import os
import sys
import time
import cv2
import torch
import numpy as np
from pathlib import Path

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def process_sam3_native_video():
    input_path = "images/long_output3.mp4"
    output_path = "images/output/checking_sam3_native_person_black_shirt.mp4"
    # prompt = "person in blue stripes shirt"
    prompt = "person in black shirt"
    max_frames = 200
    temp_dir = "images/temp_sam3_frames"

    print(f"=== InsightVision SAM 3 NATIVE Video Tracking ===")
    print(f"Input: {input_path}")
    print(f"Prompt: '{prompt}'")

    if not os.path.exists(input_path):
        print(f"❌ Input video {input_path} not found.")
        return

    # Extract first 200 frames to a temporary directory to avoid OOM
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    print(f"Extracting first {max_frames} frames to {temp_dir} to avoid OOM...")
    cap = cv2.VideoCapture(input_path)
    extracted = 0
    while cap.isOpened() and extracted < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        cv2.imwrite(os.path.join(temp_dir, f"{extracted:05d}.jpg"), frame)
        extracted += 1
    cap.release()
    print(f"Extracted {extracted} frames.")

    # 1. Load SAM3 Video Predictor
    try:
        from sam3.model.sam3_video_predictor import Sam3VideoPredictor
    except ImportError:
        print("Error: sam3 package not found.")
        return

    print("Loading SAM3 Native Video Predictor...")
    t0 = time.time()
    predictor = Sam3VideoPredictor()
    print(f"SAM 3 Video Predictor loaded in {time.time() - t0:.1f}s.")

    # 2. Init State with video directory
    print("Initializing video state...")
    session_info = predictor.start_session(resource_path=temp_dir)
    session_id = session_info["session_id"]

    # 3. Add text prompt to frame 0
    print(f"Adding text prompt '{prompt}' to Frame 0...")
    response = predictor.handle_request(
        request=dict(
            type="add_prompt",
            session_id=session_id,
            frame_index=0,
            text=prompt,
        )
    )
    print("Frame 0 Add Prompt Response:", list(response["outputs"].keys()) if isinstance(response.get("outputs"), dict) else type(response.get("outputs")))

    # 4. Propagate through video
    print("Propagating tracking across frames...")
    
    # We will collect the masks and then draw them
    masks_dict = {}
    
    t_start = time.time()
    for response in predictor.handle_stream_request(
        request=dict(
            type="propagate_in_video",
            session_id=session_id,
        )
    ):
        out_frame_idx = response["frame_index"]
        outputs = response["outputs"]
        
        # DEBUG: Print keys of outputs for the first few frames
        if out_frame_idx < 3:
            print(f"Frame {out_frame_idx} outputs:", list(outputs.keys()) if isinstance(outputs, dict) else type(outputs))
        # In SAM 3, outputs is usually a dict containing obj_ids, mask_logits
        # or maybe the mask directly depending on the version. Let's inspect.
        if isinstance(outputs, tuple) and len(outputs) == 2:
            out_obj_ids, out_mask_logits = outputs
        elif isinstance(outputs, dict):
            out_obj_ids = outputs.get("out_obj_ids", [1])
            out_mask_logits = outputs.get("mask_logits")
            if out_mask_logits is None and "masks" in outputs:
                # convert mask to logits-like shape
                out_mask_logits = (outputs["masks"] * 2.0) - 1.0
            if out_mask_logits is None and "out_binary_masks" in outputs:
                # SAM3 handle_stream_request uses out_binary_masks directly
                # shape: [B, H, W] or [1, B, H, W] usually. Let's inspect it.
                binary_masks = outputs["out_binary_masks"]
                if isinstance(binary_masks, torch.Tensor):
                    out_mask_logits = (binary_masks.float() * 2.0) - 1.0
                elif isinstance(binary_masks, np.ndarray):
                    out_mask_logits = torch.from_numpy((binary_masks.astype(np.float32) * 2.0) - 1.0)
                else:
                    out_mask_logits = torch.tensor(binary_masks, dtype=torch.float32) * 2.0 - 1.0
        else:
            print("Unknown output format:", type(outputs))
            break
            
        if out_frame_idx >= max_frames:
            break
            
        if out_mask_logits is None or out_mask_logits.shape[0] == 0:
            # No mask found on this frame
            print(f"Frame {out_frame_idx}: No mask found")
            continue
            
        # Convert logit to mask
        mask = (out_mask_logits[0] > 0.0).cpu().numpy().astype(np.uint8)
        if len(mask.shape) == 3:
            mask = mask[0]  # If [1, H, W] -> [H, W]    
        masks_dict[out_frame_idx] = mask
        
        if out_frame_idx > 0 and out_frame_idx % 10 == 0:
            print(f"Propagated {out_frame_idx}/{max_frames} frames...")
            
    print(f"Propagation finished in {time.time() - t_start:.1f}s")
    
    # 5. Save output video
    print("Writing output video...")
    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    
    Path("images/output").mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
            
        mask = masks_dict.get(frame_idx)
        if mask is not None:
            # Draw Mask (Orange for native tracking)
            overlay = frame.copy()
            overlay_mask = np.zeros_like(frame, dtype=np.uint8)
            overlay_mask[mask == 1] = (0, 165, 255) # Orange
            mask_indices = mask == 1
            overlay[mask_indices] = cv2.addWeighted(frame, 0.4, overlay_mask, 0.6, 0)[mask_indices]
            
            # Find bounding box from mask to draw label
            y_indices, x_indices = np.where(mask == 1)
            if len(y_indices) > 0 and len(x_indices) > 0:
                y_min, y_max = y_indices.min(), y_indices.max()
                x_min, x_max = x_indices.min(), x_indices.max()
                
                cv2.rectangle(overlay, (x_min, y_min), (x_max, y_max), (0, 165, 255), 2)
                tag = f"Native Track ID 1"
                cv2.putText(overlay, tag, (x_min, y_min - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
                
            out.write(overlay)
        else:
            out.write(frame)
            
        frame_idx += 1

    cap.release()
    out.release()

    print(f"\n=== Native Video Tracking finished! ===")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    process_sam3_native_video()
