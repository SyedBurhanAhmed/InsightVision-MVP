import os
import sys
import time
import numpy as np
from PIL import Image

# Ensure cv2 is available
try:
    import cv2
except ImportError:
    print("opencv-python not found. Run: pip install opencv-python-headless")
    sys.exit(1)

def run_sam3_standalone():
    print("=== InsightVision SAM 3 Standalone Loader Test ===")
    
    # 1. Attempt to import SAM 3 builder
    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
        print("SAM 3 packages imported successfully.")
    except ImportError as e:
        print(f"Import Error: {e}")
        print("Please verify that the 'sam3' package is installed in your active environment.")
        sys.exit(1)

    # 2. Try loading the model weights
    # This downloads the checkpoint from Hugging Face if access is granted.
    print("\nAttempting to build SAM 3 image model (will download weights)...")
    try:
        t0 = time.time()
        model = build_sam3_image_model()
        processor = Sam3Processor(model)
        print(f"SAM 3 model loaded successfully in {time.time() - t0:.1f}s.")
    except Exception as e:
        print(f"\nModel Loading Failed: {e}")
        print("\nPossible Causes:")
        print("1. HuggingFace authentication required: Run 'huggingface-cli login'.")
        print("2. Gate Approval required: Ensure you requested and got access to SAM 3 on Hugging Face.")
        print("3. Network/Proxy error.")
        sys.exit(1)

    # 3. Perform segmentation check
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"Test image '{img_path}' not found.")
        sys.exit(1)

    image_pil = Image.open(img_path).convert("RGB")
    h, w = image_pil.height, image_pil.width

    # Coordinates of the vehicle license plate region
    box = [676, 180, 742, 206]
    print(f"\nRunning SAM 3 inference on prompt box: {box}...")

    import torch
    try:
        t1 = time.time()
        # Normalize box to cx, cy, w, h in range [0, 1]
        x1, y1, x2, y2 = box
        cx = ((x1 + x2) / 2.0) / w
        cy = ((y1 + y2) / 2.0) / h
        w_norm = (x2 - x1) / w
        h_norm = (y2 - y1) / h
        normalized_box = [cx, cy, w_norm, h_norm]

        with torch.no_grad():
            with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                inference_state = processor.set_image(image_pil)
                # Call add_geometric_prompt instead of set_box_prompt
                output = processor.add_geometric_prompt(box=normalized_box, label=True, state=inference_state)
        latency = (time.time() - t1) * 1000

        masks = output.get("masks", [])
        if masks is not None and len(masks) > 0:
            mask = masks[0]
            # Convert PyTorch tensor to numpy
            if isinstance(mask, torch.Tensor):
                mask = mask.cpu().numpy().astype(np.uint8)
            # Squeeze if shape has extra dimension (e.g. 1, H, W)
            if len(mask.shape) == 3 and mask.shape[0] == 1:
                mask = mask[0]
                
            print(f"Segmentation successful!")
            print(f"  Mask shape: {mask.shape}")
            print(f"  Mask pixel sum: {np.sum(mask)}")
            print(f"  Latency: {latency:.1f}ms")
            
            # Save visual segment overlay
            img_cv = cv2.imread(img_path)
            overlay = img_cv.copy()
            overlay[mask == 1] = [39, 255, 20] # Green mask highlight
            blended = cv2.addWeighted(img_cv, 0.5, overlay, 0.5, 0)
            
            out_path = "outputs/sam3_standalone_segment.png"
            os.makedirs("outputs", exist_ok=True)
            cv2.imwrite(out_path, blended)
            print(f"  Saved segment overlay to: {out_path}")
        else:
            print("No mask was generated.")
            
    except Exception as e:
        print(f"Inference execution failed: {e}")

if __name__ == "__main__":
    run_sam3_standalone()
