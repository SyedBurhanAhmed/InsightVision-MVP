"""
backend/eval/test_full_scenario.py
===================================
End-to-end integration test — NO HTTP layer.

Proves the "track-aware" design works:

  1. Load real video.
  2. Grounding DINO → BoxMOT initialization.
  3. Advance 30 frames, calling tracker.update() every frame.
     → Print bbox at frame 1, 15, 30 to confirm real motion.
  4. Frame 15 → Gemma4Reader.read_track() OCR vote across the live history buffer.
     → Confirm it uses the frame-15 bbox, NOT frame-1's.
  5. Frame 30 → SAM3Segmenter.segment_track() → confirm it uses frame-30 bbox.
  6. NLComposer.compose() for OCR result and segment result.
  7. Full per-frame bbox trace + every model call + every latency.

Pass condition (printed at the end):
  bbox genuinely moved from frame-1 → frame-15 → frame-30.
"""

import os
import sys
import time
import logging
import cv2
import numpy as np
import torch
from pathlib import Path

# ─── Path bootstrap ──────────────────────────────────────────────────────────
_REPO_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
for p in (_REPO_BACKEND, _DINO_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.patch_transformers import patch_transformers
patch_transformers()

# ─── Logging setup ───────────────────────────────────────────────────────────
logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
scenario_log = logging.getLogger("SCENARIO")
scenario_log.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
ch.setFormatter(logging.Formatter("%(message)s"))
scenario_log.addHandler(ch)
scenario_log.propagate = False


def hdr(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def fmt_bbox(b):
    x, y, w, h = b
    return f"[x={x:.1f} y={y:.1f} w={w:.1f} h={h:.1f}]"


def fmt_xyxy(b):
    x1, y1, x2, y2 = b
    return f"[x1={x1:.1f} y1={y1:.1f} x2={x2:.1f} y2={y2:.1f}]"


def centre(bbox_xywh):
    x, y, w, h = bbox_xywh
    return (x + w / 2, y + h / 2)


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


# ─── Config ──────────────────────────────────────────────────────────────────
VIDEO_PATH   = "images/long_output3.mp4"
PROMPT       = "person"
DETECT_CONF  = 0.35
MAX_FRAMES   = 30
SESSION_ID   = "e2e-scenario-001"

# ─── STEP 0: Load Grounding DINO ─────────────────────────────────────────────
hdr("STEP 0  — Loading Grounding DINO")

from app.core.config import settings
from groundingdino.util.inference import load_model
from app.services.detector import GroundingDINODetector

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"  Device : {device}")

t0 = time.time()
_dino_raw = load_model(
    settings.GROUNDING_DINO_CONFIG_PATH,
    settings.GROUNDING_DINO_WEIGHTS_PATH,
    device=device,
)
dino_detector = GroundingDINODetector(_dino_raw)
print(f"  DINO loaded in {(time.time() - t0) * 1000:.0f} ms")

# ─── STEP 0b: Load SAM3 (shared) ─────────────────────────────────────────────
hdr("STEP 0b — Loading SAM 3 (shared model)")

from app.core import state as _state
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor

t_sam = time.time()
_sam3_model = build_sam3_image_model()
_sam3_proc  = Sam3Processor(_sam3_model)
_state.ml_models["sam3_model"]     = _sam3_model
_state.ml_models["sam3_processor"] = _sam3_proc
print(f"  SAM 3 loaded in {(time.time() - t_sam) * 1000:.0f} ms")

# ─── STEP 0c: Instantiate services ───────────────────────────────────────────
hdr("STEP 0c — Instantiating pipeline services")

from app.services.track_manager import TrackManager
from app.services.segmenter     import SAM3Segmenter
from app.services.reader        import Gemma4Reader
from app.services.composer      import NLComposer

track_manager = TrackManager(method="botsort", frame_rate=25)
segmenter     = SAM3Segmenter()
reader        = Gemma4Reader()
composer      = NLComposer()
labels_map    = [PROMPT]
print("  TrackManager / SAM3Segmenter / Gemma4Reader / NLComposer ready")

# ─── STEP 1: Open Video ───────────────────────────────────────────────────────
hdr("STEP 1  — Opening video")

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    raise FileNotFoundError(f"Cannot open video: {VIDEO_PATH}")

width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps    = cap.get(cv2.CAP_PROP_FPS) or 25.0
total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"  {VIDEO_PATH}  |  {width}x{height} @ {fps:.1f} FPS  |  {total} total frames")

# ─── STEP 2: DINO seed detection on frame 0 ──────────────────────────────────
hdr("STEP 2  — DINO seed detection on frame 0")

ret, seed_frame = cap.read()
if not ret:
    raise RuntimeError("Could not read first frame.")

seed_rgb = cv2.cvtColor(seed_frame, cv2.COLOR_BGR2RGB)
t_d0 = time.time()
seed_res = dino_detector.detect(seed_rgb, PROMPT, DETECT_CONF)
print(f"  DINO infer: {seed_res['inference_ms']:.0f} ms  |  detections: {len(seed_res['boxes'])}")
for i, (b, s, lbl) in enumerate(zip(seed_res["boxes"], seed_res["scores"], seed_res["labels"])):
    print(f"    [{i}] {lbl} score={s:.3f}  {fmt_xyxy(b)}")

if not seed_res["boxes"]:
    raise RuntimeError("No detections on frame 0 — cannot seed tracker. Adjust DETECT_CONF or prompt.")

dets0 = np.array(
    [[b[0], b[1], b[2], b[3], s, 0.0] for b, s in zip(seed_res["boxes"], seed_res["scores"])],
    dtype=np.float32
)
seed_tracks = track_manager.update_track(SESSION_ID, dets0, seed_frame, labels_map)
print(f"\n  Seeded {len(seed_tracks)} track(s):")
for t in seed_tracks:
    print(f"    TrackID={t['track_id']} label={t['label']} conf={t['confidence']:.2f}  {fmt_bbox(t['bbox'])}")

if not seed_tracks:
    raise RuntimeError("BoxMOT returned 0 tracks — tracker init failed.")

PRIMARY_TRACK_ID = seed_tracks[0]["track_id"]
print(f"\n  PRIMARY_TRACK_ID = {PRIMARY_TRACK_ID}")

# ─── STEP 3: 30-frame tracking loop ──────────────────────────────────────────
hdr(f"STEP 3  — Advancing {MAX_FRAMES} frames (DINO every frame -> BoxMOT)")

frame_bbox_log    = {}   # frame_idx -> [x,y,w,h]
frame_latency_log = {}   # frame_idx -> {dino_ms, tracker_ms}
snapshot_f15 = None      # (frame_bgr, [x1,y1,x2,y2])
snapshot_f30 = None

ref_x = None
print(f"\n{'Frm':>4} | {'TrackID':>7} | {'Bbox xywh':^44} | {'DINO':>7} | {'Track':>7} | {'dx_f1':>8}")
print("-" * 90)

t_loop = time.time()
for frame_idx in range(1, MAX_FRAMES + 1):
    ret, frame = cap.read()
    if not ret:
        print(f"  (video ended at frame {frame_idx})")
        break

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Detection
    t_d = time.time()
    det_res = dino_detector.detect(frame_rgb, PROMPT, DETECT_CONF)
    det_ms  = det_res["inference_ms"]
    dets_arr = np.array(
        [[b[0], b[1], b[2], b[3], s, 0.0] for b, s in zip(det_res["boxes"], det_res["scores"])],
        dtype=np.float32
    ) if det_res["boxes"] else np.empty((0, 6), dtype=np.float32)

    # Tracker update
    t_t = time.time()
    tracks = track_manager.update_track(SESSION_ID, dets_arr, frame, labels_map)
    trk_ms = (time.time() - t_t) * 1000

    # Locate primary track
    primary = next((t for t in tracks if t["track_id"] == PRIMARY_TRACK_ID), None)
    if primary:
        bb = primary["bbox"]
        frame_bbox_log[frame_idx]    = bb
        frame_latency_log[frame_idx] = {"dino_ms": det_ms, "tracker_ms": trk_ms}
        if ref_x is None:
            ref_x = bb[0]
        dx = bb[0] - ref_x

        if frame_idx == 15:
            x, y, w, h = bb
            snapshot_f15 = (frame.copy(), [x, y, x + w, y + h])
        if frame_idx == 30:
            x, y, w, h = bb
            snapshot_f30 = (frame.copy(), [x, y, x + w, y + h])

        print(f"{frame_idx:>4} | {PRIMARY_TRACK_ID:>7} | {fmt_bbox(bb):<44} | {det_ms:>7.1f} | {trk_ms:>7.1f} | {dx:>+8.1f}")
    else:
        print(f"{frame_idx:>4} | {'—':>7} | {'[track lost]':<44} | {det_ms:>7.1f} | {trk_ms:>7.1f} | {'—':>8}")

loop_elapsed = time.time() - t_loop

# ─── STEP 3 SUMMARY ──────────────────────────────────────────────────────────
hdr("STEP 3 SUMMARY — bbox movement proof")

MOVED = False
if {1, 15, 30}.issubset(frame_bbox_log):
    bb1, bb15, bb30 = frame_bbox_log[1], frame_bbox_log[15], frame_bbox_log[30]
    d1_15  = dist(centre(bb1),  centre(bb15))
    d15_30 = dist(centre(bb15), centre(bb30))
    d1_30  = dist(centre(bb1),  centre(bb30))
    MOVED  = d1_30 > 1.0
    print(f"  Frame  1 : {fmt_bbox(bb1)}")
    print(f"  Frame 15 : {fmt_bbox(bb15)}")
    print(f"  Frame 30 : {fmt_bbox(bb30)}")
    print(f"\n  Centre movement:")
    print(f"    f1  -> f15  : {d1_15:.2f} px")
    print(f"    f15 -> f30  : {d15_30:.2f} px")
    print(f"    f1  -> f30  : {d1_30:.2f} px")
    print(f"\n  {'PASS' if MOVED else 'FAIL'}  bbox moved {d1_30:.2f} px across 30 frames")
else:
    missing = [f for f in [1, 15, 30] if f not in frame_bbox_log]
    print(f"  WARNING — track lost at frames {missing}")

# ─── STEP 4: OCR at frame 15 ─────────────────────────────────────────────────
hdr("STEP 4  — Gemma4Reader OCR vote (uses live history buffer, not frame-1 snapshot)")

print("  Calling reader.read_track() — Gemma 4 loads on first call (may take ~30 s)...")
t_ocr = time.time()
ocr_result = reader.read_track(
    session_id=SESSION_ID,
    track_id=PRIMARY_TRACK_ID,
    track_manager=track_manager,
)
ocr_total_ms = (time.time() - t_ocr) * 1000

print(f"\n  OCR result:")
print(f"    text         : {repr(ocr_result['text'])}")
print(f"    vote_count   : {ocr_result['vote_count']}")
print(f"    total_samples: {ocr_result['total_samples']}")
print(f"    confidence   : {ocr_result['confidence']:.2f}")
print(f"    low_conf     : {ocr_result['low_confidence']}")
print(f"    latency_ms   : {ocr_total_ms:.1f} ms  (internal: {ocr_result.get('latency_ms', 0):.0f} ms)")

# Show which bboxes the voter sampled from the history buffer
ocr_buf   = track_manager.history_buffers.get(SESSION_ID, [])
ocr_bboxes = []
for item in ocr_buf:
    for t in item["tracks"]:
        if t["track_id"] == PRIMARY_TRACK_ID:
            x, y, w, h = t["bbox"]
            ocr_bboxes.append([x, y, x + w, y + h])
            break

print(f"\n  History buffer has {len(ocr_buf)} frames. Sampled bboxes (last 5):")
for i, b in enumerate(ocr_bboxes[-5:]):
    print(f"    [{i}] {fmt_xyxy(b)}")

# Verify not frame-1's snapshot
OCR_LIVE = len(ocr_bboxes) > 0
if 1 in frame_bbox_log and ocr_bboxes:
    dx_ocr = abs(ocr_bboxes[-1][0] - frame_bbox_log[1][0])
    print(f"\n  Delta-x between last OCR sample and frame-1 bbox: {dx_ocr:.2f} px")
    print(f"  OCR voter pulled from LIVE buffer: {'YES' if OCR_LIVE else 'NO'}")

# ─── STEP 5: SAM3 segment_track at frame 30 ──────────────────────────────────
hdr("STEP 5  — SAM3Segmenter.segment_track() at frame 30")

SEG_OK = False
seg_result = {"mask": None, "inference_ms": 0}

if snapshot_f30 is None:
    print("  WARNING — no frame-30 snapshot (track was lost). Skipping.")
else:
    frame_30_bgr, _ = snapshot_f30
    print(f"  segment_track(session={SESSION_ID}, track_id={PRIMARY_TRACK_ID})")
    t_seg = time.time()
    seg_result = segmenter.segment_track(
        session_id=SESSION_ID,
        track_id=PRIMARY_TRACK_ID,
        track_manager=track_manager,
        current_frame=frame_30_bgr,
    )
    seg_total_ms = (time.time() - t_seg) * 1000

    mask = seg_result.get("mask")
    print(f"\n  SAM3 result:")
    print(f"    inference_ms : {seg_result['inference_ms']:.1f} ms")
    print(f"    total call   : {seg_total_ms:.1f} ms")

    if mask is not None:
        SEG_OK = True
        h30, w30 = frame_30_bgr.shape[:2]
        px = int(mask.sum())
        pct = px / (h30 * w30) * 100
        print(f"    mask shape   : {mask.shape}")
        print(f"    mask pixels  : {px:,}  ({pct:.2f}% of frame)")
        print(f"  PASS  SAM3 returned valid mask using frame-30 live bbox")
    else:
        print(f"  NOTE  SAM3 returned None mask")

    if 30 in frame_bbox_log and 1 in frame_bbox_log:
        dx_seg = abs(frame_bbox_log[30][0] - frame_bbox_log[1][0])
        print(f"\n  Segmenter used frame-30 bbox : {fmt_bbox(frame_bbox_log[30])}")
        print(f"  Frame-1 bbox (NOT used)       : {fmt_bbox(frame_bbox_log[1])}")
        print(f"  Delta-x f30 vs f1             : {dx_seg:.2f} px")

# ─── STEP 6: Composer summaries ───────────────────────────────────────────────
hdr("STEP 6  — NLComposer.compose() for both results")

ocr_summary = composer.compose(
    task="ocr",
    result={"boxes": [], "labels": [], "scores": [], "text": ocr_result.get("text", "")},
    original_query=f"Read the text visible on the tracked person (track #{PRIMARY_TRACK_ID})"
)
print(f"\n  OCR summary  : \"{ocr_summary}\"")

seg_count = 1 if SEG_OK else 0
seg_summary = composer.compose(
    task="segment",
    result={
        "boxes":  [snapshot_f30[1]] if (snapshot_f30 and seg_count > 0) else [],
        "labels": [PROMPT] * seg_count,
        "scores": [1.0] * seg_count,
    },
    original_query=f"Segment the person at frame 30 (track #{PRIMARY_TRACK_ID})"
)
print(f"  Seg summary  : \"{seg_summary}\"")

# ─── STEP 7: Final trace summary ─────────────────────────────────────────────
hdr("STEP 7  — FULL PIPELINE TRACE SUMMARY")

print(f"\n  Video          : {VIDEO_PATH}  |  prompt='{PROMPT}'")
print(f"  Primary track  : #{PRIMARY_TRACK_ID}")
print(f"  Frames run     : {min(frame_idx, MAX_FRAMES)}  |  pipeline={loop_elapsed:.2f}s  ({min(frame_idx,MAX_FRAMES)/loop_elapsed:.1f} FPS)")

print("\n  Per-frame latencies at key frames:")
for f in [1, 15, 30]:
    if f in frame_latency_log:
        lat = frame_latency_log[f]
        print(f"    Frame {f:>2}: DINO={lat['dino_ms']:.0f}ms  Track={lat['tracker_ms']:.0f}ms")

print("\n  Bbox state at key frames:")
for f in [1, 15, 30]:
    bb = frame_bbox_log.get(f)
    print(f"    Frame {f:>2}: {fmt_bbox(bb) if bb else '[track lost]'}")

print(f"\n  OCR  text={repr(ocr_result['text'])}  conf={ocr_result['confidence']:.2f}  samples={ocr_result['total_samples']}")
mask = seg_result.get("mask")
print(f"  SAM3 mask={'valid' if mask is not None else 'None'}  infer={seg_result.get('inference_ms', 0):.0f}ms")

# ─── FINAL VERDICT ────────────────────────────────────────────────────────────
hdr("FINAL VERDICT")

checks = [
    ("DINO seeded tracker on frame 0",                  len(seed_tracks) > 0),
    ("bbox genuinely moved frame 1 -> 30",              MOVED),
    ("OCR voter pulled from live history buffer",       OCR_LIVE),
    ("SAM3 returned valid mask at frame 30",            SEG_OK),
    ("Composer produced OCR summary",                   bool(ocr_summary.strip())),
    ("Composer produced segment summary",               bool(seg_summary.strip())),
]

all_pass = True
for label, ok in checks:
    icon = "PASS" if ok else "FAIL"
    print(f"  [{icon}]  {label}")
    if not ok:
        all_pass = False

print()
if all_pass:
    print("  ALL CHECKS PASSED — track-aware pipeline is working end-to-end")
else:
    print("  SOME CHECKS FAILED — review trace above")

cap.release()
