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

def process_video():
    input_path = "images/long_output3.mp4"
    output_path = "images/output/tracked_long_output3.mp4"
    max_frames = 500  # Process first 500 frames (~20 seconds) for quick verification
    detect_confidence = 0.4
    prompt = "person" # Generic prompt suitable for lab camera

    print(f"=== InsightVision Video Tracking Test ===")
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Prompt: '{prompt}' | DINO Conf: {detect_confidence}")
    print(f"Max Frames to process: {max_frames} (~{max_frames/25:.1f} seconds of video)")

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
    manager = TrackManager(method="botsort", frame_rate=25)
    session_id = "video-session-001"
    labels_map = [prompt]

    # Open video capture
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video file {input_path}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Video Info: {width}x{height} @ {fps} FPS | Total frames in source: {total_frames}")

    # Prepare Video Writer
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

            # Grounding DINO expects RGB numpy array
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ── 1. Detect objects on frame
            results = detector.detect(frame_rgb, prompt, detect_confidence)

            # Convert detections to np.ndarray tracker format
            dets_list = []
            for box, score, label in zip(results["boxes"], results["scores"], results["labels"]):
                x1, y1, x2, y2 = box
                dets_list.append([x1, y1, x2, y2, score, 0.0])

            dets = np.array(dets_list, dtype=np.float32) if dets_list else np.empty((0, 6), dtype=np.float32)

            # ── 2. Run tracker update
            tracks = manager.update_track(session_id, dets, frame, labels_map)

            # ── 3. Annotate frame
            for t in tracks:
                bx, by, bw, bh = t["bbox"]
                track_id = t["track_id"]
                label = t["label"]
                conf = t["confidence"]

                x1, y1, x2, y2 = int(bx), int(by), int(bx + bw), int(by + bh)

                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (200, 211, 34), 2)
                # Label tag
                tag = f"{label} #{track_id} ({conf:.2f})"
                cv2.putText(frame, tag, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 211, 34), 2)

            # Write annotated frame to output video
            out.write(frame)

            frame_idx += 1
            if frame_idx % 50 == 0:
                elapsed = time.time() - t_start
                fps_processing = frame_idx / elapsed
                print(f"Processed {frame_idx}/{max_frames} frames... ({fps_processing:.1f} processing FPS)")

    finally:
        cap.release()
        out.release()
        manager.clear_session(session_id)

    total_time = time.time() - t_start
    print(f"\n=== Video processing finished! ===")
    print(f"Total processed frames: {frame_idx}")
    print(f"Elapsed time: {total_time:.1f} seconds")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    process_video()
