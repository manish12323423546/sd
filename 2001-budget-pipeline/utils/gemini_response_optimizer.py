"""
Gemini Response Optimizer - Prevents truncation by controlling response size
Addresses: Large model outputs, response splitting, chunk management
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import re

logger = logging.getLogger(__name__)


class GeminiResponseOptimizer:
    """
    Optimizes Gemini 2.5 Pro responses to prevent truncation
    """
    
    # Model-specific size limits based on observed failures
    MODEL_SIZE_LIMITS = {
        "scheduleOptimizer": 12000,      # Failed at ~13,895 chars
        "laborCostCalculator": 15000,    # Complex labor calculations
        "cashFlowProjector": 16000,      # Failed at ~18,001 chars
        "budgetAggregator": 20000,       # Large aggregation
        "default": 10000                 # Safe default
    }
    
    # Response splitting strategies
    SPLITTING_STRATEGIES = {
        "scheduleOptimizer": "by_location_group",
        "laborCostCalculator": "by_department", 
        "cashFlowProjector": "by_time_period",
        "budgetAggregator": "by_category"
    }
    
    @staticmethod
    def optimize_system_prompt(original_prompt: str, model_name: str) -> str:
        """
        Optimize system prompt to prevent truncation
        """
        size_limit = GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)
        splitting_strategy = GeminiResponseOptimizer.SPLITTING_STRATEGIES.get(model_name, "default")
        
        optimization_instructions = f"""

CRITICAL RESPONSE SIZE MANAGEMENT:
- MAXIMUM response size: {size_limit} characters
- If response would exceed {size_limit} chars, use CHUNKED RESPONSE strategy
- Use concise descriptions, avoid verbose explanations
- Focus on essential data only

CHUNKED RESPONSE STRATEGY for {model_name.upper()}:
If response is too large, structure as:
{{
  "responseMetadata": {{
    "chunkStatus": "CHUNKED_DUE_TO_SIZE",
    "totalChunks": 1,
    "currentChunk": 1,
    "chunkingStrategy": "{splitting_strategy}"
  }},
  "summary": {{
    "essentialData": "CORE_RESULTS_ONLY",
    "fullDataNote": "Response truncated to prevent API limits"
  }},
  "processingEvidence": [
    {{
      "function": "primaryFunction",
      "status": "SUCCESS",
      "outputs": "CONDENSED_RESULTS"
    }}
  ]
}}

SIZE OPTIMIZATION RULES:
1. Use abbreviated field names where possible
2. Limit description fields to 50 characters max
3. Combine similar items into aggregated entries
4. Use numerical summaries instead of detailed breakdowns
5. Include only essential processingEvidence entries

"""
        
        return original_prompt + optimization_instructions
    
    @staticmethod
    def create_size_aware_template(model_name: str) -> Dict[str, Any]:
        """
        Create model-specific templates optimized for size
        """
        
        base_template = {
            "projectId": "proj_2001_space_odyssey",
            "processingEvidence": [
                {
                    "function": "primaryProcessing",
                    "status": "SUCCESS", 
                    "summary": "Core processing completed"
                }
            ]
        }
        
        model_templates = {
            "scheduleOptimizer": {
                **base_template,
                "scheduleId": "sched_2001_optimized",
                "scheduleSummary": {
                    "totalDays": 145,
                    "locationGroups": "SUMMARIZED_DATA",
                    "keyMilestones": []
                },
                "optimizationResults": {
                    "efficiency": "85%",
                    "companyMoves": 12,
                    "note": "Detailed schedule available on request"
                }
            },
            
            "laborCostCalculator": {
                **base_template,
                "laborCostSummary": {
                    "totalLaborCost": 0,
                    "totalGrossWages": 0,
                    "totalFringes": 0,
                    "departmentSummary": {}
                },
                "crewSummary": {
                    "totalPositions": 0,
                    "keyRoles": [],
                    "note": "Detailed breakdown available on request"
                }
            },
            
            "cashFlowProjector": {
                **base_template,
                "cashFlowSummary": {
                    "totalBudget": 0,
                    "peakFunding": 0,
                    "quarterlyBreakdown": [],
                    "note": "Detailed projections available on request"
                },
                "fundingSchedule": {
                    "milestones": [],
                    "riskFactors": []
                }
            }
        }
        
        return model_templates.get(model_name, base_template)
    
    @staticmethod
    def validate_response_size(response_text: str, model_name: str) -> Tuple[bool, str]:
        """
        Validate if response is within safe size limits
        
        Returns:
            (is_safe, validation_message)
        """
        size_limit = GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)
        response_size = len(response_text)
        
        if response_size <= size_limit:
            return True, f"Response size ({response_size}) within limit ({size_limit})"
        else:
            return False, f"Response size ({response_size}) exceeds limit ({size_limit})"
    
    @staticmethod
    def create_emergency_instructions(model_name: str) -> str:
        """
        Create emergency size-reduction instructions
        """
        return f"""
EMERGENCY SIZE REDUCTION FOR {model_name.upper()}:

IMMEDIATE ACTIONS:
1. Remove all verbose descriptions
2. Use single-word status values ("SUCCESS", "FAILED") 
3. Combine similar items into totals
4. Remove example data
5. Use abbreviations: "desc" not "description"

STRUCTURE LIMITS:
- Max 5 processingEvidence entries
- Max 50 chars per description
- Max 3 levels of nesting
- Use arrays sparingly

CRITICAL: Response MUST be under {GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)} characters
"""
    
    @staticmethod
    def estimate_response_size(model_complexity: str, data_volume: int) -> int:
        """
        Estimate response size based on model complexity and data volume
        """
        base_sizes = {
            "simple": 2000,
            "medium": 8000, 
            "complex": 15000,
            "very_complex": 25000
        }
        
        base_size = base_sizes.get(model_complexity, 8000)
        
        # Factor in data volume (scenes, crew members, etc.)
        size_multiplier = 1 + (data_volume / 100)  # Each 100 items adds 100% to base
        
        estimated_size = int(base_size * size_multiplier)
        
        logger.info(f"Estimated response size: {estimated_size} chars (complexity: {model_complexity}, volume: {data_volume})")
        
        return estimated_size
    
    @staticmethod
    def apply_size_reduction_strategies(response_text: str, target_size: int) -> str:
        """
        Apply various strategies to reduce response size
        """
        if len(response_text) <= target_size:
            return response_text
        
        # Strategy 1: Remove whitespace and formatting
        compressed = re.sub(r'\s+', ' ', response_text)
        compressed = compressed.replace(', ', ',').replace(': ', ':')
        
        if len(compressed) <= target_size:
            return compressed
        
        # Strategy 2: Truncate long description fields
        def shorten_descriptions(match):
            field_content = match.group(1)
            if len(field_content) > 30:
                return f'"description":"{field_content[:30]}..."'
            return match.group(0)
        
        compressed = re.sub(r'"description":"([^"]*)"', shorten_descriptions, compressed)
        
        if len(compressed) <= target_size:
            return compressed
        
        # Strategy 3: Remove non-essential fields
        non_essential_fields = ['notes', 'examples', 'details', 'additionalInfo']
        for field in non_essential_fields:
            pattern = f'"{field}":[^,}}]*[,}}]'
            compressed = re.sub(pattern, '', compressed)
        
        # Strategy 4: Aggressive truncation if still too large
        if len(compressed) > target_size:
            compressed = compressed[:target_size-100] + '..."}'
        
        return compressed


class ResponseChunker:
    """
    Handles chunking of large responses across multiple API calls
    """
    
    @staticmethod
    def should_chunk_response(model_name: str, estimated_size: int) -> bool:
        """
        Determine if response should be chunked
        """
        size_limit = GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)
        return estimated_size > size_limit * 0.8  # Chunk if approaching 80% of limit
    
    @staticmethod
    def create_chunk_request(original_request: Dict[str, Any], chunk_number: int, total_chunks: int) -> Dict[str, Any]:
        """
        Create a chunked request for partial processing
        """
        chunked_request = original_request.copy()
        
        # Add chunking metadata
        chunked_request["chunkingMetadata"] = {
            "chunkNumber": chunk_number,
            "totalChunks": total_chunks,
            "chunkingReason": "prevent_response_truncation"
        }
        
        # Modify request to focus on specific chunk
        if "scenes" in chunked_request:
            scenes = chunked_request["scenes"]
            chunk_size = len(scenes) // total_chunks
            start_idx = (chunk_number - 1) * chunk_size
            end_idx = start_idx + chunk_size if chunk_number < total_chunks else len(scenes)
            
            chunked_request["scenes"] = scenes[start_idx:end_idx]
            chunked_request["chunkScope"] = f"scenes_{start_idx+1}_to_{end_idx}"
        
        return chunked_request
    
    @staticmethod
    def merge_chunked_responses(chunks: List[Dict[str, Any]], model_name: str) -> Dict[str, Any]:
        """
        Merge multiple chunked responses into a single response
        """
        if not chunks:
            return {}
        
        # Use first chunk as base
        merged_response = chunks[0].copy()
        
        # Add merging metadata
        merged_response["responseMetadata"] = {
            "chunkedResponse": True,
            "totalChunks": len(chunks),
            "mergedAt": "post_processing"
        }
        
        # Merge data from subsequent chunks
        for chunk in chunks[1:]:
            # Model-specific merging logic
            if model_name == "scheduleOptimizer":
                if "scheduleData" in chunk and "scheduleData" in merged_response:
                    merged_response["scheduleData"].update(chunk["scheduleData"])
            
            elif model_name == "laborCostCalculator":
                if "crewBreakdown" in chunk and "crewBreakdown" in merged_response:
                    merged_response["crewBreakdown"].extend(chunk["crewBreakdown"])
            
            # Merge processing evidence
            if "processingEvidence" in chunk:
                if "processingEvidence" not in merged_response:
                    merged_response["processingEvidence"] = []
                merged_response["processingEvidence"].extend(chunk["processingEvidence"])
        
        return merged_response