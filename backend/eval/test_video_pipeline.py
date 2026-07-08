import os
import sys
import time
import cv2
import numpy as np
import torch
from pathlib import Path

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.detector import GroundingDINODetector
from app.services.track_manager import TrackManager
from app.services.segmenter import SAM3Segmenter
from groundingdino.util.inference import load_model

def process_video_pipeline():
    input_path = "images/long_output3.mp4"
    output_path = "images/output/checking_video_pipeline_person.mp4"
    max_frames = 200  # Process first 200 frames for quick verification
    detect_confidence = 0.35
    prompt = "person in white"

    print(f"=== InsightVision Full Video Pipeline (Detection -> Tracking -> Segmentation) ===")
    print(f"Input: {input_path}")
    print(f"Prompt: '{prompt}'")

    if not os.path.exists(input_path):
        print(f"❌ Input video {input_path} not found.")
        return

    # 1. Load Models
    print("Loading Grounding DINO model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dino_model = load_model(
        settings.GROUNDING_DINO_CONFIG_PATH,
        settings.GROUNDING_DINO_WEIGHTS_PATH,
        device=device
    )
    detector = GroundingDINODetector(dino_model)
    
    print("Loading SAM3 Segmenter...")
    segmenter = SAM3Segmenter()

    # 2. Instantiate Track Manager
    manager = TrackManager(method="botsort", frame_rate=25)
    session_id = "video-session-002"
    labels_map = [prompt]

    # Open video
    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    
    Path("images/output").mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0
    t_start = time.time()

    try:
        while cap.isOpened() and frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ── 1. Detection
            results = detector.detect(frame_rgb, prompt, detect_confidence)
            dets_list = []
            for box, score, label in zip(results["boxes"], results["scores"], results["labels"]):
                x1, y1, x2, y2 = box
                dets_list.append([x1, y1, x2, y2, score, 0.0])
            dets = np.array(dets_list, dtype=np.float32) if dets_list else np.empty((0, 6), dtype=np.float32)

            # ── 2. Tracking
            tracks = manager.update_track(session_id, dets, frame, labels_map)

            # ── 3. Segmentation (for each active track)
            overlay = frame.copy()
            for t in tracks:
                track_id = t["track_id"]
                label = t["label"]
                conf = t["confidence"]
                
                # Fetch mask for the tracked object using segment_track
                seg_res = segmenter.segment_track(session_id, track_id, manager, frame)
                mask = seg_res.get("mask")
                
                # Draw Mask
                if mask is not None:
                    # Randomish distinct color for tracks based on id
                    color = (255, (track_id * 50) % 255, (track_id * 100) % 255) 
                    overlay_mask = np.zeros_like(frame, dtype=np.uint8)
                    overlay_mask[mask == 1] = color
                    mask_indices = mask == 1
                    overlay[mask_indices] = cv2.addWeighted(frame, 0.4, overlay_mask, 0.6, 0)[mask_indices]
                
                # Draw Box
                bx, by, bw, bh = t["bbox"]
                x1, y1, x2, y2 = int(bx), int(by), int(bx + bw), int(by + bh)
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (200, 211, 34), 2)
                tag = f"{label} #{track_id} ({conf:.2f})"
                cv2.putText(overlay, tag, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 211, 34), 2)

            out.write(overlay)
            frame_idx += 1
            if frame_idx % 10 == 0:
                print(f"Processed {frame_idx}/{max_frames} frames...")

    finally:
        cap.release()
        out.release()
        manager.clear_session(session_id)

    print(f"\n=== Video processing finished! ===")
    print(f"Total processed frames: {frame_idx} in {time.time() - t_start:.1f}s")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    process_video_pipeline()
