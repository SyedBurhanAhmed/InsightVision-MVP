# InsightVision — Antigravity Task Prompts

A sequence of ready-to-paste prompts for building InsightVision in an agentic IDE (Antigravity, Cursor, Windsurf, etc.). Paste one at a time, in order. Don't start the next prompt until the current one's "Definition of done" is verified by you, not just claimed by the agent.

General rules for working with the agent on this project:
- Always ask it to run the code and show you real output, not just generate code and stop.
- Review any evaluation/scoring/metric code yourself, line by line. Agents write code that compiles easily; they don't always write code that scores correctly.
- Commit to git after every prompt that ends in a working state.
- If a prompt references a specific model name, treat it as a placeholder — tell the agent your actual choice if it differs.

---

## Prompt 0 — Repository Scaffold

```
Set up a new project called insightvision with this exact structure:

insightvision/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── core/
│   │   ├── models/
│   │   └── main.py
│   ├── eval/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          (leave empty for now)
├── data/
│   ├── images/
│   └── annotations/
├── docs/
│   └── weekly_log.md
├── docker-compose.yml
└── README.md

Requirements:
- Python 3.11, FastAPI, pydantic v2
- requirements.txt should pin exact versions for: fastapi, uvicorn, pydantic, torch, transformers, ultralytics, redis, python-multipart, pillow, opencv-python, numpy
- main.py should have a working FastAPI app with a single GET /health endpoint that returns {"status": "ok"} and the current GPU availability (torch.cuda.is_available() and device name if available)
- Initialize a git repo, create a .gitignore appropriate for Python + node (exclude venv, __pycache__, node_modules, .env, *.pt, *.pth model weight files, data/images/*)
- README.md should have setup instructions: how to create the venv, install deps, and run the dev server

After creating everything, run the server and curl /health to confirm it returns a real GPU status from this machine. Show me the actual output, not just the code.
```

**Definition of done:** `curl localhost:8000/health` returns real JSON with your actual GPU info, not a placeholder.

---

## Prompt 1 — Module Interfaces (Architecture Skeleton)

```
In backend/app/services/, create abstract base interfaces for five modules. Each should be a Python file with an ABC class defining the contract — no model implementation yet, just the interface and clear docstrings.

1. query_parser_base.py — QueryParserBase with method parse(query: str) -> dict, returning {"task": str, "target": str, "attribute": str | None, "conf_threshold": float}

2. detector_base.py — DetectorBase with method detect(image: np.ndarray, target: str, conf_threshold: float) -> dict, returning {"boxes": list[list[float]], "scores": list[float], "labels": list[str], "inference_ms": float}

3. reader_base.py — ReaderBase with method read(image: np.ndarray, bbox: list[float]) -> dict, returning {"text": str, "confidence": float, "inference_ms": float}

4. segmenter_base.py — SegmenterBase with method segment(image: np.ndarray, bbox: list[float]) -> dict, returning {"mask": np.ndarray, "inference_ms": float}

5. composer_base.py — ComposerBase with method compose(task: str, result: dict) -> str, returning a natural language summary string

Also create backend/app/models/schemas.py with pydantic models for the API request/response: QueryRequest (image upload + query string) and QueryResponse (matching the structure these modules will populate).

Print out the full directory tree when done so I can confirm the structure.
```

**Definition of done:** five interface files exist, each with the correct method signature, and `schemas.py` defines the request/response contract. No model code yet — just contracts.

---

## Prompt 2 — Intent Router (Query Parser Implementation)

```
Implement a concrete QueryParser in backend/app/services/query_parser.py that implements QueryParserBase from query_parser_base.py.

Use [YOUR CHOSEN LLM/API — e.g. Groq with llama-3.1-8b-instant] to classify natural language queries into structured JSON.

System prompt should instruct the model to output ONLY valid JSON with this exact schema:
{"task": "detect|ocr|segment|describe|count", "target": "<object description>", "attribute": "<what to read, or null>", "conf_threshold": 0.3}

Requirements:
- Load the API key from an environment variable, never hardcode it
- Parse the LLM response defensively — strip markdown code fences if present, handle JSON parse failures by raising a clear exception rather than crashing silently
- Add a simple in-memory test: write 15 example queries covering all 5 task types (3 each) in backend/eval/test_router.py, run the parser on all of them, print the task classification for each one next to the query, and tell me the accuracy against my expected labels (I will confirm the expected labels)

Run the test script and show me the real output table: query, predicted task, latency in ms.
```

**Definition of done:** real output table showing 15 queries classified, with you confirming ≥90% match your expectations.

---

## Prompt 3 — Detector Module

```
Implement a concrete Detector in backend/app/services/detector.py that implements DetectorBase.

Use [YOUR CHOSEN DETECTION MODEL — e.g. YOLOv11x via ultralytics for closed-vocabulary, with a fallback path for open-vocabulary targets not in COCO classes].

Requirements:
- Load the model ONCE at module import time / app startup, not per-request. Add a startup event in main.py that triggers model loading and logs the load time.
- Implement detect() so it filters detections by the target string when possible, and returns boxes in [x1, y1, x2, y2] pixel coordinates
- Add a simple fallback: if the target isn't in the model's known classes, log a warning and return an empty result for now (we'll wire the open-vocab path in a later prompt)
- Write backend/eval/test_detector.py: load 5 test images from data/images/ (I will place these), run detection on each with a few different target queries, and for each one draw the bounding boxes on a copy of the image and save it to data/images/output/ so I can visually verify

Run the test and tell me the actual per-image inference time you measured on this machine, and confirm the output images were saved.
```

**Definition of done:** you open the saved output images and visually confirm boxes are correctly placed; you have real per-image latency numbers from your own GPU.

---

## Prompt 4 — Open-Vocabulary Detection Fallback

```
Extend the Detector module to handle open-vocabulary targets — objects not in the closed-vocabulary model's class list.

Use [YOUR CHOSEN OPEN-VOCAB MODEL — e.g. Grounding DINO or a VLM with grounding capability] as a second path inside detector.py.

Requirements:
- Add a method or internal branch that the main detect() function uses automatically: try closed-vocab detection first if the target matches a known class, otherwise route to the open-vocab model
- This should be invisible to callers of detect() — same interface, same return shape
- Update test_detector.py to include at least 3 test queries with targets that are NOT standard COCO classes (e.g. "the red backpack" or something specific to your test images) to exercise this new path
- Run it and show me the saved output images with boxes for these open-vocab queries, plus the inference time — I expect this to be noticeably slower than the closed-vocab path, tell me the actual numbers

Also update backend/eval/test_detector.py to print a clear comparison: closed-vocab average latency vs open-vocab average latency from this run.
```

**Definition of done:** open-vocab test images show correct boxes, and you have real comparative latency numbers between the two paths.

---

## Prompt 5 — Reader / OCR Module

```
Implement a concrete Reader in backend/app/services/reader.py that implements ReaderBase.

Use [YOUR CHOSEN OCR-CAPABLE MODEL — e.g. Florence-2 or a dedicated OCR engine] to extract text from a cropped image region.

Requirements:
- read() should crop the image to the given bbox before running OCR, with a small padding margin (configurable, default ~5px) around the box
- Load the model once at startup like the detector
- Write backend/eval/test_reader.py: I will provide 10 test images with visible text (signs, plates, labels) and their bounding boxes in data/annotations/ocr_test_set.json with this format: [{"image": "path", "bbox": [x1,y1,x2,y2], "ground_truth_text": "expected text"}]. Run the reader on all of them, compare predicted text to ground truth (case-insensitive, stripped), and print: exact match rate, and a table of image / predicted / ground truth / match (yes/no)

Run it and show me the real exact-match rate from this test set, not an estimate.
```

**Definition of done:** real exact-match percentage computed from your actual test images, with the full comparison table printed.

---

## Prompt 6 — Segmenter Module

```
Implement a concrete Segmenter in backend/app/services/segmenter.py that implements SegmenterBase.

Use [YOUR CHOSEN SEGMENTATION MODEL — e.g. SAM2] and have segment() accept a bounding box as a prompt (from the Detector module's output) and return a binary mask.

Requirements:
- Load the model once at startup
- segment() takes the image and a bbox, returns a binary numpy mask the same height/width as the input image
- Write backend/eval/test_segmenter.py: run the full detect-then-segment pipeline on 5 test images (call the Detector first to get a box, then pass that box to the Segmenter), overlay the resulting mask semi-transparently on the original image, and save to data/images/output/

Run it and show me the saved overlay images so I can visually confirm mask quality, plus the per-image segmentation latency you measured.
```

**Definition of done:** saved overlay images visually show correct masks; you have real latency numbers.

---

## Prompt 7 — Response Composer

```
Implement a concrete Composer in backend/app/services/composer.py that implements ComposerBase.

Use the same LLM you used for the query parser (reuse the client/config). Given a task type and a structured result dict (boxes, text, mask info, etc.), generate ONE natural language sentence summarizing the result for a user.

Requirements:
- Different prompt templates per task type (detect/count should mention quantity and labels, ocr should state the extracted text clearly, segment should describe what was masked, describe should just relay the caption)
- Write backend/eval/test_composer.py with 5 example structured results (one per task type, I will help you write realistic example dicts based on what the actual modules return) and print the generated sentence for each

Run it and show me the 5 generated sentences so I can judge if they read naturally.
```

**Definition of done:** you read the 5 generated sentences and confirm they sound coherent and accurate, not robotic or wrong.

---

## Prompt 8 — Full Integration

```
Wire all five modules together behind a single POST /query endpoint in backend/app/routers/query.py.

Pipeline: receive image (multipart upload) + query string → QueryParser.parse() → based on task, dispatch to Detector (+ Reader if task=ocr, + Segmenter if task=segment) → Composer.compose() → return QueryResponse matching the schema from schemas.py, including the structured result, the NL summary, an inference_breakdown_ms dict showing time spent in each stage, and a base64-encoded copy of the image with boxes/masks drawn on it.

Requirements:
- All five services should be instantiated once at app startup (lifespan context in main.py) and shared across requests, not recreated per-request
- Wrap each module call in try/except — if a module fails, return a clear error in the response rather than crashing the whole request
- Add simple structured logging: for every request, log request_id, task selected, total latency, and whether it succeeded

Test it end-to-end with curl or a Python script: send one real image with one query per task type (5 total requests), and show me the actual JSON responses for all 5, including the real latency breakdown for each.
```

**Definition of done:** five real end-to-end requests, one per task type, with you inspecting the actual JSON responses and confirming they're correct.

---

## Prompt 9 — Redis Caching

```
Add Redis-backed caching to the /query endpoint in backend/app/routers/query.py.

Requirements:
- Cache key: sha256 hash of the image bytes, combined with the lowercased/stripped query string
- Check cache before running the pipeline; if hit, return cached result immediately and log cache_hit=true
- After a successful pipeline run, store the result with a 300 second TTL
- Add Redis to docker-compose.yml as a service
- Write a quick test: send the exact same image+query twice, show me the latency of the first request (cache miss) vs the second (cache hit) — I expect the second to be dramatically faster

Run it and show me the real before/after latency numbers.
```

**Definition of done:** real measured latency difference between cache miss and cache hit on your machine.

---

## Prompt 10 — Benchmark Dataset Schema & Loader

```
Create backend/eval/dataset_schema.py defining the structure for our benchmark dataset, and backend/eval/load_dataset.py to load it.

Schema per sample (JSON):
{
  "id": "string",
  "image": "relative path under data/images/",
  "query": "natural language query",
  "task": "detect|ocr|segment",
  "ground_truth": {
    // for detect: "boxes": [[x1,y1,x2,y2], ...], "labels": [...]
    // for ocr: "text": "exact string", "bbox": [x1,y1,x2,y2]
    // for segment: "mask_rle": "run-length encoded string", "bbox": [x1,y1,x2,y2]
  },
  "difficulty": "easy|medium|hard"
}

Write load_dataset.py to load data/annotations/benchmark.json into a list of validated samples (use pydantic for validation), with clear error messages if a sample is malformed.

Also write a small helper script backend/eval/dataset_stats.py that prints a breakdown: total samples, count per task type, count per difficulty level — I'll use this to confirm my dataset is balanced as I build it.

I will provide the actual benchmark.json incrementally — for now, create a tiny 6-sample example file (2 per task) so we can test the loader works, and run dataset_stats.py on it to show me the output.
```

**Definition of done:** loader runs without errors on a real (even if tiny) sample file, stats script prints correct counts.

---

## Prompt 11 — Evaluation / Scoring Script

```
Write backend/eval/benchmark.py — a single script that runs our full pipeline against the benchmark dataset and computes metrics.

IMPORTANT: write the scoring/metric logic carefully and explain each formula to me in comments, since I will review this code myself before trusting the numbers.

For each sample:
- detect task: run Detector, compute IoU between each predicted box and ground truth box, report whether it counts as a match at IoU >= 0.5 (standard mAP@50 style matching — explain the matching logic you use, e.g. greedy matching to avoid double-counting)
- ocr task: run Detector then Reader, compare predicted text to ground truth (exact match, case-insensitive, stripped) and also compute Character Error Rate
- segment task: run Detector then Segmenter, compute IoU between predicted mask and ground truth mask (decoded from RLE)

For every sample also record: total latency, per-stage latency breakdown.

At the end, print a summary table: per-task accuracy metric, per-task average latency, and overall routing accuracy if the dataset includes a task label that differs from the parser's own classification.

Output the full per-sample results to backend/eval/results.csv so I can inspect every row myself.

Run this against our 6-sample test file and show me the real summary table and the first few rows of results.csv.
```

**Definition of done:** you have personally reviewed the IoU/matching/CER logic in the code and verified it's correct on a couple of samples by hand before trusting the aggregate numbers.

---

## Prompt 12 — Frontend Scaffold

```
Set up a React + Vite frontend in the frontend/ directory.

Requirements:
- Components: CameraFeed.jsx (webcam access via getUserMedia, plus a file upload fallback), QueryInput.jsx (text box + submit button), OverlayCanvas.jsx (canvas positioned absolutely over the video/image element, draws boxes and masks from the API response), ResultPanel.jsx (shows the NL summary text, and a collapsible raw JSON view)
- A simple App.jsx wiring these together: capture/upload an image, type a query, POST to the backend /query endpoint, render the overlay and result panel from the response
- Basic, clean styling — doesn't need to be elaborate, just usable and not broken
- A .env.example showing the backend API URL config

Start the dev server and confirm it loads without console errors. Show me the terminal output confirming it's running.
```

**Definition of done:** dev server runs, you open it in a browser yourself and confirm no console errors, the camera/upload UI renders.

---

## Prompt 13 — Frontend-Backend Connection Test

```
Connect the frontend to the running backend. Make sure CORS is configured correctly in backend/app/main.py to allow requests from the frontend's dev server origin.

Walk me through testing this manually: I will upload a test image, type a real query, hit submit, and we'll confirm together that the overlay renders correctly and the result panel shows a sensible summary.

If anything fails, show me the actual browser console error and the actual backend log output — don't guess at the fix without seeing the real error.
```

**Definition of done:** you, the human, successfully run one full query through the actual UI and see a correct result rendered.

---

## Prompt 14 — Error Handling & Edge Cases

```
Harden the backend for the following edge cases, and write a quick test for each one showing me the actual response:

1. Empty or nonsense query string
2. Image with no detectable object matching the query
3. Very large image (test with something >4000px on a side if you can find/generate one)
4. Multiple objects matching the same target description (e.g. "person" when there are 3 people)
5. A model failing to load or a model call throwing an exception mid-request

For each case, the API should return a clear, structured error or a sensible partial result — never a raw 500 with a stack trace leaking to the client. Log the full error server-side regardless.

Run all 5 test cases for real and show me the actual responses.
```

**Definition of done:** five real test runs, you've seen the actual responses and confirmed none of them are an ugly unhandled crash.

---

## Notes on using these prompts well

After each prompt, before moving to the next one, do three things yourself: read the actual code the agent wrote (don't just trust the summary it gives you), run the test it ran again independently if you have any doubt, and commit to git with a clear message. This is what keeps the project reproducible and defensible later, and it's also what catches subtle agent mistakes — like a metric computed slightly wrong, or a model loaded with the wrong precision — before they're buried under five more prompts of code built on top of them.

When you're ready for the benchmark dataset construction (collecting your 100–150 real annotated samples) and the comparative study against closed-source models, that's manual/research work the agent can support but shouldn't drive — flag it to me separately when you get there and we can plan that phase in more detail.
