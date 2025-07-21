"""
Main Pipeline Orchestrator with Tier-based Execution
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from pipeline.dependency_manager import DependencyGraph, TierExecutor, ModelStatus
from pipeline.memory_state_manager import memory_state_manager, PipelineExecutionState
from models.model_processor import model_processor
from models.io_logger import io_logger
from config.settings import settings
from utils.fallback_aggregator import FallbackBudgetAggregator

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Main orchestrator for the 2001 budget pipeline system
    """
    
    def __init__(self):
        self.dependency_graph = DependencyGraph()
        self.tier_executor = TierExecutor(self.dependency_graph)
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize all components"""
        if self.is_initialized:
            return
        
        try:
            # Initialize state manager
            await memory_state_manager.initialize()
            
            # Initialize model processor
            await model_processor.initialize()
            
            self.is_initialized = True
            logger.info("Pipeline orchestrator initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize pipeline orchestrator: {str(e)}")
            raise
    
    async def shutdown(self):
        """Clean shutdown of orchestrator"""
        try:
            await memory_state_manager.close()
            logger.info("Pipeline orchestrator shut down")
        except Exception as e:
            logger.error(f"Error during shutdown: {str(e)}")
    
    async def execute_pipeline(
        self,
        coordinator_input: Dict[str, Any],
        enable_thinking: bool = True,
        enable_functions: bool = True,
        max_concurrent: int = None
    ) -> Dict[str, Any]:
        """
        Execute the complete budget pipeline
        
        Args:
            coordinator_input: Input from coordinator model
            enable_thinking: Enable Gemini thinking mode
            enable_functions: Enable function calling
            max_concurrent: Maximum concurrent model executions per tier
            
        Returns:
            Complete pipeline results
        """
        if not self.is_initialized:
            await self.initialize()
        
        max_concurrent = max_concurrent or settings.pipeline.max_concurrent_models
        
        # Create execution state
        execution_state = await memory_state_manager.create_execution(coordinator_input)
        execution_id = execution_state.execution_id
        
        try:
            logger.info(f"Starting pipeline execution {execution_id}")
            start_time = time.time()
            
            # Create execution folder structure for logging
            io_logger.create_execution_folder(execution_id)
            
            # Update status to running
            await memory_state_manager.update_execution_status(execution_id, "RUNNING")
            
            # Initialize dependency graph
            model_executions = self.dependency_graph.initialize_execution()
            
            # Execute tiers sequentially, models within tiers concurrently
            final_results = {}
            
            for tier_idx, tier_models in enumerate(settings.execution_tiers):
                logger.info(f"Executing Tier {tier_idx + 1}: {tier_models}")
                
                # Update current tier
                await memory_state_manager.update_execution_status(
                    execution_id,
                    "RUNNING",
                    current_tier=tier_idx
                )
                
                # Execute tier
                tier_results = await self._execute_tier(
                    execution_id,
                    tier_models,
                    coordinator_input,
                    enable_thinking,
                    enable_functions,
                    max_concurrent
                )
                
                # Save tier results
                for model_name, result in tier_results.items():
                    if "error" in result:
                        await memory_state_manager.mark_model_failed(
                            execution_id,
                            model_name,
                            result["error"]
                        )
                        raise Exception(f"Model {model_name} failed: {result['error']}")
                    else:
                        processing_time = result.get("processing_time", 0)
                        model_output = result.get("output", result)
                        
                        await memory_state_manager.save_model_output(
                            execution_id,
                            model_name,
                            model_output,
                            processing_time
                        )
                        
                        final_results[model_name] = model_output
                
                logger.info(f"Tier {tier_idx + 1} completed successfully")
            
            # Check if budget aggregator failed and apply fallback
            if "budgetAggregator" in final_results:
                budget_result = final_results["budgetAggregator"]
                if (budget_result.get("error") == "JSON_PARSING_FAILED" or 
                    not budget_result.get("success", False)):
                    
                    logger.warning("🔄 Budget Aggregator failed, applying fallback aggregation...")
                    try:
                        fallback_aggregator = FallbackBudgetAggregator()
                        fallback_result = fallback_aggregator.aggregate_budget(final_results)
                        
                        # Replace failed aggregator with fallback result
                        final_results["budgetAggregator"] = {
                            "model_name": "budgetAggregator",
                            "execution_id": execution_id,
                            "timestamp": datetime.utcnow().isoformat(),
                            "success": True,
                            "processing_time": 0.0,
                            "output_data": fallback_result,
                            "fallback_applied": True
                        }
                        
                        logger.info("✅ Fallback budget aggregation completed successfully")
                        
                    except Exception as fallback_error:
                        logger.error(f"❌ Fallback aggregation also failed: {str(fallback_error)}")
            
            # Mark as completed
            total_time = time.time() - start_time
            await memory_state_manager.update_execution_status(execution_id, "COMPLETED")
            
            # Generate final execution result
            execution_result = {
                "execution_id": execution_id,
                "status": "COMPLETED",
                "total_processing_time": total_time,
                "results": final_results,
                "summary": self._generate_execution_summary(final_results, total_time)
            }
            
            # Log complete execution summary
            io_logger.log_execution_summary(execution_id, execution_result, coordinator_input)
            
            logger.info(f"Pipeline execution {execution_id} completed in {total_time:.2f} seconds")
            logger.info(f"Execution logs stored in: {io_logger.get_execution_path(execution_id)}")
            
            return execution_result
            
        except Exception as e:
            # Mark as failed
            await memory_state_manager.update_execution_status(execution_id, "FAILED")
            logger.error(f"Pipeline execution {execution_id} failed: {str(e)}")
            
            return {
                "execution_id": execution_id,
                "status": "FAILED",
                "error": str(e),
                "partial_results": final_results if 'final_results' in locals() else {}
            }
    
    async def _execute_tier(
        self,
        execution_id: str,
        tier_models: List[str],
        base_input: Dict[str, Any],
        enable_thinking: bool,
        enable_functions: bool,
        max_concurrent: int
    ) -> Dict[str, Dict[str, Any]]:
        """Execute models within a single tier"""
        
        async def process_model(model_name: str) -> Dict[str, Any]:
            """Process a single model within the tier"""
            try:
                start_time = time.time()
                
                logger.info(f"Processing model: {model_name}")
                
                # Get dependency outputs
                dependencies = settings.dependency_map.get(model_name, [])
                dependency_outputs = await memory_state_manager.get_dependency_outputs(
                    execution_id,
                    dependencies
                )
                
                # Process model with execution logging
                result = await model_processor.process_model(
                    model_name=model_name,
                    input_data=base_input,
                    dependency_outputs=dependency_outputs,
                    enable_thinking=enable_thinking,
                    enable_functions=enable_functions,
                    execution_id=execution_id
                )
                
                processing_time = time.time() - start_time
                
                logger.info(f"Model {model_name} completed in {processing_time:.2f} seconds")
                
                return {
                    "output": result,
                    "processing_time": processing_time,
                    "model_name": model_name
                }
                
            except Exception as e:
                logger.error(f"Model {model_name} failed: {str(e)}")
                return {
                    "error": str(e),
                    "model_name": model_name
                }
        
        # Execute tier with concurrency control
        tier_results = await self.tier_executor.execute_tier(
            tier_models,
            process_model,
            max_concurrent
        )
        
        return tier_results
    
    def _generate_execution_summary(
        self,
        results: Dict[str, Any],
        total_time: float
    ) -> Dict[str, Any]:
        """Generate execution summary"""
        
        summary = {
            "total_models_processed": len(results),
            "total_processing_time": total_time,
            "average_model_time": total_time / len(results) if results else 0,
            "models_completed": list(results.keys()),
            "tier_breakdown": {}
        }
        
        # Tier breakdown
        for tier_idx, tier_models in enumerate(settings.execution_tiers):
            completed_in_tier = [model for model in tier_models if model in results]
            summary["tier_breakdown"][f"tier_{tier_idx + 1}"] = {
                "models": tier_models,
                "completed": completed_in_tier,
                "completion_rate": len(completed_in_tier) / len(tier_models) if tier_models else 0
            }
        
        # Extract key metrics
        if "budgetAggregator" in results:
            budget_data = results["budgetAggregator"]
            if isinstance(budget_data, dict) and "budgetAggregatorOutput" in budget_data:
                agg_output = budget_data["budgetAggregatorOutput"]
                if "grandTotal" in agg_output:
                    summary["total_budget"] = agg_output["grandTotal"]
        
        if "cashFlowProjector" in results:
            cash_data = results["cashFlowProjector"]
            if isinstance(cash_data, dict) and "cashFlowModelOutput" in cash_data:
                cash_output = cash_data["cashFlowModelOutput"]
                if "executiveSummary" in cash_output:
                    exec_summary = cash_output["executiveSummary"]
                    summary["peak_funding"] = exec_summary.get("peakFunding")
                    summary["project_irr"] = exec_summary.get("projectIRR")
        
        return summary
    
    async def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get current execution status"""
        return await memory_state_manager.get_execution_progress(execution_id)
    
    async def list_executions(self) -> List[str]:
        """List all active executions"""
        return await memory_state_manager.list_active_executions()
    
    async def get_execution_summary(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution summary"""
        return await memory_state_manager.get_execution_summary(execution_id)
    
    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel a running execution"""
        state = await memory_state_manager.get_execution_state(execution_id)
        if not state:
            return False
        
        if state.status == "RUNNING":
            await memory_state_manager.update_execution_status(execution_id, "CANCELLED")
            logger.info(f"Cancelled execution {execution_id}")
            return True
        
        return False
    
    async def subscribe_to_progress(self, execution_id: str) -> asyncio.Queue:
        """Subscribe to progress updates"""
        return await memory_state_manager.subscribe_to_progress(execution_id)
    
    async def unsubscribe_from_progress(self, execution_id: str, queue: asyncio.Queue):
        """Unsubscribe from progress updates"""
        await memory_state_manager.unsubscribe_from_progress(execution_id, queue)
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information"""
        return {
            "orchestrator": {
                "initialized": self.is_initialized,
                "dependency_graph": {
                    "total_models": len(settings.model_folder_map) - 1,
                    "execution_tiers": len(settings.execution_tiers),
                    "dependency_map": settings.dependency_map
                }
            },
            "memory_stats": memory_state_manager.get_memory_stats(),
            "model_processor": model_processor.get_model_summary(),
            "settings": {
                "max_concurrent_models": settings.pipeline.max_concurrent_models,
                "retry_attempts": settings.pipeline.retry_attempts,
                "execution_timeout": settings.pipeline.execution_timeout,
                "gemini_model": settings.gemini.model_name,
                "thinking_enabled": settings.gemini.thinking_enabled
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        health = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        try:
            # Check state manager
            memory_stats = memory_state_manager.get_memory_stats()
            health["components"]["memory_state_manager"] = {
                "status": "healthy",
                "active_executions": memory_stats["total_executions"]
            }
            
            # Check model processor
            model_summary = model_processor.get_model_summary()
            health["components"]["model_processor"] = {
                "status": "healthy",
                "loaded_models": model_summary["total_models"]
            }
            
            # Check Gemini client
            health["components"]["gemini_client"] = {
                "status": "healthy",
                "model": settings.gemini.model_name,
                "thinking_enabled": settings.gemini.thinking_enabled
            }
            
        except Exception as e:
            health["status"] = "unhealthy"
            health["error"] = str(e)
        
        return health


# Global orchestrator instance
pipeline_orchestrator = PipelineOrchestrator()