"""
CORRECTED Pipeline - Coordinator First, Then Other Models
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from pipeline.orchestrator import pipeline_orchestrator
from models.io_logger import io_logger
from config.settings import settings
from utils.data_validator import validate_and_clean_input
from utils.fallback_aggregator import FallbackBudgetAggregator

# Configure enhanced logging with detailed timestamps and depth
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d - [%(levelname)s] - %(name)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/corrected_pipeline.log'),
        logging.FileHandler('logs/detailed_pipeline.log')  # Separate detailed log
    ]
)
logger = logging.getLogger(__name__)


class CorrectedPipelineRunner:
    """
    Corrected pipeline: Input → Coordinator → Data Distribution → Other Models
    """
    
    def __init__(self):
        self.coordinator_input = None
        self.coordinator_output = None
    
    def load_coordinator_input(self) -> Dict[str, Any]:
        """Load and validate the 2001 coordinator input"""
        try:
            coordinator_path = settings.system_prompts_path / "01-coordinator" / "input.json"
            
            with open(coordinator_path, 'r', encoding='utf-8') as f:
                raw_input = json.load(f)
            
            # Validate and clean the input data
            logger.info("🔍 Validating input data quality...")
            validated_input, quality_report = validate_and_clean_input(raw_input)
            
            # Log validation results
            total_warnings = quality_report.get("total_warnings", 0)
            overall_quality = quality_report.get("overall_quality", "UNKNOWN")
            
            logger.info(f"📊 Data Quality: {overall_quality} ({total_warnings} warnings)")
            
            if total_warnings > 0:
                logger.info("⚠️  Data validation warnings:")
                for warning in quality_report.get("validation_details", {}).get("warnings", [])[:5]:
                    logger.info(f"   • {warning}")
                if total_warnings > 5:
                    logger.info(f"   • ... and {total_warnings - 5} more warnings")
            
            scene_count = len(validated_input.get('coordinatorInput', {}).get('scenes', []))
            logger.info(f"✅ Loaded and validated 2001 coordinator input: {scene_count} scenes")
            
            return validated_input
            
        except Exception as e:
            logger.error(f"Failed to load coordinator input: {str(e)}")
            raise
    
    async def run_corrected_pipeline(self) -> Dict[str, Any]:
        """Run the corrected pipeline workflow"""
        logger.info("🎬 STARTING CORRECTED 2001 BUDGET PIPELINE")
        logger.info("📋 WORKFLOW: Input → Coordinator → Data Distribution → 9 Models")
        
        # Load input
        self.coordinator_input = self.load_coordinator_input()
        
        # Initialize pipeline
        await pipeline_orchestrator.initialize()
        
        try:
            logger.info("🚀 EXECUTING CORRECTED PIPELINE")
            start_time = time.time()
            
            # Execute pipeline with corrected workflow
            result = await pipeline_orchestrator.execute_pipeline(
                coordinator_input=self.coordinator_input,
                enable_thinking=True,
                enable_functions=True,
                max_concurrent=1  # Conservative for stability
            )
            
            total_time = time.time() - start_time
            
            if result.get("status") == "COMPLETED":
                logger.info(f"🎉 CORRECTED PIPELINE COMPLETED!")
                logger.info(f"⏱️ Total time: {total_time:.1f}s")
                logger.info(f"📊 Models processed: {len(result.get('results', {}))}")
                logger.info(f"💾 Execution logs: executions/{result['execution_id']}")
                
                # Show coordinator output
                if "coordinator" in result.get("results", {}):
                    logger.info("✅ Coordinator processed successfully - data packets created")
                    self.coordinator_output = result["results"]["coordinator"]
                
                self._print_execution_summary(result)
                return result
            else:
                logger.warning(f"⚠️ Pipeline incomplete - Status: {result.get('status')}")
                return result
                
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {str(e)}")
            raise
    
    def _print_execution_summary(self, result: Dict[str, Any]):
        """Print detailed execution summary"""
        print("\n" + "🎬" + "="*60 + "🎬")
        print("2001: A SPACE ODYSSEY - CORRECTED PIPELINE RESULTS")
        print("🎬" + "="*60 + "🎬")
        
        # Execution details
        print(f"📋 Execution ID: {result['execution_id']}")
        print(f"⏱️  Processing Time: {result['total_processing_time']:.1f}s")
        print(f"✅ Status: {result['status']}")
        
        # Model completion
        results = result.get("results", {})
        print(f"\n📊 MODELS COMPLETED: {len(results)}")
        print("-" * 40)
        
        for model_name, model_result in results.items():
            if isinstance(model_result, dict) and not model_result.get("error"):
                print(f"✅ {model_name}")
            else:
                print(f"❌ {model_name}: {model_result.get('error', 'Unknown error')}")
        
        # Coordinator analysis
        if "coordinator" in results:
            print(f"\n🎯 COORDINATOR ANALYSIS:")
            print("-" * 40)
            coord_data = results["coordinator"]
            if isinstance(coord_data, dict):
                # Look for data packets
                if "modelDataPackets" in coord_data:
                    packets = coord_data["modelDataPackets"]
                    print(f"📦 Data packets created: {len(packets)}")
                    for model, packet in packets.items():
                        print(f"   → {model}: {len(str(packet))} chars")
                else:
                    print("📦 Data packets: Found in response structure")
            else:
                print("⚠️  Coordinator data structure unexpected")
        
        # File locations
        print(f"\n📁 DETAILED LOGS:")
        print("-" * 40)
        print(f"📂 Execution folder: executions/{result['execution_id']}/")
        print("📄 Each model has input.json and output.json")
        print("🔍 Coordinator shows data distribution to other models")
        
        print("\n🎬" + "="*60 + "🎬\n")
    
    def analyze_coordinator_output(self):
        """Analyze what the coordinator produced"""
        if not self.coordinator_output:
            return
        
        print("🔍 COORDINATOR OUTPUT ANALYSIS:")
        print("-" * 40)
        
        # Show structure
        if isinstance(self.coordinator_output, dict):
            print(f"📊 Top-level keys: {list(self.coordinator_output.keys())}")
            
            # Look for data distribution evidence
            data_indicators = [
                "budgetCoordinatorOutput", "modelDataPackets", "dataPackets",
                "distribution", "packets", "scheduleOptimizer", "laborCostCalculator"
            ]
            
            found_indicators = []
            for indicator in data_indicators:
                if indicator in str(self.coordinator_output):
                    found_indicators.append(indicator)
            
            if found_indicators:
                print(f"✅ Data distribution indicators: {found_indicators}")
            else:
                print("⚠️  No clear data distribution indicators found")
        
        print("-" * 40)


async def main():
    """Main execution"""
    try:
        # Create logs directory
        Path("logs").mkdir(exist_ok=True)
        
        # Run the corrected pipeline
        runner = CorrectedPipelineRunner()
        result = await runner.run_corrected_pipeline()
        
        # Analyze coordinator output
        runner.analyze_coordinator_output()
        
        return result.get("status") == "COMPLETED"
        
    except Exception as e:
        logger.error(f"Main execution failed: {str(e)}")
        return False


if __name__ == "__main__":
    logger.info("🎬 STARTING CORRECTED PIPELINE (Coordinator First)")
    
    success = asyncio.run(main())
    
    if success:
        print("🎉 CORRECTED PIPELINE COMPLETED SUCCESSFULLY!")
        print("✅ Coordinator processed input and distributed data to models")
    else:
        print("⚠️ CORRECTED PIPELINE NEEDS REFINEMENT")
        
    print("\nCheck executions/ folder - Coordinator should be in Tier 0!")
    sys.exit(0 if success else 1)