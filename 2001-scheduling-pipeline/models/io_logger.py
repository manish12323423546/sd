"""
Input/Output Logging for 2001 Scheduling Pipeline
Handles execution logging, file I/O, and result storage
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from config.settings import settings

logger = logging.getLogger(__name__)


class SchedulingIOLogger:
    """
    Handles input/output logging for scheduling pipeline executions
    """
    
    def __init__(self):
        self.executions_dir = Path("executions")
        self.executions_dir.mkdir(exist_ok=True)
    
    def create_execution_folder(self, execution_id: str) -> Path:
        """Create folder structure for an execution"""
        execution_path = self.executions_dir / execution_id
        execution_path.mkdir(exist_ok=True)
        
        # Create folders for each scheduling agent
        for model_name, folder_name in settings.model_folder_map.items():
            model_path = execution_path / folder_name
            model_path.mkdir(exist_ok=True)
        
        logger.info(f"Created execution folder: {execution_path}")
        return execution_path
    
    def get_execution_path(self, execution_id: str) -> Path:
        """Get the path for an execution"""
        return self.executions_dir / execution_id
    
    def log_model_input(
        self,
        execution_id: str,
        model_name: str,
        input_data: Dict[str, Any]
    ):
        """Log model input data"""
        try:
            folder_name = settings.model_folder_map.get(model_name)
            if not folder_name:
                logger.warning(f"Unknown model {model_name}, cannot log input")
                return
            
            execution_path = self.get_execution_path(execution_id)
            model_path = execution_path / folder_name
            input_file = model_path / "input.json"
            
            with open(input_file, 'w', encoding='utf-8') as f:
                json.dump(input_data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Logged input for {model_name}: {input_file}")
            
        except Exception as e:
            logger.error(f"Failed to log input for {model_name}: {str(e)}")
    
    def log_model_output(
        self,
        execution_id: str,
        model_name: str,
        output_data: Dict[str, Any]
    ):
        """Log model output data"""
        try:
            folder_name = settings.model_folder_map.get(model_name)
            if not folder_name:
                logger.warning(f"Unknown model {model_name}, cannot log output")
                return
            
            execution_path = self.get_execution_path(execution_id)
            model_path = execution_path / folder_name
            output_file = model_path / "output.json"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Logged output for {model_name}: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to log output for {model_name}: {str(e)}")
    
    def log_execution_summary(
        self,
        execution_id: str,
        execution_result: Dict[str, Any],
        original_input: Dict[str, Any]
    ):
        """Log complete execution summary"""
        try:
            execution_path = self.get_execution_path(execution_id)
            
            # Create summary with metadata
            summary = {
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "pipeline_type": "2001_scheduling_pipeline",
                "status": execution_result.get("status"),
                "total_processing_time": execution_result.get("total_processing_time"),
                "agents_processed": list(execution_result.get("results", {}).keys()),
                "summary": execution_result.get("summary", {}),
                "original_input": original_input,
                "final_results": execution_result.get("results", {})
            }
            
            # Save execution summary
            summary_file = execution_path / "execution_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            # Save original script input
            script_file = execution_path / "script_input.json"
            with open(script_file, 'w', encoding='utf-8') as f:
                json.dump(original_input, f, indent=2, ensure_ascii=False)
            
            # Log individual model outputs
            for model_name, output_data in execution_result.get("results", {}).items():
                self.log_model_output(execution_id, model_name, output_data)
                
                # Log model input if available
                if hasattr(self, '_cached_inputs') and execution_id in self._cached_inputs:
                    model_input = self._cached_inputs[execution_id].get(model_name)
                    if model_input:
                        self.log_model_input(execution_id, model_name, model_input)
            
            logger.info(f"Logged execution summary: {summary_file}")
            
        except Exception as e:
            logger.error(f"Failed to log execution summary for {execution_id}: {str(e)}")
    
    def cache_model_input(
        self,
        execution_id: str,
        model_name: str,
        input_data: Dict[str, Any]
    ):
        """Cache model input for later logging"""
        if not hasattr(self, '_cached_inputs'):
            self._cached_inputs = {}
        
        if execution_id not in self._cached_inputs:
            self._cached_inputs[execution_id] = {}
        
        self._cached_inputs[execution_id][model_name] = input_data
    
    def load_execution_results(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Load results from a previous execution"""
        try:
            execution_path = self.get_execution_path(execution_id)
            summary_file = execution_path / "execution_summary.json"
            
            if not summary_file.exists():
                return None
            
            with open(summary_file, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"Failed to load execution results for {execution_id}: {str(e)}")
            return None
    
    def load_model_output(
        self,
        execution_id: str,
        model_name: str
    ) -> Optional[Dict[str, Any]]:
        """Load output from a specific model execution"""
        try:
            folder_name = settings.model_folder_map.get(model_name)
            if not folder_name:
                return None
            
            execution_path = self.get_execution_path(execution_id)
            model_path = execution_path / folder_name
            output_file = model_path / "output.json"
            
            if not output_file.exists():
                return None
            
            with open(output_file, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"Failed to load model output for {model_name}: {str(e)}")
            return None
    
    def list_executions(self) -> List[Dict[str, Any]]:
        """List all available executions"""
        executions = []
        
        try:
            for execution_dir in self.executions_dir.iterdir():
                if execution_dir.is_dir():
                    summary_file = execution_dir / "execution_summary.json"
                    
                    if summary_file.exists():
                        try:
                            with open(summary_file, 'r', encoding='utf-8') as f:
                                summary = json.load(f)
                            
                            executions.append({
                                "execution_id": execution_dir.name,
                                "timestamp": summary.get("timestamp"),
                                "status": summary.get("status"),
                                "processing_time": summary.get("total_processing_time"),
                                "agents_processed": len(summary.get("agents_processed", []))
                            })
                            
                        except Exception as e:
                            logger.warning(f"Failed to read summary for {execution_dir.name}: {str(e)}")
                            executions.append({
                                "execution_id": execution_dir.name,
                                "status": "unknown",
                                "error": "Failed to read summary"
                            })
            
            # Sort by timestamp (newest first)
            executions.sort(
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )
            
        except Exception as e:
            logger.error(f"Failed to list executions: {str(e)}")
        
        return executions
    
    def cleanup_old_executions(self, keep_count: int = 50):
        """Clean up old execution logs"""
        try:
            executions = self.list_executions()
            
            # Keep only the most recent executions
            if len(executions) > keep_count:
                to_remove = executions[keep_count:]
                
                for execution in to_remove:
                    execution_path = self.get_execution_path(execution["execution_id"])
                    if execution_path.exists():
                        # Remove directory and all contents
                        import shutil
                        shutil.rmtree(execution_path)
                        logger.info(f"Removed old execution: {execution['execution_id']}")
                
                logger.info(f"Cleaned up {len(to_remove)} old executions")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old executions: {str(e)}")
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            total_size = 0
            file_count = 0
            execution_count = 0
            
            for execution_dir in self.executions_dir.iterdir():
                if execution_dir.is_dir():
                    execution_count += 1
                    
                    for file_path in execution_dir.rglob("*"):
                        if file_path.is_file():
                            total_size += file_path.stat().st_size
                            file_count += 1
            
            return {
                "total_executions": execution_count,
                "total_files": file_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "executions_directory": str(self.executions_dir)
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage stats: {str(e)}")
            return {
                "error": str(e)
            }


# Global IO logger instance
io_logger = SchedulingIOLogger()