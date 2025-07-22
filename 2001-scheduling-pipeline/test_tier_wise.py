"""
Test Tier-wise Execution of 2001 Scheduling Pipeline
"""

import asyncio
import json
import logging
from pathlib import Path
import sys

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from pipeline.orchestrator import scheduling_pipeline_orchestrator
from models.io_logger import io_logger

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def test_tier_wise_scheduling():
    """Test tier-wise scheduling pipeline execution"""
    
    try:
        logger.info("🚀 Testing 2001 Scheduling Pipeline - Tier-wise Execution")
        
        # Load the actual coordinator input.json
        coordinator_input_path = Path("../2001-scheduling-system/01-coordinator-agent/input.json")
        
        if not coordinator_input_path.exists():
            logger.error(f"❌ Coordinator input not found: {coordinator_input_path}")
            return
        
        with open(coordinator_input_path, 'r', encoding='utf-8') as f:
            coordinator_input = json.load(f)
        
        logger.info("✅ Loaded coordinator input.json")
        logger.info(f"📊 Input structure: {list(coordinator_input.keys())}")
        
        # Initialize pipeline
        logger.info("🔧 Initializing scheduling pipeline...")
        await scheduling_pipeline_orchestrator.initialize()
        
        logger.info("\n🎬 Starting Tier-wise Execution:")
        logger.info("   Tier 1: Coordinator Agent")
        logger.info("   Tier 2: Compliance Agent + Resource Agent (parallel)")
        logger.info("   Tier 3: Optimization Agent")
        
        # Execute pipeline
        result = await scheduling_pipeline_orchestrator.execute_scheduling_pipeline(
            script_input=coordinator_input,
            enable_thinking=True,
            enable_functions=False,
            max_concurrent=2
        )
        
        execution_id = result.get('execution_id')
        logger.info(f"\n📋 Pipeline Results:")
        logger.info(f"   Execution ID: {execution_id}")
        logger.info(f"   Status: {result.get('status')}")
        logger.info(f"   Processing Time: {result.get('total_processing_time', 0):.2f}s")
        
        if result.get("status") == "COMPLETED":
            results = result.get("results", {})
            logger.info(f"\n✅ Successfully processed {len(results)} agents:")
            
            for tier_idx, tier_agents in enumerate([
                ["coordinatorAgent"], 
                ["complianceConstraintsAgent", "resourceLogisticsAgent"], 
                ["optimizationScenarioAgent"]
            ]):
                logger.info(f"\n   Tier {tier_idx + 1}:")
                for agent in tier_agents:
                    status = "✅ COMPLETED" if agent in results else "❌ FAILED"
                    logger.info(f"      • {agent}: {status}")
            
            # Check execution folder structure
            execution_path = Path(f"executions/{execution_id}")
            if execution_path.exists():
                logger.info(f"\n📁 Execution Folder: {execution_path}")
                
                for agent_name, folder_name in [
                    ("coordinatorAgent", "01-coordinator-agent"),
                    ("complianceConstraintsAgent", "02-compliance-constraints-agent"), 
                    ("resourceLogisticsAgent", "03-resource-logistics-agent"),
                    ("optimizationScenarioAgent", "04-optimization-scenario-agent")
                ]:
                    agent_path = execution_path / folder_name
                    if agent_path.exists():
                        input_file = agent_path / "input.json"
                        output_file = agent_path / "output.json"
                        
                        input_status = "✅" if input_file.exists() else "❌"
                        output_status = "✅" if output_file.exists() else "❌"
                        
                        logger.info(f"   {folder_name}/:")
                        logger.info(f"      input.json: {input_status}")
                        logger.info(f"      output.json: {output_status}")
                        
                        # Show file sizes
                        if input_file.exists():
                            size = input_file.stat().st_size
                            logger.info(f"        input.json size: {size} bytes")
                        
                        if output_file.exists():
                            size = output_file.stat().st_size
                            logger.info(f"        output.json size: {size} bytes")
            
            # Show summary
            summary = result.get("summary", {})
            if summary:
                logger.info(f"\n📊 Execution Summary:")
                for key, value in summary.items():
                    logger.info(f"   {key}: {value}")
        
        else:
            logger.error(f"❌ Pipeline failed: {result.get('error', 'Unknown error')}")
        
        logger.info("\n🏁 Tier-wise test completed")
        
        # Shutdown
        await scheduling_pipeline_orchestrator.shutdown()
        
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(test_tier_wise_scheduling())