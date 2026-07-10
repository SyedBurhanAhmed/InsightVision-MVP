import cv2, numpy as np, asyncio
from app.ml.models import load_models
from app.core.state import ml_models
async def main():
    print("Loading models...")
    await load_models()
    det = ml_models["grounding_dino"]
    img = np.zeros((720, 1280, 3), dtype=np.uint8)
    print("Running DINO on black image...")
    out = det.detect(img, "person in orange vest", 0.35)
    print("Done:", out)
asyncio.run(main())
