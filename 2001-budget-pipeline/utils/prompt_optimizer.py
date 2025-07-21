"""
System Prompt Optimizer - Adds size constraints to prevent response truncation
"""

import logging
from typing import Dict, Any
from utils.gemini_response_optimizer import GeminiResponseOptimizer

logger = logging.getLogger(__name__)


class PromptOptimizer:
    """
    Optimizes system prompts to prevent response truncation
    """
    
    @staticmethod
    def optimize_prompt_for_model(original_prompt: str, model_name: str) -> str:
        """
        Add size constraints and optimization instructions to system prompt
        """
        
        # Get model-specific size limit
        size_limit = GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000)
        
        # Model-specific optimization instructions
        optimization_block = f"""

## CRITICAL RESPONSE SIZE MANAGEMENT FOR {model_name.upper()}

**MANDATORY CONSTRAINTS:**
- MAXIMUM response size: {size_limit:,} characters
- If response approaches {size_limit:,} chars, use CONDENSED OUTPUT strategy
- Use concise descriptions (max 50 chars each)
- Focus on essential data only

**CONDENSED OUTPUT STRATEGY:**
If full response would exceed {size_limit:,} characters:
1. Use abbreviated field names ("desc" not "description")
2. Combine similar items into aggregated entries  
3. Limit processingEvidence to max 5 entries
4. Use single-word status values ("SUCCESS", "FAILED")
5. Remove verbose explanations and examples

**SIZE OPTIMIZATION RULES:**
✅ Essential: Core numerical data, IDs, status
✅ Important: Brief summaries, key totals
❌ Remove: Long descriptions, detailed explanations, examples
❌ Remove: Redundant data, verbose notes

**EMERGENCY SIZE REDUCTION:**
If approaching limit:
- Stop adding detail
- Use "..." to indicate truncation
- Focus on completion over comprehensiveness
- Ensure valid JSON structure

"""

        # Add the optimization block to the original prompt
        optimized_prompt = original_prompt + optimization_block
        
        # Add model-specific strategies
        if model_name == "scheduleOptimizer":
            optimized_prompt += """
**SCHEDULE OPTIMIZER SPECIFIC:**
- Summarize location groups instead of listing all scenes
- Use abbreviated day ranges ("Days 1-5" not detailed breakdown)
- Limit cast scheduling to key milestones only
- Focus on totals: total days, moves, efficiency metrics
"""
        
        elif model_name == "laborCostCalculator":
            optimized_prompt += """
**LABOR COST CALCULATOR SPECIFIC:**
- Group crew by department totals, not individual positions
- Use salary ranges instead of individual rates
- Combine similar roles ("Assistants: 15 positions")
- Focus on major cost drivers only
"""
        
        elif model_name == "cashFlowProjector":
            optimized_prompt += """
**CASH FLOW PROJECTOR SPECIFIC:**
- Use monthly summaries, not weekly detail
- Limit scenario modeling to 3 scenarios max
- Focus on peak funding and major milestones
- Aggregate minor expenses into categories
"""
        
        optimized_prompt += f"""

**RESPONSE VALIDATION:**
Before submitting response:
1. Count characters - must be under {size_limit:,}
2. Ensure JSON is valid and complete
3. Include essential processingEvidence
4. Verify all required fields present

**CRITICAL:** Response truncation causes system failure. Better to provide condensed complete data than truncated detailed data.

"""
        
        logger.info(f"Optimized system prompt for {model_name} (size limit: {size_limit:,})")
        return optimized_prompt
    
    @staticmethod
    def update_all_system_prompts(original_prompts: Dict[str, str]) -> Dict[str, str]:
        """
        Update all system prompts with size constraints
        """
        optimized_prompts = {}
        
        for model_name, original_prompt in original_prompts.items():
            optimized_prompts[model_name] = PromptOptimizer.optimize_prompt_for_model(
                original_prompt, model_name
            )
            
        logger.info(f"Optimized {len(optimized_prompts)} system prompts with size constraints")
        return optimized_prompts
    
    @staticmethod 
    def create_size_aware_prompt_template(model_name: str, base_content: str) -> str:
        """
        Create a size-aware prompt template for a specific model
        """
        template = f"""
{base_content}

## RESPONSE SIZE MANAGEMENT

This model has been optimized to prevent response truncation:

**Size Limit:** {GeminiResponseOptimizer.MODEL_SIZE_LIMITS.get(model_name, 10000):,} characters
**Strategy:** {GeminiResponseOptimizer.SPLITTING_STRATEGIES.get(model_name, 'default')}

**Output Priority:**
1. Essential data and calculations
2. Core processing evidence  
3. Summary information
4. Detailed breakdowns (if space permits)

**Size Monitoring:**
- Track response length during generation
- Apply condensation if approaching limit
- Ensure JSON validity over completeness
"""
        
        return template