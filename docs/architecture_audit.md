# InsightVision Architecture & Frontend Audit

This document details the architectural audit of InsightVision MVP based on the real-time tracking pivot specifications.

## 1. Backend Services Audit (`backend/app/services/`)

### Grounding DINO Integration
* **Current State**: `GroundingDINODetector` (in `detector.py`) wraps GroundingDINO predictions. It takes a raw numpy image, applies resizing, tensor transformations, and queries GroundingDINO. It outputs bounding boxes in absolute coordinates `[x1, y1, x2, y2]`.
* **Alignment with design**: GroundingDINO is correct as a cold-start single-shot detector. In the live camera tracking path, we will run it *once* to initialize tracks (based on a user command), rather than running it frame-by-frame. This aligns perfectly with the pivot since GroundingDINO's GPU latency is ~150ms-800ms (too slow for real-time video).

### Florence-2 Integration
* **Current State**: Loaded in `main.py` lifespan (as `florence_model` and `florence_processor`), and routed in `vision.py` for single-shot phrase grounding. However, `reader.py` (`EasyOCRReader` stub) does *not* utilize it yet.
* **Alignment with design**: We need to extend `reader.py` (and the `Segmenter` if SAM2 is not loaded) to call Florence-2 with specialized task prompts:
  * OCR task prompt: `<OCR>` for reading text (to be called by `reader.py` on tracked bounding box regions).
  * Segmentation task prompt: `<REFERRING_EXPRESSION_SEGMENTATION>` (can serve as a backup/alternative segmenter).
  * Phrase Grounding task prompt: `<CAPTION_TO_PHRASE_GROUNDING>` (available as a GroundingDINO alternative).

### Cloud LLM Dependencies
The current external API dependencies reside in:
1. [query_parser.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/services/query_parser.py): Uses the `Groq` API client to hit the `llama-3.1-8b-instant` model for translating user natural language questions into VLM tasks.
2. [composer.py](file:///home/burhan/projects/InsightVision-MVP/backend/app/services/composer.py): Uses programmatic string templates (`NLComposer`) right now, but the design requires swapping this or augmenting it with an LLM to generate descriptive, track-aware summaries.

---

## 2. Frontend Layout & Navigation Audit

The current sidebar contains several redundant items left over from generic templates. We will consolidate these into a focused, highly interactive monitoring system:

| Old Navigation | Target Route / Page | Status / Action | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `/` | **Keep** | High-level session analytics and CPU/GPU metrics. |
| **Live Camera** | `/live-camera` | **Merge** | Merge with Tracking into a single Live Tracking control room. |
| **Detection** | `/object-detection` | **Consolidate** | Rename to **Analyze Image**; handles single static-image analysis. |
| **Tracking** | `/object-tracking` | **Merge** | Merge with Live Camera into a single Live Tracking screen. |
| **VL Query** | `/vision-language` | **Remove** | Redundant; fully replaced by the consolidated *Analyze Image* screen. |
| **Few-Shot** | `/few-shot-learning` | **Remove/Hide** | Outside the scope of core live tracking; hide/remove from nav. |
| **Comparison** | `/comparative-analysis` | **Merge** | Merge with Performance into a single *Benchmark* screen. |
| **Performance** | `/performance` | **Merge** | Merge with Comparison into a single *Benchmark* screen. |
| **History** | `/history` | **Repurpose** | Repurposed to show a timeline log of this session's tracked targets. |
| **Settings** | `/settings` | **Keep** | General configurations (credentials, saved RTSP profiles). |
| **About** | `/about` | **Keep** | Project info & license. |

### Revised Nav Structure (Target Screens)
1. **Dashboard** (`/`) - General health.
2. **Analyze Image** (`/analyze-image`) - Upload single image + query (GroundingDINO/Florence-2 head-to-head, dynamic masks, OCR text).
3. **Live Tracking** (`/live-tracking`) - Real-time tracking screen with camera source selector.
4. **Benchmark** (`/benchmark`) - Comprehensive evaluation (latency/VRAM tables, exact-match scores).
5. **Track History** (`/history`) - Interactive log of active and historical tracks during this session.
6. **Settings** (`/settings`) - Profile options & model configs.

---

## 3. Brand Theme & Color Scheme Revamp

### Current Theme Issue
Red (`#DC143C` and `rgba(220,20,60,0.3)`) is currently used as the dominant brand color (logo, nav active highlights, borders, verify tags). This creates visual fatigue and violates design guidelines because red is typically reserved for critical system states.

### Proposed Palette
We will shift to a high-end, calm **cyber-monitoring** theme:
* **Primary Brand / Active State Color**: **Electric Cyan** (`#00D4FF`) or a sleek **Deep Cobalt Blue** (`#0088FF`). This provides a tech-forward look representing a steady, functioning system.
* **Accent Highlight**: **Neon Emerald Green** (`#39FF14`) for normal operation stats, healthy telemetry, and connection active tags.
* **Alert States (Red reserved strictly for)**:
  * **Target Lost**: Tracker lost lock on object.
  * **RTSP Disconnected**: Stream drop or camera failure.
  * **System Fault**: Out of VRAM, GPU temperature alert, backend crash.

---

## 4. Live Tracking Camera-Source Selector Design

The **Live Tracking** control screen requires a source selector at the top before starting a session:
* **Source Selection**:
  * `Webcam`: Pulls from browser media stream (client pushes frames over WebSocket).
  * `Upload Video`: Local test video file (server-side decoder for predictable evals).
  * `RTSP Feed`: Server-side network stream from lab cameras. A text field for custom URLs is shown, along with a dropdown of saved RTSP camera profiles (defined in Settings).
* **Wire Protocol**: Initiates a persistent WebSocket stream `/ws/session` with an initialization JSON payload specifying type, source, and path configs.

---

## 5. Implementation Roadmap (Prompts 6-18)

We will proceed with the following sequence:
1. **Speed Benchmarking**: Quantify GPU VRAM and latency constraints (concurrently running GroundingDINO, Florence-2, and Ollama Qwen3/Phi4). Include new benchmarks for SAM 3.1 vs SAM2, and Gemma-4 E4B vs Florence-2 OCR.
2. **Analyze Image Refinement**: Consolidate Object Detection and VL Query into a unified single-image debugging center (Prompt 7).
3. **LLM Hosting configuration**: Lock in local Ollama vs Cloud model fallback.
4. **BoT-SORT Tracker Integration**: Build the robust multi-object tracking loop (Prompt 9).
5. **Conversation & Context Manager**: Integrate follow-up referencing logic (Prompt 10).
6. **Reader & Segmenter wiring**: Integrate Florence-2 OCR multi-frame voting and SAM2 segmentation.
7. **Camera Source Abstractions**: Build Webcam, Uploaded Video, and RTSP stream handling.
8. **Frontend Theme & Live Tracking UI implementation**.
