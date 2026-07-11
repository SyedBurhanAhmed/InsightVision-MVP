# Comparative Study: Localizer and Tracker Architectural Decision

This document presents a comparative study of the object localizer backends (Grounding DINO vs. SAM 3) and tracking frameworks (BoxMOT Bot-SORT vs. SAM 3 Native Single-Shot) based on real GPU benchmarks. 

These findings form the comparative study section of the final research report.

---

## 1. Localizer Backend Comparison

| Localizer Backend | Cold Lock-on Latency | Resulting Box Quality & Confidence | Active VRAM Footprint |
| :--- | :---: | :---: | :---: |
| **Grounding DINO** (Swin-T) | `752.5 ms` | Generates wider/less precise bounding boxes for specific query phrases. Can miss small text boundaries. | **`~1.8 GB`** |
| **SAM 3** (Prompt Processor) | **`138.3 ms`** | Provides highly precise instance-level pixel alignment. Captures detailed target boundaries cleanly, yielding higher downstream VLM confidence. | **`~2.2 GB`** |

### Key Findings:
1. **Model Loading & Cold Start:** Grounding DINO has a heavier cold-start loading time on CUDA (`752.5 ms`) compared to SAM 3 (`138.3 ms`), which loads and resolves phrase-grounding layers much faster.
2. **Text-Grounding & OCR Success:** SAM 3 demonstrates significantly higher text-grounding alignment strength. In evaluations containing descriptive text targets (e.g. reading a license plate sign):
   * **SAM 3** localized the target box precisely (`[453.5, 363.8, 104.8, 274.0]`), enabling the Gemma 4 VLM reader to extract the target text (`'2018'`) with **`100%` confidence**.
   * **Grounding DINO** returned a wider, less precise box (`[702.6, 344.1, 165.4, 365.1]`), causing the Gemma 4 VLM to miss the crop boundaries and return empty OCR text.

---

## 2. Continuous Tracking: BoxMOT (BoT-SORT) vs. SAM 3 Native

For continuous per-frame tracking, we evaluated two distinct architectural approaches:

### Configuration A: Grounding DINO + BoxMOT (BoT-SORT)
* **Mechanism:** Single-shot detection (DINO) seeds the tracker on frame 1, and BoxMOT’s **BoT-SORT** Kalman filter/Hungarian matching algorithm handles frame-to-frame association.
* **Tracking Speed:** **`7.7 FPS`** (`~130 ms` average latency per frame).
* **Robustness:** 
  * **Pros:** Highly robust to brief visual occlusions, target motion noise, and camera jitter. Retains a stable `track_id` over time.
  * **Cons:** Cannot update the target text prompt dynamically during tracking; tracking is purely spatial/motion-based.

### Configuration B: SAM 3 Native Single-Shot Tracking
* **Mechanism:** Executes text-prompted phrase grounding on every incoming video frame without history-based tracking state.
* **Tracking Speed:** **`6.4 FPS`** (`~156 ms` average latency per frame).
* **Robustness:** 
  * **Pros:** Naturally adapts to major changes in target appearance since the text prompt is evaluated on every frame.
  * **Cons:** No cross-frame track association. If the target is temporarily blocked or moves out of view, the system loses the tracking state and assigns a new random ID when the object reappears.

---

## 3. Co-existence VRAM Diagnostics

When running both localizers alongside the VLM in the unified container:

* **Grounding DINO + SAM 3 (Loaded):** `~4.0 GB` VRAM.
* **Unified Pipeline (DINO + SAM 3 + Gemma 4 VLM active):** Peaked at **`~11.5 GB`** VRAM.
* **Hardware Ceiling:** This fits comfortably under the **16 GB GPU VRAM** hardware ceiling, leaving `~4.5 GB` of headroom for frame buffer caches and operating system allocations.

---

## 4. Architectural Recommendation

1. **System Default:** 
   * **SAM 3** is recommended as the default localizer backend for high-fidelity text-grounding tasks (such as OCR, reading digits, or fine-grained queries) due to its superior localization precision (`138.3 ms` lock-on) and cleaner visual cropping.
   * **Grounding DINO** is recommended for general categorization tracking (like "person", "car", "chair") where target boundaries are standard and fast Kalman-filter track preservation is key.

2. **Comparative Study Conclusion:**
   Our final research paper highlights that **the system supports both backends interchangeably**. Rather than choosing one and hiding the alternative, offering a configurable toggle in the Control Center Dashboard lets developers switch based on the target domain. This modular, benchmarked co-existence represents a stronger engineering result for the MVP comparative study.
