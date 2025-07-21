"""
Comprehensive Pipeline Test with Looping for Best Results
"""

import asyncio
import json
import logging
import time
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from pipeline.orchestrator import pipeline_orchestrator
from models.io_logger import io_logger
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/test_execution.log')
    ]
)
logger = logging.getLogger(__name__)


class PipelineTestRunner:
    """
    Comprehensive test runner with result analysis and looping
    """
    
    def __init__(self):
        self.test_results: List[Dict[str, Any]] = []
        self.best_execution: Optional[Dict[str, Any]] = None
        self.coordinator_input: Optional[Dict[str, Any]] = None
    
    def load_coordinator_input(self) -> Dict[str, Any]:
        """Load coordinator input from the existing system"""
        try:
            coordinator_path = settings.system_prompts_path / "01-coordinator" / "input.json"
            
            if not coordinator_path.exists():
                logger.error(f"Coordinator input not found at: {coordinator_path}")
                return self._create_fallback_input()
            
            with open(coordinator_path, 'r', encoding='utf-8') as f:
                coordinator_input = json.load(f)
            
            logger.info(f"✅ Loaded coordinator input from: {coordinator_path}")
            logger.info(f"📊 Input contains {len(coordinator_input.get('coordinatorInput', {}).get('scenes', []))} scenes")
            
            return coordinator_input
            
        except Exception as e:
            logger.error(f"Failed to load coordinator input: {str(e)}")
            return self._create_fallback_input()
    
    def _create_fallback_input(self) -> Dict[str, Any]:
        """Create minimal fallback input for testing"""
        return {
            "coordinatorInput": {
                "projectId": "test_2001_space_odyssey",
                "timestamp": datetime.utcnow().isoformat(),
                "scriptData": {
                    "title": "2001: A Space Odyssey - Test",
                    "format": "feature_film",
                    "genre": ["sci-fi", "drama"],
                    "totalPages": 10,
                    "totalScenes": 5,
                    "estimatedRuntime": 20
                },
                "scenes": [
                    {
                        "sceneId": 1,
                        "sceneName": "TEST SCENE 1",
                        "pages": 2.0,
                        "location": "STUDIO",
                        "intExt": "INT",
                        "dayNight": "DAY",
                        "cast": ["ACTOR1", "ACTOR2"],
                        "extras": 10,
                        "setupTime": 2.0,
                        "shootTime": 4.0,
                        "specialRequirements": ["basic_lighting"]
                    }
                ]
            }
        }
    
    async def run_single_test(self, test_number: int) -> Dict[str, Any]:
        """Run a single pipeline test"""
        logger.info(f"🚀 Starting Test #{test_number}")
        start_time = time.time()
        
        try:
            # Execute pipeline
            result = await pipeline_orchestrator.execute_pipeline(
                coordinator_input=self.coordinator_input,
                enable_thinking=True,
                enable_functions=True,
                max_concurrent=2  # Conservative for stability
            )
            
            total_time = time.time() - start_time
            
            # Analyze result quality
            quality_score = self._calculate_quality_score(result)
            
            test_result = {
                "test_number": test_number,
                "execution_id": result.get("execution_id"),
                "status": result.get("status"),
                "success": result.get("status") == "COMPLETED",
                "total_time": total_time,
                "quality_score": quality_score,
                "models_completed": len(result.get("results", {})),
                "models_failed": len([r for r in result.get("results", {}).values() 
                                   if isinstance(r, dict) and r.get("error")]),
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Log test result
            status_emoji = "✅" if test_result["success"] else "❌"
            logger.info(f"{status_emoji} Test #{test_number} - Status: {result.get('status')}")
            logger.info(f"📊 Quality Score: {quality_score:.2f}/100")
            logger.info(f"⏱️  Total Time: {total_time:.1f}s")
            logger.info(f"🎯 Models: {test_result['models_completed']}/{len(settings.execution_tiers)} tiers")
            
            if result.get("status") == "COMPLETED":
                logger.info(f"💾 Execution logs: executions/{result['execution_id']}")
            
            return test_result
            
        except Exception as e:
            logger.error(f"❌ Test #{test_number} failed with error: {str(e)}")
            return {
                "test_number": test_number,
                "success": False,
                "error": str(e),
                "total_time": time.time() - start_time,
                "quality_score": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _calculate_quality_score(self, result: Dict[str, Any]) -> float:
        """Calculate quality score for a result (0-100)"""
        if result.get("status") != "COMPLETED":
            return 0.0
        
        score = 0.0
        results = result.get("results", {})
        
        # Base completion score (40 points)
        models_completed = len(results)
        expected_models = len([name for name in settings.model_folder_map.keys() if name != "coordinator"])
        if expected_models > 0:
            score += (models_completed / expected_models) * 40
        
        # Processing function execution score (30 points)
        function_score = 0
        for model_name, model_result in results.items():
            if isinstance(model_result, dict) and "processingLog" in model_result:
                # Check if processing functions were executed
                processing_log = model_result["processingLog"]
                if isinstance(processing_log, dict):
                    executed_functions = sum(1 for v in processing_log.values() 
                                           if isinstance(v, dict) and v.get("executed"))
                    if executed_functions > 0:
                        function_score += 1
        
        if models_completed > 0:
            score += (function_score / models_completed) * 30
        
        # Output structure score (20 points)
        structure_score = 0
        for model_name, model_result in results.items():
            if isinstance(model_result, dict):
                # Check for expected output keys
                expected_keys = [f"{model_name}Output", "processingLog", "executiveSummary", "totalCost"]
                found_keys = sum(1 for key in expected_keys if any(key in str(k) for k in model_result.keys()))
                structure_score += found_keys / len(expected_keys)
        
        if models_completed > 0:
            score += (structure_score / models_completed) * 20
        
        # Performance score (10 points)
        total_time = result.get("total_processing_time", float('inf'))
        if total_time < 300:  # Under 5 minutes
            score += 10
        elif total_time < 600:  # Under 10 minutes
            score += 5
        
        return min(score, 100.0)
    
    def _is_better_result(self, new_result: Dict[str, Any]) -> bool:
        """Check if new result is better than current best"""
        if not self.best_execution:
            return True
        
        # Primary: Success vs failure
        if new_result["success"] and not self.best_execution["success"]:
            return True
        if not new_result["success"] and self.best_execution["success"]:
            return False
        
        # Secondary: Quality score
        if new_result["quality_score"] > self.best_execution["quality_score"]:
            return True
        if new_result["quality_score"] < self.best_execution["quality_score"]:
            return False
        
        # Tertiary: Performance (faster is better)
        return new_result["total_time"] < self.best_execution["total_time"]
    
    async def run_test_loop(
        self,
        max_attempts: int = 5,
        target_quality: float = 80.0,
        time_limit: int = 3600  # 1 hour
    ) -> Dict[str, Any]:
        """Run pipeline tests in loop until best result"""
        logger.info("🎯 Starting Pipeline Test Loop")
        logger.info(f"📋 Max Attempts: {max_attempts}")
        logger.info(f"🎯 Target Quality: {target_quality}")
        logger.info(f"⏰ Time Limit: {time_limit}s")
        
        # Load coordinator input
        self.coordinator_input = self.load_coordinator_input()
        
        # Initialize pipeline
        await pipeline_orchestrator.initialize()
        
        start_time = time.time()
        
        for attempt in range(1, max_attempts + 1):
            # Check time limit
            elapsed = time.time() - start_time
            if elapsed > time_limit:
                logger.info(f"⏰ Time limit reached ({elapsed:.1f}s)")
                break
            
            logger.info(f"\n{'='*60}")
            logger.info(f"🔄 ATTEMPT {attempt}/{max_attempts}")
            logger.info(f"{'='*60}")
            
            # Run test
            test_result = await self.run_single_test(attempt)
            self.test_results.append(test_result)
            
            # Check if this is the best result
            if self._is_better_result(test_result):
                self.best_execution = test_result
                logger.info(f"🏆 NEW BEST RESULT! Quality: {test_result['quality_score']:.1f}")
            
            # Check if we've reached target quality
            if test_result["success"] and test_result["quality_score"] >= target_quality:
                logger.info(f"🎉 TARGET QUALITY REACHED! ({test_result['quality_score']:.1f} >= {target_quality})")
                break
            
            # Wait before next attempt
            if attempt < max_attempts:
                logger.info(f"⏳ Waiting 30s before next attempt...")
                await asyncio.sleep(30)
        
        # Generate final report
        return self._generate_final_report()
    
    def _generate_final_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        successful_tests = len([t for t in self.test_results if t["success"]])
        
        report = {
            "test_summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "success_rate": (successful_tests / total_tests) * 100 if total_tests > 0 else 0,
                "average_quality": sum(t["quality_score"] for t in self.test_results) / total_tests if total_tests > 0 else 0,
                "average_time": sum(t["total_time"] for t in self.test_results) / total_tests if total_tests > 0 else 0
            },
            "best_execution": self.best_execution,
            "all_test_results": self.test_results,
            "recommendations": self._generate_recommendations()
        }
        
        # Save report
        report_path = Path("test_report.json")
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"📊 Test report saved: {report_path}")
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if not self.test_results:
            return ["No test results to analyze"]
        
        success_rate = len([t for t in self.test_results if t["success"]]) / len(self.test_results)
        avg_quality = sum(t["quality_score"] for t in self.test_results) / len(self.test_results)
        
        if success_rate < 0.8:
            recommendations.append("Consider reducing max_concurrent_models to improve stability")
            recommendations.append("Check network connection and API rate limits")
        
        if avg_quality < 50:
            recommendations.append("Review system prompts for clarity and completeness")
            recommendations.append("Ensure all processing functions are properly implemented")
        
        if any(t["total_time"] > 600 for t in self.test_results):
            recommendations.append("Consider optimizing model processing for better performance")
            recommendations.append("Review Gemini API timeout settings")
        
        if self.best_execution and self.best_execution["quality_score"] > 80:
            recommendations.append("Excellent results achieved! System is working well.")
            recommendations.append(f"Best execution ID: {self.best_execution.get('execution_id')}")
        
        return recommendations
    
    def print_final_summary(self, report: Dict[str, Any]):
        """Print comprehensive final summary"""
        print("\n" + "="*80)
        print("🎬 2001 BUDGET PIPELINE - FINAL TEST REPORT")
        print("="*80)
        
        summary = report["test_summary"]
        print(f"📊 Tests Run: {summary['total_tests']}")
        print(f"✅ Successful: {summary['successful_tests']} ({summary['success_rate']:.1f}%)")
        print(f"🏆 Average Quality: {summary['average_quality']:.1f}/100")
        print(f"⏱️  Average Time: {summary['average_time']:.1f}s")
        
        if self.best_execution:
            print(f"\n🏆 BEST EXECUTION:")
            print(f"   📋 Execution ID: {self.best_execution['execution_id']}")
            print(f"   🎯 Quality Score: {self.best_execution['quality_score']:.1f}/100")
            print(f"   ⏱️  Processing Time: {self.best_execution['total_time']:.1f}s")
            print(f"   🎛️  Models Completed: {self.best_execution['models_completed']}")
            print(f"   📁 Logs Location: executions/{self.best_execution['execution_id']}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in report["recommendations"]:
            print(f"   • {rec}")
        
        print(f"\n📁 DETAILED RESULTS:")
        print(f"   • Test Report: test_report.json")
        print(f"   • Execution Logs: executions/ folder")
        print(f"   • System Logs: logs/test_execution.log")
        
        print("\n" + "="*80)


async def main():
    """Main test execution"""
    try:
        # Create test runner
        test_runner = PipelineTestRunner()
        
        # Run test loop
        report = await test_runner.run_test_loop(
            max_attempts=5,       # Run up to 5 tests
            target_quality=80.0,  # Target 80% quality
            time_limit=3600       # 1 hour limit
        )
        
        # Print final summary
        test_runner.print_final_summary(report)
        
        # Return best result
        return test_runner.best_execution
        
    except Exception as e:
        logger.error(f"Test execution failed: {str(e)}")
        raise


if __name__ == "__main__":
    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)
    
    # Run the test
    logger.info("🎬 Starting 2001 Budget Pipeline Test")
    result = asyncio.run(main())
    
    if result and result["success"]:
        logger.info("🎉 TEST COMPLETED SUCCESSFULLY!")
    else:
        logger.error("❌ TEST FAILED")
        sys.exit(1)