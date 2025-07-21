"""
Robust JSON Parser - Handles AI-generated malformed JSON responses
Fixes: Unterminated strings, missing quotes, truncated responses, etc.
"""

import json
import re
import logging
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class RobustJSONParser:
    """
    Multi-stage JSON parser with progressive repair strategies
    """
    
    @staticmethod
    def parse(text: str, model_name: str = "unknown") -> Tuple[Dict[str, Any], bool]:
        """
        Parse JSON with progressive repair strategies
        
        Returns:
            (parsed_data, is_repaired)
        """
        if not text or not text.strip():
            logger.warning(f"{model_name}: Empty response text")
            return {}, True
            
        # Stage 1: Clean and attempt strict parsing
        cleaned_text = RobustJSONParser._clean_response_text(text)
        
        # Try strict parsing first
        try:
            data = json.loads(cleaned_text)
            logger.info(f"{model_name}: ✅ Strict JSON parsing successful")
            return data, False
        except json.JSONDecodeError as e:
            logger.warning(f"{model_name}: Strict parsing failed: {str(e)}")
        
        # Stage 2: Progressive repair strategies
        repair_strategies = [
            RobustJSONParser._fix_unterminated_strings,
            RobustJSONParser._fix_missing_quotes,
            RobustJSONParser._fix_trailing_commas,
            RobustJSONParser._fix_truncated_json,
            RobustJSONParser._extract_valid_json_subset,
            RobustJSONParser._create_minimal_fallback
        ]
        
        for i, repair_func in enumerate(repair_strategies, 1):
            try:
                repaired_text = repair_func(cleaned_text)
                if repaired_text != cleaned_text:
                    data = json.loads(repaired_text)
                    logger.info(f"{model_name}: ✅ Repair strategy {i} successful")
                    return data, True
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.warning(f"{model_name}: Repair strategy {i} error: {str(e)}")
                continue
        
        # Stage 3: Last resort - return minimal valid structure
        logger.error(f"{model_name}: All parsing strategies failed")
        return RobustJSONParser._emergency_fallback(text, model_name), True
    
    @staticmethod
    def _clean_response_text(text: str) -> str:
        """Clean response text of common formatting issues"""
        # Remove markdown code blocks
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*$', '', text, flags=re.MULTILINE)
        
        # Remove any leading/trailing whitespace
        text = text.strip()
        
        # Remove BOM if present
        if text.startswith('\ufeff'):
            text = text[1:]
            
        return text
    
    @staticmethod
    def _fix_unterminated_strings(text: str) -> str:
        """Fix unterminated string literals with advanced detection"""
        # Find unterminated strings and close them
        lines = text.split('\n')
        fixed_lines = []
        in_string = False
        
        for i, line in enumerate(lines):
            # Count quotes, but ignore escaped quotes
            quote_count = 0
            escape_next = False
            for char in line:
                if escape_next:
                    escape_next = False
                    continue
                if char == '\\':
                    escape_next = True
                    continue
                if char == '"':
                    quote_count += 1
            
            # If odd number of quotes, we have unterminated string
            if quote_count % 2 == 1:
                in_string = not in_string
                if in_string:
                    # Started a string, continue
                    fixed_lines.append(line)
                else:
                    # Need to close string
                    if line.strip().endswith(','):
                        line = line.rstrip() + '"'
                    elif line.strip().endswith('{') or line.strip().endswith('['):
                        line = line + '""'
                    else:
                        line = line + '"'
                    fixed_lines.append(line)
            else:
                # Even number of quotes, normal line
                if in_string:
                    # We're in the middle of a multi-line string, close it
                    line = '""'
                    in_string = False
                fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    @staticmethod
    def _fix_missing_quotes(text: str) -> str:
        """Fix missing quotes around property names"""
        # Add quotes around unquoted property names
        text = re.sub(r'(\w+)(\s*:\s*)', r'"\1"\2', text)
        return text
    
    @staticmethod
    def _fix_trailing_commas(text: str) -> str:
        """Remove trailing commas"""
        # Remove trailing commas before closing braces/brackets
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        return text
    
    @staticmethod
    def _fix_truncated_json(text: str) -> str:
        """Attempt to close truncated JSON structures"""
        # Count opening vs closing braces/brackets
        open_braces = text.count('{') - text.count('}')
        open_brackets = text.count('[') - text.count(']')
        
        # Add missing closing characters
        result = text
        if open_braces > 0:
            result += '}' * open_braces
        if open_brackets > 0:
            result += ']' * open_brackets
            
        return result
    
    @staticmethod
    def _extract_valid_json_subset(text: str) -> str:
        """Extract the largest valid JSON subset"""
        # Try to find complete JSON objects
        brace_count = 0
        for i, char in enumerate(text):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    # Found complete object
                    return text[:i+1]
        
        # If no complete object found, return original
        return text
    
    @staticmethod
    def _create_minimal_fallback(text: str) -> str:
        """Create minimal valid JSON structure"""
        return '{"response": "partial", "raw_text": "' + text.replace('"', '\\"')[:500] + '"}'
    
    @staticmethod
    def _emergency_fallback(text: str, model_name: str) -> Dict[str, Any]:
        """Emergency fallback when all parsing fails"""
        logger.error(f"{model_name}: Using emergency fallback structure")
        
        return {
            "error": "JSON_PARSING_FAILED",
            "model_name": model_name,
            "response_preview": text[:200] if text else "EMPTY_RESPONSE",
            "success": False,
            "processing_evidence": {
                "status": "FAILED",
                "summary": "JSON parsing failed, using fallback structure"
            }
        }


# Convenience functions for backward compatibility
def robust_json_loads(text: str, model_name: str = "unknown") -> Dict[str, Any]:
    """
    Drop-in replacement for json.loads() with robust parsing
    """
    data, was_repaired = RobustJSONParser.parse(text, model_name)
    if was_repaired:
        logger.warning(f"{model_name}: JSON was repaired during parsing")
    return data


def safe_json_loads(text: str, default: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Safe JSON parsing that never raises exceptions
    """
    try:
        data, _ = RobustJSONParser.parse(text)
        return data
    except Exception as e:
        logger.error(f"Safe JSON parsing failed: {str(e)}")
        return default or {}