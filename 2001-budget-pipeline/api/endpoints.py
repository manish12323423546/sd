"""
FastAPI Endpoints for 2001 Budget Pipeline
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pipeline.orchestrator import pipeline_orchestrator
from config.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="2001 Budget Pipeline API",
    description="AI-powered film budget processing pipeline using Gemini 2.5 Pro",
    version="1.0.0"
)

# CORS middleware
if settings.api.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Pydantic models
class PipelineRequest(BaseModel):
    """Request model for pipeline execution"""
    coordinator_input: Dict[str, Any] = Field(..., description="Input data from coordinator")
    enable_thinking: bool = Field(default=True, description="Enable Gemini thinking mode")
    enable_functions: bool = Field(default=True, description="Enable function calling")
    max_concurrent: Optional[int] = Field(default=None, description="Max concurrent models per tier")


class PipelineResponse(BaseModel):
    """Response model for pipeline execution"""
    success: bool
    execution_id: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    total_processing_time: Optional[float] = None


class ExecutionStatusResponse(BaseModel):
    """Response model for execution status"""
    execution_id: str
    status: str
    current_tier: int
    completed_models: List[str]
    failed_models: List[str]
    total_models: int
    progress_percentage: float
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    components: Dict[str, Any]


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize pipeline on startup"""
    try:
        await pipeline_orchestrator.initialize()
        logger.info("Pipeline API started successfully")
    except Exception as e:
        logger.error(f"Failed to start pipeline API: {str(e)}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    try:
        await pipeline_orchestrator.shutdown()
        logger.info("Pipeline API shut down successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")


# API Endpoints

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "2001 Budget Pipeline API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        health = await pipeline_orchestrator.health_check()
        return HealthResponse(**health)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.get("/system-info")
async def get_system_info():
    """Get system information"""
    try:
        return pipeline_orchestrator.get_system_info()
    except Exception as e:
        logger.error(f"Failed to get system info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@app.post("/execute-pipeline", response_model=PipelineResponse)
async def execute_pipeline(request: PipelineRequest, background_tasks: BackgroundTasks):
    """
    Execute the complete budget pipeline
    
    This endpoint processes a complete 2001: A Space Odyssey budget breakdown
    through all 9 specialized models using Gemini 2.5 Pro with thinking mode.
    """
    try:
        logger.info("Received pipeline execution request")
        
        # Validate input
        if not request.coordinator_input:
            raise HTTPException(status_code=400, detail="coordinator_input is required")
        
        # Execute pipeline
        result = await pipeline_orchestrator.execute_pipeline(
            coordinator_input=request.coordinator_input,
            enable_thinking=request.enable_thinking,
            enable_functions=request.enable_functions,
            max_concurrent=request.max_concurrent
        )
        
        if result["status"] == "COMPLETED":
            return PipelineResponse(
                success=True,
                execution_id=result["execution_id"],
                status=result["status"],
                message="Pipeline executed successfully",
                results=result["results"],
                summary=result["summary"],
                total_processing_time=result["total_processing_time"]
            )
        else:
            return PipelineResponse(
                success=False,
                execution_id=result["execution_id"],
                status=result["status"],
                error=result.get("error", "Pipeline execution failed"),
                results=result.get("partial_results")
            )
    
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")


@app.get("/executions", response_model=List[str])
async def list_executions():
    """List all active executions"""
    try:
        executions = await pipeline_orchestrator.list_executions()
        return executions
    except Exception as e:
        logger.error(f"Failed to list executions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list executions: {str(e)}")


@app.get("/executions/{execution_id}/status", response_model=ExecutionStatusResponse)
async def get_execution_status(execution_id: str):
    """Get execution status"""
    try:
        status = await pipeline_orchestrator.get_execution_status(execution_id)
        if not status:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return ExecutionStatusResponse(**status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution status: {str(e)}")


@app.get("/executions/{execution_id}/summary")
async def get_execution_summary(execution_id: str):
    """Get execution summary"""
    try:
        summary = await pipeline_orchestrator.get_execution_summary(execution_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution summary: {str(e)}")


@app.post("/executions/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running execution"""
    try:
        cancelled = await pipeline_orchestrator.cancel_execution(execution_id)
        if not cancelled:
            raise HTTPException(status_code=400, detail="Execution not found or not cancellable")
        
        return {"message": f"Execution {execution_id} cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel execution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel execution: {str(e)}")


# WebSocket endpoint for real-time progress updates
@app.websocket("/ws/executions/{execution_id}/progress")
async def websocket_execution_progress(websocket: WebSocket, execution_id: str):
    """
    WebSocket endpoint for real-time execution progress updates
    """
    await websocket.accept()
    logger.info(f"WebSocket client connected for execution {execution_id}")
    
    try:
        # Subscribe to progress updates
        progress_queue = await pipeline_orchestrator.subscribe_to_progress(execution_id)
        
        # Send progress updates
        while True:
            try:
                # Wait for progress update with timeout
                progress_update = await asyncio.wait_for(progress_queue.get(), timeout=30.0)
                
                if progress_update is None:
                    # Signal to close connection
                    break
                
                # Send progress update to client
                await websocket.send_json(progress_update)
                
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            except Exception as e:
                logger.error(f"Error sending progress update: {str(e)}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for execution {execution_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for execution {execution_id}: {str(e)}")
        await websocket.close()
    
    finally:
        # Cleanup
        try:
            await pipeline_orchestrator.unsubscribe_from_progress(execution_id, progress_queue)
        except Exception as e:
            logger.error(f"Error during WebSocket cleanup: {str(e)}")


# Test endpoints for development
@app.post("/test/coordinator")
async def test_coordinator_input():
    """Test endpoint with sample coordinator input"""
    try:
        # Load sample coordinator input
        from config.settings import get_sample_input_path
        import json
        
        coordinator_input_path = get_sample_input_path("coordinator")
        if not coordinator_input_path.exists():
            raise HTTPException(status_code=404, detail="Sample coordinator input not found")
        
        with open(coordinator_input_path, 'r') as f:
            sample_input = json.load(f)
        
        return {
            "message": "Sample coordinator input loaded",
            "input": sample_input,
            "usage": "POST this input to /execute-pipeline to test the system"
        }
    
    except Exception as e:
        logger.error(f"Failed to load test data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load test data: {str(e)}")


@app.get("/models/summary")
async def get_models_summary():
    """Get summary of all loaded models"""
    try:
        from models.model_processor import model_processor
        summary = model_processor.get_model_summary()
        return summary
    except Exception as e:
        logger.error(f"Failed to get models summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get models summary: {str(e)}")


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Not found", "detail": str(exc.detail) if hasattr(exc, 'detail') else "Resource not found"}


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return {"error": "Internal server error", "detail": "An unexpected error occurred"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api.endpoints:app",
        host=settings.api.host,
        port=settings.api.port,
        reload=settings.api.debug,
        log_level=settings.api.log_level.lower()
    )