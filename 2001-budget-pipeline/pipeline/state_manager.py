"""
Redis-based State Management for Pipeline Execution
"""

import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Set
import redis.asyncio as redis
from config.settings import settings

logger = logging.getLogger(__name__)


class PipelineExecutionState:
    """
    Manages the state of a single pipeline execution
    """
    
    def __init__(self, execution_id: str = None):
        self.execution_id = execution_id or str(uuid.uuid4())
        self.created_at = datetime.utcnow()
        self.status = "INITIALIZED"  # INITIALIZED, RUNNING, COMPLETED, FAILED
        self.current_tier = 0
        self.completed_models: Set[str] = set()
        self.failed_models: Set[str] = set()
        self.model_outputs: Dict[str, Dict[str, Any]] = {}
        self.progress_log: List[Dict[str, Any]] = []
        self.error_log: List[Dict[str, Any]] = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for serialization"""
        return {
            "execution_id": self.execution_id,
            "created_at": self.created_at.isoformat(),
            "status": self.status,
            "current_tier": self.current_tier,
            "completed_models": list(self.completed_models),
            "failed_models": list(self.failed_models),
            "model_outputs": self.model_outputs,
            "progress_log": self.progress_log,
            "error_log": self.error_log
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PipelineExecutionState':
        """Create state from dictionary"""
        state = cls(execution_id=data["execution_id"])
        state.created_at = datetime.fromisoformat(data["created_at"])
        state.status = data["status"]
        state.current_tier = data["current_tier"]
        state.completed_models = set(data["completed_models"])
        state.failed_models = set(data["failed_models"])
        state.model_outputs = data["model_outputs"]
        state.progress_log = data["progress_log"]
        state.error_log = data["error_log"]
        return state


class RedisStateManager:
    """
    Redis-based state manager for pipeline executions
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.connection_pool = None
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.connection_pool = redis.ConnectionPool(
                host=settings.redis.host,
                port=settings.redis.port,
                db=settings.redis.db,
                password=settings.redis.password,
                max_connections=settings.redis.max_connections,
                retry_on_timeout=settings.redis.retry_on_timeout
            )
            
            self.redis_client = redis.Redis(
                connection_pool=self.connection_pool,
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis connection initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {str(e)}")
            raise
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
        if self.connection_pool:
            await self.connection_pool.disconnect()
    
    def _get_execution_key(self, execution_id: str) -> str:
        """Get Redis key for execution state"""
        return f"pipeline:execution:{execution_id}"
    
    def _get_model_output_key(self, execution_id: str, model_name: str) -> str:
        """Get Redis key for model output"""
        return f"pipeline:execution:{execution_id}:model:{model_name}"
    
    def _get_progress_key(self, execution_id: str) -> str:
        """Get Redis key for progress updates"""
        return f"pipeline:execution:{execution_id}:progress"
    
    async def create_execution(self, initial_input: Dict[str, Any]) -> PipelineExecutionState:
        """Create new pipeline execution"""
        execution_state = PipelineExecutionState()
        execution_state.status = "INITIALIZED"
        
        # Store initial state
        await self.save_execution_state(execution_state)
        
        # Store initial input
        await self.redis_client.hset(
            self._get_execution_key(execution_state.execution_id),
            "initial_input",
            json.dumps(initial_input)
        )
        
        # Set expiration (24 hours)
        await self.redis_client.expire(
            self._get_execution_key(execution_state.execution_id),
            86400
        )
        
        logger.info(f"Created execution {execution_state.execution_id}")
        return execution_state
    
    async def save_execution_state(self, state: PipelineExecutionState):
        """Save execution state to Redis"""
        key = self._get_execution_key(state.execution_id)
        
        # Update timestamp
        state_dict = state.to_dict()
        state_dict["updated_at"] = datetime.utcnow().isoformat()
        
        await self.redis_client.hset(key, "state", json.dumps(state_dict))
        
        # Publish progress update
        await self._publish_progress_update(state)
    
    async def get_execution_state(self, execution_id: str) -> Optional[PipelineExecutionState]:
        """Get execution state from Redis"""
        key = self._get_execution_key(execution_id)
        
        state_data = await self.redis_client.hget(key, "state")
        if not state_data:
            return None
        
        return PipelineExecutionState.from_dict(json.loads(state_data))
    
    async def save_model_output(
        self,
        execution_id: str,
        model_name: str,
        output: Dict[str, Any],
        processing_time: float = None
    ):
        """Save model output with metadata"""
        key = self._get_model_output_key(execution_id, model_name)
        
        model_data = {
            "model_name": model_name,
            "output": output,
            "timestamp": datetime.utcnow().isoformat(),
            "processing_time": processing_time
        }
        
        await self.redis_client.set(key, json.dumps(model_data))
        
        # Set expiration (24 hours)
        await self.redis_client.expire(key, 86400)
        
        # Update execution state
        state = await self.get_execution_state(execution_id)
        if state:
            state.completed_models.add(model_name)
            state.model_outputs[model_name] = output
            state.progress_log.append({
                "timestamp": datetime.utcnow().isoformat(),
                "event": "model_completed",
                "model_name": model_name,
                "processing_time": processing_time
            })
            await self.save_execution_state(state)
        
        logger.info(f"Saved output for {model_name} in execution {execution_id}")
    
    async def get_model_output(
        self,
        execution_id: str,
        model_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get model output from Redis"""
        key = self._get_model_output_key(execution_id, model_name)
        
        data = await self.redis_client.get(key)
        if not data:
            return None
        
        model_data = json.loads(data)
        return model_data["output"]
    
    async def get_dependency_outputs(
        self,
        execution_id: str,
        dependency_models: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """Get outputs from dependency models"""
        dependency_data = {}
        
        for model_name in dependency_models:
            output = await self.get_model_output(execution_id, model_name)
            if output:
                dependency_data[model_name] = output
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
        if state:
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
        if state:
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
    
    async def _publish_progress_update(self, state: PipelineExecutionState):
        """Publish progress update for WebSocket clients"""
        progress_key = self._get_progress_key(state.execution_id)
        
        progress_data = {
            "execution_id": state.execution_id,
            "status": state.status,
            "current_tier": state.current_tier,
            "completed_models": list(state.completed_models),
            "failed_models": list(state.failed_models),
            "total_models": len(settings.model_folder_map) - 1,  # Exclude coordinator
            "progress_percentage": (len(state.completed_models) / (len(settings.model_folder_map) - 1)) * 100,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store latest progress
        await self.redis_client.set(
            progress_key,
            json.dumps(progress_data),
            ex=86400  # 24 hour expiration
        )
        
        # Publish to progress channel
        await self.redis_client.publish(
            f"pipeline:progress:{state.execution_id}",
            json.dumps(progress_data)
        )
    
    async def subscribe_to_progress(self, execution_id: str):
        """Subscribe to progress updates for an execution"""
        pubsub = self.redis_client.pubsub()
        channel = f"pipeline:progress:{execution_id}"
        
        await pubsub.subscribe(channel)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield json.loads(message["data"])
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
    
    async def get_execution_progress(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get current execution progress"""
        progress_key = self._get_progress_key(execution_id)
        
        progress_data = await self.redis_client.get(progress_key)
        if not progress_data:
            return None
        
        return json.loads(progress_data)
    
    async def list_active_executions(self) -> List[str]:
        """List all active execution IDs"""
        pattern = "pipeline:execution:*"
        keys = await self.redis_client.keys(pattern)
        
        execution_ids = []
        for key in keys:
            if ":model:" not in key and ":progress" not in key:
                # Extract execution ID from key
                execution_id = key.split(":")[-1]
                execution_ids.append(execution_id)
        
        return execution_ids
    
    async def cleanup_expired_executions(self):
        """Clean up expired executions"""
        active_executions = await self.list_active_executions()
        
        for execution_id in active_executions:
            state = await self.get_execution_state(execution_id)
            if state:
                # Clean up executions older than 24 hours
                if datetime.utcnow() - state.created_at > timedelta(hours=24):
                    await self.delete_execution(execution_id)
    
    async def delete_execution(self, execution_id: str):
        """Delete all data for an execution"""
        pattern = f"pipeline:execution:{execution_id}*"
        keys = await self.redis_client.keys(pattern)
        
        if keys:
            await self.redis_client.delete(*keys)
            logger.info(f"Deleted execution {execution_id}")


# Global state manager instance
state_manager = RedisStateManager()