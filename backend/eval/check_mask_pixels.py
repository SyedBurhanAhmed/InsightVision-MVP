import os
import sys
import torch
import numpy as np
from PIL import Image

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

def check_mask():
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    
    model = build_sam3_image_model()
    processor = Sam3Processor(model)
    
    img_path = "images/ocr_check1.png"
    pil_img = Image.open(img_path).convert("RGB")
    w, h = pil_img.size
    
    # Bounding box coordinates
    box = [676, 180, 742, 206]
    cx = ((box[0] + box[2]) / 2.0) / w
    cy = ((box[1] + box[3]) / 2.0) / h
    bw = (box[2] - box[0]) / w
    bh = (box[3] - box[1]) / h
    normalized_box = [cx, cy, bw, bh]
    
    print(f"Image shape: {w}x{h}")
    print(f"Normalized Box: {normalized_box}")
    
    with torch.no_grad():
        with torch.amp.autocast("cuda", dtype=torch.bfloat16):
            inference_state = processor.set_image(pil_img)
            output = processor.add_geometric_prompt(box=normalized_box, label=True, state=inference_state)
            
    masks = output.get("masks", [])
    print(f"Number of masks returned: {len(masks)}")
    
    if len(masks) > 0:
        mask = masks[0]
        if isinstance(mask, torch.Tensor):
            mask = mask.cpu().numpy()
            
        if len(mask.shape) == 3 and mask.shape[0] == 1:
            mask = mask[0]
            
        print(f"Mask type: {mask.dtype}")
        print(f"Mask shape: {mask.shape}")
        
        # Find non-zero indices
        ys, xs = np.where(mask > 0)
        if len(ys) > 0:
            print(f"Number of non-zero pixels: {len(ys)}")
            print(f"Mask Y range: {ys.min()} to {ys.max()}")
            print(f"Mask X range: {xs.min()} to {xs.max()}")
            
            # Check if mask intersects the bounding box region
            bx1, by1, bx2, by2 = box
            inside_count = np.sum((xs >= bx1) & (xs <= bx2) & (ys >= by1) & (ys <= by2))
            print(f"Number of mask pixels inside prompt box {box}: {inside_count}")
        else:
            print("Mask is completely empty (no non-zero pixels).")

if __name__ == "__main__":
    check_mask()
