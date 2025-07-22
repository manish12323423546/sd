"""
Test script for 2001 Scheduling Pipeline
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from pipeline.orchestrator import scheduling_pipeline_orchestrator
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def test_scheduling_pipeline():
    """Test the scheduling pipeline with coordinator input"""
    
    try:
        logger.info("🚀 Starting 2001 Scheduling Pipeline Test")
        
        # Load coordinator input
        coordinator_input_path = Path("../2001-scheduling-system/01-coordinator-agent/input.json")
        
        if not coordinator_input_path.exists():
            logger.error(f"Coordinator input file not found: {coordinator_input_path}")
            return
        
        with open(coordinator_input_path, 'r', encoding='utf-8') as f:
            coordinator_input = json.load(f)
        
        logger.info(f"✅ Loaded coordinator input from {coordinator_input_path}")
        logger.info(f"Input contains {len(coordinator_input.get('coordinatorInput', {}).get('scenes', []))} scenes")
        
        # Initialize and run pipeline
        logger.info("🔧 Initializing scheduling pipeline orchestrator...")
        await scheduling_pipeline_orchestrator.initialize()
        
        logger.info("🎬 Executing scheduling pipeline...")
        result = await scheduling_pipeline_orchestrator.execute_scheduling_pipeline(
            script_input=coordinator_input,
            enable_thinking=True,
            enable_functions=False,
            max_concurrent=2
        )
        
        # Display results
        logger.info("📊 Pipeline Execution Results:")
        logger.info(f"Status: {result.get('status')}")
        logger.info(f"Execution ID: {result.get('execution_id')}")
        logger.info(f"Total Processing Time: {result.get('total_processing_time', 0):.2f} seconds")
        
        if result.get("status") == "COMPLETED":
            results = result.get("results", {})
            logger.info(f"✅ Successfully processed {len(results)} agents:")
            
            for agent_name in results.keys():
                logger.info(f"   • {agent_name}")
            
            # Display summary
            summary = result.get("summary", {})
            if summary:
                logger.info("\n📋 Execution Summary:")
                for key, value in summary.items():
                    logger.info(f"   {key}: {value}")
            
            # Check for key scheduling outputs
            if "optimizationScenarioAgent" in results:
                opt_output = results["optimizationScenarioAgent"]
                if "optimizationScenarioOutput" in opt_output:
                    opt_data = opt_output["optimizationScenarioOutput"]
                    proposals = opt_data.get("optimizedScheduleProposals", {})
                    logger.info(f"\n🎯 Generated {len(proposals)} scheduling scenarios")
                    
                    for scenario_id, scenario in proposals.items():
                        if isinstance(scenario, dict):
                            logger.info(f"   • {scenario.get('name', scenario_id)}: "
                                      f"{scenario.get('totalShootDays', 'N/A')} shoot days")
        
        else:
            logger.error("❌ Pipeline execution failed")
            error = result.get("error", "Unknown error")
            logger.error(f"Error: {error}")
            
            partial_results = result.get("partial_results", {})
            if partial_results:
                logger.info(f"Partial results from {len(partial_results)} agents:")
                for agent_name in partial_results.keys():
                    logger.info(f"   • {agent_name}")
        
        logger.info("🏁 Test completed")
        
        # Shutdown
        await scheduling_pipeline_orchestrator.shutdown()
        
    except Exception as e:
        logger.error(f"❌ Test failed with exception: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(test_scheduling_pipeline())