"""
2001 Budget Pipeline Configuration Settings
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
    max_concurrent_models: int = 3
    retry_attempts: int = 2
    progress_update_interval: int = 5  # seconds
    enable_caching: bool = True
    cache_ttl: int = 3600  # seconds
    execution_timeout: int = 1800  # 30 minutes
    
    class Config:
        env_prefix = "PIPELINE_"


class APISettings(BaseSettings):
    """API Server Configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
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
        self.system_prompts_path = Path(__file__).parent.parent.parent / "2001-budget-system"
        
        # Dependency Graph - CORRECTED: All models depend on coordinator
        self.dependency_map = {
            "coordinator": [],                                      # Coordinator processes raw input first
            "scheduleOptimizer": ["coordinator"],                  # Uses coordinator data packets
            "postProductionEstimator": ["coordinator"],            # Uses coordinator data packets
            "laborCostCalculator": ["coordinator", "scheduleOptimizer"],
            "equipmentPricingEngine": ["coordinator", "scheduleOptimizer"], 
            "locationCostEstimator": ["coordinator", "scheduleOptimizer"],
            "insuranceCalculator": ["coordinator", "laborCostCalculator", "equipmentPricingEngine"],
            "budgetAggregator": [
                "coordinator",
                "laborCostCalculator", 
                "equipmentPricingEngine", 
                "locationCostEstimator", 
                "insuranceCalculator", 
                "postProductionEstimator"
            ],
            "taxIncentiveAnalyzer": ["coordinator", "budgetAggregator"],
            "cashFlowProjector": ["coordinator", "budgetAggregator", "scheduleOptimizer"]
        }
        
        # Execution Tiers - CORRECTED: Coordinator processes first
        self.execution_tiers = [
            ["coordinator"],                                       # Tier 0 - COORDINATOR FIRST - processes raw input
            ["scheduleOptimizer", "postProductionEstimator"],      # Tier 1 - Use coordinator data packets
            ["laborCostCalculator", "equipmentPricingEngine", "locationCostEstimator"],  # Tier 2 - Use coordinator + Tier 1
            ["insuranceCalculator"],                               # Tier 3 - Depends on Labor + Equipment
            ["budgetAggregator"],                                 # Tier 4 - Depends on all previous
            ["taxIncentiveAnalyzer"],                             # Tier 5 - Depends on Budget Aggregator
            ["cashFlowProjector"]                                 # Tier 6 - Depends on Budget + Schedule
        ]
        
        # Model Mappings
        self.model_folder_map = {
            "coordinator": "01-coordinator",
            "laborCostCalculator": "02-labor-cost-calculator",
            "equipmentPricingEngine": "03-equipment-pricing-engine", 
            "locationCostEstimator": "04-location-cost-estimator",
            "scheduleOptimizer": "05-schedule-optimizer",
            "insuranceCalculator": "06-insurance-calculator",
            "postProductionEstimator": "07-post-production-estimator",
            "taxIncentiveAnalyzer": "08-tax-incentive-analyzer",
            "budgetAggregator": "09-budget-aggregator",
            "cashFlowProjector": "10-cash-flow-projector"
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