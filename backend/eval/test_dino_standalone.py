import os
import sys
import time
import torch
import cv2
import numpy as np

# Ensure GroundingDINO is in sys.path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

def run_dino_standalone():
    print("=== InsightVision GroundingDINO Standalone Test ===")
    
    # 1. Check CUDA availability
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Device Name: {torch.cuda.get_device_name(0)}")
    else:
        print("Error: CUDA is not available. GroundingDINO requires a GPU to run efficiently.")
        sys.exit(1)
        
    # 2. Try importing GroundingDINO components
    try:
        from groundingdino.util.inference import load_model, predict
        import groundingdino.datasets.transforms as T
        print("GroundingDINO packages and compiled modules imported successfully!")
    except ImportError as e:
        print(f"Import Error: {e}")
        print("Verify your GroundingDINO installation.")
        sys.exit(1)
        
    # 3. Define paths and config
    config_path = os.path.join(_DINO_ROOT, "groundingdino/config/GroundingDINO_SwinT_OGC.py")
    weights_path = "/home/burhan/insightvision_benchmarks/GroundingDINO/weights/groundingdino_swint_ogc.pth"
        
    print(f"Config path: {config_path}")
    print(f"Weights path: {weights_path}")
    
    if not os.path.exists(config_path):
        print(f"Config path {config_path} does not exist.")
        sys.exit(1)
        
    # 4. Attempt to load model
    print("\nLoading GroundingDINO model (Swin-T)...")
    try:
        t0 = time.time()
        model = load_model(config_path, weights_path, device="cuda")
        print(f"Model loaded successfully on GPU in {time.time() - t0:.1f}s.")
    except Exception as e:
        print(f"Model Loading Failed: {e}")
        print("Please check if weights are present or download them.")
        sys.exit(1)
        
    # 5. Run test inference
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        # Create a dummy image
        img = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        cv2.imwrite("images/ocr_check1.png", img)
    else:
        img = cv2.imread(img_path)
        
    # Convert BGR to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # GroundingDINO image transform
    transform = T.Compose([
        T.RandomResize([800], max_size=1333),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Load PIL image for transformation
    from PIL import Image
    pil_img = Image.fromarray(img_rgb)
    image_tensor, _ = transform(pil_img, None)
    
    prompt = "detect license plate"
    print(f"\nRunning GroundingDINO inference on prompt: '{prompt}'...")
    
    try:
        t1 = time.time()
        boxes, logits, phrases = predict(
            model=model,
            image=image_tensor,
            caption=prompt,
            box_threshold=0.3,
            text_threshold=0.25,
            device="cuda"
        )
        latency = (time.time() - t1) * 1000
        # Save visual detection overlay
        h_img, w_img, _ = img.shape
        for i, box_norm in enumerate(boxes):
            cx, cy, bw, bh = box_norm.tolist()
            x1 = int((cx - bw / 2.0) * w_img)
            y1 = int((cy - bh / 2.0) * h_img)
            x2 = int((cx + bw / 2.0) * w_img)
            y2 = int((cy + bh / 2.0) * h_img)
            
            # Draw green rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            # Draw text label
            label = f"{phrases[i]} ({logits[i]:.2f})"
            cv2.putText(img, label, (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
        out_path = "outputs/dino_standalone_result.png"
        os.makedirs("outputs", exist_ok=True)
        cv2.imwrite(out_path, img)
        print(f"  Saved visual result to: {out_path}")
        
        print("\n" + "=" * 50)
        print("GroundingDINO is fully operational on GPU inside this environment!")
        print("=" * 50)
        
    except Exception as e:
        print(f"Inference execution failed: {e}")

if __name__ == "__main__":
    run_dino_standalone()
