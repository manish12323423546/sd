"""
In-Memory State Management for 2001 Scheduling Pipeline
Handles execution tracking, progress monitoring, and state persistence
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
import uuid

from config.settings import settings

logger = logging.getLogger(__name__)


class ExecutionStatus(Enum):
    """Execution status enumeration"""
    PENDING = "PENDING"
    RUNNING = "RUNNING" 
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass
class PipelineExecutionState:
    """Represents the state of a pipeline execution"""
    execution_id: str
    status: ExecutionStatus
    created_at: datetime
    updated_at: datetime
    input_data: Dict[str, Any]
    results: Dict[str, Any]
    current_tier: int = 0
    total_tiers: int = 3
    error_message: Optional[str] = None
    processing_time: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "execution_id": self.execution_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(), 
            "current_tier": self.current_tier,
            "total_tiers": self.total_tiers,
            "error_message": self.error_message,
            "processing_time": self.processing_time,
            "input_data": self.input_data,
            "results": self.results
        }


@dataclass
class ModelExecutionState:
    """Represents the state of a single model execution"""
    model_name: str
    status: ExecutionStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    processing_time: float = 0.0
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class MemoryStateManager:
    """
    In-memory state management for scheduling pipeline executions
    """
    
    def __init__(self):
        self.executions: Dict[str, PipelineExecutionState] = {}
        self.model_states: Dict[str, Dict[str, ModelExecutionState]] = {}
        self.progress_subscribers: Dict[str, List[asyncio.Queue]] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize the state manager"""
        if self.is_initialized:
            return
        
        try:
            # Start cleanup task
            self.cleanup_task = asyncio.create_task(self._cleanup_old_executions())
            self.is_initialized = True
            logger.info("Memory state manager initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize memory state manager: {str(e)}")
            raise
    
    async def close(self):
        """Clean shutdown of state manager"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        self.is_initialized = False
        logger.info("Memory state manager closed")
    
    async def create_execution(self, input_data: Dict[str, Any]) -> PipelineExecutionState:
        """Create a new pipeline execution"""
        execution_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        state = PipelineExecutionState(
            execution_id=execution_id,
            status=ExecutionStatus.PENDING,
            created_at=now,
            updated_at=now,
            input_data=input_data,
            results={},
            total_tiers=len(settings.execution_tiers)
        )
        
        self.executions[execution_id] = state
        self.model_states[execution_id] = {}
        self.progress_subscribers[execution_id] = []
        
        # Initialize model states
        for model_name in settings.model_folder_map.keys():
            self.model_states[execution_id][model_name] = ModelExecutionState(
                model_name=model_name,
                status=ExecutionStatus.PENDING
            )
        
        logger.info(f"Created execution {execution_id}")
        await self._notify_progress_subscribers(execution_id)
        
        return state
    
    async def update_execution_status(
        self,
        execution_id: str,
        status: str,
        current_tier: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Update execution status"""
        if execution_id not in self.executions:
            raise ValueError(f"Execution {execution_id} not found")
        
        state = self.executions[execution_id]
        state.status = ExecutionStatus(status)
        state.updated_at = datetime.utcnow()
        
        if current_tier is not None:
            state.current_tier = current_tier
        
        if error_message:
            state.error_message = error_message
        
        if status in ["COMPLETED", "FAILED", "CANCELLED"]:
            state.processing_time = (state.updated_at - state.created_at).total_seconds()
        
        logger.info(f"Updated execution {execution_id} status to {status}")
        await self._notify_progress_subscribers(execution_id)
    
    async def save_model_output(
        self,
        execution_id: str,
        model_name: str,
        output: Dict[str, Any],
        processing_time: float
    ):
        """Save model execution output"""
        if execution_id not in self.executions:
            raise ValueError(f"Execution {execution_id} not found")
        
        # Update model state
        if execution_id in self.model_states and model_name in self.model_states[execution_id]:
            model_state = self.model_states[execution_id][model_name]
            model_state.status = ExecutionStatus.COMPLETED
            model_state.end_time = datetime.utcnow()
            model_state.processing_time = processing_time
            model_state.output = output
        
        # Update execution results
        self.executions[execution_id].results[model_name] = output
        self.executions[execution_id].updated_at = datetime.utcnow()
        
        logger.info(f"Saved output for model {model_name} in execution {execution_id}")
        await self._notify_progress_subscribers(execution_id)
    
    async def mark_model_failed(
        self,
        execution_id: str,
        model_name: str,
        error: str
    ):
        """Mark a model as failed"""
        if execution_id not in self.executions:
            raise ValueError(f"Execution {execution_id} not found")
        
        # Update model state
        if execution_id in self.model_states and model_name in self.model_states[execution_id]:
            model_state = self.model_states[execution_id][model_name]
            model_state.status = ExecutionStatus.FAILED
            model_state.end_time = datetime.utcnow()
            model_state.error = error
        
        logger.error(f"Model {model_name} failed in execution {execution_id}: {error}")
        await self._notify_progress_subscribers(execution_id)
    
    async def get_dependency_outputs(
        self,
        execution_id: str,
        dependencies: List[str]
    ) -> Dict[str, Any]:
        """Get outputs from dependency models"""
        if execution_id not in self.executions:
            raise ValueError(f"Execution {execution_id} not found")
        
        dependency_outputs = {}
        results = self.executions[execution_id].results
        
        for dep in dependencies:
            if dep in results:
                dependency_outputs[dep] = results[dep]
            else:
                raise ValueError(f"Dependency {dep} not found for execution {execution_id}")
        
        return dependency_outputs
    
    async def get_execution_state(self, execution_id: str) -> Optional[PipelineExecutionState]:
        """Get execution state"""
        return self.executions.get(execution_id)
    
    async def get_execution_progress(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution progress information"""
        if execution_id not in self.executions:
            return None
        
        state = self.executions[execution_id]
        model_states = self.model_states.get(execution_id, {})
        
        # Calculate progress
        completed_models = sum(1 for ms in model_states.values() if ms.status == ExecutionStatus.COMPLETED)
        total_models = len(model_states)
        progress_percent = (completed_models / total_models * 100) if total_models > 0 else 0
        
        return {
            "execution_id": execution_id,
            "status": state.status.value,
            "current_tier": state.current_tier,
            "total_tiers": state.total_tiers,
            "progress_percent": progress_percent,
            "completed_models": completed_models,
            "total_models": total_models,
            "processing_time": state.processing_time,
            "created_at": state.created_at.isoformat(),
            "updated_at": state.updated_at.isoformat(),
            "model_status": {
                name: {
                    "status": ms.status.value,
                    "processing_time": ms.processing_time,
                    "error": ms.error
                }
                for name, ms in model_states.items()
            }
        }
    
    async def list_active_executions(self) -> List[str]:
        """List all active execution IDs"""
        active_statuses = {ExecutionStatus.PENDING, ExecutionStatus.RUNNING}
        return [
            exec_id for exec_id, state in self.executions.items()
            if state.status in active_statuses
        ]
    
    async def get_execution_summary(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution summary"""
        if execution_id not in self.executions:
            return None
        
        state = self.executions[execution_id]
        return state.to_dict()
    
    async def subscribe_to_progress(self, execution_id: str) -> asyncio.Queue:
        """Subscribe to progress updates for an execution"""
        if execution_id not in self.progress_subscribers:
            self.progress_subscribers[execution_id] = []
        
        queue = asyncio.Queue()
        self.progress_subscribers[execution_id].append(queue)
        
        # Send current state immediately
        progress = await self.get_execution_progress(execution_id)
        if progress:
            await queue.put(progress)
        
        return queue
    
    async def unsubscribe_from_progress(self, execution_id: str, queue: asyncio.Queue):
        """Unsubscribe from progress updates"""
        if execution_id in self.progress_subscribers:
            try:
                self.progress_subscribers[execution_id].remove(queue)
            except ValueError:
                pass  # Queue not in list
    
    async def _notify_progress_subscribers(self, execution_id: str):
        """Notify all progress subscribers of an update"""
        if execution_id not in self.progress_subscribers:
            return
        
        progress = await self.get_execution_progress(execution_id)
        if not progress:
            return
        
        # Send to all subscribers
        for queue in self.progress_subscribers[execution_id][:]:  # Copy to avoid modification during iteration
            try:
                queue.put_nowait(progress)
            except asyncio.QueueFull:
                # Remove full queues
                self.progress_subscribers[execution_id].remove(queue)
            except Exception as e:
                logger.error(f"Error notifying progress subscriber: {str(e)}")
    
    async def _cleanup_old_executions(self):
        """Periodic cleanup of old executions"""
        while True:
            try:
                await asyncio.sleep(settings.memory.cleanup_interval)
                
                cutoff_time = datetime.utcnow() - timedelta(seconds=settings.memory.execution_ttl)
                expired_executions = []
                
                for exec_id, state in self.executions.items():
                    if state.updated_at < cutoff_time and state.status in [
                        ExecutionStatus.COMPLETED, 
                        ExecutionStatus.FAILED, 
                        ExecutionStatus.CANCELLED
                    ]:
                        expired_executions.append(exec_id)
                
                # Remove expired executions
                for exec_id in expired_executions:
                    del self.executions[exec_id]
                    if exec_id in self.model_states:
                        del self.model_states[exec_id]
                    if exec_id in self.progress_subscribers:
                        del self.progress_subscribers[exec_id]
                
                if expired_executions:
                    logger.info(f"Cleaned up {len(expired_executions)} expired executions")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {str(e)}")
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory usage statistics"""
        return {
            "total_executions": len(self.executions),
            "active_executions": len([
                e for e in self.executions.values() 
                if e.status in {ExecutionStatus.PENDING, ExecutionStatus.RUNNING}
            ]),
            "completed_executions": len([
                e for e in self.executions.values() 
                if e.status == ExecutionStatus.COMPLETED
            ]),
            "failed_executions": len([
                e for e in self.executions.values() 
                if e.status == ExecutionStatus.FAILED
            ]),
            "total_subscribers": sum(len(subs) for subs in self.progress_subscribers.values()),
            "is_initialized": self.is_initialized
        }


# Global state manager instance
memory_state_manager = MemoryStateManager()