"""
2001 Scheduling Pipeline Configuration Settings
"""

import os
from typing import Dict, List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class GeminiSettings(BaseSettings):
    """Gemini 2.5 Pro API Configuration"""
    api_key: str = Field(..., env="GEMINI_API_KEY")
    model_name: str = "gemini-2.5-pro"
    thinking_enabled: bool = True
    max_retries: int = 3
    timeout_seconds: int = 300
    temperature: float = 0.1
    max_tokens: int = 8192
    
    class Config:
        env_prefix = "GEMINI_"


class MemorySettings(BaseSettings):
    """In-Memory State Management Configuration"""
    max_executions: int = 100
    cleanup_interval: int = 3600  # seconds
    execution_ttl: int = 86400  # 24 hours
    
    class Config:
        env_prefix = "MEMORY_"


class PipelineSettings(BaseSettings):
    """Pipeline Execution Configuration"""
    max_concurrent_models: int = 2  # Reduced for scheduling pipeline
    retry_attempts: int = 2
    progress_update_interval: int = 5  # seconds
    enable_caching: bool = True
    cache_ttl: int = 3600  # seconds
    execution_timeout: int = 2400  # 40 minutes (longer for complex scheduling)
    
    class Config:
        env_prefix = "PIPELINE_"


class APISettings(BaseSettings):
    """API Server Configuration"""
    host: str = "0.0.0.0"
    port: int = 8001  # Different port from budget pipeline
    debug: bool = False
    enable_cors: bool = True
    log_level: str = "INFO"
    
    class Config:
        env_prefix = "API_"


class Settings:
    """Main Application Settings"""
    
    def __init__(self):
        self.gemini = GeminiSettings()
        self.memory = MemorySettings()
        self.pipeline = PipelineSettings()
        self.api = APISettings()
        
        # Model Configuration
        self.models_config_path = Path(__file__).parent / "models_config.yaml"
        self.system_prompts_path = Path(__file__).parent.parent.parent / "2001-scheduling-system"
        
        # Dependency Graph - Scheduling-specific flow
        self.dependency_map = {
            "coordinatorAgent": [],                                    # Processes raw script input first
            "complianceConstraintsAgent": ["coordinatorAgent"],        # Uses coordinator data packets
            "resourceLogisticsAgent": ["coordinatorAgent"],           # Uses coordinator data packets  
            "optimizationScenarioAgent": [                            # Uses all previous agents
                "coordinatorAgent", 
                "complianceConstraintsAgent", 
                "resourceLogisticsAgent"
            ]
        }
        
        # Execution Tiers - Scheduling pipeline flow
        self.execution_tiers = [
            ["coordinatorAgent"],                                      # Tier 1 - Process script input
            ["complianceConstraintsAgent", "resourceLogisticsAgent"], # Tier 2 - Parallel constraint/resource analysis
            ["optimizationScenarioAgent"]                            # Tier 3 - Final optimization with all data
        ]
        
        # Model Mappings - Scheduling agents
        self.model_folder_map = {
            "coordinatorAgent": "01-coordinator-agent",
            "complianceConstraintsAgent": "02-compliance-constraints-agent",
            "resourceLogisticsAgent": "03-resource-logistics-agent", 
            "optimizationScenarioAgent": "04-optimization-scenario-agent"
        }


# Global settings instance
settings = Settings()


def get_system_prompt_path(model_name: str) -> Path:
    """Get the path to a model's system prompt file"""
    folder_name = settings.model_folder_map.get(model_name)
    if not folder_name:
        raise ValueError(f"Unknown model: {model_name}")
    
    return settings.system_prompts_path / folder_name / "system.prompt.txt"


def get_sample_input_path(model_name: str) -> Path:
    """Get the path to a model's sample input file"""
    folder_name = settings.model_folder_map.get(model_name)
    if not folder_name:
        raise ValueError(f"Unknown model: {model_name}")
    
    return settings.system_prompts_path / folder_name / "input.json"


def get_sample_output_path(model_name: str) -> Path:
    """Get the path to a model's sample output file"""
    folder_name = settings.model_folder_map.get(model_name)
    if not folder_name:
        raise ValueError(f"Unknown model: {model_name}")
    
    return settings.system_prompts_path / folder_name / "output.json"