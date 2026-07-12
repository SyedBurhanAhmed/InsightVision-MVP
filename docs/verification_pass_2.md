# SAM 3 Interface and Bounding Box Verification (Pass 2)

This document details the deep-dive verification of the SAM 3 implementation in `segmenter.py` and the lifecycle of bounding boxes across the pipeline.

## 1. SAM 3 API Method Signature Usage

**Objective:** Verify that `segmenter.py` correctly uses SAM 3's box-prompted segmentation API.

**Findings:**
- Reviewed actual source of `Sam3Processor` in `sam3_image_processor.py`. The method `add_geometric_prompt(box: List, label: bool, state: Dict)` expects `box` to be in `[center_x, center_y, width, height]` format and normalized in the `[0, 1]` range.
- `SAM3Segmenter.segment()` in `segmenter.py` correctly performs this normalization:
  ```python
  cx = ((x1 + x2) / 2.0) / w
  cy = ((y1 + y2) / 2.0) / h
  w_norm = (x2 - x1) / w
  h_norm = (y2 - y1) / h
  ```
- **Conclusion:** Passed. The method signature and coordinate normalization exactly match SAM 3's requirements.

## 2. Text-Prompt (PCS) vs. Box-Prompt

**Objective:** Check if SAM 3's text-prompt (PCS) mode is used anywhere.

**Findings:**
- `segmenter.py` exclusively relies on `set_image()` and `add_geometric_prompt()`. It does not invoke `set_text_prompt()`.
- **Architectural Flag:** We are purely using SAM 3 for its mask quality improvements over SAM 2. We are *not* using SAM 3's unique text-grounding capabilities. 
- *Recommendation:* Given the latency concerns seen in previous benchmarks (where running both DINO and a heavy LLM like Gemma 4 took a long time), it might be worth reconsidering this architecture. SAM 3 is capable of performing both detection (via text prompts) and segmentation in a single pass. Replacing Grounding DINO + SAM 3 with a pure SAM 3 pipeline could yield significant latency improvements in the future.

## 3. Mask Output Format and Selection Bug

**Objective:** Confirm mask output format matches expectations (binary array vs polygon) and resolve any discrepancies seen in utility scripts like `check_mask_pixels.py`.

**Findings:**
- SAM 3's `add_geometric_prompt()` returns boolean masks of shape `(N, 1, H, W)` where `N` is the number of mask proposals for the given prompt.
- **Critical Bug Found:** `segmenter.py` was hardcoded to blindly select the first mask proposal: `mask = output["masks"][0]`. As observed during previous eval runs (where the mask output was completely outside the prompt box), the proposal at index 0 is sometimes a lower-confidence background artifact rather than the primary object.
- **Fix Applied:** Modified `segmenter.py` to extract `output["scores"]`, convert the `BFloat16` tensor safely to a `float32` numpy array (`scores.cpu().float().numpy()`), and apply `np.argmax(scores)` to pick the highest-confidence mask proposal instead of defaulting to index 0.

## 4. Current Bounding Box Verification

**Objective:** Cross-check `track_manager.py`'s registry against `reader.py` and `segmenter.py` to ensure they pull the updated bounding box.

**Findings:**
- `track_manager.py` maintains a `history_buffers` array. In its `update_track` method, it calls `tracker.update(dets, img)` (passing through BoxMOT) and saves the *resulting* tracked boxes into this buffer.
- Both `reader.py` (`read_track`) and `segmenter.py` (`segment_track`) fetch bounding boxes by accessing `track_manager.history_buffers.get(session_id, [])[-1]`. 
- **Conclusion:** Passed. Both modules correctly pull the CURRENT bounding box (post-BoxMOT-update), confirming there is no stale/cached bounding box bug from track initiation.

---
**Status:** Verification complete. SAM 3 integration is now mathematically correct (proper mask selection) and functionally aligned with the pipeline's tracking registry.
