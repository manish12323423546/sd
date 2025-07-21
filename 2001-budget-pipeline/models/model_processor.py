"""
Model Processors using Original System Prompts
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path
from dataclasses import dataclass
from models.gemini_client import gemini_client
from models.io_logger import io_logger
from config.settings import settings, get_system_prompt_path, get_sample_input_path, get_sample_output_path

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for a single model"""
    name: str
    system_prompt: str
    sample_input: Dict[str, Any]
    sample_output: Dict[str, Any]
    dependencies: List[str]
    tier: int


class ModelLoader:
    """
    Loads original system prompts and model configurations
    """
    
    def __init__(self):
        self.models_cache: Dict[str, ModelConfig] = {}
    
    def load_system_prompt(self, model_name: str) -> str:
        """Load system prompt from original file"""
        try:
            prompt_path = get_system_prompt_path(model_name)
            
            if not prompt_path.exists():
                raise FileNotFoundError(f"System prompt not found: {prompt_path}")
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                system_prompt = f.read()
            
            logger.info(f"Loaded system prompt for {model_name}")
            return system_prompt.strip()
            
        except Exception as e:
            logger.error(f"Failed to load system prompt for {model_name}: {str(e)}")
            raise
    
    def load_sample_input(self, model_name: str) -> Dict[str, Any]:
        """Load sample input from original file"""
        try:
            input_path = get_sample_input_path(model_name)
            
            if not input_path.exists():
                logger.warning(f"Sample input not found for {model_name}: {input_path}")
                return {}
            
            with open(input_path, 'r', encoding='utf-8') as f:
                sample_input = json.load(f)
            
            logger.info(f"Loaded sample input for {model_name}")
            return sample_input
            
        except Exception as e:
            logger.warning(f"Failed to load sample input for {model_name}: {str(e)}")
            return {}
    
    def load_sample_output(self, model_name: str) -> Dict[str, Any]:
        """Load sample output from original file"""
        try:
            output_path = get_sample_output_path(model_name)
            
            if not output_path.exists():
                logger.warning(f"Sample output not found for {model_name}: {output_path}")
                return {}
            
            with open(output_path, 'r', encoding='utf-8') as f:
                sample_output = json.load(f)
            
            logger.info(f"Loaded sample output for {model_name}")
            return sample_output
            
        except Exception as e:
            logger.warning(f"Failed to load sample output for {model_name}: {str(e)}")
            return {}
    
    def load_model_config(self, model_name: str) -> ModelConfig:
        """Load complete model configuration"""
        if model_name in self.models_cache:
            return self.models_cache[model_name]
        
        try:
            # Load all components
            system_prompt = self.load_system_prompt(model_name)
            sample_input = self.load_sample_input(model_name)
            sample_output = self.load_sample_output(model_name)
            
            # Get dependencies and tier info
            dependencies = settings.dependency_map.get(model_name, [])
            
            # Find tier
            tier = 0
            for tier_idx, tier_models in enumerate(settings.execution_tiers):
                if model_name in tier_models:
                    tier = tier_idx
                    break
            
            # Create config
            config = ModelConfig(
                name=model_name,
                system_prompt=system_prompt,
                sample_input=sample_input,
                sample_output=sample_output,
                dependencies=dependencies,
                tier=tier
            )
            
            # Cache it
            self.models_cache[model_name] = config
            logger.info(f"Loaded complete configuration for {model_name}")
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to load model configuration for {model_name}: {str(e)}")
            raise
    
    def load_all_models(self) -> Dict[str, ModelConfig]:
        """Load all model configurations"""
        all_configs = {}
        
        # Get all model names (excluding coordinator)
        model_names = [name for name in settings.model_folder_map.keys() if name != "coordinator"]
        
        for model_name in model_names:
            try:
                config = self.load_model_config(model_name)
                all_configs[model_name] = config
            except Exception as e:
                logger.error(f"Failed to load {model_name}: {str(e)}")
                # Continue loading other models
                continue
        
        logger.info(f"Loaded {len(all_configs)} model configurations")
        return all_configs


class BudgetModelProcessor:
    """
    Processes individual budget models using original system prompts
    """
    
    def __init__(self):
        self.model_loader = ModelLoader()
        self.model_configs: Dict[str, ModelConfig] = {}
        
    async def initialize(self):
        """Initialize all model configurations"""
        self.model_configs = self.model_loader.load_all_models()
        logger.info(f"Initialized {len(self.model_configs)} model processors")
    
    def get_model_config(self, model_name: str) -> ModelConfig:
        """Get model configuration"""
        if model_name not in self.model_configs:
            # Try to load it dynamically
            self.model_configs[model_name] = self.model_loader.load_model_config(model_name)
        
        return self.model_configs[model_name]
    
    def prepare_model_input(
        self,
        model_name: str,
        base_input: Dict[str, Any],
        dependency_outputs: Dict[str, Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Prepare input data for a specific model including dependencies
        """
        try:
            config = self.get_model_config(model_name)
            
            # Start with base input
            model_input = base_input.copy()
            
            # Add dependency outputs if available
            if dependency_outputs and config.dependencies:
                model_input["dependency_outputs"] = {}
                
                for dependency in config.dependencies:
                    if dependency in dependency_outputs:
                        model_input["dependency_outputs"][dependency] = dependency_outputs[dependency]
                    else:
                        logger.warning(f"Missing dependency output: {dependency} for {model_name}")
            
            # Add model-specific context
            model_input["model_context"] = {
                "model_name": model_name,
                "tier": config.tier,
                "dependencies": config.dependencies,
                "processing_timestamp": asyncio.get_event_loop().time()
            }
            
            logger.debug(f"Prepared input for {model_name} with {len(config.dependencies)} dependencies")
            return model_input
            
        except Exception as e:
            logger.error(f"Failed to prepare input for {model_name}: {str(e)}")
            raise
    
    async def process_model(
        self,
        model_name: str,
        input_data: Dict[str, Any],
        dependency_outputs: Dict[str, Dict[str, Any]] = None,
        enable_thinking: bool = True,
        enable_functions: bool = True,
        execution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a single model using its original system prompt
        
        Args:
            model_name: Name of the model to process
            input_data: Base input data
            dependency_outputs: Outputs from dependency models
            enable_thinking: Enable Gemini thinking mode
            enable_functions: Enable function calling
            execution_id: Execution ID for logging
            
        Returns:
            Model output dictionary
        """
        start_time = asyncio.get_event_loop().time()
        success = False
        error = None
        result = None
        
        try:
            logger.info(f"Processing model: {model_name}")
            
            # Get model configuration
            config = self.get_model_config(model_name)
            
            # Prepare input with dependencies
            prepared_input = self.prepare_model_input(
                model_name,
                input_data,
                dependency_outputs
            )
            
            # Log input if execution_id provided
            if execution_id:
                io_logger.log_model_input(
                    execution_id=execution_id,
                    model_name=model_name,
                    input_data=prepared_input,
                    dependency_data=dependency_outputs
                )
            
            # Process with Gemini 2.5 Pro
            result = await gemini_client.process_model(
                model_name=model_name,
                system_prompt=config.system_prompt,
                input_data=prepared_input,
                enable_thinking=enable_thinking,
                enable_functions=enable_functions
            )
            
            # Validate result
            validated_result = self._validate_model_output(model_name, result)
            success = True
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # Log output if execution_id provided
            if execution_id:
                io_logger.log_model_output(
                    execution_id=execution_id,
                    model_name=model_name,
                    output_data=validated_result,
                    processing_time=processing_time,
                    success=True
                )
            
            logger.info(f"Successfully processed {model_name} in {processing_time:.2f}s")
            return validated_result
            
        except Exception as e:
            error = str(e)
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # Log error if execution_id provided
            if execution_id:
                io_logger.log_model_output(
                    execution_id=execution_id,
                    model_name=model_name,
                    output_data=result or {},
                    processing_time=processing_time,
                    success=False,
                    error=error
                )
            
            logger.error(f"Error processing model {model_name}: {error}")
            raise
    
    def _validate_model_output(self, model_name: str, output: Dict[str, Any]) -> Dict[str, Any]:
        """Validate model output structure"""
        try:
            # Check if output is valid JSON
            if not isinstance(output, dict):
                raise ValueError(f"Output must be a dictionary, got {type(output)}")
            
            # Check for required top-level structure
            expected_root_keys = {
                "laborCostCalculator": "laborCostModelOutput",
                "equipmentPricingEngine": "equipmentModelOutput", 
                "locationCostEstimator": "locationModelOutput",
                "scheduleOptimizer": "scheduleModelOutput",
                "insuranceCalculator": "insuranceModelOutput",
                "postProductionEstimator": "postProductionModelOutput",
                "taxIncentiveAnalyzer": "taxIncentiveModelOutput",
                "budgetAggregator": "budgetAggregatorOutput",
                "cashFlowProjector": "cashFlowModelOutput"
            }
            
            expected_root_key = expected_root_keys.get(model_name)
            if expected_root_key and expected_root_key not in output:
                logger.warning(f"Missing expected root key '{expected_root_key}' in {model_name} output")
            
            # Check for processing log (indicates functions were executed)
            has_processing_log = "processingLog" in output
            if not has_processing_log:
                # Check if it's nested under the model output
                for key, value in output.items():
                    if isinstance(value, dict) and "processingLog" in value:
                        has_processing_log = True
                        break
            
            if not has_processing_log:
                logger.warning(f"No processingLog found in {model_name} output - functions may not have executed")
            
            # Model-specific validation
            self._model_specific_validation(model_name, output)
            
            return output
            
        except Exception as e:
            logger.error(f"Output validation failed for {model_name}: {str(e)}")
            raise
    
    def _model_specific_validation(self, model_name: str, output: Dict[str, Any]):
        """Perform model-specific validation"""
        try:
            # Budget Aggregator specific validation
            if model_name == "budgetAggregator":
                if "budgetAggregatorOutput" in output:
                    budget_data = output["budgetAggregatorOutput"]
                    if "grandTotal" in budget_data and "departmentTotals" in budget_data:
                        dept_sum = sum(budget_data["departmentTotals"].values())
                        grand_total = budget_data["grandTotal"]
                        
                        # Allow for reasonable variance (1% or $10k)
                        variance = abs(dept_sum - grand_total)
                        if variance > max(grand_total * 0.01, 10000):
                            logger.warning(f"Budget totals don't match: Departments={dept_sum}, Grand={grand_total}")
            
            # Cash Flow Projector validation
            elif model_name == "cashFlowProjector":
                if "cashFlowModelOutput" in output:
                    cash_data = output["cashFlowModelOutput"]
                    if "monthlyProjections" in cash_data:
                        # Validate that monthly projections have required structure
                        monthly = cash_data["monthlyProjections"]
                        if not isinstance(monthly, dict):
                            logger.warning("monthlyProjections should be a dictionary")
            
            # Labor Cost Calculator validation
            elif model_name == "laborCostCalculator":
                if "laborCostModelOutput" in output:
                    labor_data = output["laborCostModelOutput"]
                    if "totalLaborCost" in labor_data:
                        total = labor_data["totalLaborCost"]
                        if not isinstance(total, (int, float)) or total <= 0:
                            logger.warning(f"Invalid totalLaborCost: {total}")
            
            logger.debug(f"Model-specific validation passed for {model_name}")
            
        except Exception as e:
            logger.warning(f"Model-specific validation warning for {model_name}: {str(e)}")
            # Don't raise - these are soft validations
    
    async def batch_process_models(
        self,
        model_names: List[str],
        base_input: Dict[str, Any],
        dependency_outputs: Dict[str, Dict[str, Any]] = None,
        max_concurrent: int = 3
    ) -> Dict[str, Dict[str, Any]]:
        """
        Process multiple models concurrently
        
        Args:
            model_names: List of models to process
            base_input: Base input data for all models
            dependency_outputs: Dependency outputs for models that need them
            max_concurrent: Maximum concurrent executions
            
        Returns:
            Dictionary mapping model names to their outputs
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_single(model_name: str) -> tuple:
            async with semaphore:
                try:
                    result = await self.process_model(
                        model_name=model_name,
                        input_data=base_input,
                        dependency_outputs=dependency_outputs
                    )
                    return model_name, result
                except Exception as e:
                    logger.error(f"Batch processing failed for {model_name}: {str(e)}")
                    return model_name, {"error": str(e), "failed": True}
        
        # Execute all models
        tasks = [process_single(name) for name in model_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Compile results
        output = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch processing exception: {str(result)}")
                continue
            
            model_name, model_output = result
            output[model_name] = model_output
        
        return output
    
    def get_model_summary(self) -> Dict[str, Any]:
        """Get summary of all loaded models"""
        summary = {
            "total_models": len(self.model_configs),
            "models_by_tier": {},
            "dependency_counts": {},
            "model_details": {}
        }
        
        for tier_idx in range(len(settings.execution_tiers)):
            summary["models_by_tier"][f"tier_{tier_idx}"] = []
        
        for model_name, config in self.model_configs.items():
            # Group by tier
            tier_key = f"tier_{config.tier}"
            summary["models_by_tier"][tier_key].append(model_name)
            
            # Count dependencies
            summary["dependency_counts"][model_name] = len(config.dependencies)
            
            # Model details
            summary["model_details"][model_name] = {
                "tier": config.tier,
                "dependencies": config.dependencies,
                "has_system_prompt": bool(config.system_prompt),
                "has_sample_input": bool(config.sample_input),
                "has_sample_output": bool(config.sample_output)
            }
        
        return summary


# Global model processor instance
model_processor = BudgetModelProcessor()