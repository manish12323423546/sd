"""
2001 Scheduling Pipeline - Main Application Entry Point
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from api.endpoints import app
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.api.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/pipeline.log') if Path('logs').exists() else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)


async def main():
    """Main application entry point"""
    try:
        logger.info("Starting 2001 Scheduling Pipeline Application")
        logger.info(f"Gemini Model: {settings.gemini.model_name}")
        logger.info(f"Thinking Mode: {settings.gemini.thinking_enabled}")
        logger.info(f"Max Concurrent Models: {settings.pipeline.max_concurrent_models}")
        
        # Import uvicorn here to avoid issues with event loop
        import uvicorn
        
        # Run the API server
        config = uvicorn.Config(
            app=app,
            host=settings.api.host,
            port=settings.api.port,
            reload=settings.api.debug,
            log_level=settings.api.log_level.lower(),
            access_log=True
        )
        
        server = uvicorn.Server(config)
        await server.serve()
        
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Application failed to start: {str(e)}")
        raise


if __name__ == "__main__":
    # Check for required environment variables
    if not settings.gemini.api_key:
        logger.error("GEMINI_API_KEY environment variable is required")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Run the application
    asyncio.run(main())