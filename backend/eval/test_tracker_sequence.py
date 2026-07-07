import os
import sys
import time
import logging
import cv2
import numpy as np
import torch
from pathlib import Path

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.detector import GroundingDINODetector
from app.services.track_manager import TrackManager
from groundingdino.util.inference import load_model

logging.basicConfig(level=logging.ERROR)

def run_sequence_test():
    print("=== InsightVision Real Frame Tracking Test ===")
    
    # 1. Load Grounding DINO
    print("Loading Grounding DINO model on GPU...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = load_model(
        settings.GROUNDING_DINO_CONFIG_PATH,
        settings.GROUNDING_DINO_WEIGHTS_PATH,
        device=device
    )
    detector = GroundingDINODetector(model)
    
    # 2. Instantiate Track Manager
    manager = TrackManager(method="botsort")
    session_id = "real-sequence-session"
    labels_map = ["person"]
    
    # Define frame sequences
    images_dir = Path("images")
    frames = ["frame_94.jpg", "frame_95.jpg", "frame_96.jpg", "frame_97.jpg"]
    
    output_dir = images_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\nStarting Tracking Loop...")
    print("-" * 90)
    
    for frame_name in frames:
        img_path = images_dir / frame_name
        if not img_path.exists():
            print(f"Frame {frame_name} not found at {img_path}")
            continue
            
        # Load frame
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"Failed to read image: {img_path}")
            continue
            
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Run detection
        t_detect_start = time.time()
        results = detector.detect(img_rgb, "person", 0.25)
        detect_ms = (time.time() - t_detect_start) * 1000
        
        # Convert detections to np.ndarray tracker format [x1, y1, x2, y2, score, class_id]
        boxes = results["boxes"]
        scores = results["scores"]
        labels = results["labels"]
        
        dets_list = []
        for box, score, label in zip(boxes, scores, labels):
            x1, y1, x2, y2 = box
            # map "person" to class 0
            dets_list.append([x1, y1, x2, y2, score, 0.0])
            
        dets = np.array(dets_list, dtype=np.float32) if dets_list else np.empty((0, 6), dtype=np.float32)
        
        # Run tracker update
        t_track_start = time.time()
        tracks = manager.update_track(session_id, dets, img, labels_map)
        track_ms = (time.time() - t_track_start) * 1000
        
        print(f"\n[{frame_name}] Detection: {len(boxes)} found ({detect_ms:.1f}ms) | Tracking: {len(tracks)} active ({track_ms:.1f}ms)")
        
        # Draw bounding boxes and track IDs on the frame
        for t in tracks:
            bx, by, bw, bh = t["bbox"]
            track_id = t["track_id"]
            label = t["label"]
            conf = t["confidence"]
            
            x1, y1, x2, y2 = int(bx), int(by), int(bx + bw), int(by + bh)
            
            # Draw bbox
            cv2.rectangle(img, (x1, y1), (x2, y2), (200, 211, 34), 2) # Teal-ish green
            # Draw label tag with ID
            tag = f"{label} ID:{track_id} ({conf:.2f})"
            cv2.putText(img, tag, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 211, 34), 2)
            
            print(f"  Track ID: {track_id:<2} | BBox: {[x1, y1, x2, y2]} | Conf: {conf:.2f}")
            
        # Save output frame
        out_path = output_dir / f"tracked_{frame_name}"
        cv2.imwrite(str(out_path), img)
        print(f"  Annotated frame saved to: {out_path}")
        
    # Clear session
    manager.clear_session(session_id)
    print("\n=== Tracking sequence test finished! ===")

if __name__ == "__main__":
    run_sequence_test()
