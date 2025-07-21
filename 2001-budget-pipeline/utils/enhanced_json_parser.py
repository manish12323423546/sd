"""
Enhanced JSON Parser - Permanent solution for Gemini 2.5 Pro truncation issues
Addresses: Output truncation, unterminated strings, large response handling
"""

import json
import re
import logging
from typing import Dict, Any, Optional, Tuple, List
import time

logger = logging.getLogger(__name__)


class EnhancedJSONParser:
    """
    Advanced JSON parser specifically designed for Gemini 2.5 Pro truncation issues
    """
    
    # Maximum safe response size before truncation risk
    MAX_SAFE_SIZE = 15000
    
    @staticmethod
    def parse_with_truncation_detection(text: str, model_name: str = "unknown") -> Tuple[Dict[str, Any], bool, str]:
        """
        Parse JSON with advanced truncation detection and recovery
        
        Returns:
            (parsed_data, is_repaired, repair_method)
        """
        if not text or not text.strip():
            logger.warning(f"{model_name}: Empty response text")
            return {}, True, "empty_response"
            
        # Check for truncation indicators
        truncation_detected, truncation_type = EnhancedJSONParser._detect_truncation(text)
        
        if truncation_detected:
            logger.warning(f"{model_name}: Truncation detected - {truncation_type}")
            
        # Stage 1: Try standard parsing
        try:
            data = json.loads(text)
            
            # Ensure result is always a dictionary
            if not isinstance(data, dict):
                data = {"parsed_data": data, "original_type": type(data).__name__}
                logger.warning(f"{model_name}: Converted {type(data).__name__} to dict")
            
            logger.info(f"{model_name}: ✅ Standard JSON parsing successful")
            return data, False, "none"
        except json.JSONDecodeError as e:
            logger.warning(f"{model_name}: Standard parsing failed: {str(e)}")
        
        # Stage 2: Advanced repair strategies
        repair_methods = [
            ("truncation_recovery", EnhancedJSONParser._recover_from_truncation),
            ("smart_completion", EnhancedJSONParser._smart_json_completion),
            ("section_extraction", EnhancedJSONParser._extract_complete_sections),
            ("progressive_truncation", EnhancedJSONParser._progressive_truncation_repair),
            ("template_reconstruction", EnhancedJSONParser._reconstruct_from_template),
            ("emergency_fallback", EnhancedJSONParser._create_emergency_structure)
        ]
        
        for method_name, repair_func in repair_methods:
            try:
                logger.info(f"{model_name}: Attempting {method_name} repair...")
                repaired_text = repair_func(text, model_name)
                
                if repaired_text:
                    data = json.loads(repaired_text)
                    
                    # Ensure result is always a dictionary
                    if not isinstance(data, dict):
                        data = {"repaired_data": data, "original_type": type(data).__name__}
                    
                    logger.info(f"{model_name}: ✅ Repaired using {method_name}")
                    return data, True, method_name
                    
            except Exception as e:
                logger.debug(f"{model_name}: {method_name} failed: {str(e)}")
                continue
        
        # Final fallback
        logger.error(f"{model_name}: All repair methods failed")
        fallback_result = EnhancedJSONParser._create_comprehensive_fallback(text, model_name)
        
        # Ensure result is always a dictionary
        if not isinstance(fallback_result, dict):
            fallback_result = {"data": fallback_result, "error": "non_dict_result"}
            
        return fallback_result, True, "comprehensive_fallback"
    
    @staticmethod
    def _detect_truncation(text: str) -> Tuple[bool, str]:
        """Detect various types of truncation in JSON response"""
        
        # Check for unterminated strings
        if 'Unterminated string' in str(text):
            return True, "unterminated_string_error"
        
        # Check for abrupt ending patterns
        abrupt_patterns = [
            r'"[^"]*$',  # Ends with unterminated quote
            r':\s*$',    # Ends with colon
            r',\s*$',    # Ends with comma
            r'\{\s*$',   # Ends with opening brace
            r'\[\s*$',   # Ends with opening bracket
        ]
        
        for pattern in abrupt_patterns:
            if re.search(pattern, text.strip()):
                return True, f"abrupt_ending_{pattern}"
        
        # Check for incomplete JSON structure
        open_braces = text.count('{')
        close_braces = text.count('}')
        open_brackets = text.count('[')
        close_brackets = text.count(']')
        
        if open_braces != close_braces or open_brackets != close_brackets:
            return True, f"unbalanced_braces_{open_braces}_{close_braces}"
        
        # Check for size-based truncation risk
        if len(text) > EnhancedJSONParser.MAX_SAFE_SIZE:
            return True, "size_risk_detected"
        
        return False, "none"
    
    @staticmethod
    def _recover_from_truncation(text: str, model_name: str) -> Optional[str]:
        """Recover JSON from truncation by smart completion"""
        
        # Find the last complete JSON element
        lines = text.split('\n')
        
        # Look for the last line with complete key-value pair
        last_complete_line = -1
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            if line and (line.endswith(',') or line.endswith('}') or line.endswith(']')):
                last_complete_line = i
                break
        
        if last_complete_line == -1:
            return None
        
        # Reconstruct JSON up to last complete line
        truncated_json = '\n'.join(lines[:last_complete_line + 1])
        
        # Remove trailing comma if present
        truncated_json = re.sub(r',(\s*[}\]])', r'\1', truncated_json)
        
        # Ensure proper closing
        open_braces = truncated_json.count('{')
        close_braces = truncated_json.count('}')
        open_brackets = truncated_json.count('[')
        close_brackets = truncated_json.count(']')
        
        # Add missing closing braces/brackets
        while close_braces < open_braces:
            truncated_json += '\n}'
            close_braces += 1
        
        while close_brackets < open_brackets:
            truncated_json += '\n]'
            close_brackets += 1
        
        return truncated_json
    
    @staticmethod
    def _smart_json_completion(text: str, model_name: str) -> Optional[str]:
        """Smart completion of truncated JSON based on context"""
        
        # Find the truncation point
        lines = text.split('\n')
        
        # Look for incomplete string literal
        for i, line in enumerate(lines):
            if '"' in line:
                quote_count = line.count('"')
                # If odd number of quotes, string is unterminated
                if quote_count % 2 != 0:
                    # Complete the string and continue
                    if i < len(lines) - 1:
                        # Remove the incomplete line and everything after
                        complete_lines = lines[:i]
                        
                        # Add a generic completion for the incomplete field
                        incomplete_field = line.split('"')[-2] if '"' in line else "description"
                        complete_lines.append(f'    "{incomplete_field}": "Data truncated during generation"')
                        
                        # Close all open structures
                        complete_text = '\n'.join(complete_lines)
                        
                        # Balance braces
                        open_braces = complete_text.count('{')
                        close_braces = complete_text.count('}')
                        
                        while close_braces < open_braces:
                            complete_text += '\n}'
                            close_braces += 1
                        
                        return complete_text
        
        return None
    
    @staticmethod
    def _extract_complete_sections(text: str, model_name: str) -> Optional[str]:
        """Extract only complete sections from truncated JSON"""
        
        # Try to find complete top-level sections
        try:
            # Parse as much as possible using a more lenient approach
            # Look for complete object patterns
            
            # Extract everything up to the first major truncation
            truncation_point = len(text)
            
            # Look for patterns that indicate truncation
            truncation_indicators = [
                r'"[^"]*$',  # Unterminated string
                r':\s*$',    # Ends with colon
            ]
            
            for pattern in truncation_indicators:
                match = re.search(pattern, text)
                if match:
                    truncation_point = match.start()
                    break
            
            # Extract text up to truncation point
            safe_text = text[:truncation_point]
            
            # Find last complete JSON object
            lines = safe_text.split('\n')
            complete_lines = []
            
            for line in lines:
                if line.strip():
                    # Check if line is complete (ends with proper punctuation)
                    if (line.strip().endswith(',') or 
                        line.strip().endswith('}') or 
                        line.strip().endswith(']') or
                        line.strip().endswith('"')):
                        complete_lines.append(line)
                    else:
                        break
            
            if complete_lines:
                reconstructed = '\n'.join(complete_lines)
                
                # Ensure proper JSON structure
                if reconstructed.strip().endswith(','):
                    reconstructed = reconstructed.rsplit(',', 1)[0]
                
                # Add necessary closing braces
                open_count = reconstructed.count('{')
                close_count = reconstructed.count('}')
                
                while close_count < open_count:
                    reconstructed += '\n}'
                    close_count += 1
                
                return reconstructed
        
        except Exception:
            pass
        
        return None
    
    @staticmethod
    def _progressive_truncation_repair(text: str, model_name: str) -> Optional[str]:
        """Progressive repair by removing truncated sections"""
        
        # Start from the end and work backwards to find valid JSON
        text_length = len(text)
        
        for cut_point in range(text_length, text_length // 2, -100):
            try:
                partial_text = text[:cut_point]
                
                # Try to balance the JSON
                balanced_text = EnhancedJSONParser._balance_json_structure(partial_text)
                
                if balanced_text:
                    # Test if it's valid JSON
                    json.loads(balanced_text)
                    return balanced_text
                    
            except (json.JSONDecodeError, Exception):
                continue
        
        return None
    
    @staticmethod
    def _balance_json_structure(text: str) -> Optional[str]:
        """Balance JSON braces and brackets"""
        
        # Count open/close elements
        open_braces = text.count('{')
        close_braces = text.count('}')
        open_brackets = text.count('[')
        close_brackets = text.count(']')
        
        # Remove incomplete lines at the end
        lines = text.split('\n')
        complete_lines = []
        
        for line in lines:
            line_stripped = line.strip()
            if line_stripped and not line_stripped.endswith((':', ',')):
                # Only add lines that look complete
                if (line_stripped.endswith(('}', ']', '"')) or 
                    line_stripped.endswith((',')) or
                    line_stripped in ('{', '[')):
                    complete_lines.append(line)
                else:
                    break
            elif line_stripped.endswith((',', ':')):
                # Remove trailing commas and incomplete key-value pairs
                if line_stripped.endswith(','):
                    complete_lines.append(line)
                break
        
        if not complete_lines:
            return None
        
        balanced_text = '\n'.join(complete_lines)
        
        # Remove trailing comma if present
        balanced_text = re.sub(r',(\s*[}\]])', r'\1', balanced_text)
        
        # Add missing closing elements
        open_braces = balanced_text.count('{')
        close_braces = balanced_text.count('}')
        open_brackets = balanced_text.count('[')
        close_brackets = balanced_text.count(']')
        
        while close_braces < open_braces:
            balanced_text += '\n}'
            close_braces += 1
        
        while close_brackets < open_brackets:
            balanced_text += '\n]'
            close_brackets += 1
        
        return balanced_text
    
    @staticmethod
    def _reconstruct_from_template(text: str, model_name: str) -> Optional[str]:
        """Reconstruct JSON using model-specific templates"""
        
        # Model-specific templates for critical data
        templates = {
            "scheduleOptimizer": {
                "scheduleId": "sched_2001_truncated",
                "projectId": "proj_2001_space_odyssey",
                "scheduleData": "TRUNCATED_DATA_PLACEHOLDER",
                "processingLog": [{"status": "TRUNCATED", "note": "Response was truncated"}]
            },
            "laborCostCalculator": {
                "laborCostSummary": {
                    "projectId": "proj_2001_space_odyssey",
                    "totalLaborCost": 0,
                    "note": "TRUNCATED_DATA_PLACEHOLDER"
                },
                "processingLog": [{"status": "TRUNCATED", "note": "Response was truncated"}]
            },
            "cashFlowProjector": {
                "cashFlowAnalysis": {
                    "projectId": "proj_2001_space_odyssey",
                    "summary": "TRUNCATED_DATA_PLACEHOLDER"
                },
                "processingLog": [{"status": "TRUNCATED", "note": "Response was truncated"}]
            }
        }
        
        if model_name in templates:
            # Try to extract any valid data from the truncated response
            template = templates[model_name].copy()
            
            # Look for any extractable values
            try:
                # Extract project ID if present
                project_match = re.search(r'"projectId":\s*"([^"]*)"', text)
                if project_match:
                    template["projectId"] = project_match.group(1)
                
                # Extract any numerical values
                numbers = re.findall(r'"(\w+)":\s*(\d+(?:\.\d+)?)', text)
                for key, value in numbers[:5]:  # Limit to first 5 to avoid errors
                    try:
                        template[key] = float(value) if '.' in value else int(value)
                    except:
                        pass
                
            except Exception:
                pass
            
            return json.dumps(template, indent=2)
        
        return None
    
    @staticmethod
    def _create_emergency_structure(text: str, model_name: str) -> Optional[str]:
        """Create emergency JSON structure with extracted data"""
        
        emergency_structure = {
            "model_name": model_name,
            "status": "TRUNCATED_RESPONSE",
            "extracted_data": {},
            "processingLog": [
                {
                    "status": "FAILED",
                    "reason": "Response truncated during generation",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                    "recovery_method": "emergency_structure"
                }
            ],
            "original_response_length": len(text),
            "truncation_analysis": {
                "estimated_complete_size": len(text) * 2,
                "truncation_type": "gemini_output_limit",
                "recoverable": False
            }
        }
        
        # Try to extract any meaningful data
        try:
            # Extract strings that look like IDs or names
            ids = re.findall(r'"(\w*[Ii]d)":\s*"([^"]*)"', text)
            for key, value in ids:
                emergency_structure["extracted_data"][key] = value
            
            # Extract project information
            project_info = re.findall(r'"(project\w*)":\s*"([^"]*)"', text, re.IGNORECASE)
            for key, value in project_info:
                emergency_structure["extracted_data"][key] = value
                
        except Exception:
            pass
        
        return json.dumps(emergency_structure, indent=2)
    
    @staticmethod
    def _create_comprehensive_fallback(text: str, model_name: str) -> Dict[str, Any]:
        """Create comprehensive fallback structure"""
        
        return {
            "error": "JSON_PARSING_FAILED",
            "model_name": model_name,
            "response_preview": text[:100] + "..." if len(text) > 100 else text,
            "success": False,
            "processing_evidence": {
                "status": "FAILED", 
                "summary": "JSON parsing failed, using fallback structure"
            },
            "failure_analysis": {
                "response_size": len(text),
                "truncation_detected": len(text) > EnhancedJSONParser.MAX_SAFE_SIZE,
                "likely_cause": "gemini_output_truncation" if len(text) > 10000 else "malformed_json",
                "repair_attempts": "all_methods_failed"
            }
        }