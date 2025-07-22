"""
Debug Gemini API responses for scheduling pipeline
"""

import asyncio
import json
import logging
from pathlib import Path
import sys

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from models.gemini_client import gemini_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def debug_gemini_response():
    """Debug Gemini API response"""
    
    try:
        logger.info("🔧 Initializing Gemini client...")
        await gemini_client.initialize()
        
        # Simple test prompt
        system_prompt = """You are a scheduling coordinator for film production. Respond with valid JSON only."""
        
        user_input = """{"test": "simple scheduling test"}"""
        
        logger.info("📡 Testing Gemini API...")
        response = await gemini_client.generate_scheduling_response(
            system_prompt=system_prompt,
            user_input=user_input,
            enable_thinking=False,
            model_name="testAgent"
        )
        
        logger.info("📋 Response received:")
        logger.info(f"Success: {response.get('success')}")
        logger.info(f"Error: {response.get('error')}")
        
        if response.get('raw_response'):
            logger.info(f"Raw response length: {len(response['raw_response'])}")
            logger.info(f"Raw response preview: {response['raw_response'][:500]}...")
        
        # Test with coordinator prompt
        logger.info("\n🎬 Testing with coordinator prompt...")
        
        coordinator_prompt_path = Path("../2001-scheduling-system/01-coordinator-agent/system.prompt.txt")
        if coordinator_prompt_path.exists():
            with open(coordinator_prompt_path, 'r', encoding='utf-8') as f:
                coordinator_prompt = f.read()
            
            coordinator_input_path = Path("../2001-scheduling-system/01-coordinator-agent/input.json")
            if coordinator_input_path.exists():
                with open(coordinator_input_path, 'r', encoding='utf-8') as f:
                    coordinator_input = json.load(f)
                
                logger.info(f"📖 Loaded coordinator prompt ({len(coordinator_prompt)} chars)")
                logger.info(f"📖 Loaded coordinator input")
                
                response2 = await gemini_client.generate_scheduling_response(
                    system_prompt=coordinator_prompt,
                    user_input=json.dumps(coordinator_input, indent=2),
                    enable_thinking=True,
                    model_name="coordinatorAgent"
                )
                
                logger.info("📋 Coordinator response:")
                logger.info(f"Success: {response2.get('success')}")
                logger.info(f"Error: {response2.get('error')}")
                
                if response2.get('raw_response'):
                    logger.info(f"Raw response length: {len(response2['raw_response'])}")
                    if response2['raw_response'].strip():
                        logger.info(f"Raw response start: {response2['raw_response'][:200]}...")
                        logger.info(f"Raw response end: {response2['raw_response'][-200:]}")
                    else:
                        logger.error("❌ Empty response from Gemini!")
        
        logger.info("✅ Debug completed")
        
    except Exception as e:
        logger.error(f"❌ Debug failed: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(debug_gemini_response())