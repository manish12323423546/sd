"""
Input/Output Logger for Pipeline Executions
Stores input.json and output.json for each model execution
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from config.settings import settings

logger = logging.getLogger(__name__)


class ExecutionIOLogger:
    """
    Logs input and output data for each model execution
    """
    
    def __init__(self, base_path: str = "executions"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)
    
    def create_execution_folder(self, execution_id: str) -> Path:
        """Create folder structure for an execution"""
        execution_path = self.base_path / execution_id
        execution_path.mkdir(exist_ok=True)
        
        # Create model folders
        model_names = [
            "01-coordinator",
            "02-labor-cost-calculator", 
            "03-equipment-pricing-engine",
            "04-location-cost-estimator",
            "05-schedule-optimizer",
            "06-insurance-calculator", 
            "07-post-production-estimator",
            "08-tax-incentive-analyzer",
            "09-budget-aggregator",
            "10-cash-flow-projector"
        ]
        
        for model_name in model_names:
            model_path = execution_path / model_name
            model_path.mkdir(exist_ok=True)
        
        logger.info(f"Created execution folder structure: {execution_path}")
        return execution_path
    
    def log_model_input(
        self,
        execution_id: str,
        model_name: str,
        input_data: Dict[str, Any],
        dependency_data: Optional[Dict[str, Any]] = None
    ):
        """Log input data for a model"""
        try:
            # Get model folder mapping
            folder_name = settings.model_folder_map.get(model_name, model_name)
            
            execution_path = self.base_path / execution_id
            model_path = execution_path / folder_name
            model_path.mkdir(exist_ok=True, parents=True)
            
            # Prepare complete input data
            complete_input = {
                "model_name": model_name,
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "base_input": input_data,
                "dependencies": dependency_data or {},
                "processing_metadata": {
                    "thinking_enabled": True,
                    "functions_enabled": True,
                    "gemini_model": settings.gemini.model_name
                }
            }
            
            # Save input.json
            input_file = model_path / "input.json"
            with open(input_file, 'w', encoding='utf-8') as f:
                json.dump(complete_input, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Logged input for {model_name}: {input_file}")
            
        except Exception as e:
            logger.error(f"Failed to log input for {model_name}: {str(e)}")
    
    def log_model_output(
        self,
        execution_id: str,
        model_name: str,
        output_data: Dict[str, Any],
        processing_time: float,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Log output data for a model"""
        try:
            # Get model folder mapping
            folder_name = settings.model_folder_map.get(model_name, model_name)
            
            execution_path = self.base_path / execution_id
            model_path = execution_path / folder_name
            model_path.mkdir(exist_ok=True, parents=True)
            
            # Prepare complete output data
            complete_output = {
                "model_name": model_name,
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "success": success,
                "processing_time": processing_time,
                "output_data": output_data,
                "error": error,
                "metadata": {
                    "gemini_model": settings.gemini.model_name,
                    "thinking_enabled": settings.gemini.thinking_enabled,
                    "output_size_chars": len(json.dumps(output_data)) if output_data else 0
                }
            }
            
            # Extract thinking evidence if available (handle both dict and list formats)
            if output_data and "processingLog" in output_data:
                processing_log = output_data["processingLog"]
                
                if isinstance(processing_log, dict):
                    # Original format - dict with items
                    functions_executed = len([k for k, v in processing_log.items() 
                                            if isinstance(v, dict) and v.get("executed")])
                elif isinstance(processing_log, list):
                    # Enhanced parser format - list of entries
                    functions_executed = len([item for item in processing_log 
                                            if isinstance(item, dict) and item.get("status") == "SUCCESS"])
                else:
                    # Unknown format
                    functions_executed = 0
                
                complete_output["thinking_evidence"] = {
                    "has_processing_log": True,
                    "functions_executed": functions_executed,
                    "processing_log_type": type(processing_log).__name__
                }
            
            # Save output.json
            output_file = model_path / "output.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(complete_output, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Logged output for {model_name}: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to log output for {model_name}: {str(e)}")
    
    def log_execution_summary(
        self,
        execution_id: str,
        execution_result: Dict[str, Any],
        coordinator_input: Dict[str, Any]
    ):
        """Log complete execution summary"""
        try:
            execution_path = self.base_path / execution_id
            execution_path.mkdir(exist_ok=True, parents=True)
            
            # Create comprehensive summary
            summary = {
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "coordinator_input": coordinator_input,
                "execution_result": execution_result,
                "performance_metrics": {
                    "total_processing_time": execution_result.get("total_processing_time", 0),
                    "status": execution_result.get("status", "UNKNOWN"),
                    "models_processed": len(execution_result.get("results", {})),
                    "models_failed": len([r for r in execution_result.get("results", {}).values() 
                                        if isinstance(r, dict) and r.get("error")])
                },
                "system_info": {
                    "gemini_model": settings.gemini.model_name,
                    "thinking_enabled": settings.gemini.thinking_enabled,
                    "max_concurrent": settings.pipeline.max_concurrent_models,
                    "pipeline_version": "1.0.0"
                }
            }
            
            # Analyze results
            if execution_result.get("results"):
                model_analysis = {}
                for model_name, result in execution_result["results"].items():
                    if isinstance(result, dict):
                        model_analysis[model_name] = {
                            "has_processing_log": "processingLog" in result,
                            "output_size": len(json.dumps(result)),
                            "has_error": "error" in result or result.get("failed", False),
                            "key_outputs": list(result.keys())[:10]  # First 10 keys
                        }
                
                summary["model_analysis"] = model_analysis
            
            # Save execution summary
            summary_file = execution_path / "execution_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Logged execution summary: {summary_file}")
            
        except Exception as e:
            logger.error(f"Failed to log execution summary: {str(e)}")
    
    def get_execution_path(self, execution_id: str) -> Path:
        """Get path to execution folder"""
        return self.base_path / execution_id
    
    def list_executions(self) -> list:
        """List all logged executions"""
        if not self.base_path.exists():
            return []
        
        return [d.name for d in self.base_path.iterdir() if d.is_dir()]
    
    def get_execution_files(self, execution_id: str) -> Dict[str, list]:
        """Get all files for an execution"""
        execution_path = self.base_path / execution_id
        if not execution_path.exists():
            return {}
        
        files_by_model = {}
        for model_folder in execution_path.iterdir():
            if model_folder.is_dir():
                model_files = []
                for file in model_folder.iterdir():
                    if file.is_file():
                        model_files.append(file.name)
                files_by_model[model_folder.name] = model_files
        
        return files_by_model


# Global IO logger instance
io_logger = ExecutionIOLogger()