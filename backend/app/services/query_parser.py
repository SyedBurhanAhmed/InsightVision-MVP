import os
import json
import logging
from typing import Dict, Any
from groq import Groq
from dotenv import load_dotenv

from .query_parser_base import QueryParserBase
from app.core.prompts import ROUTER_SYSTEM_PROMPT

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Load environment variables
load_dotenv()

class QueryParser(QueryParserBase):
    def __init__(self, model_name: str = "llama3-8b-8192"):
        """
        Initializes the QueryParser with the Groq client.
        We default to `llama3-8b-8192` for fast routing, but we can attempt to use 
        the requested `Llama-4-Scout-17B-16E` if available.
        """
        self.model_name = "llama-3.1-8b-instant" # Fast, reliable routing model on Groq
        
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY not found in environment.")
            
        self.client = Groq(api_key=api_key)

    def parse(self, raw_query: str) -> Dict[str, Any]:
        fallback_result = {
            "task": "describe",
            "prompt": raw_query,
            "attribute": None,
            "conf_threshold": 0.35
        }
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                    {"role": "user", "content": raw_query}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            raw_response = response.choices[0].message.content
            logger.debug(f"Raw Groq response: {raw_response}")
            
            # Defensively clean possible markdown formatting
            cleaned_response = raw_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
                
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
                
            cleaned_response = cleaned_response.strip()
            
            parsed_json = json.loads(cleaned_response)
            logger.debug(f"Parsed JSON: {parsed_json}")
            
            return {
                "task": parsed_json.get("task", "describe"),
                "prompt": parsed_json.get("prompt", raw_query),
                "attribute": parsed_json.get("attribute", None),
                "conf_threshold": parsed_json.get("conf_threshold", 0.35)
            }
            
        except Exception as e:
            logger.error(f"Error parsing query '{raw_query}': {str(e)}")
            return fallback_result
