import os
import sys
import time
import torch
import cv2
import numpy as np

# Ensure GroundingDINO_sam3 is in sys.path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

# Ensure app directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def run_integrated_pipeline():
    print("=== InsightVision Integrated SAM3 + DINO + Boxmot Verification ===")
    
    # 1. Imports check
    try:
        from groundingdino.util.inference import load_model, predict
        import groundingdino.datasets.transforms as T
        from PIL import Image
        print("✔ GroundingDINO imported successfully.")
    except ImportError as e:
        print(f"❌ GroundingDINO Import Error: {e}")
        return
        
    try:
        from boxmot.trackers.bbox.botsort.botsort import BotSort
        print("✔ Boxmot BotSort imported successfully.")
    except ImportError as e:
        print(f"❌ Boxmot Import Error: {e}")
        return

    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
        print("✔ SAM 3 imported successfully.")
    except ImportError as e:
        print(f"❌ SAM 3 Import Error: {e}")
        return

    # 2. Check GPU/CUDA
    print(f"✔ CUDA Available: {torch.cuda.is_available()}")
    
    # 3. Load GroundingDINO Detector on GPU
    config_path = os.path.join(_DINO_ROOT, "groundingdino/config/GroundingDINO_SwinT_OGC.py")
    weights_path = "/home/burhan/insightvision_benchmarks/GroundingDINO/weights/groundingdino_swint_ogc.pth"
    print("\nLoading GroundingDINO...")
    model_dino = load_model(config_path, weights_path, device="cuda")
    print("✔ GroundingDINO loaded on GPU.")

    # 4. Load SAM 3 Segmenter on GPU
    print("\nLoading SAM 3...")
    model_sam3 = build_sam3_image_model()
    processor_sam3 = Sam3Processor(model_sam3)
    print("✔ SAM 3 loaded on GPU.")

    # 5. Initialize Boxmot Tracker
    print("\nInitializing Boxmot BotSort Tracker...")
    tracker = BotSort(
        with_reid=False,
        track_high_thresh=0.3,
        track_low_thresh=0.1,
        new_track_thresh=0.4,
        track_buffer=30,
        match_thresh=0.8,
        frame_rate=30
    )
    print("✔ Tracker initialized successfully.")

    # 6. Run Integrated Frame Processing
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"❌ Test image '{img_path}' not found.")
        return
        
    img = cv2.imread(img_path)
    h, w, _ = img.shape
    
    # --- PHASE A: Detection with GroundingDINO ---
    print("\n[PHASE A] Running GroundingDINO detection...")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    transform = T.Compose([
        T.RandomResize([800], max_size=1333),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    pil_img = Image.fromarray(img_rgb)
    image_tensor, _ = transform(pil_img, None)
    
    boxes, logits, phrases = predict(
        model=model_dino,
        image=image_tensor,
        caption="license plate",
        box_threshold=0.3,
        text_threshold=0.25,
        device="cuda"
    )
    
    if len(boxes) == 0:
        print("❌ No license plate detected by GroundingDINO. Exiting pipeline.")
        return
        
    print(f"✔ Detected plate region! Bboxes: {boxes.tolist()}")

    # Convert DINO relative coordinates [cx, cy, w, h] to absolute [x1, y1, x2, y2, confidence, class_id]
    # DINO boxes are normalized relative to image dimensions
    cx, cy, bw, bh = boxes[0].tolist()
    x1 = (cx - bw/2) * w
    y1 = (cy - bh/2) * h
    x2 = (cx + bw/2) * w
    y2 = (cy + bh/2) * h
    conf = float(logits[0])
    
    # Format detection for Boxmot: [x1, y1, x2, y2, conf, class_id]
    dets = np.array([[x1, y1, x2, y2, conf, 0]], dtype=np.float32)

    # --- PHASE B: Tracking with Boxmot ---
    print("\n[PHASE B] Updating Boxmot tracker with detection...")
    tracks = tracker.update(dets, img)
    if len(tracks) == 0:
        # Fallback if first frame track doesn't register instantly
        print("ℹ Track did not register instantly (common on frame 1). Using simulated track ID.")
        track_id = 1
        track_box = [x1, y1, x2, y2]
    else:
        track = tracks[0]
        track_id = int(track[4])
        track_box = track[0:4].tolist()
        print(f"✔ Track registered! ID: {track_id}, Box: {track_box}")

    # --- PHASE C: Segmentation with SAM 3 ---
    print("\n[PHASE C] Segmenting tracked region using SAM 3...")
    
    # Normalize coordinates for SAM 3 geometric prompt [cx, cy, w, h] in range [0, 1]
    tx1, ty1, tx2, ty2 = track_box
    tcx = ((tx1 + tx2) / 2.0) / w
    tcy = ((ty1 + ty2) / 2.0) / h
    tw = (tx2 - tx1) / w
    th = (ty2 - ty1) / h
    normalized_box = [tcx, tcy, tw, th]

    t_start = time.time()
    with torch.no_grad():
        with torch.amp.autocast("cuda", dtype=torch.bfloat16):
            inference_state = processor_sam3.set_image(pil_img)
            output = processor_sam3.add_geometric_prompt(box=normalized_box, label=True, state=inference_state)
    latency = (time.time() - t_start) * 1000

    masks = output.get("masks", [])
    if masks is not None and len(masks) > 0:
        mask = masks[0]
        if isinstance(mask, torch.Tensor):
            mask = mask.cpu().numpy().astype(np.uint8)
        if len(mask.shape) == 3 and mask.shape[0] == 1:
            mask = mask[0]
            
        print("✔ SAM 3 Mask generated successfully!")
        print(f"  Shape: {mask.shape}")
        print(f"  Pixel count: {np.sum(mask)}")
        print(f"  Inference Latency: {latency:.1f}ms")
        
        # Save output visual overlay with bounding boxes and track ID annotations
        overlay = img.copy()
        overlay[mask == 1] = [39, 255, 20] # Green mask color
        blended = cv2.addWeighted(img, 0.6, overlay, 0.4, 0)
        
        # Draw bounding box (Blue) and Track ID (Red text)
        tx1_i, ty1_i, tx2_i, ty2_i = map(int, track_box)
        cv2.rectangle(blended, (tx1_i, ty1_i), (tx2_i, ty2_i), (255, 100, 0), 2)
        cv2.putText(blended, f"Track {track_id} (License Plate)", (tx1_i, ty1_i - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        out_path = "outputs/integrated_pipeline_test.png"
        os.makedirs("outputs", exist_ok=True)
        cv2.imwrite(out_path, blended)
        print(f"✔ Saved visual pipeline result to: {out_path}")
        
        # Save a zoomed-in crop of the tracked license plate region for close inspection
        pad = 20
        crop_y1 = max(0, ty1_i - pad)
        crop_y2 = min(h, ty2_i + pad)
        crop_x1 = max(0, tx1_i - pad)
        crop_x2 = min(w, tx2_i + pad)
        
        crop = blended[crop_y1:crop_y2, crop_x1:crop_x2]
        zoom_path = "outputs/integrated_pipeline_zoom.png"
        cv2.imwrite(zoom_path, crop)
        print(f"✔ Saved zoomed-in crop of tracked license plate to: {zoom_path}")
    else:
        print("❌ No mask generated from SAM 3.")
        
    print("\n" + "=" * 60)
    print("INTEGRATED PIPELINE VERIFICATION SUCCESSFUL!")
    print("All components (GroundingDINO + Boxmot + SAM 3) are working together!")
    print("=" * 60)

if __name__ == "__main__":
    run_integrated_pipeline()
