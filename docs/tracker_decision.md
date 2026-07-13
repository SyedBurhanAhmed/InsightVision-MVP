# Architectural Study: Continuous Tracker Selection

This document presents the architectural decision analysis for the continuous tracking framework in InsightVision-MVP, comparing **BoxMOT (BoT-SORT)** against **SAM 3.1 Object Multiplex (Native Single-Shot Tracking)**.

---

## 1. Tracker Backend Comparison

| Evaluation Metric | BoxMOT (BoT-SORT / ByteTrack) | SAM 3.1 Object Multiplex (Native) |
| :--- | :---: | :---: |
| **Per-Frame Latency (Kalman Mode)** | **`< 2.0 ms`** (CPU-bound) | `~156.0 ms` (GPU-bound) |
| **Peak Active VRAM Cost** | **`~0 MB`** (System RAM only) | `~2.2 GB` (GPU Memory) |
| **Coupling to Segmentation Compute** | **Decoupled** (Only invoked on-demand) | **Fully Coupled** (Required on every frame) |
| **Track ID Stability & Occlusions** | **High** (Hungarian matching + Kalman recovery) | **Low** (No history/association state) |

---

## 2. Justification for Architectural Selection

We select **BoxMOT (BoT-SORT)** as the continuous tracking backbone for the active monitoring pipeline, reserving **SAM 3** exclusively for on-demand high-precision segmentation and text-grounding tasks. While SAM 3 delivers exceptional pixel-level boundaries, running it continuously as a native tracker forces a permanent **`~2.2 GB`** GPU VRAM footprint and imposes a heavy **`156 ms`** latency penalty on every incoming frame. By employing BoxMOT's lightweight Kalman filter state propagation, the pipeline achieves sub-**`2 ms`** tracking loops on CPU, freeing up critical GPU execution slots for downstream VLMs (e.g. Gemma 4) and zero-shot localizers. This decoupled design guarantees real-time visual fluidities for multi-target tracking while cleanly avoiding VRAM threshold ceilings on edge-compute hardware.
