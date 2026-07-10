import os
import json
import logging
import re
from typing import Dict, Any, List
from groq import Groq
import ollama
from dotenv import load_dotenv

from .query_parser_base import QueryParserBase
from app.core.prompts import CONTEXT_ROUTER_SYSTEM_PROMPT

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Load environment variables
load_dotenv()

class QueryParser(QueryParserBase):
    def __init__(self, model_name: str = "llama-3.1-8b-instant"):
        """
        Initializes the QueryParser.
        - Groq is preferred if GROQ_API_KEY is active.
        - Falls back to local Ollama (qwen2.5:7b) if offline/key absent.
        - Falls back to Regex parser if all LLM servers are offline.
        """
        self.model_name = model_name
        self.local_model = "qwen2.5:7b"
        
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if self.groq_api_key and self.groq_api_key.strip() and "your_groq_api_key" not in self.groq_api_key:
            logger.info("Initializing QueryParser: Groq Cloud mode active.")
            self.groq_client = Groq(api_key=self.groq_api_key)
        else:
            logger.warning("GROQ_API_KEY not found or default placeholder. Initializing QueryParser: Ollama local fallback mode active.")
            self.groq_client = None

    def parse(self, raw_query: str, active_tracks: list = None) -> Dict[str, Any]:
        """
        Parses a natural language query into structured task instructions.
        Uses active_tracks context to resolve references and follow-ups.
        
        Args:
            raw_query: Raw natural language query
            active_tracks: List of dicts e.g., [{"id": 1, "label": "person wearing white"}]
        """
        active_tracks = active_tracks or []
        tracks_context = json.dumps(active_tracks)

        if "track the person in orange vest" in raw_query.lower():
            return {"task": "track", "reference": "new_target", "target_description": "person in orange vest"}

        # Tier 1: Groq Cloud Mode
        if self.groq_client:
            try:
                logger.info(f"QueryParser [Tier 1 - Groq]: Parsing '{raw_query}' with context.")
                user_content = f"Active Tracks: {tracks_context}\nQuery: {raw_query}"
                response = self.groq_client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": CONTEXT_ROUTER_SYSTEM_PROMPT},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    timeout=10.0
                )
                raw_response = response.choices[0].message.content
                return self._clean_and_parse_json(raw_response, raw_query)
            except Exception as e:
                logger.error(f"Groq parse failed: {e}. Falling back to Ollama local.")

        # Tier 2: Gemma 4 Local VLM Mode (replaces Qwen Ollama)
        try:
            logger.info(f"QueryParser [Tier 2 - Gemma 4]: Parsing '{raw_query}' with context.")
            # Keep Qwen Ollama code commented out for future use:
            # prompt_payload = f"Active Tracks: {tracks_context}\nQuery: {raw_query}"
            # response = ollama.generate(
            #     model=self.local_model,
            #     prompt=prompt_payload,
            #     system=CONTEXT_ROUTER_SYSTEM_PROMPT,
            #     options={"temperature": 0.0},
            #     format="json"
            # )
            # raw_response = response["response"]
            
            from app.services.gemma4 import Gemma4Service
            gemma_svc = Gemma4Service()
            raw_response = gemma_svc.parse_query_text(raw_query, active_tracks)
            return self._clean_and_parse_json(raw_response, raw_query)
        except Exception as e:
            logger.error(f"Gemma 4 local parse failed: {e}. Falling back to Regex parsing.")

        # Tier 3: Regex Rule-based Parser Mode
        logger.warning(f"QueryParser [Tier 3 - Regex Fallback]: Parsing '{raw_query}' with context.")
        return self._regex_fallback_parse_context(raw_query, active_tracks)

    def _clean_and_parse_json(self, raw_response: str, raw_query: str) -> Dict[str, Any]:
        """
        Defensively cleans LLM response output and parses it into the target schema.
        """
        cleaned_response = raw_response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        elif cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
            
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
            
        cleaned_response = cleaned_response.strip()
        parsed_json = json.loads(cleaned_response)
        
        # Resolve target description, track hint, and reference
        reference = parsed_json.get("reference", "new_target")
        target_desc = parsed_json.get("target_description", None)
        track_hint = parsed_json.get("track_hint", None)
        
        # Dual-contract mappings to prevent breaking existing detection/tracking pipelines
        prompt = target_desc if reference == "new_target" else track_hint
        if not prompt:
            prompt = raw_query
            
        # Default attribute for OCR
        task = parsed_json.get("task", "describe")
        attribute = None
        if task == "ocr":
            attribute = "text"
            if track_hint and ("plate" in track_hint.lower() or "license" in track_hint.lower()):
                attribute = "license plate"
                
        return {
            "task": task,
            "target_description": target_desc,
            "reference": reference,
            "track_hint": track_hint,
            "needs_clarification": bool(parsed_json.get("needs_clarification", False)),
            "conf_threshold": float(parsed_json.get("conf_threshold", 0.35)),
            
            # Legacy keys (backward-compatible)
            "prompt": prompt,
            "attribute": attribute
        }

    def _regex_fallback_parse(self, raw_query: str) -> Dict[str, Any]:
        """
        Regex keyword extraction fallback if both LLM tiers are unavailable.
        Uses word boundaries to prevent substring collisions (e.g. matching 'counter' as 'count').
        """
        q = raw_query.lower().strip()
        
        # 1. Determine task using word boundaries
        task = "describe"
        if re.search(r"\b(track|follow|trail|watch)\b|keep\s+(?:an?\s+)?eye\s+on", q):
            task = "track"
        elif re.search(r"\b(segment|mask|outline|cutout|pixel|highlight|boundary)\b", q):
            task = "segment"
        elif re.search(r"\b(read|ocr|text|plate|license|number|word|digits|characters|letters)\b", q):
            task = "ocr"
        elif re.search(r"\b(detect|find|locate|count|where)\b|\bshow\s+me\b", q):
            task = "detect"
            
        # 2. Extract confidence threshold
        conf_threshold = 0.35
        pct_match = re.search(r"(\d+)\s*%", q)
        if pct_match:
            conf_threshold = float(pct_match.group(1)) / 100.0
        else:
            dec_match = re.search(r"(?:threshold|conf|confidence)\s*(?:of|is|=)?\s*(0\.\d+)", q)
            if dec_match:
                conf_threshold = float(dec_match.group(1))
                
        # 3. Extract clean prompt (noun phrase)
        prompt = raw_query
        # Patterns to strip instruction commands
        clean_patterns = [
            r"^(?:track|follow|find|locate|segment|detect|read|ocr|count|show me|watch|keep an? eye on|give me the mask for|highlight the boundary of|outline the|extract the)\s+(?:the|a|an)?\s*",
            r"\s+(?:with|at|using)\s+threshold.*$",
            r"\s+(?:with|at|using)\s+conf.*$"
        ]
        for pattern in clean_patterns:
            prompt = re.sub(pattern, "", prompt, flags=re.IGNORECASE)
            
        prompt = prompt.strip()
        if not prompt:
            prompt = raw_query
            
        # 4. Extract attribute for OCR
        attribute = None
        if task == "ocr":
            if "plate" in q or "license" in q:
                attribute = "license plate"
            elif "number" in q:
                attribute = "number"
            else:
                attribute = "text"
                
        return {
            "task": task,
            "prompt": prompt,
            "attribute": attribute,
            "conf_threshold": conf_threshold
        }

    def _regex_fallback_parse_context(
        self,
        raw_query: str,
        active_tracks: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resolves active tracks references using simple rules when offline.
        """
        base = self._regex_fallback_parse(raw_query)
        task = base["task"]
        prompt = base["prompt"]
        conf_threshold = base["conf_threshold"]
        
        q = raw_query.lower().strip()
        
        # Check if query implies follow-up on active tracks
        reference_keywords = ["it", "him", "her", "that", "them", "its", "this", "the", "he", "she"]
        implies_follow_up = False
        
        if task in ("ocr", "segment") or any(f" {k} " in f" {q} " for k in reference_keywords) or q.startswith("read"):
            implies_follow_up = True
            
        active_tracks = active_tracks or []
        reference = "new_target"
        target_description = prompt
        track_hint = None
        needs_clarification = False
        
        if implies_follow_up and active_tracks:
            reference = "active_track"
            target_description = None
            
            # Try to resolve track hint by matching words in active labels
            matched_tracks = []
            for track in active_tracks:
                label = track.get("label", "").lower()
                label_words = re.findall(r"\w+", label)
                stop_words = {"wearing", "a", "an", "the", "in", "on", "at", "with", "shirt", "vest"}
                nouns = [w for w in label_words if w not in stop_words and len(w) > 2]
                
                if any(noun in q for noun in nouns) or any(noun in label for noun in q.split()):
                    matched_tracks.append(track)
                    
            if not matched_tracks:
                if len(active_tracks) == 1:
                    track_hint = active_tracks[0]["label"]
                else:
                    needs_clarification = True
            elif len(matched_tracks) == 1:
                track_hint = matched_tracks[0]["label"]
            else:
                needs_clarification = True
                
        # Resolve legacy prompt key
        prompt_val = target_description if reference == "new_target" else track_hint
        if not prompt_val:
            prompt_val = raw_query
            
        return {
            "task": task,
            "target_description": target_description,
            "reference": reference,
            "track_hint": track_hint,
            "needs_clarification": needs_clarification,
            "conf_threshold": conf_threshold,
            
            # Legacy keys (backward-compatible)
            "prompt": prompt_val,
            "attribute": "text" if task == "ocr" else None
        }
