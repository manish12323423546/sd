"""
In-Memory State Management for Pipeline Execution
"""

import asyncio
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field
from threading import Lock
from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class ExecutionProgress:
    """Progress tracking for pipeline execution"""
    execution_id: str
    status: str
    current_tier: int
    completed_models: Set[str] = field(default_factory=set)
    failed_models: Set[str] = field(default_factory=set)
    progress_percentage: float = 0.0
    start_time: datetime = field(default_factory=datetime.utcnow)
    last_update: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PipelineExecutionState:
    """Complete state of a pipeline execution"""
    execution_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "INITIALIZED"  # INITIALIZED, RUNNING, COMPLETED, FAILED
    current_tier: int = 0
    completed_models: Set[str] = field(default_factory=set)
    failed_models: Set[str] = field(default_factory=set)
    model_outputs: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    progress_log: List[Dict[str, Any]] = field(default_factory=list)
    error_log: List[Dict[str, Any]] = field(default_factory=list)
    initial_input: Optional[Dict[str, Any]] = None
    processing_times: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary"""
        return {
            "execution_id": self.execution_id,
            "created_at": self.created_at.isoformat(),
            "status": self.status,
            "current_tier": self.current_tier,
            "completed_models": list(self.completed_models),
            "failed_models": list(self.failed_models),
            "model_outputs": self.model_outputs,
            "progress_log": self.progress_log,
            "error_log": self.error_log,
            "processing_times": self.processing_times
        }
    
    def get_progress(self) -> ExecutionProgress:
        """Get current progress"""
        total_models = len(settings.model_folder_map) - 1  # Exclude coordinator
        progress_percentage = (len(self.completed_models) / total_models) * 100 if total_models > 0 else 0
        
        return ExecutionProgress(
            execution_id=self.execution_id,
            status=self.status,
            current_tier=self.current_tier,
            completed_models=self.completed_models.copy(),
            failed_models=self.failed_models.copy(),
            progress_percentage=progress_percentage,
            start_time=self.created_at,
            last_update=datetime.utcnow()
        )


class MemoryStateManager:
    """
    In-memory state manager for pipeline executions
    """
    
    def __init__(self):
        self.executions: Dict[str, PipelineExecutionState] = {}
        self.progress_subscribers: Dict[str, List[asyncio.Queue]] = {}
        self.lock = Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """Initialize the state manager"""
        logger.info("Memory state manager initialized")
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    async def close(self):
        """Clean shutdown"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Clear all data
        with self.lock:
            self.executions.clear()
            self.progress_subscribers.clear()
        
        logger.info("Memory state manager closed")
    
    async def create_execution(self, initial_input: Dict[str, Any]) -> PipelineExecutionState:
        """Create new pipeline execution"""
        execution_state = PipelineExecutionState(
            execution_id=str(uuid.uuid4()),
            initial_input=initial_input,
            status="INITIALIZED"
        )
        
        with self.lock:
            self.executions[execution_state.execution_id] = execution_state
            self.progress_subscribers[execution_state.execution_id] = []
        
        logger.info(f"Created execution {execution_state.execution_id}")
        return execution_state
    
    async def get_execution_state(self, execution_id: str) -> Optional[PipelineExecutionState]:
        """Get execution state"""
        with self.lock:
            return self.executions.get(execution_id)
    
    async def save_execution_state(self, state: PipelineExecutionState):
        """Save execution state"""
        with self.lock:
            if state.execution_id not in self.executions:
                logger.warning(f"Execution {state.execution_id} not found for save")
                return
            
            # Update the stored state
            self.executions[state.execution_id] = state
        
        # Notify subscribers
        await self._notify_progress_subscribers(state)
    
    async def save_model_output(
        self,
        execution_id: str,
        model_name: str,
        output: Dict[str, Any],
        processing_time: float = None
    ):
        """Save model output with metadata"""
        state = await self.get_execution_state(execution_id)
        if not state:
            logger.error(f"Execution {execution_id} not found")
            return
        
        # Update state
        state.completed_models.add(model_name)
        state.model_outputs[model_name] = output
        
        if processing_time is not None:
            state.processing_times[model_name] = processing_time
        
        state.progress_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "model_completed",
            "model_name": model_name,
            "processing_time": processing_time
        })
        
        # Save updated state
        await self.save_execution_state(state)
        
        logger.info(f"Saved output for {model_name} in execution {execution_id}")
    
    async def get_model_output(
        self,
        execution_id: str,
        model_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get model output"""
        state = await self.get_execution_state(execution_id)
        if not state:
            return None
        
        return state.model_outputs.get(model_name)
    
    async def get_dependency_outputs(
        self,
        execution_id: str,
        dependency_models: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """Get outputs from dependency models"""
        state = await self.get_execution_state(execution_id)
        if not state:
            return {}
        
        dependency_data = {}
        
        for model_name in dependency_models:
            if model_name in state.model_outputs:
                dependency_data[model_name] = state.model_outputs[model_name]
            else:
                logger.warning(f"Missing dependency output: {model_name}")
        
        return dependency_data
    
    async def mark_model_failed(
        self,
        execution_id: str,
        model_name: str,
        error: str
    ):
        """Mark a model as failed"""
        state = await self.get_execution_state(execution_id)
        if not state:
            logger.error(f"Execution {execution_id} not found")
            return
        
        state.failed_models.add(model_name)
        state.error_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "error": error
        })
        
        await self.save_execution_state(state)
        
        logger.error(f"Marked {model_name} as failed in execution {execution_id}: {error}")
    
    async def update_execution_status(
        self,
        execution_id: str,
        status: str,
        current_tier: int = None
    ):
        """Update execution status and current tier"""
        state = await self.get_execution_state(execution_id)
        if not state:
            logger.error(f"Execution {execution_id} not found")
            return
        
        state.status = status
        if current_tier is not None:
            state.current_tier = current_tier
        
        state.progress_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "status_change",
            "status": status,
            "tier": current_tier
        })
        
        await self.save_execution_state(state)
        
        logger.info(f"Updated execution {execution_id} status to {status}")
    
    async def subscribe_to_progress(self, execution_id: str) -> asyncio.Queue:
        """Subscribe to progress updates for an execution"""
        progress_queue = asyncio.Queue()
        
        with self.lock:
            if execution_id not in self.progress_subscribers:
                self.progress_subscribers[execution_id] = []
            
            self.progress_subscribers[execution_id].append(progress_queue)
        
        # Send current state immediately
        state = await self.get_execution_state(execution_id)
        if state:
            progress = state.get_progress()
            await progress_queue.put(progress.to_dict())
        
        return progress_queue
    
    async def unsubscribe_from_progress(self, execution_id: str, queue: asyncio.Queue):
        """Unsubscribe from progress updates"""
        with self.lock:
            if execution_id in self.progress_subscribers:
                try:
                    self.progress_subscribers[execution_id].remove(queue)
                except ValueError:
                    pass  # Queue not in list
    
    async def _notify_progress_subscribers(self, state: PipelineExecutionState):
        """Notify all progress subscribers"""
        with self.lock:
            subscribers = self.progress_subscribers.get(state.execution_id, [])
            if not subscribers:
                return
            
            progress = state.get_progress()
            progress_data = {
                "execution_id": state.execution_id,
                "status": state.status,
                "current_tier": state.current_tier,
                "completed_models": list(state.completed_models),
                "failed_models": list(state.failed_models),
                "total_models": len(settings.model_folder_map) - 1,
                "progress_percentage": progress.progress_percentage,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Notify all subscribers (without holding the lock)
        for queue in subscribers:
            try:
                await queue.put(progress_data)
            except Exception as e:
                logger.warning(f"Failed to notify progress subscriber: {e}")
    
    async def get_execution_progress(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get current execution progress"""
        state = await self.get_execution_state(execution_id)
        if not state:
            return None
        
        progress = state.get_progress()
        return {
            "execution_id": state.execution_id,
            "status": state.status,
            "current_tier": state.current_tier,
            "completed_models": list(state.completed_models),
            "failed_models": list(state.failed_models),
            "total_models": len(settings.model_folder_map) - 1,
            "progress_percentage": progress.progress_percentage,
            "timestamp": datetime.utcnow().isoformat(),
            "processing_times": state.processing_times
        }
    
    async def list_active_executions(self) -> List[str]:
        """List all active execution IDs"""
        with self.lock:
            return list(self.executions.keys())
    
    async def get_execution_summary(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution summary"""
        state = await self.get_execution_state(execution_id)
        if not state:
            return None
        
        total_models = len(settings.model_folder_map) - 1
        
        return {
            "execution_id": state.execution_id,
            "status": state.status,
            "created_at": state.created_at.isoformat(),
            "total_models": total_models,
            "completed_models": len(state.completed_models),
            "failed_models": len(state.failed_models),
            "current_tier": state.current_tier,
            "progress_percentage": (len(state.completed_models) / total_models) * 100 if total_models > 0 else 0,
            "total_processing_time": sum(state.processing_times.values()),
            "error_count": len(state.error_log)
        }
    
    async def delete_execution(self, execution_id: str):
        """Delete all data for an execution"""
        with self.lock:
            if execution_id in self.executions:
                del self.executions[execution_id]
            
            if execution_id in self.progress_subscribers:
                # Close all subscriber queues
                for queue in self.progress_subscribers[execution_id]:
                    try:
                        await queue.put(None)  # Signal shutdown
                    except Exception:
                        pass
                
                del self.progress_subscribers[execution_id]
        
        logger.info(f"Deleted execution {execution_id}")
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of expired executions"""
        while True:
            try:
                await asyncio.sleep(settings.memory.cleanup_interval)
                await self._cleanup_expired_executions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    async def _cleanup_expired_executions(self):
        """Clean up expired executions"""
        cutoff_time = datetime.utcnow() - timedelta(seconds=settings.memory.execution_ttl)
        expired_executions = []
        
        with self.lock:
            for execution_id, state in self.executions.items():
                if state.created_at < cutoff_time:
                    expired_executions.append(execution_id)
            
            # Also enforce max executions limit
            if len(self.executions) > settings.memory.max_executions:
                # Remove oldest executions
                sorted_executions = sorted(
                    self.executions.items(),
                    key=lambda x: x[1].created_at
                )
                
                excess_count = len(self.executions) - settings.memory.max_executions
                for execution_id, _ in sorted_executions[:excess_count]:
                    expired_executions.append(execution_id)
        
        # Delete expired executions
        for execution_id in expired_executions:
            await self.delete_execution(execution_id)
        
        if expired_executions:
            logger.info(f"Cleaned up {len(expired_executions)} expired executions")
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory usage statistics"""
        with self.lock:
            total_executions = len(self.executions)
            total_subscribers = sum(len(subs) for subs in self.progress_subscribers.values())
            
            # Status breakdown
            status_counts = {}
            for state in self.executions.values():
                status = state.status
                status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_executions": total_executions,
            "total_subscribers": total_subscribers,
            "status_breakdown": status_counts,
            "max_executions": settings.memory.max_executions,
            "cleanup_interval": settings.memory.cleanup_interval,
            "execution_ttl": settings.memory.execution_ttl
        }


# Global state manager instance
memory_state_manager = MemoryStateManager()