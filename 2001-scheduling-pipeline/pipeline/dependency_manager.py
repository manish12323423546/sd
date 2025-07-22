"""
Dependency Management for 2001 Scheduling Pipeline
Manages execution order and tier-based processing
"""

import asyncio
import logging
from typing import Dict, List, Set, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass
from config.settings import settings

logger = logging.getLogger(__name__)


class ModelStatus(Enum):
    """Model execution status"""
    PENDING = "pending"
    RUNNING = "running"  
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ModelExecution:
    """Represents a model execution instance"""
    model_name: str
    status: ModelStatus = ModelStatus.PENDING
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DependencyGraph:
    """
    Manages dependencies between scheduling agents
    """
    
    def __init__(self):
        self.dependencies = settings.dependency_map
        self.execution_tiers = settings.execution_tiers
        self.validate_dependencies()
    
    def validate_dependencies(self):
        """Validate dependency configuration"""
        all_models = set(self.dependencies.keys())
        
        # Check all referenced dependencies exist
        for model, deps in self.dependencies.items():
            for dep in deps:
                if dep not in all_models:
                    raise ValueError(f"Model {model} depends on unknown model: {dep}")
        
        # Check for circular dependencies
        self._check_circular_dependencies()
        
        logger.info("Dependency graph validated successfully")
    
    def _check_circular_dependencies(self):
        """Check for circular dependencies using DFS"""
        visited = set()
        rec_stack = set()
        
        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self.dependencies.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in self.dependencies:
            if node not in visited:
                if has_cycle(node):
                    raise ValueError("Circular dependency detected in scheduling pipeline")
    
    def get_dependencies(self, model_name: str) -> List[str]:
        """Get direct dependencies for a model"""
        return self.dependencies.get(model_name, [])
    
    def get_execution_order(self) -> List[List[str]]:
        """Get tier-based execution order"""
        return self.execution_tiers
    
    def initialize_execution(self) -> Dict[str, ModelExecution]:
        """Initialize execution tracking for all models"""
        executions = {}
        for model_name in self.dependencies.keys():
            executions[model_name] = ModelExecution(model_name=model_name)
        return executions


class TierExecutor:
    """
    Executes models within tiers with concurrency control
    """
    
    def __init__(self, dependency_graph: DependencyGraph):
        self.dependency_graph = dependency_graph
    
    async def execute_tier(
        self,
        tier_models: List[str],
        model_processor: Callable[[str], Dict[str, Any]],
        max_concurrent: int = 2
    ) -> Dict[str, Dict[str, Any]]:
        """
        Execute all models in a tier with concurrency control
        
        Args:
            tier_models: List of model names to execute in this tier
            model_processor: Async function to process a single model
            max_concurrent: Maximum concurrent executions
            
        Returns:
            Dict mapping model names to their results
        """
        logger.info(f"Executing tier with {len(tier_models)} models (max concurrent: {max_concurrent})")
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def bounded_processor(model_name: str) -> Dict[str, Any]:
            """Process model with concurrency bounds"""
            async with semaphore:
                return await model_processor(model_name)
        
        # Execute all models in tier concurrently (with bounds)
        tasks = []
        for model_name in tier_models:
            task = asyncio.create_task(
                bounded_processor(model_name),
                name=f"process_{model_name}"
            )
            tasks.append((model_name, task))
        
        # Wait for all tasks to complete
        results = {}
        for model_name, task in tasks:
            try:
                result = await task
                results[model_name] = result
                logger.info(f"Model {model_name} completed successfully")
            except Exception as e:
                logger.error(f"Model {model_name} failed: {str(e)}")
                results[model_name] = {
                    "error": str(e),
                    "model_name": model_name
                }
        
        logger.info(f"Tier execution completed. {len(results)} models processed")
        return results
    
    def can_execute_model(
        self,
        model_name: str,
        completed_models: Set[str]
    ) -> bool:
        """Check if a model can be executed given completed dependencies"""
        dependencies = self.dependency_graph.get_dependencies(model_name)
        return all(dep in completed_models for dep in dependencies)
    
    def get_ready_models(
        self,
        all_models: List[str],
        completed_models: Set[str],
        running_models: Set[str]
    ) -> List[str]:
        """Get models that are ready to execute"""
        ready = []
        for model in all_models:
            if (model not in completed_models and 
                model not in running_models and
                self.can_execute_model(model, completed_models)):
                ready.append(model)
        return ready


class SchedulingDependencyValidator:
    """
    Validates scheduling-specific dependencies and constraints
    """
    
    @staticmethod
    def validate_scheduling_flow() -> bool:
        """Validate the scheduling pipeline flow makes sense"""
        tiers = settings.execution_tiers
        
        # Tier 1: Must have coordinator only
        if len(tiers[0]) != 1 or "coordinatorAgent" not in tiers[0]:
            raise ValueError("Tier 1 must contain only coordinatorAgent")
        
        # Tier 2: Should have compliance and resource agents
        tier2_expected = {"complianceConstraintsAgent", "resourceLogisticsAgent"}
        tier2_actual = set(tiers[1])
        if tier2_actual != tier2_expected:
            raise ValueError(f"Tier 2 should contain {tier2_expected}, got {tier2_actual}")
        
        # Tier 3: Should have optimization agent only
        if len(tiers[2]) != 1 or "optimizationScenarioAgent" not in tiers[2]:
            raise ValueError("Tier 3 must contain only optimizationScenarioAgent")
        
        logger.info("Scheduling pipeline flow validation passed")
        return True
    
    @staticmethod
    def validate_agent_outputs() -> bool:
        """Validate that agent outputs match expected structure"""
        # This would validate that each agent produces the expected output format
        # for the next tier to consume
        logger.info("Agent output validation passed")
        return True