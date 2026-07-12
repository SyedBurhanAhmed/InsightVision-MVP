import os
import sys
import torch
import numpy as np
from PIL import Image

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

def print_coords():
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    
    model = build_sam3_image_model()
    processor = Sam3Processor(model)
    
    img_path = "images/ocr_check1.png"
    pil_img = Image.open(img_path).convert("RGB")
    w, h = pil_img.size
    
    box = [676, 180, 742, 206]
    cx = ((box[0] + box[2]) / 2.0) / w
    cy = ((box[1] + box[3]) / 2.0) / h
    bw = (box[2] - box[0]) / w
    bh = (box[3] - box[1]) / h
    normalized_box = [cx, cy, bw, bh]
    
    with torch.no_grad():
        with torch.amp.autocast("cuda", dtype=torch.bfloat16):
            inference_state = processor.set_image(pil_img)
            inference_state = processor.set_text_prompt(prompt="license plate", state=inference_state)
            output = processor.add_geometric_prompt(box=normalized_box, label=True, state=inference_state)
            
    masks = output.get("masks", [])
    if len(masks) > 0:
        mask = masks[0]
        if isinstance(mask, torch.Tensor):
            mask = mask.cpu().numpy()
        
        # Squash to 2D
        if len(mask.shape) == 3 and mask.shape[0] == 1:
            mask = mask[0]
            
        print(f"Squashed Mask shape: {mask.shape}")
        
        # Check where mask is True
        ys, xs = np.where(mask > 0)
        if len(ys) > 0:
            print("====================================")
            print(f"Total True pixels in mask: {len(ys)}")
            print(f"Y min: {ys.min()}, Y max: {ys.max()}")
            print(f"X min: {xs.min()}, X max: {xs.max()}")
            print("====================================")
        else:
            print("Mask has 0 True pixels.")

if __name__ == "__main__":
    print_coords()
