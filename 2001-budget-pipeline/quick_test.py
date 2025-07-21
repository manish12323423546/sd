"""
Quick Single Model Test
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from models.gemini_client import gemini_client
from models.model_processor import model_processor
from config.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_single_model():
    """Test a single model quickly"""
    try:
        logger.info("🚀 Quick Model Test")
        
        # Initialize model processor
        await model_processor.initialize()
        
        # Create simple test input
        test_input = {
            "coordinatorInput": {
                "projectId": "test_project",
                "timestamp": "2024-07-21T10:00:00Z",
                "scriptData": {
                    "title": "Test Film",
                    "totalPages": 10,
                    "totalScenes": 2
                },
                "scenes": [
                    {
                        "sceneId": 1,
                        "sceneName": "TEST SCENE",
                        "pages": 2.0,
                        "location": "STUDIO",
                        "cast": ["ACTOR1"],
                        "extras": 5
                    }
                ]
            }
        }
        
        # Test schedule optimizer (no dependencies)
        logger.info("Testing scheduleOptimizer...")
        result = await model_processor.process_model(
            model_name="scheduleOptimizer",
            input_data=test_input,
            enable_thinking=True,
            enable_functions=True
        )
        
        if result:
            logger.info("✅ Schedule Optimizer SUCCESS!")
            logger.info(f"📊 Output keys: {list(result.keys())}")
            
            # Check for processing log
            if "processingLog" in result:
                logger.info("✅ Processing functions executed")
            else:
                logger.warning("⚠️ No processing log found")
            
            return True
        else:
            logger.error("❌ No result returned")
            return False
            
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")
        return False


async def main():
    """Main test"""
    success = await test_single_model()
    
    if success:
        logger.info("🎉 QUICK TEST PASSED!")
        return True
    else:
        logger.error("💥 QUICK TEST FAILED!")
        return False


if __name__ == "__main__":
    result = asyncio.run(main())
    if not result:
        sys.exit(1)