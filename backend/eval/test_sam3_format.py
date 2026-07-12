import os
import sys
import torch
import numpy as np
from PIL import Image

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

def run_tests():
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    
    model = build_sam3_image_model()
    processor = Sam3Processor(model)
    
    img_path = "images/ocr_check1.png"
    pil_img = Image.open(img_path).convert("RGB")
    w, h = pil_img.size
    
    box = [676, 180, 742, 206]
    
    # Format A: Normalized cxcywh
    cx_norm = ((box[0] + box[2]) / 2.0) / w
    cy_norm = ((box[1] + box[3]) / 2.0) / h
    bw_norm = (box[2] - box[0]) / w
    bh_norm = (box[3] - box[1]) / h
    box_a = [cx_norm, cy_norm, bw_norm, bh_norm]
    
    # Format B: Absolute cxcywh
    cx_abs = (box[0] + box[2]) / 2.0
    cy_abs = (box[1] + box[3]) / 2.0
    bw_abs = box[2] - box[0]
    bh_abs = box[3] - box[1]
    box_b = [cx_abs, cy_abs, bw_abs, bh_abs]

    # Format C: Normalized xyxy
    box_c = [box[0]/w, box[1]/h, box[2]/w, box[3]/h]
    
    # Format D: Absolute xyxy
    box_d = [float(x) for x in box]

    formats = {
        "A (Normalized cxcywh)": box_a,
        "B (Absolute cxcywh)": box_b,
        "C (Normalized xyxy)": box_c,
        "D (Absolute xyxy)": box_d
    }
    
    for name, prompt_box in formats.items():
        print(f"\n--- Testing Format: {name} (Prompt: {prompt_box}) ---")
        try:
            with torch.no_grad():
                with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                    state = processor.set_image(pil_img)
                    state = processor.set_text_prompt(prompt="license plate", state=state)
                    output = processor.add_geometric_prompt(box=prompt_box, label=True, state=state)
                    
            masks = output.get("masks", [])
            boxes = output.get("boxes", [])
            scores = output.get("scores", [])
            
            print(f"Detected {len(masks)} objects:")
            for i in range(len(masks)):
                mask = masks[i]
                sbox = boxes[i]
                score = scores[i]
                
                if isinstance(mask, torch.Tensor):
                    mask = mask.cpu().numpy()
                if isinstance(sbox, torch.Tensor):
                    sbox = sbox.cpu().numpy()
                if isinstance(score, torch.Tensor):
                    score = score.cpu().item()
                if len(mask.shape) == 3 and mask.shape[0] == 1:
                    mask = mask[0]
                    
                ys, xs = np.where(mask > 0)
                print(f"  Object {i} (Conf: {score:.4f}):")
                print(f"    Box: {sbox.tolist()}")
                if len(ys) > 0:
                    print(f"    Mask Y range: {ys.min()} to {ys.max()}")
                    print(f"    Mask X range: {xs.min()} to {xs.max()}")
                else:
                    print("    Mask is empty.")
        except Exception as e:
            print(f"  Failed: {e}")

if __name__ == "__main__":
    run_tests()
