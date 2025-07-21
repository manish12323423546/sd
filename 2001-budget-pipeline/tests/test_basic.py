"""
Basic tests for the 2001 Budget Pipeline
"""

import pytest
import asyncio
import json
from pathlib import Path
from pipeline.orchestrator import pipeline_orchestrator
from models.model_processor import model_processor
from config.settings import settings


@pytest.fixture
def sample_coordinator_input():
    """Load sample coordinator input for testing"""
    # Try to load from the actual coordinator input
    try:
        coordinator_path = settings.system_prompts_path / "01-coordinator" / "input.json"
        if coordinator_path.exists():
            with open(coordinator_path, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    
    # Fallback minimal test input
    return {
        "coordinatorInput": {
            "projectId": "test_project",
            "timestamp": "2024-07-21T10:00:00Z",
            "scriptData": {
                "title": "Test Film",
                "totalPages": 100,
                "totalScenes": 50
            },
            "scenes": [
                {
                    "sceneId": 1,
                    "sceneName": "INT. TEST SCENE",
                    "pages": 2.0,
                    "location": "STUDIO",
                    "cast": ["ACTOR1", "ACTOR2"],
                    "extras": 10
                }
            ]
        }
    }


@pytest.mark.asyncio
async def test_pipeline_initialization():
    """Test that pipeline components initialize correctly"""
    await pipeline_orchestrator.initialize()
    
    # Check that components are initialized
    assert pipeline_orchestrator.is_initialized
    
    # Check model processor
    model_summary = model_processor.get_model_summary()
    assert model_summary["total_models"] > 0
    
    # Check system info
    system_info = pipeline_orchestrator.get_system_info()
    assert "orchestrator" in system_info
    assert "memory_stats" in system_info


@pytest.mark.asyncio
async def test_model_loading():
    """Test that models load their system prompts correctly"""
    await model_processor.initialize()
    
    # Test loading a specific model
    config = model_processor.get_model_config("laborCostCalculator")
    
    assert config.name == "laborCostCalculator"
    assert len(config.system_prompt) > 100  # Should have substantial prompt
    assert "LABOR COST CALCULATOR" in config.system_prompt
    assert len(config.dependencies) >= 0  # May have dependencies


def test_dependency_graph():
    """Test dependency graph validation"""
    from pipeline.dependency_manager import DependencyGraph
    
    graph = DependencyGraph()
    
    # Check that graph initializes without cycles
    assert graph.dependency_map is not None
    assert graph.execution_tiers is not None
    
    # Check tier structure
    assert len(graph.execution_tiers) == 6  # Should have 6 tiers
    
    # Verify specific dependencies
    assert "scheduleOptimizer" in graph.dependency_map
    assert graph.dependency_map["scheduleOptimizer"] == []  # No dependencies
    
    assert "laborCostCalculator" in graph.dependency_map
    assert "scheduleOptimizer" in graph.dependency_map["laborCostCalculator"]
    
    assert "budgetAggregator" in graph.dependency_map
    assert len(graph.dependency_map["budgetAggregator"]) == 5  # Should depend on 5 models


@pytest.mark.asyncio
async def test_health_check():
    """Test system health check"""
    await pipeline_orchestrator.initialize()
    
    health = await pipeline_orchestrator.health_check()
    
    assert health["status"] == "healthy"
    assert "components" in health
    assert "timestamp" in health


def test_configuration():
    """Test configuration loading"""
    assert settings.gemini.model_name == "gemini-2.5-pro"
    assert settings.gemini.thinking_enabled == True
    assert settings.pipeline.max_concurrent_models > 0
    
    # Check model folder mapping
    assert "laborCostCalculator" in settings.model_folder_map
    assert settings.model_folder_map["laborCostCalculator"] == "02-labor-cost-calculator"


@pytest.mark.asyncio
async def test_memory_state_manager():
    """Test in-memory state management"""
    from pipeline.memory_state_manager import memory_state_manager
    
    await memory_state_manager.initialize()
    
    # Test creating execution
    test_input = {"test": "data"}
    execution_state = await memory_state_manager.create_execution(test_input)
    
    assert execution_state.execution_id is not None
    assert execution_state.status == "INITIALIZED"
    assert execution_state.initial_input == test_input
    
    # Test retrieving execution
    retrieved_state = await memory_state_manager.get_execution_state(execution_state.execution_id)
    assert retrieved_state is not None
    assert retrieved_state.execution_id == execution_state.execution_id
    
    # Cleanup
    await memory_state_manager.delete_execution(execution_state.execution_id)


def test_system_prompts_exist():
    """Test that all required system prompts exist"""
    required_models = [
        "laborCostCalculator",
        "equipmentPricingEngine", 
        "locationCostEstimator",
        "scheduleOptimizer",
        "insuranceCalculator",
        "postProductionEstimator",
        "taxIncentiveAnalyzer",
        "budgetAggregator",
        "cashFlowProjector"
    ]
    
    for model_name in required_models:
        try:
            from config.settings import get_system_prompt_path
            prompt_path = get_system_prompt_path(model_name)
            assert prompt_path.exists(), f"System prompt missing for {model_name}"
            
            # Check that prompt has content
            with open(prompt_path, 'r') as f:
                content = f.read()
            assert len(content) > 100, f"System prompt too short for {model_name}"
            
        except Exception as e:
            pytest.fail(f"Failed to load system prompt for {model_name}: {str(e)}")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])