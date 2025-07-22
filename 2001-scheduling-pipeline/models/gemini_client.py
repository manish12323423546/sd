"""
Gemini 2.5 Pro API Client for 2001 Scheduling Pipeline
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

import google.generativeai as genai
from google.generativeai import GenerativeModel
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from config.settings import settings

logger = logging.getLogger(__name__)


class GeminiSchedulingClient:
    """
    Gemini 2.5 Pro client optimized for scheduling pipeline
    """
    
    def __init__(self):
        self.model: Optional[GenerativeModel] = None
        self.is_initialized = False
        self.request_count = 0
        self.total_tokens = 0
        self.total_processing_time = 0.0
    
    async def initialize(self):
        """Initialize Gemini client"""
        if self.is_initialized:
            return
        
        try:
            # Configure Gemini API
            genai.configure(api_key=settings.gemini.api_key)
            
            # Initialize model with safety settings
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
            
            generation_config = genai.GenerationConfig(
                temperature=settings.gemini.temperature,
                max_output_tokens=settings.gemini.max_tokens,
            )
            
            self.model = GenerativeModel(
                model_name=settings.gemini.model_name,
                safety_settings=safety_settings,
                generation_config=generation_config
            )
            
            self.is_initialized = True
            logger.info(f"Gemini client initialized with model: {settings.gemini.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
            raise
    
    async def generate_scheduling_response(
        self,
        system_prompt: str,
        user_input: str,
        enable_thinking: bool = True,
        model_name: str = None
    ) -> Dict[str, Any]:
        """
        Generate response from Gemini for scheduling tasks
        
        Args:
            system_prompt: System prompt defining the agent's role
            user_input: User input data (JSON string)
            enable_thinking: Enable thinking mode
            model_name: Model name for logging
            
        Returns:
            Dict containing response and metadata
        """
        if not self.is_initialized:
            await self.initialize()
        
        start_time = time.time()
        self.request_count += 1
        
        try:
            # Construct full prompt
            full_prompt = self._construct_scheduling_prompt(
                system_prompt, 
                user_input, 
                enable_thinking,
                model_name
            )
            
            logger.info(f"Generating response for {model_name or 'unknown'} (thinking: {enable_thinking})")
            
            # Generate response with retry logic
            response = await self._generate_with_retry(full_prompt)
            
            processing_time = time.time() - start_time
            self.total_processing_time += processing_time
            
            # Process response
            result = self._process_scheduling_response(response, processing_time, model_name)
            
            logger.info(f"Generated response for {model_name or 'unknown'} in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Failed to generate response for {model_name or 'unknown'}: {str(e)}")
            
            return {
                "success": False,
                "error": str(e),
                "processing_time": processing_time,
                "timestamp": datetime.utcnow().isoformat(),
                "model_name": model_name
            }
    
    def _construct_scheduling_prompt(
        self,
        system_prompt: str,
        user_input: str,
        enable_thinking: bool,
        model_name: str = None
    ) -> str:
        """Construct the complete prompt for scheduling agents"""
        
        thinking_instructions = ""
        if enable_thinking:
            thinking_instructions = """
<thinking>
Before responding, think through this scheduling problem step by step:
1. What type of scheduling agent am I and what is my specific role?
2. What input data have I received and what dependencies do I need to process?
3. What are the key constraints, resources, or optimization goals I need to consider?
4. What calculations or analysis do I need to perform?
5. What format should my output follow and what fields are mandatory?
6. How can I ensure my output will be useful for the next tier of agents?
</thinking>

"""
        
        agent_context = f"\n\n## Agent Context\nYou are the {model_name or 'Scheduling Agent'} in a 2001: A Space Odyssey scheduling pipeline.\n" if model_name else ""
        
        prompt = f"""{system_prompt}{agent_context}

{thinking_instructions}## Input Data
{user_input}

## Response Instructions
Respond with a complete, valid JSON object following the exact format specified in your system prompt. Never provide text explanations outside the JSON structure.
"""
        
        return prompt
    
    async def _generate_with_retry(self, prompt: str) -> Any:
        """Generate response with retry logic"""
        max_retries = settings.gemini.max_retries
        
        for attempt in range(max_retries + 1):
            try:
                # Use asyncio to run the sync generate_content method
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.model.generate_content,
                    prompt
                )
                
                return response
                
            except Exception as e:
                if attempt < max_retries:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise e
    
    def _process_scheduling_response(
        self,
        response: Any,
        processing_time: float,
        model_name: str = None
    ) -> Dict[str, Any]:
        """Process Gemini response for scheduling pipeline"""
        
        try:
            # Extract text from response
            response_text = response.text if hasattr(response, 'text') else str(response)
            
            # Update token usage if available
            if hasattr(response, 'usage_metadata'):
                self.total_tokens += getattr(response.usage_metadata, 'total_token_count', 0)
            
            # Try to parse as JSON directly first
            try:
                json_response = json.loads(response_text.strip())
                
                # Validate it's a proper scheduling agent response
                if not self._validate_scheduling_response(json_response, model_name):
                    logger.warning(f"Response validation failed for {model_name or 'unknown'}")
                
                return {
                    "success": True,
                    "data": json_response,
                    "raw_response": response_text,
                    "processing_time": processing_time,
                    "timestamp": datetime.utcnow().isoformat(),
                    "model_name": model_name,
                    "token_count": getattr(response.usage_metadata, 'total_token_count', 0) if hasattr(response, 'usage_metadata') else 0
                }
                
            except json.JSONDecodeError as e:
                logger.warning(f"Direct JSON parsing failed for {model_name or 'unknown'}: {str(e)}, trying extraction...")
                
                # Try to extract JSON from response
                extracted_json = self._extract_json_from_text(response_text)
                if extracted_json:
                    logger.info(f"Successfully extracted JSON for {model_name or 'unknown'}")
                    return {
                        "success": True,
                        "data": extracted_json,
                        "raw_response": response_text,
                        "processing_time": processing_time,
                        "timestamp": datetime.utcnow().isoformat(),
                        "model_name": model_name,
                        "json_extracted": True,
                        "token_count": getattr(response.usage_metadata, 'total_token_count', 0) if hasattr(response, 'usage_metadata') else 0
                    }
                
                logger.error(f"Failed to extract JSON from {model_name or 'unknown'} response")
                return {
                    "success": False,
                    "error": "JSON_PARSING_FAILED",
                    "raw_response": response_text,
                    "processing_time": processing_time,
                    "timestamp": datetime.utcnow().isoformat(),
                    "model_name": model_name
                }
                
        except Exception as e:
            logger.error(f"Failed to process response for {model_name or 'unknown'}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "processing_time": processing_time,
                "timestamp": datetime.utcnow().isoformat(),
                "model_name": model_name
            }
    
    def _validate_scheduling_response(self, json_response: Dict[str, Any], model_name: str = None) -> bool:
        """Validate that the response has the expected scheduling agent structure"""
        
        if not isinstance(json_response, dict):
            return False
        
        # Check for expected output keys based on agent type
        agent_output_keys = {
            "coordinatorAgent": "coordinatorOutput",
            "complianceConstraintsAgent": "complianceConstraintsOutput",
            "resourceLogisticsAgent": "resourceLogisticsOutput", 
            "optimizationScenarioAgent": "optimizationScenarioOutput"
        }
        
        if model_name in agent_output_keys:
            expected_key = agent_output_keys[model_name]
            if expected_key not in json_response:
                logger.warning(f"Missing expected output key '{expected_key}' for {model_name}")
                return False
        
        return True
    
    def _extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from text response"""
        try:
            # Find JSON code blocks with ```json
            if "```json" in text.lower():
                start = text.lower().find("```json") + 7
                end = text.find("```", start)
                if end != -1:
                    json_text = text[start:end].strip()
                    logger.info(f"Extracted JSON from code block ({len(json_text)} chars)")
                    return json.loads(json_text)
            
            # Find JSON code blocks with just ```
            if "```" in text and "{" in text:
                lines = text.split('\n')
                in_code_block = False
                json_lines = []
                
                for line in lines:
                    if line.strip() == "```json" or (line.strip() == "```" and not in_code_block):
                        in_code_block = True
                        continue
                    elif line.strip() == "```" and in_code_block:
                        break
                    elif in_code_block:
                        json_lines.append(line)
                
                if json_lines:
                    json_text = '\n'.join(json_lines).strip()
                    logger.info(f"Extracted JSON from generic code block ({len(json_text)} chars)")
                    return json.loads(json_text)
            
            # Find JSON object by braces (more robust)
            start_brace = text.find("{")
            if start_brace != -1:
                # Find matching closing brace
                brace_count = 0
                end_brace = start_brace
                
                for i in range(start_brace, len(text)):
                    if text[i] == "{":
                        brace_count += 1
                    elif text[i] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            end_brace = i
                            break
                
                if brace_count == 0:
                    json_text = text[start_brace:end_brace + 1]
                    logger.info(f"Extracted JSON by brace matching ({len(json_text)} chars)")
                    return json.loads(json_text)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to extract JSON: {str(e)}")
        
        return None
    
    def get_client_stats(self) -> Dict[str, Any]:
        """Get client usage statistics"""
        return {
            "is_initialized": self.is_initialized,
            "model_name": settings.gemini.model_name,
            "request_count": self.request_count,
            "total_tokens": self.total_tokens,
            "total_processing_time": self.total_processing_time,
            "average_processing_time": self.total_processing_time / max(self.request_count, 1),
            "thinking_enabled": settings.gemini.thinking_enabled
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        if not self.is_initialized:
            return {
                "status": "unhealthy",
                "error": "Client not initialized"
            }
        
        try:
            # Simple test generation
            test_response = await self._generate_with_retry("Test health check: respond with 'OK'")
            return {
                "status": "healthy",
                "model": settings.gemini.model_name,
                "test_response_length": len(test_response.text) if hasattr(test_response, 'text') else 0
            }
        except Exception as e:
            return {
                "status": "unhealthy", 
                "error": str(e)
            }


# Global client instance
gemini_client = GeminiSchedulingClient()