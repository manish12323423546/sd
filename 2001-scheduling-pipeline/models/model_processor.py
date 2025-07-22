"""
Model Processor for 2001 Scheduling Pipeline
Handles loading and processing of scheduling agent models
"""

import asyncio
import logging
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime

from models.gemini_client import gemini_client
from config.settings import settings, get_system_prompt_path, get_sample_input_path

logger = logging.getLogger(__name__)


class SchedulingModelProcessor:
    """
    Processes scheduling agent models with Gemini 2.5 Pro
    """
    
    def __init__(self):
        self.loaded_prompts: Dict[str, str] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}
        self.is_initialized = False
        self.processing_stats = {
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "total_processing_time": 0.0
        }
    
    async def initialize(self):
        """Initialize the model processor"""
        if self.is_initialized:
            return
        
        try:
            # Initialize Gemini client
            await gemini_client.initialize()
            
            # Load all system prompts
            await self._load_system_prompts()
            
            # Validate model configuration
            self._validate_model_configuration()
            
            self.is_initialized = True
            logger.info(f"Scheduling model processor initialized with {len(self.loaded_prompts)} agents")
            
        except Exception as e:
            logger.error(f"Failed to initialize model processor: {str(e)}")
            raise
    
    async def _load_system_prompts(self):
        """Load system prompts for all scheduling agents"""
        for model_name in settings.model_folder_map.keys():
            try:
                prompt_path = get_system_prompt_path(model_name)
                
                if prompt_path.exists():
                    with open(prompt_path, 'r', encoding='utf-8') as f:
                        prompt_content = f.read().strip()
                    
                    self.loaded_prompts[model_name] = prompt_content
                    
                    # Load sample input for validation
                    sample_input_path = get_sample_input_path(model_name)
                    sample_input = {}
                    if sample_input_path.exists():
                        with open(sample_input_path, 'r', encoding='utf-8') as f:
                            sample_input = json.load(f)
                    
                    self.model_metadata[model_name] = {
                        "prompt_length": len(prompt_content),
                        "prompt_loaded": True,
                        "sample_input_available": sample_input_path.exists(),
                        "agent_type": self._get_agent_type(model_name),
                        "dependencies": settings.dependency_map.get(model_name, [])
                    }
                    
                    logger.info(f"Loaded prompt for {model_name} ({len(prompt_content)} chars)")
                    
                else:
                    logger.warning(f"System prompt not found for {model_name}: {prompt_path}")
                    self.model_metadata[model_name] = {
                        "prompt_loaded": False,
                        "error": f"Prompt file not found: {prompt_path}"
                    }
                    
            except Exception as e:
                logger.error(f"Failed to load prompt for {model_name}: {str(e)}")
                self.model_metadata[model_name] = {
                    "prompt_loaded": False,
                    "error": str(e)
                }
    
    def _get_agent_type(self, model_name: str) -> str:
        """Get agent type description"""
        agent_types = {
            "coordinatorAgent": "Script analysis and data distribution",
            "complianceConstraintsAgent": "Union compliance and scheduling constraints",
            "resourceLogisticsAgent": "Cast, crew, and equipment resource management",
            "optimizationScenarioAgent": "Mathematical schedule optimization"
        }
        return agent_types.get(model_name, "Unknown agent type")
    
    def _validate_model_configuration(self):
        """Validate model configuration"""
        missing_prompts = []
        for model_name in settings.model_folder_map.keys():
            if not self.loaded_prompts.get(model_name):
                missing_prompts.append(model_name)
        
        if missing_prompts:
            raise ValueError(f"Missing system prompts for models: {missing_prompts}")
        
        # Validate dependencies
        for model_name, dependencies in settings.dependency_map.items():
            for dep in dependencies:
                if dep not in settings.model_folder_map:
                    raise ValueError(f"Model {model_name} depends on unknown model: {dep}")
        
        logger.info("Model configuration validation passed")
    
    async def process_model(
        self,
        model_name: str,
        input_data: Dict[str, Any],
        dependency_outputs: Optional[Dict[str, Any]] = None,
        enable_thinking: bool = True,
        enable_functions: bool = True,
        execution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a scheduling agent model
        
        Args:
            model_name: Name of the model to process
            input_data: Base input data
            dependency_outputs: Outputs from dependency models
            enable_thinking: Enable Gemini thinking mode
            enable_functions: Enable function calling (not used in scheduling)
            execution_id: Execution ID for logging
            
        Returns:
            Model output data
        """
        if not self.is_initialized:
            await self.initialize()
        
        if model_name not in self.loaded_prompts:
            raise ValueError(f"Model {model_name} not loaded")
        
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Processing scheduling model: {model_name} (execution: {execution_id or 'none'})")
            
            # Prepare model input (this determines what each agent receives)
            model_input = self._prepare_model_input(
                model_name, 
                input_data, 
                dependency_outputs
            )
            
            # Get system prompt
            system_prompt = self.loaded_prompts[model_name]
            
            logger.info(f"Sending {len(json.dumps(model_input))} chars of input to {model_name}")
            
            # Generate response
            response = await gemini_client.generate_scheduling_response(
                system_prompt=system_prompt,
                user_input=json.dumps(model_input, indent=2),
                enable_thinking=enable_thinking,
                model_name=model_name
            )
            
            # Process response
            result = self._process_model_response(model_name, response, execution_id)
            
            # Update stats
            self.processing_stats["total_processed"] += 1
            if result.get("success", False):
                self.processing_stats["successful"] += 1
            else:
                self.processing_stats["failed"] += 1
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            self.processing_stats["total_processing_time"] += processing_time
            
            logger.info(f"Completed processing {model_name} in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            self.processing_stats["total_processed"] += 1
            self.processing_stats["failed"] += 1
            
            logger.error(f"Failed to process model {model_name}: {str(e)}")
            
            return {
                "model_name": model_name,
                "execution_id": execution_id,
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
                "processing_time": (datetime.utcnow() - start_time).total_seconds()
            }
    
    def _prepare_model_input(
        self,
        model_name: str,
        input_data: Dict[str, Any],
        dependency_outputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Prepare input for a specific scheduling agent"""
        
        if model_name == "coordinatorAgent":
            # Coordinator receives the actual coordinator input.json structure
            logger.info(f"Coordinator receiving input with keys: {list(input_data.keys())}")
            return input_data
        
        elif model_name == "complianceConstraintsAgent":
            # Compliance agent receives coordinator data packets
            coordinator_output = dependency_outputs.get("coordinatorAgent", {}) if dependency_outputs else {}
            return self._extract_compliance_input(coordinator_output)
        
        elif model_name == "resourceLogisticsAgent":
            # Resource agent receives coordinator data packets
            coordinator_output = dependency_outputs.get("coordinatorAgent", {}) if dependency_outputs else {}
            return self._extract_resource_input(coordinator_output)
        
        elif model_name == "optimizationScenarioAgent":
            # Optimization agent receives all previous outputs
            return self._prepare_optimization_input(dependency_outputs or {})
        
        else:
            logger.warning(f"Unknown model {model_name}, using base input")
            return input_data
    
    def _extract_compliance_input(self, coordinator_output: Dict[str, Any]) -> Dict[str, Any]:
        """Extract compliance-specific input from coordinator output"""
        if "coordinatorOutput" in coordinator_output:
            coord_data = coordinator_output["coordinatorOutput"]
            
            # Get the specific data packet for compliance agent
            agent_packets = coord_data.get("agentDataPackets", {})
            compliance_packet = agent_packets.get("complianceConstraintsAgent", {})
            
            # Extract the request data from the coordinator's data packet
            request_data = compliance_packet.get("requestData", {})
            
            compliance_input = {
                "complianceConstraintsInput": {
                    "requestId": coord_data.get("projectId", ""),
                    "timestamp": datetime.utcnow().isoformat(),
                    "sourceAgent": "coordinatorAgent",
                    "unionJurisdiction": request_data.get("unionJurisdiction", ""),
                    "primaryLocation": request_data.get("primaryLocation", ""),
                    "scheduleConstraints": request_data.get("scheduleConstraints", {}),
                    "castComplianceDetails": request_data.get("castComplianceDetails", []),
                    "sceneComplianceFlags": request_data.get("sceneComplianceFlags", []),
                    "specialConsiderations": request_data.get("specialConsiderations", []),
                    "projectModel": coord_data.get("comprehensiveProjectModel", {}),
                    "coordinationProtocol": coord_data.get("coordinationProtocol", {})
                }
            }
            return compliance_input
        
        return {"complianceConstraintsInput": {}}
    
    def _extract_resource_input(self, coordinator_output: Dict[str, Any]) -> Dict[str, Any]:
        """Extract resource-specific input from coordinator output"""
        if "coordinatorOutput" in coordinator_output:
            coord_data = coordinator_output["coordinatorOutput"]
            
            # Get the specific data packet for resource logistics agent
            agent_packets = coord_data.get("agentDataPackets", {})
            resource_packet = agent_packets.get("resourceLogisticsAgent", {})
            
            # Extract the request data from the coordinator's data packet
            request_data = resource_packet.get("requestData", {})
            
            resource_input = {
                "resourceLogisticsInput": {
                    "requestId": coord_data.get("projectId", ""),
                    "timestamp": datetime.utcnow().isoformat(),
                    "sourceAgent": "coordinatorAgent",
                    "castAvailability": request_data.get("castAvailability", []),
                    "locationLogistics": request_data.get("locationLogistics", []),
                    "departmentResourceNeeds": request_data.get("departmentResourceNeeds", {}),
                    "projectModel": coord_data.get("comprehensiveProjectModel", {}),
                    "coordinationProtocol": coord_data.get("coordinationProtocol", {})
                }
            }
            return resource_input
        
        return {"resourceLogisticsInput": {}}
    
    def _prepare_optimization_input(self, dependency_outputs: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare optimization input from all dependency outputs"""
        optimization_input = {
            "optimizationScenarioInput": {
                "requestId": f"req_optimization_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                "timestamp": datetime.utcnow().isoformat(),
                "sourceAgent": "coordinatorAgent",
                "dependencies": ["coordinatorAgent", "complianceConstraintsAgent", "resourceLogisticsAgent"]
            }
        }
        
        # Extract project model from coordinator
        if "coordinatorAgent" in dependency_outputs:
            coord_output = dependency_outputs["coordinatorAgent"]
            if "coordinatorOutput" in coord_output:
                optimization_input["optimizationScenarioInput"]["projectModel"] = coord_output["coordinatorOutput"]
        
        # Extract constraint set from compliance agent
        if "complianceConstraintsAgent" in dependency_outputs:
            compliance_output = dependency_outputs["complianceConstraintsAgent"]
            if "complianceConstraintsOutput" in compliance_output:
                optimization_input["optimizationScenarioInput"]["constraintSet"] = compliance_output["complianceConstraintsOutput"]
        
        # Extract resource availability from logistics agent
        if "resourceLogisticsAgent" in dependency_outputs:
            resource_output = dependency_outputs["resourceLogisticsAgent"]
            if "resourceLogisticsOutput" in resource_output:
                optimization_input["optimizationScenarioInput"]["resourceAvailability"] = resource_output["resourceLogisticsOutput"]
        
        # Add optimization goals
        optimization_input["optimizationScenarioInput"]["optimizationGoals"] = {
            "primary": "minimize_total_days",
            "secondary": "minimize_company_moves",
            "tertiary": "balance_workload",
            "quaternary": "minimize_costs",
            "weightings": {
                "schedule_efficiency": 0.40,
                "cost_efficiency": 0.25,
                "resource_utilization": 0.20,
                "risk_minimization": 0.15
            }
        }
        
        return optimization_input
    
    def _process_model_response(
        self,
        model_name: str,
        response: Dict[str, Any],
        execution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process model response"""
        
        if not response.get("success", False):
            return {
                "model_name": model_name,
                "execution_id": execution_id,
                "success": False,
                "error": response.get("error", "Unknown error"),
                "timestamp": response.get("timestamp", datetime.utcnow().isoformat()),
                "processing_time": response.get("processing_time", 0)
            }
        
        # Extract data
        model_data = response.get("data", {})
        
        # Validate expected output structure
        expected_keys = {
            "coordinatorAgent": "coordinatorOutput",
            "complianceConstraintsAgent": "complianceConstraintsOutput", 
            "resourceLogisticsAgent": "resourceLogisticsOutput",
            "optimizationScenarioAgent": "optimizationScenarioOutput"
        }
        
        expected_key = expected_keys.get(model_name)
        if expected_key and expected_key not in model_data:
            logger.warning(f"Missing expected output key '{expected_key}' for {model_name}")
        
        return {
            "model_name": model_name,
            "execution_id": execution_id,
            "success": True,
            "timestamp": response.get("timestamp", datetime.utcnow().isoformat()),
            "processing_time": response.get("processing_time", 0),
            **model_data  # Spread the actual model output
        }
    
    def get_model_summary(self) -> Dict[str, Any]:
        """Get model processor summary"""
        return {
            "total_models": len(settings.model_folder_map),
            "loaded_prompts": len(self.loaded_prompts),
            "is_initialized": self.is_initialized,
            "processing_stats": self.processing_stats.copy(),
            "models": {
                name: {
                    "loaded": name in self.loaded_prompts,
                    "metadata": self.model_metadata.get(name, {})
                }
                for name in settings.model_folder_map.keys()
            },
            "average_processing_time": (
                self.processing_stats["total_processing_time"] / 
                max(self.processing_stats["total_processed"], 1)
            )
        }
    
    def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model"""
        if model_name not in settings.model_folder_map:
            return None
        
        return {
            "model_name": model_name,
            "folder": settings.model_folder_map[model_name],
            "dependencies": settings.dependency_map.get(model_name, []),
            "prompt_loaded": model_name in self.loaded_prompts,
            "metadata": self.model_metadata.get(model_name, {}),
            "agent_type": self._get_agent_type(model_name)
        }


# Global model processor instance
model_processor = SchedulingModelProcessor()