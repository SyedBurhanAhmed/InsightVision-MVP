import os
import sys
import cv2
import time
import torch
import numpy as np
from PIL import Image

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def run_sam3_single_pass():
    print("=== InsightVision SAM3 Single-Pass (Detection + Segmentation) Verification ===")
    
    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
    except ImportError:
        print("Error: sam3 package not found. Ensure you are in env_sam3.")
        return
        
    print("Loading SAM3 model...")
    t0 = time.time()
    model = build_sam3_image_model()
    processor = Sam3Processor(model)
    print(f"Model loaded in {time.time() - t0:.1f}s.")
    
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"Error: Test image '{img_path}' not found.")
        return
        
    img = cv2.imread(img_path)
    h, w = img.shape[:2]
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)
    
    # We will test two prompts sequentially: vehicle and license plate
    prompts = ["vehicle", "license plate"]
    
    overlay = img.copy()
    # Define colors for different prompts (BGR)
    colors = [
        (0, 255, 0),     # Vehicle: Green
        (200, 211, 34)   # License Plate: Cyan
    ]
    
    try:
        with torch.no_grad():
            with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                t1 = time.time()
                inference_state = processor.set_image(img_pil)
                print(f"set_image took {time.time() - t1:.3f}s")
                
                for idx, prompt in enumerate(prompts):
                    print(f"\nPrompting SAM3 for: '{prompt}'...")
                    t2 = time.time()
                    
                    # Reset prompts to prevent cross-contamination between different queries
                    processor.reset_all_prompts(inference_state)
                    
                    # Run text grounding + segmentation
                    output = processor.set_text_prompt(prompt=prompt, state=inference_state)
                    print(f"set_text_prompt took {time.time() - t2:.3f}s")
                    
                    boxes = output.get("boxes")
                    masks = output.get("masks")
                    scores = output.get("scores")
                    
                    if boxes is None or len(boxes) == 0:
                        print(f"  No objects detected for '{prompt}'.")
                        continue
                        
                    # Process tensors
                    if isinstance(scores, torch.Tensor):
                        scores = scores.cpu().float().numpy()
                    if isinstance(boxes, torch.Tensor):
                        boxes = boxes.cpu().float().numpy()
                    if isinstance(masks, torch.Tensor):
                        masks = masks.cpu().float().numpy().astype(np.uint8)
                        
                    print(f"  Detected {len(boxes)} object(s).")
                    
                    for i in range(len(boxes)):
                        conf = scores[i]
                        x1, y1, x2, y2 = map(int, boxes[i])
                        mask = masks[i]
                        if len(mask.shape) == 3 and mask.shape[0] == 1:
                            mask = mask[0] # squeeze (1, H, W) to (H, W)
                            
                        print(f"  Object {i}: Conf={conf:.4f}, Box=[{x1}, {y1}, {x2}, {y2}]")
                        
                        color = colors[idx % len(colors)]
                        # Draw bounding box
                        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
                        
                        # Add label
                        label_text = f"{prompt} {conf:.2f}"
                        cv2.putText(overlay, label_text, (x1, max(y1 - 10, 10)), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                                    
                        # Apply mask overlay
                        overlay_mask = np.zeros_like(img, dtype=np.uint8)
                        overlay_mask[mask == 1] = color
                        
                        # Only blend where the mask is positive to preserve other annotations
                        mask_indices = mask == 1
                        overlay[mask_indices] = cv2.addWeighted(img, 0.4, overlay_mask, 0.6, 0)[mask_indices]
                        
    except Exception as e:
        print(f"Error during SAM3 single-pass execution: {e}")
        import traceback
        traceback.print_exc()
        return
        
    out_dir = "outputs"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "result_sam3_single_pass.png")
    cv2.imwrite(out_path, overlay)
    print(f"\nSaved annotated visualization to: {out_path}")
    print("=" * 60)

if __name__ == "__main__":
    run_sam3_single_pass()
