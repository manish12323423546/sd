#!/usr/bin/env python3
"""
Live Pipeline Monitor - Enhanced logging and status display
"""

import time
import subprocess
import os
import json
from pathlib import Path
from datetime import datetime
import sys

def print_header():
    """Print monitoring header"""
    print("🎬" + "="*80 + "🎬")
    print("2001 BUDGET PIPELINE - LIVE MONITOR")
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🎬" + "="*80 + "🎬")
    print()

def get_latest_execution():
    """Get the latest execution directory"""
    executions_dir = Path("executions")
    if not executions_dir.exists():
        return None
    
    execution_dirs = [d for d in executions_dir.iterdir() if d.is_dir()]
    if not execution_dirs:
        return None
    
    return max(execution_dirs, key=lambda x: x.stat().st_mtime)

def show_pipeline_status():
    """Show current pipeline status"""
    latest_exec = get_latest_execution()
    if not latest_exec:
        print("❌ No executions found")
        return
    
    print(f"📋 Latest Execution: {latest_exec.name}")
    print(f"⏰ Started: {datetime.fromtimestamp(latest_exec.stat().st_mtime)}")
    
    # Count completed models
    completed = 0
    processing = None
    total_files = 0
    total_size = 0
    
    models = [
        "01-coordinator", "05-schedule-optimizer", "07-post-production-estimator",
        "02-labor-cost-calculator", "03-equipment-pricing-engine", "04-location-cost-estimator",
        "06-insurance-calculator", "09-budget-aggregator", "08-tax-incentive-analyzer",
        "10-cash-flow-projector"
    ]
    
    print("\n📊 MODEL STATUS:")
    print("-" * 60)
    
    for model in models:
        model_dir = latest_exec / model
        if not model_dir.exists():
            print(f"⏸️  {model}: Not started")
            continue
            
        has_input = (model_dir / "input.json").exists()
        has_output = (model_dir / "output.json").exists()
        
        if has_output:
            try:
                with open(model_dir / "output.json", 'r') as f:
                    output_data = json.load(f)
                
                if output_data.get("success", False):
                    processing_time = output_data.get("processing_time", 0)
                    print(f"✅ {model}: COMPLETED ({processing_time:.1f}s)")
                    completed += 1
                else:
                    error = output_data.get("error", "Unknown error")
                    print(f"❌ {model}: FAILED - {error}")
            except:
                print(f"⚠️  {model}: Output file corrupted")
                
        elif has_input:
            print(f"🔄 {model}: PROCESSING...")
            processing = model
            
        else:
            print(f"⏸️  {model}: Waiting")
        
        # Count files and sizes
        if model_dir.exists():
            for file in model_dir.iterdir():
                if file.is_file():
                    total_files += 1
                    total_size += file.stat().st_size
    
    # Overall progress
    progress = (completed / len(models)) * 100
    print(f"\n📈 OVERALL PROGRESS: {completed}/{len(models)} models ({progress:.1f}%)")
    
    if processing:
        print(f"🔄 Currently Processing: {processing}")
        print("💭 Gemini 2.5 Pro thinking mode active...")
    
    print(f"\n💾 Data Generated: {total_files} files, {total_size:,} bytes")
    print(f"📂 Location: executions/{latest_exec.name}/")

def tail_logs(log_file, lines=20):
    """Show last N lines of log file"""
    try:
        with open(log_file, 'r') as f:
            all_lines = f.readlines()
            last_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            
        print(f"\n📄 LATEST LOGS ({log_file}):")
        print("-" * 60)
        for line in last_lines:
            print(line.rstrip())
            
    except FileNotFoundError:
        print(f"❌ Log file not found: {log_file}")
    except Exception as e:
        print(f"❌ Error reading logs: {str(e)}")

def live_monitor():
    """Main live monitoring loop"""
    print_header()
    
    log_files = [
        "logs/corrected_pipeline.log",
        "logs/detailed_pipeline.log"
    ]
    
    try:
        while True:
            # Clear screen
            os.system('clear' if os.name == 'posix' else 'cls')
            
            print_header()
            show_pipeline_status()
            
            # Show latest logs
            for log_file in log_files:
                if Path(log_file).exists():
                    tail_logs(log_file, 10)
                    break
            
            print(f"\n🔄 Refreshing every 10 seconds... (Press Ctrl+C to exit)")
            print("=" * 80)
            
            time.sleep(10)
            
    except KeyboardInterrupt:
        print("\n\n👋 Monitoring stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Monitor error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    os.chdir("/Users/varunisrani/Desktop/mckays-app-template 3/2001-budget-pipeline")
    live_monitor()