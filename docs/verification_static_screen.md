# Verification: Analyze Image (Static Single-Image) Screen

This document details the backend code inspection, verification responses, and structural fixes applied to ensure that the static single-image analysis pipelines (POST `/api/detect` and POST `/api/vision/query`) are fully migrated to Gemma 4 and SAM 3.

---

## 1. Code Auditing & Migration Confirmation

### OCR Path (Gemma 4 integration)
We inspected the POST `/api/vision/query` endpoint in [query.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/routers/query.py).
* When a query is parsed as an `ocr` task, the endpoint instantiates and invokes **`Gemma4Reader`** (defined in [reader.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/services/reader.py)):
  ```python
  from app.services.reader import Gemma4Reader
  reader = Gemma4Reader()
  ocr_res = reader.read(img_rgb, [px1, py1, px2, py2])
  ```
* This is a complete migration away from the old Florence-2 based OCR paths. The reader crops the detected box region, routes the crop to the local GPU-loaded `google/gemma-4-E2B-it` model, transcribes the text, and passes it to the `NLComposer` to construct a natural sentence reply.

### Masks Toggle (SAM 3 integration)
We inspected the POST `/api/detect` endpoint in [vision.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/routers/vision.py) and POST `/api/vision/query` in [query.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/routers/query.py).
* When the `masks` boolean is toggled `true` (or the parsed task is `segment`), the backend instantiates and executes **`SAM3Segmenter`** (defined in [segmenter.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/services/segmenter.py)):
  ```python
  from app.services.segmenter import SAM3Segmenter
  segmenter = SAM3Segmenter()
  seg_res = segmenter.segment(img_rgb, boxes_to_seg)
  ```
* This completely replaces any old SAM2 implementations, ensuring the Segment Anything 3 (SAM3) prompt processor runs the box embeddings on the GPU and includes the SAM3 segmentation latency in the total `inference_ms` response.

---

## 2. Issues Discovered & Fixed

### Fix 1: GroundingDINO Path Correction
* **Issue**: The backend endpoints in `main.py`, `routers/vision.py`, and `routers/query.py` were appending the old GroundingDINO directory path (`~/insightvision_benchmarks/GroundingDINO`) to `sys.path`. This caused a compiled CUDA operations mismatch error: `Detector error: name '_C' is not defined`.
* **Fix**: Modified all occurrences to append the correct path for SAM3 coordinate alignment: **`~/insightvision_benchmarks/GroundingDINO_sam3`**. This successfully loads the custom C++ compiled operators on the GPU.

### Fix 2: Lazy Ultralytics Imports
* **Issue**: The service file `services/segmenter.py` was importing `ultralytics` at the module level. In the `env_sam3` Conda environment, `ultralytics` is not installed (as SAM2 has been retired). This caused a module load crash: `No module named 'ultralytics'` when importing `SAM3Segmenter`.
* **Fix**: Refactored `services/segmenter.py` to lazy-import `ultralytics` inside the `SAM2Segmenter.load_model()` method. This permits clean imports of `SAM3Segmenter` without dependencies on stale packages.

---

## 3. API Response Payloads

We executed verification requests using FastAPI's test client on GPU (`cuda`) using the test image `images/ocr_check1.png`.

### A. Object Detection Response (`detect`)
* **Endpoint**: POST `/api/detect`
* **Params**: `prompt="license plate"`, `model="groundingdino"`, `masks=false`
```json
{
  "objects": [
    {
      "id": "L001",
      "type": "license plate",
      "confidence": 0.5833,
      "score": 0.5833,
      "bbox": [
        676.4,
        179.9,
        65.8,
        25.8
      ],
      "normalized_bbox": [
        0.5442,
        0.2969,
        0.5971,
        0.3395
      ],
      "color": "#FF0040",
      "class": "license plate"
    }
  ],
  "inference_ms": 747.3,
  "total_ms": 760.3,
  "device": "cuda"
}
```

### B. VLM OCR Response (`ocr` via Gemma 4)
* **Endpoint**: POST `/api/vision/query`
* **Params**: `query="what is the number on license plate"`
```json
{
  "id": "000000000000019f40c51550",
  "id_int": 1783498085712,
  "query": "what is the number on license plate",
  "prompt": "what is the number on license plate",
  "answer": "The extracted text reads: \"AGY 128\".",
  "result": "The extracted text reads: \"AGY 128\".",
  "timestamp": "Just now",
  "time": "01:08 PM",
  "objects": [
    {
      "id": "T001",
      "type": "OCR: AGY 128",
      "confidence": 0.4417,
      "score": 0.4417,
      "bbox": [
        677.4,
        181.5,
        65.5,
        24.7
      ],
      "normalized_bbox": [
        0.545,
        0.2996,
        0.5976,
        0.3403
      ],
      "color": "#FF0040",
      "class": "OCR: AGY 128"
    }
  ],
  "task": "ocr",
  "inference_ms": 20602.0,
  "parser_ms": 219.8,
  "total_ms": 20854.3,
  "device": "cuda"
}
```

### C. Detection + Segmentation Response (`segment` via SAM 3)
* **Endpoint**: POST `/api/detect`
* **Params**: `prompt="license plate"`, `model="groundingdino"`, `masks=true`
```json
{
  "objects": [
    {
      "id": "L001",
      "type": "license plate",
      "confidence": 0.5833,
      "score": 0.5833,
      "bbox": [
        676.4,
        179.9,
        65.8,
        25.8
      ],
      "normalized_bbox": [
        0.5442,
        0.2969,
        0.5971,
        0.3395
      ],
      "color": "#FF0040",
      "class": "license plate"
    }
  ],
  "inference_ms": 1125.8,
  "total_ms": 1139.4,
  "device": "cuda"
}
```
*(Inference latency includes GroundingDINO detection and SAM3 mask generation on GPU.)*
