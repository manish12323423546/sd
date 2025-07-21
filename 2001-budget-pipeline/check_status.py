#!/usr/bin/env python3
"""
Live Pipeline Status Monitor
"""

import os
import json
import time
from pathlib import Path
from datetime import datetime

def check_execution_status():
    """Check the current execution status"""
    
    print("🎬 2001 BUDGET PIPELINE - LIVE STATUS")
    print("=" * 50)
    
    # Find the latest execution
    executions_dir = Path("executions")
    if not executions_dir.exists():
        print("❌ No executions directory found")
        return
    
    # Get latest execution folder
    execution_dirs = [d for d in executions_dir.iterdir() if d.is_dir()]
    if not execution_dirs:
        print("❌ No executions found")
        return
    
    latest_execution = max(execution_dirs, key=lambda x: x.stat().st_mtime)
    print(f"📋 Latest Execution: {latest_execution.name}")
    print(f"⏰ Started: {datetime.fromtimestamp(latest_execution.stat().st_mtime)}")
    
    # Check each model's progress
    models = [
        "05-schedule-optimizer",
        "07-post-production-estimator", 
        "02-labor-cost-calculator",
        "03-equipment-pricing-engine",
        "04-location-cost-estimator",
        "06-insurance-calculator",
        "09-budget-aggregator",
        "08-tax-incentive-analyzer",
        "10-cash-flow-projector"
    ]
    
    print(f"\n📊 MODEL PROGRESS:")
    print("-" * 50)
    
    completed_models = 0
    processing_model = None
    
    for model in models:
        model_dir = latest_execution / model
        if not model_dir.exists():
            print(f"⏸️  {model}: Not started")
            continue
            
        has_input = (model_dir / "input.json").exists()
        has_output = (model_dir / "output.json").exists()
        
        if has_output:
            # Check if successful
            try:
                with open(model_dir / "output.json", 'r') as f:
                    output_data = json.load(f)
                
                if output_data.get("success", False):
                    processing_time = output_data.get("processing_time", 0)
                    print(f"✅ {model}: COMPLETED ({processing_time:.1f}s)")
                    completed_models += 1
                else:
                    error = output_data.get("error", "Unknown error")
                    print(f"❌ {model}: FAILED - {error}")
            except:
                print(f"⚠️  {model}: Output file corrupted")
                
        elif has_input:
            print(f"🔄 {model}: PROCESSING...")
            processing_model = model
            
        else:
            print(f"⏸️  {model}: Waiting")
    
    # Overall status
    print(f"\n📈 OVERALL PROGRESS:")
    print("-" * 50)
    progress = (completed_models / len(models)) * 100
    print(f"Progress: {completed_models}/{len(models)} models ({progress:.1f}%)")
    
    if processing_model:
        print(f"🔄 Currently Processing: {processing_model}")
        print("💭 Gemini 2.5 Pro thinking mode active...")
    
    # Check for completion
    if completed_models == len(models):
        print("🎉 PIPELINE COMPLETED!")
        print("📁 Check execution folder for all results")
    elif completed_models > 0:
        print(f"⏳ {len(models) - completed_models} models remaining")
    else:
        print("🚀 Pipeline starting up...")
    
    # Show file sizes
    print(f"\n📁 EXECUTION FILES:")
    print("-" * 50)
    total_size = 0
    file_count = 0
    
    for model_dir in latest_execution.iterdir():
        if model_dir.is_dir():
            for file in model_dir.iterdir():
                if file.is_file():
                    size = file.stat().st_size
                    total_size += size
                    file_count += 1
                    print(f"📄 {model_dir.name}/{file.name}: {size:,} bytes")
    
    print(f"\n💾 Total: {file_count} files, {total_size:,} bytes")
    print(f"📂 Location: executions/{latest_execution.name}/")

if __name__ == "__main__":
    os.chdir("/Users/varunisrani/Desktop/mckays-app-template 3/2001-budget-pipeline")
    check_execution_status()