import os
import sys
import json
import time

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.query_parser import QueryParser

# Define the 6 conversation turns
turns = [
    {
        "turn": 1,
        "query": "track the person in a white shirt",
        "active_tracks": []
    },
    {
        "turn": 2,
        "query": "what is the number on his back?",
        "active_tracks": [{"id": 1, "label": "person wearing a white shirt"}]
    },
    {
        "turn": 3,
        "query": "segment him",
        "active_tracks": [{"id": 1, "label": "person wearing a white shirt"}]
    },
    {
        "turn": 4,
        "query": "track the blue sedan",
        "active_tracks": [{"id": 1, "label": "person wearing a white shirt"}]
    },
    {
        "turn": 5,
        "query": "what color is it?",
        "active_tracks": [
            {"id": 1, "label": "person wearing a white shirt"},
            {"id": 2, "label": "blue sedan"}
        ]
    },
    {
        "turn": 6,
        "query": "read the number on the bike's license plate",
        "active_tracks": [
            {"id": 1, "label": "person wearing a white shirt"},
            {"id": 2, "label": "blue sedan"}
        ]
    }
]

def run_context_test():
    print("=== InsightVision Session Context Routing Test ===")
    
    # Force local Gemma 4 parser
    print("\n[Initializing QueryParser in LOCAL GEMMA 4 mode...]")
    os.environ["GROQ_API_KEY"] = ""
    parser = QueryParser()
    parser.groq_client = None
    
    print("-" * 125)
    print(f"{'TURN':<4} | {'RAW QUERY':<45} | {'TASK':<8} | {'REFERENCE':<12} | {'TRACK HINT':<30} | {'CLARIFY':<8}")
    print("-" * 125)
    
    for t in turns:
        q = t["query"]
        tracks = t["active_tracks"]
        
        start_time = time.time()
        res = parser.parse(q, active_tracks=tracks)
        latency = (time.time() - start_time) * 1000
        
        task = str(res.get("task", "") or "")
        ref = str(res.get("reference", "") or "")
        hint = str(res.get("track_hint", "") or "None")
        clarify = str(res.get("needs_clarification", False))
        
        print(f"#{t['turn']:<3} | {q:<45} | {task:<8} | {ref:<12} | {hint:<30} | {clarify:<8} ({latency:.0f}ms)")

if __name__ == "__main__":
    run_context_test()
