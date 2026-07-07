import os
import sys
import torch
import numpy as np
from PIL import Image

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

def test_text_only():
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    
    model = build_sam3_image_model()
    processor = Sam3Processor(model)
    
    img_path = "images/ocr_check1.png"
    pil_img = Image.open(img_path).convert("RGB")
    
    print("\nRunning SAM 3 text-only grounding on prompt: 'license plate'...")
    with torch.no_grad():
        with torch.amp.autocast("cuda", dtype=torch.bfloat16):
            inference_state = processor.set_image(pil_img)
            output = processor.set_text_prompt(prompt="license plate", state=inference_state)
            
    masks = output.get("masks", [])
    boxes = output.get("boxes", [])
    scores = output.get("scores", [])
    
    print(f"Number of objects detected: {len(masks)}")
    
    for i in range(len(masks)):
        mask = masks[i]
        box = boxes[i]
        score = scores[i]
        
        if isinstance(mask, torch.Tensor):
            mask = mask.cpu().numpy()
        if isinstance(box, torch.Tensor):
            box = box.cpu().numpy()
        if isinstance(score, torch.Tensor):
            score = score.cpu().item()
            
        if len(mask.shape) == 3 and mask.shape[0] == 1:
            mask = mask[0]
            
        ys, xs = np.where(mask > 0)
        print(f"\nObject {i}:")
        print(f"  Confidence Score: {score:.4f}")
        print(f"  Predicted Box (pixel coordinates): {box.tolist()}")
        if len(ys) > 0:
            print(f"  Mask Pixels: {len(ys)}")
            print(f"  Mask Y range: {ys.min()} to {ys.max()}")
            print(f"  Mask X range: {xs.min()} to {xs.max()}")
        else:
            print("  Mask is empty.")

if __name__ == "__main__":
    test_text_only()
