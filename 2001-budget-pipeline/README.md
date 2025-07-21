# 2001 Budget Pipeline

AI-powered film budget processing pipeline using Gemini 2.5 Pro with thinking mode capabilities. Processes complex film budgets through 9 interdependent models with sophisticated dependency management.

## Features

- **Gemini 2.5 Pro Integration**: Leverages thinking mode for complex reasoning
- **Original System Prompts**: Uses your existing system prompts from the 2001-budget-system
- **Dependency Management**: Sophisticated tier-based execution with proper dependencies
- **Real-time Progress**: WebSocket progress tracking for all executions
- **In-Memory State**: Fast, reliable state management without external dependencies
- **Production Ready**: Comprehensive error handling, logging, and monitoring

## Architecture

```
Input → Coordinator → Tier 1 (Schedule + PostProd) → Tier 2 (Labor + Equipment + Location) 
                   → Tier 3 (Insurance) → Tier 4 (Budget Aggregator) 
                   → Tier 5 (Tax Incentive) → Tier 6 (Cash Flow) → Output
```

### Execution Tiers

1. **Tier 1**: Schedule Optimizer, Post-Production Estimator (parallel)
2. **Tier 2**: Labor Cost Calculator, Equipment Pricing Engine, Location Cost Estimator (parallel, depend on Tier 1)
3. **Tier 3**: Insurance Calculator (depends on Labor + Equipment)
4. **Tier 4**: Budget Aggregator (depends on all previous models)
5. **Tier 5**: Tax Incentive Analyzer (depends on Budget Aggregator)
6. **Tier 6**: Cash Flow Projector (depends on Budget Aggregator + Schedule Optimizer)

## Quick Start

### 1. Installation

```bash
# Clone and setup
cd 2001-budget-pipeline
python -m venv venv
source venv/bin/activate  # or `venv\\Scripts\\activate` on Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_api_key_here
```

### 3. Run the Pipeline

```bash
# Start the API server
python main.py

# Server will start on http://localhost:8000
```

### 4. Execute Pipeline

#### Using the API:

```bash
# Execute pipeline with your coordinator input
curl -X POST "http://localhost:8000/execute-pipeline" \\
     -H "Content-Type: application/json" \\
     -d @path/to/coordinator/input.json
```

#### Using Python:

```python
import asyncio
from pipeline.orchestrator import pipeline_orchestrator

async def run_budget_pipeline():
    await pipeline_orchestrator.initialize()
    
    # Your coordinator input
    coordinator_input = {
        "coordinatorInput": {
            "projectId": "proj_2001_space_odyssey",
            "scenes": [...],  # Your 71 scenes
            # ... rest of coordinator input
        }
    }
    
    result = await pipeline_orchestrator.execute_pipeline(coordinator_input)
    print(f"Pipeline completed: {result['status']}")
    print(f"Total time: {result['total_processing_time']:.2f}s")
    
    return result

# Run the pipeline
result = asyncio.run(run_budget_pipeline())
```

## API Endpoints

### Pipeline Execution
- `POST /execute-pipeline` - Execute complete budget pipeline
- `GET /executions` - List all active executions
- `GET /executions/{id}/status` - Get execution status
- `GET /executions/{id}/summary` - Get execution summary
- `POST /executions/{id}/cancel` - Cancel execution

### Real-time Updates
- `WS /ws/executions/{id}/progress` - WebSocket progress stream

### System Information
- `GET /health` - Health check
- `GET /system-info` - System information
- `GET /models/summary` - Model summary

## Configuration

### Environment Variables

```bash
# Gemini Configuration
GEMINI_API_KEY=your_key_here
GEMINI_THINKING_ENABLED=true
GEMINI_MAX_RETRIES=3

# Pipeline Settings
PIPELINE_MAX_CONCURRENT_MODELS=3
PIPELINE_EXECUTION_TIMEOUT=1800

# Memory Management
MEMORY_MAX_EXECUTIONS=100
MEMORY_EXECUTION_TTL=86400
```

### System Prompts

The pipeline automatically loads original system prompts from:
```
../2001-budget-system/
├── 02-labor-cost-calculator/system.prompt.txt
├── 03-equipment-pricing-engine/system.prompt.txt
├── 04-location-cost-estimator/system.prompt.txt
└── ... (all other models)
```

## Usage Examples

### Complete Pipeline Execution

```python
from pipeline.orchestrator import pipeline_orchestrator
import asyncio
import json

async def process_2001_budget():
    # Load your coordinator input
    with open('../2001-budget-system/01-coordinator/input.json') as f:
        coordinator_input = json.load(f)
    
    # Execute pipeline with thinking mode
    result = await pipeline_orchestrator.execute_pipeline(
        coordinator_input=coordinator_input,
        enable_thinking=True,  # Use Gemini thinking mode
        enable_functions=True, # Enable processing functions
        max_concurrent=3       # Max concurrent models per tier
    )
    
    if result['status'] == 'COMPLETED':
        print("✅ Pipeline completed successfully!")
        print(f"📊 Total Budget: ${result['summary'].get('total_budget', 'N/A'):,}")
        print(f"⏱️  Processing Time: {result['total_processing_time']:.1f}s")
        
        # Access specific model outputs
        labor_costs = result['results']['laborCostCalculator']
        equipment_costs = result['results']['equipmentPricingEngine']
        final_budget = result['results']['budgetAggregator']
        
        return result
    else:
        print(f"❌ Pipeline failed: {result.get('error')}")
        return None

# Run it
result = asyncio.run(process_2001_budget())
```

### Real-time Progress Monitoring

```python
import asyncio
import websockets
import json

async def monitor_progress(execution_id):
    uri = f"ws://localhost:8000/ws/executions/{execution_id}/progress"
    
    async with websockets.connect(uri) as websocket:
        print(f"🔄 Monitoring execution {execution_id}")
        
        async for message in websocket:
            progress = json.loads(message)
            
            if progress.get('type') == 'ping':
                continue
            
            print(f"📈 Progress: {progress['progress_percentage']:.1f}%")
            print(f"🎯 Current Tier: {progress['current_tier']}")
            print(f"✅ Completed: {', '.join(progress['completed_models'])}")
            
            if progress['status'] in ['COMPLETED', 'FAILED']:
                print(f"🏁 Final Status: {progress['status']}")
                break

# Monitor a running execution
asyncio.run(monitor_progress('your-execution-id'))
```

## Model Processing Functions

Each model executes its required processing functions as specified in the original system prompts:

### Labor Cost Calculator
- Union rate lookup processing
- Base wage calculation processing  
- Overtime estimation processing
- Fringe benefit processing
- Location multiplier processing

### Equipment Pricing Engine
- Equipment catalog matching processing
- Volume discount calculation processing
- Insurance requirement processing
- Transportation cost processing
- Vendor tier processing

### Budget Aggregator
- Department cost summation processing
- Contingency application processing
- Above/below line ratio calculation processing
- Overhead and fee processing
- Industry standard formatting processing

*All models include processing function validation in their output.*

## Performance & Monitoring

### Execution Metrics

```python
# Get system performance
system_info = pipeline_orchestrator.get_system_info()
print(f"Active executions: {system_info['memory_stats']['total_executions']}")
print(f"Loaded models: {system_info['model_processor']['total_models']}")

# Get execution summary
summary = await pipeline_orchestrator.get_execution_summary(execution_id)
print(f"Processing time: {summary['total_processing_time']:.2f}s")
print(f"Completion rate: {summary['progress_percentage']:.1f}%")
```

### Health Monitoring

```bash
# Check system health
curl http://localhost:8000/health

# Response
{
  "status": "healthy",
  "components": {
    "memory_state_manager": {"status": "healthy"},
    "model_processor": {"status": "healthy"}, 
    "gemini_client": {"status": "healthy"}
  }
}
```

## Development

### Project Structure

```
2001-budget-pipeline/
├── api/                    # FastAPI endpoints and WebSocket
├── config/                 # Configuration and settings
├── models/                 # Gemini client and model processors
├── pipeline/              # Orchestration and dependency management
├── tests/                 # Test suite
├── logs/                  # Application logs
├── main.py               # Application entry point
└── requirements.txt      # Python dependencies
```

### Testing

```bash
# Run tests
pytest tests/

# Test specific pipeline execution
python -m tests.test_pipeline

# Load test data
curl http://localhost:8000/test/coordinator
```

### Adding New Models

1. Add system prompt to `../2001-budget-system/new-model/system.prompt.txt`
2. Update dependency map in `config/settings.py`
3. Add to execution tiers
4. The pipeline will automatically load and process the new model

## Troubleshooting

### Common Issues

**API Key Error**
```bash
export GEMINI_API_KEY=your_actual_key
```

**Model Loading Issues**
- Ensure `../2001-budget-system/` contains all system prompts
- Check file permissions on system prompt files

**Memory Issues**
- Adjust `MEMORY_MAX_EXECUTIONS` for your system
- Monitor memory usage with `/system-info` endpoint

**Timeout Issues**
- Increase `PIPELINE_EXECUTION_TIMEOUT` for large budgets
- Reduce `PIPELINE_MAX_CONCURRENT_MODELS` if hitting rate limits

### Logs

```bash
# View real-time logs
tail -f logs/pipeline.log

# Check specific execution
grep "execution-id" logs/pipeline.log
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "main.py"]
```

### Environment Setup

```bash
# Production environment
export GEMINI_API_KEY=prod_key
export API_DEBUG=false
export API_LOG_LEVEL=INFO
export PIPELINE_MAX_CONCURRENT_MODELS=5
export MEMORY_MAX_EXECUTIONS=1000
```

## Support

- Check `/health` endpoint for system status
- Review logs in `logs/pipeline.log`
- Monitor execution progress via WebSocket
- Use `/system-info` for debugging

---

Built with Gemini 2.5 Pro thinking mode for sophisticated film budget processing. 🎬🤖