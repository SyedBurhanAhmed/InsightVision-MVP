import os
import sys
import time
import logging

# Ensure app module can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.query_parser import QueryParser

# Mute debug logs for clean table output
logging.getLogger("app.services.query_parser").setLevel(logging.ERROR)

queries = [
    # detect
    "find the guy in red near the door",
    "how many white cars are in the parking lot?",
    "locate the dropped package on the conveyor belt",
    "are there any safety helmets visible?",
    
    # segment
    "give me the mask for the blue truck",
    "outline the spilled liquid on the floor",
    "segment the person wearing a yellow vest",
    "highlight the boundary of the crack on the wall",
    
    # track
    "track the cyclist across the intersection",
    "follow the red sedan",
    "keep an eye on the person carrying a black backpack",
    "track the drone flying in the sky",
    
    # ocr
    "read the number plate on that car",
    "what does the sign above the door say?",
    "extract the serial number from the engine block",
    "read the text on the employee's ID badge",
    
    # describe
    "what is happening in this scene?",
    "describe the overall layout of the warehouse",
    "what are the people doing near the counter?",
    "summarize the activity in the room"
]

def run_eval():
    parser = QueryParser()
    
    print(f"{'RAW QUERY':<55} | {'TASK':<10} | {'PROMPT':<35} | {'ATTRIBUTE':<25} | {'LATENCY (ms)'}")
    print("-" * 145)
    
    for q in queries:
        start_time = time.time()
        result = parser.parse(q)
        latency = (time.time() - start_time) * 1000
        
        task = result.get('task', '')
        prompt = result.get('prompt', '')
        attr = result.get('attribute', '')
        if attr is None:
            attr = "None"
            
        print(f"{q:<55} | {task:<10} | {prompt:<35} | {attr:<25} | {latency:.2f}")

if __name__ == "__main__":
    run_eval()
