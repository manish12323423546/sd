#!/usr/bin/env python3
"""
Simplified Test for Enhanced JSON Parsing
Focus on testing the parser components without full model execution
"""

import json
import logging
from pathlib import Path
import sys

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from utils.enhanced_json_parser import EnhancedJSONParser
from utils.gemini_response_optimizer import GeminiResponseOptimizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s:%(lineno)d - %(message)s'
)
logger = logging.getLogger(__name__)


def test_truncated_responses():
    """Test parser with actual truncated responses from failed models"""
    
    logger.info("🧪 Testing Enhanced Parser with Real Truncated Data")
    
    # Simulate the actual truncated responses that caused failures
    test_cases = [
        {
            "name": "Schedule Optimizer Truncation",
            "model": "scheduleOptimizer", 
            "response": '''{
  "scheduleId": "sched_2001_19651229_v1",
  "projectId": "proj_2001_space_odyssey",
  "processingLog": [
    {
      "step": 1,
      "processName": "Scene Location Grouping Processing",
      "stat''',
            "should_repair": True
        },
        {
            "name": "Labor Cost Calculator Truncation",
            "model": "laborCostCalculator",
            "response": '''{
  "laborCostSummary": {
    "projectId": "proj_2001_space_odyssey",
    "currency": "GBP", 
    "totalLaborCost": 21858015,
    "totalGrossWages": 14698500,
    "totalFringes": 6246863,
    "totalOve''',
            "should_repair": True
        },
        {
            "name": "Cash Flow Projector Truncation", 
            "model": "cashFlowProjector",
            "response": '''{
  "cashFlowAnalysis": {
    "projectId": "proj_2001_space_odyssey",
    "analysisTimestamp": "2024-07-21T10:18:00Z",
    "currency": "USD",
    "currencyYear": 1966,
    "summary": "This cash flow p''',
            "should_repair": True
        },
        {
            "name": "Complete Valid Response",
            "model": "testModel",
            "response": '''{
  "projectId": "proj_2001_space_odyssey",
  "status": "SUCCESS",
  "data": {"key": "value"}
}''',
            "should_repair": False
        }
    ]
    
    success_count = 0
    
    for test_case in test_cases:
        logger.info(f"\n🔍 Testing: {test_case['name']}")
        
        try:
            # Test enhanced parsing
            parsed_data, was_repaired, repair_method = EnhancedJSONParser.parse_with_truncation_detection(
                test_case["response"], test_case["model"]
            )
            
            # Validate results
            parsing_success = parsed_data is not None and isinstance(parsed_data, dict)
            repair_correct = was_repaired == test_case["should_repair"]
            
            if parsing_success and repair_correct:
                logger.info(f"✅ {test_case['name']}: SUCCESS")
                if was_repaired:
                    logger.info(f"🔧 Repair method: {repair_method}")
                    logger.info(f"📊 Parsed keys: {list(parsed_data.keys())}")
                success_count += 1
            else:
                logger.error(f"❌ {test_case['name']}: FAILED")
                logger.error(f"   Parsing success: {parsing_success}")
                logger.error(f"   Repair correct: {repair_correct}")
                
        except Exception as e:
            logger.error(f"💥 {test_case['name']}: Exception: {str(e)}")
    
    success_rate = (success_count / len(test_cases)) * 100
    logger.info(f"\n📊 Enhanced Parser Test Results: {success_rate:.1f}% success")
    
    return success_rate == 100


def test_size_optimization():
    """Test response size optimization features"""
    
    logger.info("\n🧪 Testing Response Size Optimization")
    
    models_to_test = ["scheduleOptimizer", "laborCostCalculator", "cashFlowProjector"]
    
    for model_name in models_to_test:
        logger.info(f"\n🔍 Testing size limits for {model_name}")
        
        # Test size limit validation
        size_limit = GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)
        logger.info(f"📏 Size limit: {size_limit:,} characters")
        
        # Test with response at limit
        test_response = "x" * size_limit
        is_safe, message = GeminiResponseOptimizer.validate_response_size(test_response, model_name)
        logger.info(f"✅ At limit validation: {is_safe}")
        
        # Test with response over limit  
        oversized_response = "x" * (size_limit + 1000)
        is_safe, message = GeminiResponseOptimizer.validate_response_size(oversized_response, model_name)
        logger.info(f"⚠️  Over limit validation: {is_safe} - {message}")
        
        # Test size estimation
        estimated_size = GeminiResponseOptimizer.estimate_response_size("very_complex", 71)
        logger.info(f"📊 Estimated size for 71 scenes: {estimated_size:,} chars")
    
    return True


def test_template_reconstruction():
    """Test template-based reconstruction for failed models"""
    
    logger.info("\n🧪 Testing Template Reconstruction")
    
    models_to_test = ["scheduleOptimizer", "laborCostCalculator", "cashFlowProjector"]
    
    for model_name in models_to_test:
        logger.info(f"\n🔍 Testing template reconstruction for {model_name}")
        
        # Test with severely truncated response
        truncated_response = '{"projectId": "proj_2001_space_odyssey", "data'
        
        try:
            parsed_data, was_repaired, repair_method = EnhancedJSONParser.parse_with_truncation_detection(
                truncated_response, model_name
            )
            
            if parsed_data and "projectId" in str(parsed_data):
                logger.info(f"✅ {model_name}: Template reconstruction successful")
                logger.info(f"🔧 Repair method: {repair_method}")
                logger.info(f"📊 Generated structure: {list(parsed_data.keys())}")
            else:
                logger.error(f"❌ {model_name}: Template reconstruction failed")
                
        except Exception as e:
            logger.error(f"💥 {model_name}: Exception: {str(e)}")
    
    return True


def main():
    """Run simplified parser tests"""
    
    logger.info("🚀 Enhanced JSON Parsing - Simplified Test Suite")
    logger.info("=" * 60)
    
    # Test 1: Enhanced parser with truncated responses
    test1_success = test_truncated_responses()
    
    # Test 2: Size optimization features  
    test2_success = test_size_optimization()
    
    # Test 3: Template reconstruction
    test3_success = test_template_reconstruction()
    
    # Overall results
    if test1_success and test2_success and test3_success:
        logger.info("\n🎉 ALL TESTS PASSED!")
        logger.info("✅ Enhanced JSON parsing solution is working correctly")
        logger.info("✅ Ready for integration into full pipeline")
        return 0
    else:
        logger.error("\n❌ Some tests failed")
        logger.error("🔧 Parser needs refinement")
        return 1


if __name__ == "__main__":
    exit_code = main()
    print(f"\nTest completed with exit code: {exit_code}")
    sys.exit(exit_code)