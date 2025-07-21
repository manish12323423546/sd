#!/usr/bin/env python3
"""
Test Output File Creation Fixes
"""

import json
import logging
from pathlib import Path
import sys

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from utils.enhanced_json_parser import EnhancedJSONParser
from models.io_logger import ExecutionIOLogger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_parser_dict_output():
    """Test that enhanced parser always returns dictionaries"""
    
    logger.info("🧪 Testing Enhanced Parser Dict Output")
    
    test_cases = [
        # Case 1: Valid JSON object - should remain dict
        ('{"key": "value"}', "object"),
        
        # Case 2: JSON array - should be converted to dict
        ('[1, 2, 3]', "array"),
        
        # Case 3: JSON string - should be converted to dict
        ('"hello world"', "string"),
        
        # Case 4: JSON number - should be converted to dict  
        ('42', "number"),
        
        # Case 5: Truncated JSON - should be repaired as dict
        ('{"key": "unterm', "truncated")
    ]
    
    all_success = True
    
    for json_text, test_type in test_cases:
        logger.info(f"Testing {test_type}: {json_text[:20]}...")
        
        try:
            result, was_repaired, method = EnhancedJSONParser.parse_with_truncation_detection(
                json_text, "test_model"
            )
            
            if isinstance(result, dict):
                logger.info(f"✅ {test_type}: Returns dict (repaired: {was_repaired})")
            else:
                logger.error(f"❌ {test_type}: Returns {type(result).__name__}, not dict")
                all_success = False
                
        except Exception as e:
            logger.error(f"💥 {test_type}: Exception: {str(e)}")
            all_success = False
    
    return all_success

def test_io_logger_dict_handling():
    """Test that IO logger handles dict output correctly"""
    
    logger.info("🧪 Testing IO Logger Dict Handling")
    
    io_logger = ExecutionIOLogger()
    
    # Test with dict processingLog
    dict_output = {
        "model_data": {"key": "value"},
        "processingLog": {
            "step1": {"executed": True, "status": "SUCCESS"},
            "step2": {"executed": False, "status": "PENDING"}
        }
    }
    
    # Test with list processingLog  
    list_output = {
        "model_data": {"key": "value"},
        "processingLog": [
            {"status": "SUCCESS", "step": "step1"},
            {"status": "FAILED", "step": "step2"}
        ]
    }
    
    try:
        # Test dict format
        io_logger.log_model_output(
            "test_model_dict", 
            "test_execution",
            dict_output,
            True,
            60.0,
            None
        )
        logger.info("✅ Dict processingLog: Handled successfully")
        
        # Test list format
        io_logger.log_model_output(
            "test_model_list",
            "test_execution", 
            list_output,
            True,
            60.0,
            None
        )
        logger.info("✅ List processingLog: Handled successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ IO Logger test failed: {str(e)}")
        return False

def main():
    """Run output fixes tests"""
    
    logger.info("🚀 Testing Output File Creation Fixes")
    logger.info("=" * 50)
    
    # Test 1: Parser always returns dicts
    test1_success = test_parser_dict_output()
    
    # Test 2: IO logger handles both formats
    test2_success = test_io_logger_dict_handling()
    
    if test1_success and test2_success:
        logger.info("\n🎉 ALL TESTS PASSED!")
        logger.info("✅ Output file creation fixes are working")
        logger.info("✅ Ready to run pipeline without output errors")
        return 0
    else:
        logger.error("\n❌ Some tests failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)