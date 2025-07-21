"""
Dependency Graph Management and Execution Tier Logic
"""

import asyncio
import logging
from typing import Dict, List, Set, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from config.settings import settings

logger = logging.getLogger(__name__)


class ModelStatus(Enum):
    """Model execution status"""
    PENDING = "pending"
    READY = "ready"  
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ModelExecution:
    """Represents a model execution state"""
    name: str
    tier: int
    dependencies: List[str]
    status: ModelStatus = ModelStatus.PENDING
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DependencyGraph:
    """
    Manages the dependency relationships between models
    """
    
    def __init__(self):
        self.dependency_map = settings.dependency_map
        self.execution_tiers = settings.execution_tiers
        self.model_executions: Dict[str, ModelExecution] = {}
        self._validate_dependencies()
    
    def _validate_dependencies(self):
        """Validate that dependency graph has no cycles"""
        visited = set()
        rec_stack = set()
        
        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for dependency in self.dependency_map.get(node, []):
                if dependency not in visited:
                    if has_cycle(dependency):
                        return True
                elif dependency in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for model in self.dependency_map.keys():
            if model not in visited:
                if has_cycle(model):
                    raise ValueError(f"Cyclic dependency detected involving model: {model}")
        
        logger.info("Dependency graph validation completed - no cycles found")
    
    def initialize_execution(self) -> Dict[str, ModelExecution]:
        """Initialize all model executions"""
        self.model_executions = {}
        
        # Create execution objects for each model
        for tier_idx, tier_models in enumerate(self.execution_tiers):
            for model_name in tier_models:
                dependencies = self.dependency_map.get(model_name, [])
                
                self.model_executions[model_name] = ModelExecution(
                    name=model_name,
                    tier=tier_idx,
                    dependencies=dependencies,
                    status=ModelStatus.PENDING
                )
        
        logger.info(f"Initialized {len(self.model_executions)} model executions")
        return self.model_executions
    
    def get_ready_models(self) -> List[str]:
        """Get models that are ready to execute (dependencies met)"""
        ready_models = []
        
        for model_name, execution in self.model_executions.items():
            if execution.status != ModelStatus.PENDING:
                continue
            
            # Check if all dependencies are completed
            dependencies_met = True
            for dependency in execution.dependencies:
                if dependency not in self.model_executions:
                    dependencies_met = False
                    logger.error(f"Missing dependency model: {dependency}")
                    break
                
                if self.model_executions[dependency].status != ModelStatus.COMPLETED:
                    dependencies_met = False
                    break
            
            if dependencies_met:
                ready_models.append(model_name)
        
        return ready_models
    
    def get_models_by_tier(self, tier: int) -> List[str]:
        """Get all models in a specific tier"""
        if tier < 0 or tier >= len(self.execution_tiers):
            return []
        
        return self.execution_tiers[tier]
    
    def get_current_tier_models(self) -> Tuple[int, List[str]]:
        """Get the current executable tier and its models"""
        for tier_idx, tier_models in enumerate(self.execution_tiers):
            # Check if all models in this tier are either pending or running
            tier_has_pending = False
            tier_has_ready = False
            
            for model_name in tier_models:
                if model_name not in self.model_executions:
                    continue
                
                execution = self.model_executions[model_name]
                
                if execution.status in [ModelStatus.PENDING, ModelStatus.RUNNING]:
                    tier_has_pending = True
                
                if execution.status == ModelStatus.PENDING:
                    # Check if dependencies are met
                    dependencies_met = all(
                        self.model_executions.get(dep, ModelExecution("", 0, [])).status == ModelStatus.COMPLETED
                        for dep in execution.dependencies
                    )
                    if dependencies_met:
                        tier_has_ready = True
            
            # If this tier has ready models, return it
            if tier_has_ready:
                return tier_idx, [model for model in tier_models if model in self.model_executions]
            
            # If this tier has pending models but none ready, we need to wait
            if tier_has_pending:
                return tier_idx, []
        
        # All tiers completed
        return len(self.execution_tiers), []
    
    def mark_model_status(self, model_name: str, status: ModelStatus, **kwargs):
        """Update model status"""
        if model_name not in self.model_executions:
            logger.error(f"Unknown model: {model_name}")
            return
        
        execution = self.model_executions[model_name]
        old_status = execution.status
        execution.status = status
        
        # Update additional fields
        if "start_time" in kwargs:
            execution.start_time = kwargs["start_time"]
        if "end_time" in kwargs:
            execution.end_time = kwargs["end_time"]
        if "output" in kwargs:
            execution.output = kwargs["output"]
        if "error" in kwargs:
            execution.error = kwargs["error"]
        
        logger.info(f"Model {model_name} status: {old_status.value} -> {status.value}")
    
    def get_dependency_outputs(self, model_name: str) -> Dict[str, Any]:
        """Get outputs from all dependencies of a model"""
        if model_name not in self.model_executions:
            return {}
        
        dependency_outputs = {}
        execution = self.model_executions[model_name]
        
        for dependency in execution.dependencies:
            if dependency in self.model_executions:
                dep_execution = self.model_executions[dependency]
                if dep_execution.output:
                    dependency_outputs[dependency] = dep_execution.output
                else:
                    logger.warning(f"Missing output for dependency: {dependency}")
        
        return dependency_outputs
    
    def is_execution_complete(self) -> bool:
        """Check if all models have completed successfully"""
        for execution in self.model_executions.values():
            if execution.status != ModelStatus.COMPLETED:
                return False
        return True
    
    def has_failed_models(self) -> List[str]:
        """Get list of failed models"""
        failed_models = []
        for execution in self.model_executions.values():
            if execution.status == ModelStatus.FAILED:
                failed_models.append(execution.name)
        return failed_models
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get summary of execution state"""
        status_counts = {status.value: 0 for status in ModelStatus}
        
        for execution in self.model_executions.values():
            status_counts[execution.status.value] += 1
        
        total_models = len(self.model_executions)
        completed_models = status_counts[ModelStatus.COMPLETED.value]
        failed_models = status_counts[ModelStatus.FAILED.value]
        
        return {
            "total_models": total_models,
            "completed_models": completed_models,
            "failed_models": failed_models,
            "progress_percentage": (completed_models / total_models) * 100 if total_models > 0 else 0,
            "status_counts": status_counts,
            "is_complete": self.is_execution_complete(),
            "has_failures": failed_models > 0
        }
    
    def get_next_executable_models(self, max_concurrent: int = 3) -> List[str]:
        """Get the next batch of models that can be executed concurrently"""
        ready_models = self.get_ready_models()
        
        # Limit to max concurrent
        return ready_models[:max_concurrent]
    
    def validate_model_input(self, model_name: str, input_data: Dict[str, Any]) -> bool:
        """Validate that required dependency data is present in input"""
        if model_name not in self.model_executions:
            return False
        
        execution = self.model_executions[model_name]
        
        # Check if dependency outputs are available
        for dependency in execution.dependencies:
            if dependency not in self.model_executions:
                logger.error(f"Dependency {dependency} not found for model {model_name}")
                return False
            
            dep_execution = self.model_executions[dependency]
            if dep_execution.status != ModelStatus.COMPLETED or not dep_execution.output:
                logger.error(f"Dependency {dependency} not completed for model {model_name}")
                return False
        
        return True
    
    def get_critical_path(self) -> List[Tuple[int, List[str]]]:
        """Get the critical path through the dependency graph"""
        critical_path = []
        
        for tier_idx, tier_models in enumerate(self.execution_tiers):
            if tier_models:  # Only include non-empty tiers
                critical_path.append((tier_idx, tier_models))
        
        return critical_path
    
    def estimate_execution_time(self, model_times: Dict[str, float] = None) -> float:
        """Estimate total execution time based on tier structure"""
        if not model_times:
            # Default estimates (in seconds)
            model_times = {
                "scheduleOptimizer": 120,
                "postProductionEstimator": 90,
                "laborCostCalculator": 100,
                "equipmentPricingEngine": 80,
                "locationCostEstimator": 70,
                "insuranceCalculator": 60,
                "budgetAggregator": 90,
                "taxIncentiveAnalyzer": 60,
                "cashFlowProjector": 80
            }
        
        total_time = 0
        
        for tier_models in self.execution_tiers:
            # Models in the same tier run concurrently, so take the maximum time
            tier_time = max([model_times.get(model, 60) for model in tier_models])
            total_time += tier_time
        
        return total_time


class TierExecutor:
    """
    Executes models within a tier with proper concurrency control
    """
    
    def __init__(self, dependency_graph: DependencyGraph):
        self.dependency_graph = dependency_graph
    
    async def execute_tier(
        self,
        tier_models: List[str],
        processor_func: callable,
        max_concurrent: int = 3
    ) -> Dict[str, Any]:
        """
        Execute all models in a tier with concurrency control
        
        Args:
            tier_models: List of models in the current tier
            processor_func: Function to process each model
            max_concurrent: Maximum concurrent executions
            
        Returns:
            Dictionary of model results
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def execute_single_model(model_name: str) -> Tuple[str, Any]:
            async with semaphore:
                try:
                    # Mark as running
                    self.dependency_graph.mark_model_status(
                        model_name,
                        ModelStatus.RUNNING,
                        start_time=asyncio.get_event_loop().time()
                    )
                    
                    # Process the model
                    result = await processor_func(model_name)
                    
                    # Mark as completed
                    self.dependency_graph.mark_model_status(
                        model_name,
                        ModelStatus.COMPLETED,
                        end_time=asyncio.get_event_loop().time(),
                        output=result
                    )
                    
                    return model_name, result
                    
                except Exception as e:
                    # Mark as failed
                    self.dependency_graph.mark_model_status(
                        model_name,
                        ModelStatus.FAILED,
                        error=str(e)
                    )
                    logger.error(f"Model {model_name} failed: {str(e)}")
                    raise
        
        # Execute all models in the tier
        tasks = [execute_single_model(model) for model in tier_models]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        tier_results = {}
        for result in results:
            if isinstance(result, Exception):
                raise result
            
            model_name, model_output = result
            tier_results[model_name] = model_output
        
        return tier_results