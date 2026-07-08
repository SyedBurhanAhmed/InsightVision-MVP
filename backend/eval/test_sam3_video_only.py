import os
import sys
import time
import cv2
import numpy as np
import torch
from pathlib import Path

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def process_sam3_only_video():
    input_path = "images/long_output3.mp4"
    output_path = "images/output/checking_sam3_only_person.mp4"
    max_frames = 200  # Process first 200 frames for quick verification
    prompt = "person in white"

    print(f"=== InsightVision SAM 3 ONLY Video Tracking (No DINO) ===")
    print(f"Input: {input_path}")
    print(f"Prompt: '{prompt}'")

    if not os.path.exists(input_path):
        print(f"❌ Input video {input_path} not found.")
        return

    # 1. Load SAM3
    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
    except ImportError:
        print("Error: sam3 package not found.")
        return

    print("Loading SAM3 Segmenter...")
    t0 = time.time()
    model_sam3 = build_sam3_image_model()
    processor = Sam3Processor(model_sam3)
    print(f"SAM 3 loaded in {time.time() - t0:.1f}s.")

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

    from PIL import Image

    try:
        while cap.isOpened() and frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            overlay = frame.copy()

            with torch.no_grad():
                with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                    inference_state = processor.set_image(pil_img)
                    processor.reset_all_prompts(inference_state)
                    
                    # SAM 3 Text Prompt Detection + Segmentation
                    output = processor.set_text_prompt(prompt=prompt, state=inference_state)
                    
                    boxes = output.get("boxes")
                    masks = output.get("masks")
                    scores = output.get("scores")
                    
                    if boxes is not None and len(boxes) > 0:
                        if isinstance(scores, torch.Tensor):
                            scores = scores.cpu().float().numpy()
                        if isinstance(boxes, torch.Tensor):
                            boxes = boxes.cpu().float().numpy()
                        if isinstance(masks, torch.Tensor):
                            masks = masks.cpu().float().numpy().astype(np.uint8)
                            
                        # Pick the mask with the highest text-grounding confidence
                        best_idx = int(np.argmax(scores))
                        conf = scores[best_idx]
                        
                        if conf > 0.4:  # Basic confidence threshold
                            x1, y1, x2, y2 = map(int, boxes[best_idx])
                            mask = masks[best_idx]
                            
                            if len(mask.shape) == 3 and mask.shape[0] == 1:
                                mask = mask[0]
                                
                            # Draw Mask (Purple)
                            overlay_mask = np.zeros_like(frame, dtype=np.uint8)
                            overlay_mask[mask == 1] = (255, 0, 255)
                            mask_indices = mask == 1
                            overlay[mask_indices] = cv2.addWeighted(frame, 0.4, overlay_mask, 0.6, 0)[mask_indices]
                            
                            # Draw Bounding Box
                            cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 0, 255), 2)
                            tag = f"SAM3: {prompt} ({conf:.2f})"
                            cv2.putText(overlay, tag, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 2)

            out.write(overlay)
            frame_idx += 1
            if frame_idx % 10 == 0:
                print(f"Processed {frame_idx}/{max_frames} frames... ({time.time() - t_start:.1f}s)")

    finally:
        cap.release()
        out.release()

    print(f"\n=== Video processing finished! ===")
    print(f"Total processed frames: {frame_idx} in {time.time() - t_start:.1f}s")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    process_sam3_only_video()
