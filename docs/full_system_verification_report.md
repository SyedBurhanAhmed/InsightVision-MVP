# Full-System Verification Audit Report

**Objective:** Audit all displayed numbers, metrics, and comparative claims across the InsightVision frontend to ensure they are dynamically sourced from actual pipeline runs or explicitly tagged as external literature.

## Phase 1: Frontend Inventory & Findings

### 1. `Dashboard.tsx`
- **GPU Utilization (`gpuUsage`):** Hardcoded to `78` (Static mock value). **VIOLATION**
- **Recent Activity Log:** Hardcoded array of 4 mock activities with timestamps ("2 minutes ago", etc.). **VIOLATION**
- **Telemetry Cards:**
  - Active Bounding Boxes: `Tracking Rate: 25 FPS` (Hardcoded string). **VIOLATION**
  - Reasoning Core: `VLM Success Rate: 94%` (Hardcoded string). **VIOLATION**
  - Hardware Engine: `VRAM Alloc: 6.2/8 GB` base values. **VIOLATION**
  - Engine Type: `RTX 4090 Edge`. **VIOLATION** (Unless intended to be static system spec, but should be dynamic telemetry)

### 2. `LiveCamera.tsx`
- **Session Payload Configuration:** `fps: 25.0`, `conf: 0.35` in `startSession()`. (These are parameters, not displayed metrics, but worth noting).
- **Active Tracking Nodes Bar:** Metrics like confidence (`t.confidence`) are dynamically fetched via WebSocket (`latestTracks`). **COMPLIANT**

### 3. `History.tsx`
- **Fallback History Data (`fallbackHistoryData`):** Contains extensive hardcoded metrics (e.g., `confidence: 0.85`, `latency: 752.5ms`, `coverage 2.10%`). While this is fallback data, it presents fake claims if the backend fails. **VIOLATION**
- **Dynamic Fetching:** Does hit `${BACKEND}/api/session/history`. **COMPLIANT** (if successful).

### 4. `Performance.tsx`
- **Fallback Data (`fallbackBenchmarkData`):** Contains hardcoded baseline metrics for fallback. **VIOLATION**
- **Accuracy / Software Telemetry Section:**
  - Object Detection (mAP IoU): Grounding DINO `85% IoU`, SAM 3 `92% IoU`. Hardcoded in JSX. **VIOLATION**
  - OCR Character Extraction: Grounding DINO `0% Success`, SAM 3 `100% Success`. Hardcoded in JSX. **VIOLATION**
  - Track ID Consistency: BoT-SORT `95% Retention`, SAM 3 Native `60% Retention`. Hardcoded in JSX. **VIOLATION**

### 5. `ComparativeAnalysis.tsx`
- **Fallback Data (`fallbackBenchmarkData`):** Contains hardcoded baseline metrics for fallback. **VIOLATION**
- **System Feature Comparison Matrix:**
  - YOLOv11 & Generic VLM metrics (`30+ FPS`, `~0.8 FPS`, `<1GB`): Appropriately tagged as `[lit]` or `[eval]`. **COMPLIANT**
  - InsightVision Hardware Requirement Note: `~11.5 GB VRAM peak` in the Detailed Capabilities text blob (Line 387). This should reference `vramPeakGB` or dynamically generated values. **VIOLATION**
- **Specification Matrix Table:**
  - Text-Grounding Accuracy: `Low (0% OCR rate)` and `Exceptional (100% OCR rate)` are hardcoded in the JSX rather than pulled from the `data` object. **VIOLATION**

---

## Next Steps
Proceed to Phase 2: Removing mock metrics, binding hardcoded JSX to API states, ensuring the backend `/api/benchmark` provides all necessary fields for the accuracy metrics, and updating the fallback configurations if necessary to represent "No Data" instead of "Fake Data".
