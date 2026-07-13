"""
backend/app/routers/session.py
================================
WS /ws/session — Live session WebSocket endpoint.

Lifecycle (10 steps):
  1.  Client connects → sends {"type":"init", ...}
  2.  Server opens video source (server-side for rtsp/file; upload = client pushes frames)
  3.  Per-frame: BoxMOT tracker.update() only — localizer NOT called per frame
  4.  Client sends {"type":"command", "text":"..."}
  5.  QueryParser classifies: new_target vs active_track follow-up
  6.  new_target → localizer runs ONCE → BoxMOT seeded
       If target NOT visible: enters PENDING state — retried every PENDING_RETRY_INTERVAL_S
       until found (→ automatic lock-on) or PENDING_TIMEOUT_S elapsed (→ timeout message)
  7.  active_track follow-up → OCR or SAM3 segment dispatched as async background task
  8.  Composer wraps result → {"type":"response"} pushed
  9.  Adaptive re-detection: confidence drops / tracks lost / 5 s timeout
  10. On disconnect or end_session → teardown

Design:
  - All services (detectors, tracker, Gemma 4, SAM3 segmenter) use globals from ml_models
  - Single-writer pattern: one out_q + one sender() task prevent concurrent WS write errors
  - Heavy tasks (OCR: ~20 s, segmentation: ~400 ms) run via asyncio.create_task()
  - Localizer backend is IMMUTABLE after init — no mid-session switch
  - SAM3 segmenter is ALWAYS used for on-demand segmentation regardless of localizer choice
  - Pending targets are retried at PENDING_RETRY_INTERVAL_S (default 0.5 s), NOT every frame
"""

from __future__ import annotations

import asyncio
import base64
import logging
import time
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

import cv2
import numpy as np
import torch
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.state import ml_models
from app.services.track_manager import TrackManager

router = APIRouter()
logger = logging.getLogger(__name__)

# Persisted session history archive
session_history_dict: Dict[str, Dict[str, Any]] = {}

@router.get("/api/session/history")
def get_session_history():
    """Return all tracked session records sorted by timestamp descending."""
    return sorted(
        session_history_dict.values(),
        key=lambda x: x["timestamp"],
        reverse=True
    )

@router.post("/api/session/history/clear")
def clear_session_history():
    """Clear all session history records."""
    session_history_dict.clear()
    return {"status": "ok"}

@router.get("/api/benchmark")
def get_benchmark_results():
    """Return pipeline and model comparison benchmark results."""
    import os
    import json
    import torch
    json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs/benchmark_results.json"))
    if not os.path.exists(json_path):
        try:
            from eval.benchmark import generate_benchmark_results
            generate_benchmark_results()
        except Exception as e:
            logger.error(f"Failed to auto-generate benchmark results: {e}")
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            data = json.load(f)
        # Determine GPU device name dynamically
        has_gpu = torch.cuda.is_available()
        device_name = torch.cuda.get_device_name(0) if has_gpu else "CPU Mode"
        data["gpu_device_name"] = device_name
        return data
    return {"error": "Benchmark results file not found"}

class ConfigPayload(BaseModel):
    storage_location: str
    default_model: str
    tracking_algorithm: str
    hardware_acceleration: bool
    notifications: bool
    auto_save: bool
    cloud_provider: str
    cloud_api_key: str

@router.get("/api/config")
def get_config():
    import json
    import os
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs/config.json"))
    default_config = {
        "storage_location": os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs")),
        "default_model": "grounding_dino",
        "tracking_algorithm": "botsort",
        "hardware_acceleration": True,
        "notifications": True,
        "auto_save": True,
        "cloud_provider": "local",
        "cloud_api_key": ""
    }
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                user_cfg = json.load(f)
                for k, v in user_cfg.items():
                    default_config[k] = v
        except Exception as e:
            logger.error(f"Failed to read config.json: {e}")
    return default_config

@router.post("/api/config")
def update_config(payload: ConfigPayload):
    import json
    import os
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs/config.json"))
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    try:
        with open(config_path, "w") as f:
            json.dump(payload.model_dump(), f, indent=4)
    except Exception as e:
        logger.error(f"Failed to save config.json: {e}")
        return {"status": "error", "message": str(e)}
    return {"status": "ok", "message": "Config saved successfully"}

@router.post("/api/cache/clear")
def clear_cache():
    from app.services.cache import cache
    cache.clear()
    return {"status": "ok", "message": "Cache cleared successfully"}


# ── Adaptive re-detection thresholds ─────────────────────────────────────────
REDETECT_COOLDOWN_S = 0.5    # minimum interval between re-detects
CONF_DROP_THRESHOLD = 0.40   # per-track confidence floor
CONF_LOW_STREAK     = 3      # consecutive low-conf frames before drift trigger
MAX_IDLE_S          = 5.0    # hard timeout — always re-detect after this

# ── Pending-target search thresholds ─────────────────────────────────────────
# Retry interval is tuned to ~0.5 s so we don't race the GPU with DINO (~150 ms)
# or SAM3 (~200 ms) inference that may already be running in a followup task.
PENDING_RETRY_INTERVAL_S = 0.5   # seconds between localizer retries for pending targets
PENDING_TIMEOUT_S        = 30.0  # abandon pending search after this many seconds


# ─────────────────────────────────────────────────────────────────────────────
# State dataclasses
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TrackMeta:
    """Metadata recorded when a track is first created via lock-on."""
    track_id: int
    label: str           # descriptive label / prompt used at lock-on
    backend: str         # "grounding_dino" | "sam3"
    lock_on_bbox: List[float]   # [x,y,w,h] at lock-on time — used for movement proof
    low_conf_streak: int = 0    # counter for adaptive re-detection drift trigger


@dataclass
class PendingTarget:
    """
    A track command whose target was NOT visible on the first attempt.
    The session retries the localizer every PENDING_RETRY_INTERVAL_S seconds
    until the target appears or PENDING_TIMEOUT_S elapses.
    """
    pending_id: str         # short UUID — used as dict key in SessionState.pending_targets
    prompt: str             # original NL description / target_desc from the parser
    issued_at: float        # time.time() when the command was first received
    last_retry_t: float     # time.time() of the most recent localizer call
    retry_count: int = 0    # number of retries so far (for logging)


@dataclass
class SessionState:
    """All mutable state for one WebSocket session."""
    session_id: str
    localizer: str           # "grounding_dino" | "sam3" — immutable after init
    conf: float              # detection confidence threshold
    source: str              # "upload" | "webcam" | "rtsp" | "file"
    url: str                 # source URL (RTSP addr or local file path)
    cap: Optional[Any]       # cv2.VideoCapture for server-side; None for upload
    track_manager: TrackManager
    out_q: asyncio.Queue     # outgoing message queue (single-writer pattern)
    active: bool = True
    frame_idx: int = 0
    last_frame: Optional[np.ndarray] = None   # most-recent BGR frame (for command context)
    last_redetect_t: float = field(default_factory=time.time)
    last_redetect_frame: int = 0
    redetect_prompt: str = "object"   # prompt used at last lock-on (for adaptive re-detect)
    initial_track_count: int = 0
    track_meta: Dict[int, TrackMeta] = field(default_factory=dict)
    pending_tasks: Set[asyncio.Task] = field(default_factory=set)
    pending_targets: Dict[str, PendingTarget] = field(default_factory=dict)
    fps: float = 25.0
    last_frame_t: float = 0.0
    last_tracks: List[dict] = field(default_factory=list)
    sender_task: Optional[asyncio.Task] = None


# Global session registry
_sessions: Dict[str, SessionState] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_detector(localizer: str):
    """Return the appropriate detector wrapping the globally cached model weights."""
    if localizer == "sam3":
        m = ml_models.get("sam3_model")
        if m is None:
            raise RuntimeError("SAM3 model not loaded in ml_models")
        from app.services.detector import SAM3Detector
        return SAM3Detector(m)
    else:  # grounding_dino (default)
        m = ml_models.get("detector")
        if m is None:
            raise RuntimeError("GroundingDINO model not loaded in ml_models")
        from app.services.detector import GroundingDINODetector
        return GroundingDINODetector(m)


def _decode_b64_frame(data: str) -> Optional[np.ndarray]:
    """Decode a base64 JPEG/PNG string → BGR numpy array."""
    try:
        raw = base64.b64decode(data)
        arr = np.frombuffer(raw, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame  # None if decode failed
    except Exception as e:
        logger.warning(f"Frame decode error: {e}")
        return None


def _fmt_tracks(tracks: list, state: SessionState) -> list:
    """Format tracker output into the wire protocol dict list."""
    out = []
    for t in tracks:
        tid = t["track_id"]
        meta = state.track_meta.get(tid)
        out.append({
            "track_id": tid,
            "label":    t["label"],
            "bbox":     t["bbox"],            # [x, y, w, h] absolute pixels
            "confidence": round(t["confidence"], 3),
            "backend":  meta.backend if meta else state.localizer,
        })
    return out


async def _emit(state: SessionState, msg: Optional[dict]):
    """Put a message on the outgoing queue (non-blocking, unlimited queue)."""
    await state.out_q.put(msg)


async def _run_in_thread(fn, *args):
    """Run a blocking function in the default thread pool without stalling the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


# ─────────────────────────────────────────────────────────────────────────────
# Detection
# ─────────────────────────────────────────────────────────────────────────────

async def _detect(state: SessionState, frame_rgb: np.ndarray, prompt: str) -> dict:
    detector = _get_detector(state.localizer)
    conf = min(state.conf, 0.25) if state.localizer == "sam3" else state.conf
    return await _run_in_thread(detector.detect, frame_rgb, prompt, conf)


# ─────────────────────────────────────────────────────────────────────────────
# Lock-on  (step 6 — new target command)
# ─────────────────────────────────────────────────────────────────────────────

async def _lock_on(
    state: SessionState,
    frame_bgr: np.ndarray,
    prompt: str,
    *,
    emit_on_miss: bool = True,
) -> tuple[List[dict], bool]:
    """
    Run the session localizer ONCE on frame_bgr with the given prompt.
    Seeds BoxMOT and records TrackMeta for each new track.
    Pushes lock_on events through the out_q.

    Returns: (tracks, found)
      - found=True  → target was detected; tracks is non-empty list
      - found=False → nothing detected; tracks is []

    When emit_on_miss=False the caller handles the "not found" path
    (used by the pending-target retry loop which emits its own messages).
    """
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    t0 = time.time()
    det = await _detect(state, frame_rgb, prompt)
    lock_ms = (time.time() - t0) * 1000

    logger.info(
        f"[{state.session_id}] Lock-on | backend={state.localizer} | "
        f"detections={len(det['boxes'])} | latency={lock_ms:.0f}ms | prompt='{prompt}'"
    )

    if not det["boxes"]:
        if emit_on_miss:
            await _emit(state, {
                "type": "lock_on",
                "track_id": None,
                "backend": state.localizer,
                "latency_ms": round(lock_ms, 1),
                "detail": "No objects detected — try a different prompt or threshold",
            })
        return [], False

    # Feed detections into BoxMOT to assign track IDs
    dets_np = np.array(
        [[b[0], b[1], b[2], b[3], s, 0.0]
         for b, s in zip(det["boxes"], det["scores"])],
        dtype=np.float32,
    )
    # BoxMOT uses min_hits=3: a track must be detected in 3 consecutive frames before
    # it is confirmed and returned. Since we only call the localizer ONCE (at lock-on),
    # we warm up the tracker by replaying the same detections 3 times on the same frame.
    # This instantly confirms all detected tracks without requiring 3 video frames.
    logger.info(f"[_lock_on] Warming up tracker, dets_np={dets_np}")
    for i in range(3):
        logger.info(f"[_lock_on] Iteration {i} start...")
        tracks = await _run_in_thread(
            state.track_manager.update_track,
            state.session_id, dets_np, frame_bgr, [prompt]
        )
        logger.info(f"[_lock_on] Iteration {i} done, tracks={tracks}")

    if not tracks:
        # The localizer found something, but the tracker rejected it (e.g. invalid reID on black frame).
        # Treat as not found so we can enter PENDING or alert the user.
        if emit_on_miss:
            await _emit(state, {
                "type": "lock_on",
                "track_id": None,
                "backend": state.localizer,
                "latency_ms": round(lock_ms, 1),
                "detail": "Target localized but rejected by tracker",
            })
        return [], False

    # Update session state
    state.redetect_prompt = prompt
    state.last_redetect_t = time.time()
    state.last_redetect_frame = state.frame_idx
    state.initial_track_count = max(state.initial_track_count, len(tracks))
    state.last_tracks = tracks

    for t in tracks:
        tid = t["track_id"]
        state.track_meta[tid] = TrackMeta(
            track_id=tid,
            label=prompt,
            backend=state.localizer,
            lock_on_bbox=list(t["bbox"]),
        )
        
        # Add to history record
        record = session_history_dict.get(state.session_id)
        if record:
            target = next((x for x in record["targets"] if x["track_id"] == tid), None)
            if not target:
                target = {
                    "track_id": tid,
                    "label": prompt,
                    "lock_on_time": datetime.now().strftime("%H:%M:%S"),
                    "events": []
                }
                record["targets"].append(target)
            
            target["events"].append({
                "type": "lock_on",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "query": f"track the {prompt}",
                "result": f"Locked on target #{tid} (confidence: {round(t['confidence'], 2)}, latency: {round(lock_ms, 1)}ms)",
                "latency_ms": round(lock_ms, 1)
            })

        await _emit(state, {
            "type": "lock_on",
            "track_id": tid,
            "backend": state.localizer,
            "bbox": t["bbox"],
            "label": t["label"],
            "confidence": round(t["confidence"], 3),
            "latency_ms": round(lock_ms, 1),
        })

    return tracks, True


# ─────────────────────────────────────────────────────────────────────────────
# Adaptive re-detection  (step 9)
# ─────────────────────────────────────────────────────────────────────────────

async def _adaptive_redetect(
    state: SessionState, frame_bgr: np.ndarray, tracks: list
) -> list:
    """
    Check adaptive re-detection triggers; fire re-detect if needed.
    Uses the SAME localizer and SAME prompt that was used at lock-on.
    BoxMOT track IDs are preserved via IoU matching — no ID reset.
    """
    elapsed_frames = state.frame_idx - state.last_redetect_frame
    is_lost = len(tracks) < state.initial_track_count
    
    # If target is lost or active, run re-detection/correction every 0.5s (12 frames at 25 FPS).
    required_cooldown = int(REDETECT_COOLDOWN_S * state.fps)

    if elapsed_frames < required_cooldown:
        return tracks

    reason: Optional[str] = None
    triggered_tid: Optional[int] = None

    # Trigger 1: track count dropped below initial
    if is_lost:
        reason = "lost"

    # Trigger 2: per-track low-confidence streak
    if not reason:
        for t in tracks:
            tid = t["track_id"]
            meta = state.track_meta.get(tid)
            if meta is None:
                continue
            if t["confidence"] < CONF_DROP_THRESHOLD:
                meta.low_conf_streak += 1
                if meta.low_conf_streak >= CONF_LOW_STREAK:
                    reason = "drift"
                    triggered_tid = tid
                    break
            else:
                meta.low_conf_streak = 0
        
        # Trigger 3: periodic correction to keep Kalman filter aligned with ground truth
        if not reason and elapsed_frames >= required_cooldown:
            reason = "periodic"

        if not reason:
            return tracks

    # ── Execute re-detection ───────────────────────────────────────────────
    logger.info(
        f"[{state.session_id}] Adaptive redetect | reason={reason} "
        f"tid={triggered_tid} | backend={state.localizer}"
    )

    t0 = time.time()
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    det = await _detect(state, frame_rgb, state.redetect_prompt)
    redet_ms = (time.time() - t0) * 1000

    new_dets = (
        np.array(
            [[b[0], b[1], b[2], b[3], s, 0.0]
             for b, s in zip(det["boxes"], det["scores"])],
            dtype=np.float32,
        )
        if det["boxes"] else np.empty((0, 6), dtype=np.float32)
    )

    # First, run a single update step to see if BoxMOT associates the detection with our existing track(s)
    updated_tracks = await _run_in_thread(
        state.track_manager.update_track,
        state.session_id, new_dets, frame_bgr, [state.redetect_prompt],
    )

    if len(new_dets) > 0 and not any(t["track_id"] in state.track_meta for t in updated_tracks):
        # The detection did not associate with any active/known tracks (it is considered brand-new or tentative).
        # BoxMOT requires 3 consecutive hits to confirm a brand-new track. Warm it up instantly to confirm it.
        for _ in range(2):
            updated_tracks = await _run_in_thread(
                state.track_manager.update_track,
                state.session_id, new_dets, frame_bgr, [state.redetect_prompt],
            )

    state.last_redetect_t = time.time()
    state.last_redetect_frame = state.frame_idx

    # Register any brand-new tracks that appeared in re-detect
    for t in updated_tracks:
        tid = t["track_id"]
        if tid not in state.track_meta:
            state.track_meta[tid] = TrackMeta(
                track_id=tid, label=t["label"],
                backend=state.localizer, lock_on_bbox=list(t["bbox"]),
            )
            
            # Add to history record
            record = session_history_dict.get(state.session_id)
            if record:
                target = next((x for x in record["targets"] if x["track_id"] == tid), None)
                if not target:
                    target = {
                        "track_id": tid,
                        "label": t["label"],
                        "lock_on_time": datetime.now().strftime("%H:%M:%S"),
                        "events": []
                    }
                    record["targets"].append(target)
                
                target["events"].append({
                    "type": "lock_on",
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "query": f"re-detect: track {t['label']}",
                    "result": f"Locked on target #{tid} during adaptive re-detection",
                    "latency_ms": 0.0
                })

    await _emit(state, {
        "type": "redetect",
        "reason": reason,
        "track_id": triggered_tid,
        "backend": state.localizer,
        "tracks_recovered": len(updated_tracks),
        "latency_ms": round(redet_ms, 1),
    })

    logger.info(
        f"[{state.session_id}] Redetect done | reason={reason} | "
        f"recovered={len(updated_tracks)} | latency={redet_ms:.0f}ms"
    )
    return updated_tracks


# ─────────────────────────────────────────────────────────────────────────────
# Pending-target retry  (runs inside _process_frame)
# ─────────────────────────────────────────────────────────────────────────────

async def _attempt_pending_targets(state: SessionState, frame_bgr: np.ndarray):
    """
    For every PendingTarget that is overdue for a retry, run the localizer once.

    Call frequency is controlled by PendingTarget.last_retry_t — we only fire
    the GPU when PENDING_RETRY_INTERVAL_S seconds have elapsed since the last
    attempt.  This keeps the GPU free for BoxMOT's Kalman propagation and any
    concurrent OCR/segment tasks that may be running.

    On success  → removes the PendingTarget from the dict; calls _lock_on path
                  which seeds BoxMOT and emits lock_on events; then emits a
                  friendly "Found and now tracking..." response message.
    On timeout  → removes the PendingTarget and emits a "Could not find..." response.
    On miss     → updates last_retry_t and retry_count; does nothing else.
    """
    if not state.pending_targets:
        return

    now = time.time()
    # Snapshot keys so we can mutate the dict inside the loop
    for pid, pt in list(state.pending_targets.items()):
        # ── Timeout check ────────────────────────────────────────────────
        age = now - pt.issued_at
        if age >= PENDING_TIMEOUT_S:
            logger.info(
                f"[{state.session_id}] Pending target TIMED OUT after {age:.1f}s "
                f"| prompt='{pt.prompt}' | retries={pt.retry_count}"
            )
            del state.pending_targets[pid]
            await _emit(state, {
                "type": "response",
                "summary": f"Could not find '{pt.prompt}' within {PENDING_TIMEOUT_S:.0f}s — "
                           f"search cancelled. Try again or rephrase the description.",
                "pending_id": pid,
            })
            continue

        # ── Throttle check — only retry every PENDING_RETRY_INTERVAL_S ──
        since_retry = now - pt.last_retry_t
        if since_retry < PENDING_RETRY_INTERVAL_S:
            continue

        # ── Fire the localizer ────────────────────────────────────────────
        pt.last_retry_t = now
        pt.retry_count += 1
        logger.debug(
            f"[{state.session_id}] Pending retry #{pt.retry_count} "
            f"| prompt='{pt.prompt}' | age={age:.1f}s"
        )

        tracks, found = await _lock_on(state, frame_bgr, pt.prompt, emit_on_miss=False)

        if found:
            logger.info(
                f"[{state.session_id}] Pending target FOUND after {age:.1f}s "
                f"| prompt='{pt.prompt}' | retry_count={pt.retry_count} "
                f"| tracks={len(tracks)}"
            )
            del state.pending_targets[pid]
            # _lock_on already emitted lock_on events and seeded BoxMOT.
            # Emit a user-facing confirmation.
            await _emit(state, {
                "type": "response",
                "summary": f"Found and now tracking '{pt.prompt}'. "
                           f"Lock-on confirmed ({len(tracks)} track(s)).",
                "pending_id": pid,
                "track_ids": [t["track_id"] for t in tracks],
            })
        # If not found: loop continues, next retry scheduled via last_retry_t


# ─────────────────────────────────────────────────────────────────────────────
# Per-frame processing  (step 3)
# ─────────────────────────────────────────────────────────────────────────────

async def _process_frame(state: SessionState, frame_bgr: np.ndarray):
    """
    Process one frame: advance BoxMOT (Kalman only, no localizer),
    run adaptive re-detect if triggered, push frame_update.
    Also drives pending-target retries at the throttled interval.
    """
    # Pacing for server-driven file/RTSP sources only.
    # Upload mode already has natural backpressure: the client sends one frame,
    # waits for frame_update ACK, then sends the next — so no sleep is needed.
    # Adding asyncio.sleep in upload mode would also deadlock Starlette TestClient.
    if state.source == "file":
        now = time.time()
        if state.last_frame_t > 0:
            interval = 1.0 / state.fps
            elapsed = now - state.last_frame_t
            sleep_time = interval - elapsed
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
        state.last_frame_t = time.time()

    state.frame_idx += 1
    state.last_frame = frame_bgr
    t0 = time.time()

    if state.track_meta:
        # Determine if we should trigger adaptive re-detection BEFORE updating the tracker
        elapsed_frames = state.frame_idx - state.last_redetect_frame
        required_cooldown = int(REDETECT_COOLDOWN_S * state.fps)
        
        # Dynamic periodic cooldown based on localizer robustness characteristics
        if state.localizer == "sam3":
            periodic_cooldown_s = 0.1  # SAM3 is sensitive to posture changes, correct more frequently
        else:
            periodic_cooldown_s = 0.3  # Grounding DINO holds tracking well, run less frequently to save compute
        # periodic_cooldown_s = 0.3    
        periodic_cooldown = int(periodic_cooldown_s * state.fps)
        
        should_redetect = False
        reason = None
        triggered_tid = None

        if elapsed_frames >= required_cooldown:
            # Trigger 1: track count dropped below initial target count
            if len(state.last_tracks) < state.initial_track_count:
                should_redetect = True
                reason = "lost"

            # Trigger 2: per-track confidence drift/low streak
            if not should_redetect:
                for t in state.last_tracks:
                    tid = t["track_id"]
                    meta = state.track_meta.get(tid)
                    if meta:
                        if t["confidence"] < CONF_DROP_THRESHOLD:
                            meta.low_conf_streak += 1
                            if meta.low_conf_streak >= CONF_LOW_STREAK:
                                should_redetect = True
                                reason = "drift"
                                triggered_tid = tid
                                break
                        else:
                            meta.low_conf_streak = 0

            # Trigger 3: periodic correction to keep Kalman filter aligned with ground truth
            if not should_redetect and elapsed_frames >= periodic_cooldown:
                should_redetect = True
                reason = "periodic"

        if should_redetect:
            logger.info(
                f"[{state.session_id}] Adaptive redetect | reason={reason} "
                f"tid={triggered_tid} | backend={state.localizer}"
            )
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            det = await _detect(state, frame_rgb, state.redetect_prompt)

            new_dets = (
                np.array(
                    [[b[0], b[1], b[2], b[3], s, 0.0]
                     for b, s in zip(det["boxes"], det["scores"])],
                    dtype=np.float32,
                )
                if det["boxes"] else np.empty((0, 6), dtype=np.float32)
            )

            # Update tracker EXACTLY ONCE with the new detections
            tracks = await _run_in_thread(
                state.track_manager.update_track,
                state.session_id, new_dets, frame_bgr, [state.redetect_prompt],
            )

            # Warm up tracker if association failed to prevent track ID reset
            if len(new_dets) > 0 and not any(t["track_id"] in state.track_meta for t in tracks):
                for _ in range(2):
                    tracks = await _run_in_thread(
                        state.track_manager.update_track,
                        state.session_id, new_dets, frame_bgr, [state.redetect_prompt],
                    )

            state.last_redetect_frame = state.frame_idx
        else:
            # Normal tracking path: propagate with Kalman filter only (empty detection batch)
            # Update tracker EXACTLY ONCE
            empty = np.empty((0, 6), dtype=np.float32)
            tracks = await _run_in_thread(
                state.track_manager.update_track,
                state.session_id, empty, frame_bgr, [state.redetect_prompt],
            )
            
            # Update confidence streak counts
            for t in tracks:
                tid = t["track_id"]
                meta = state.track_meta.get(tid)
                if meta:
                    if t["confidence"] < CONF_DROP_THRESHOLD:
                        meta.low_conf_streak += 1
                    else:
                        meta.low_conf_streak = 0

        state.last_tracks = tracks
    else:
        # No lock-on yet — push empty update so client sees the frame counter ticking
        tracks = []

    # Drive pending-target searches (throttled — does NOT run localizer every frame)
    await _attempt_pending_targets(state, frame_bgr)

    latency_ms = (time.time() - t0) * 1000
    await _emit(state, {
        "type": "frame_update",
        "frame_idx": state.frame_idx,
        "tracks": _fmt_tracks(tracks, state),
        "latency_ms": round(latency_ms, 1),
        "pending_targets": [
            {"pending_id": pid, "prompt": pt.prompt, "retry_count": pt.retry_count}
            for pid, pt in state.pending_targets.items()
        ],
    })


# ─────────────────────────────────────────────────────────────────────────────
# Command handling  (steps 5–8)
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_track_id(state: SessionState, track_hint: Optional[str]) -> Optional[int]:
    """
    Resolve a textual track_hint to an active track_id in the live registry.

    Priority order:
    1. Exact / substring label match against track_hint.
    2. If track_hint is None AND only one track exists → return it.
    3. If track_hint is None AND all tracks share the same label (e.g. all "person")
       → return the primary track (lowest track_id, assigned at lock-on).
    4. Genuinely ambiguous (different labels, no hint) → return None.
    """
    active = list(state.track_meta.values())
    if not active:
        return None
    if len(active) == 1:
        return active[0].track_id
    if track_hint:
        hl = track_hint.lower()
        for meta in active:
            if hl in meta.label.lower() or meta.label.lower() in hl:
                return meta.track_id
    # Fallback: if all tracks share the same label, return the primary (lowest track_id)
    unique_labels = {meta.label.lower() for meta in active}
    if len(unique_labels) == 1:
        return min(active, key=lambda m: m.track_id).track_id
    return None   # genuinely ambiguous


async def _handle_command(ws: WebSocket, state: SessionState, text: str):
    """
    Parse a natural language command and route to the correct action.
    - new_target / track task → synchronous localizer lock-on on the current frame
    - active_track follow-up  → async background task (OCR or segmentation)
    """
    parser = ml_models.get("query_parser")
    if parser is None:
        await _emit(state, {"type": "error", "code": "parser_unavailable"})
        return

    # Build active-tracks context list for the parser
    active_ctx = [
        {"id": meta.track_id, "label": meta.label}
        for meta in state.track_meta.values()
    ]

    try:
        parsed = await _run_in_thread(parser.parse, text, active_ctx)
    except Exception as e:
        logger.error(f"[{state.session_id}] QueryParser error: {e}")
        await _emit(state, {"type": "error", "code": "parse_failed", "detail": str(e)})
        return

    task      = parsed.get("task", "detect")
    reference = parsed.get("reference", "new_target")
    target_desc = parsed.get("target_description") or text
    track_hint  = parsed.get("track_hint")

    logger.info(
        f"[{state.session_id}] Command | task={task} ref={reference} "
        f"target='{target_desc}' hint='{track_hint}'"
    )

    # ── New target: localizer lock-on ─────────────────────────────────────
    if reference == "new_target" or task == "track":
        if state.last_frame is None:
            await _emit(state, {
                "type": "error", "code": "no_frame",
                "detail": "Send at least one frame before issuing a track command",
            })
            return
        
        _, found = await _lock_on(state, state.last_frame, target_desc, emit_on_miss=False)
        if not found:
            # Target not visible on this frame — enter PENDING state
            pid = str(uuid.uuid4())[:8]
            now = time.time()
            pt = PendingTarget(
                pending_id=pid,
                prompt=target_desc,
                issued_at=now,
                last_retry_t=now,   # first retry is counted as the initial attempt
                retry_count=1,
            )
            state.pending_targets[pid] = pt
            logger.info(
                f"[{state.session_id}] Target not visible — entering PENDING "
                f"| pending_id={pid} | prompt='{target_desc}'"
            )
            await _emit(state, {
                "type": "response",
                "summary": f"Watching for '{target_desc}' — will lock on automatically "
                           f"when it enters frame (timeout {PENDING_TIMEOUT_S:.0f}s).",
                "pending_id": pid,
            })
        else:
            await _emit(state, {
                "type": "response",
                "summary": f"Found and now tracking '{target_desc}'. Lock-on confirmed.",
            })
        return

    # ── Active-track follow-up: dispatch async ────────────────────────────
    track_id = _resolve_track_id(state, track_hint)
    if track_id is None:
        if parsed.get("needs_clarification"):
            await _emit(state, {
                "type": "clarification_needed",
                "message": "Multiple tracked objects — which one did you mean?",
            })
        else:
            await _emit(state, {
                "type": "error", "code": "track_not_found",
                "detail": f"No active track matching '{track_hint}'",
            })
        return

    # Acknowledge immediately so the frame loop stays unblocked
    await _emit(state, {"type": "query_dispatched", "task": task, "track_id": track_id})

    bg = asyncio.create_task(_run_followup_query(state, task, track_id))
    state.pending_tasks.add(bg)
    bg.add_done_callback(state.pending_tasks.discard)


async def _run_followup_query(state: SessionState, task: str, track_id: int):
    """
    Background task: run OCR or segmentation against the LIVE bbox for track_id.

    Segmentation ALWAYS uses SAM3 regardless of which localizer the session uses —
    segmentation is a distinct capability from localization.

    Sends query_result + response messages when complete.
    """
    t0 = time.time()

    # Snapshot the LIVE bbox right now (it keeps moving while this task runs)
    buf = state.track_manager.history_buffers.get(state.session_id, [])
    live_bbox_xyxy: Optional[List[float]] = None
    for item in reversed(buf):
        for t in item["tracks"]:
            if t["track_id"] == track_id:
                x, y, w, h = t["bbox"]
                live_bbox_xyxy = [x, y, x + w, y + h]
                break
        if live_bbox_xyxy:
            break

    if live_bbox_xyxy is None:
        await _emit(state, {"type": "error", "code": "track_bbox_lost", "track_id": track_id})
        return

    try:
        data: dict = {}
        summary: str = ""
        from app.services.composer import NLComposer
        composer = NLComposer()

        # ── OCR (step 7a) ─────────────────────────────────────────────────
        if task == "ocr":
            from app.services.cache import cache
            cached_res = cache.get_track_cache(track_id, "ocr")
            if cached_res:
                logger.info(f"[{state.session_id}] Track cache hit for track_id={track_id} task=ocr")
                data = cached_res["data"]
                summary = cached_res["summary"]
            else:
                from app.services.reader import Gemma4Reader
                reader = Gemma4Reader()
                ocr_res = await _run_in_thread(
                    reader.read_track, state.session_id, track_id, state.track_manager
                )
                data = {
                    "text":          ocr_res["text"],
                    "confidence":    ocr_res["confidence"],
                    "vote_count":    ocr_res["vote_count"],
                    "total_samples": ocr_res["total_samples"],
                }
                data["result"] = f'Extracted text: "{ocr_res["text"]}" (Confidence: {int(ocr_res["confidence"] * 100)}%)'
                summary = composer.compose(
                    "ocr",
                    {"boxes": [], "labels": [], "scores": [], "text": ocr_res["text"]},
                    f"Read text on tracked object #{track_id}",
                )
                cache.set_track_cache(track_id, "ocr", {"data": data, "summary": summary})

        # ── Segmentation (step 7b) — ALWAYS SAM3 ─────────────────────────
        elif task == "segment":
            from app.services.cache import cache
            cached_res = cache.get_track_cache(track_id, "segment")
            if cached_res:
                logger.info(f"[{state.session_id}] Track cache hit for track_id={track_id} task=segment")
                data = cached_res["data"]
                summary = cached_res["summary"]
            else:
                from app.services.segmenter import SAM3Segmenter
                segmenter = SAM3Segmenter()   # always SAM3, regardless of session localizer
                frame = state.last_frame
                if frame is None:
                    await _emit(state, {
                        "type": "error", "code": "no_frame_for_segment", "track_id": track_id,
                    })
                    return
                seg_res = await _run_in_thread(
                    segmenter.segment_track,
                    state.session_id, track_id, state.track_manager, frame,
                )
                mask = seg_res.get("mask")
                mask_px = int(mask.sum()) if mask is not None else 0
                h_f, w_f = frame.shape[:2]
                
                # Extract contour polygons
                polygons = []
                if mask is not None:
                    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    for c in contours:
                        if len(c) > 2:
                            points = c.reshape(-1, 2).tolist()
                            polygons.append(points)

                data = {
                    "has_mask":           mask is not None,
                    "mask_pixels":        mask_px,
                    "frame_coverage_pct": round(mask_px / (h_f * w_f) * 100, 2) if mask_px else 0.0,
                    "inference_ms":       seg_res["inference_ms"],
                    "polygons":           polygons,
                }
                data["result"] = f"Mask generated successfully covering {data['frame_coverage_pct']}% of frame pixels."
                summary = composer.compose(
                    "segment",
                    {
                        "boxes":  [live_bbox_xyxy] if mask is not None else [],
                        "labels": ["object"] * (1 if mask is not None else 0),
                        "scores": [1.0] * (1 if mask is not None else 0),
                    },
                    f"Segment tracked object #{track_id}",
                )
                cache.set_track_cache(track_id, "segment", {"data": data, "summary": summary})

        # ── Describe / VQA ────────────────────────────────────────────────
        elif task in ("describe", "count", "detect"):
            frame = state.last_frame
            if frame is not None:
                x1, y1, x2, y2 = map(int, live_bbox_xyxy)
                h_f, w_f = frame.shape[:2]
                crop = frame[
                    max(0, y1):min(h_f, y2),
                    max(0, x1):min(w_f, x2),
                ]
                if crop.size > 0:
                    from PIL import Image as _PIL_Image
                    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                    crop_pil = _PIL_Image.fromarray(crop_rgb)
                    from app.services.gemma4 import Gemma4Service
                    gemma = Gemma4Service()
                    res = await _run_in_thread(
                        gemma.process, crop_pil,
                        f"Describe this object in detail. Task: {task}",
                    )
                    description = res.get("text", "")
                    data = {"description": description, "task": task, "result": description}
                    summary = composer.compose(
                        task,
                        {"boxes": [live_bbox_xyxy], "labels": [task], "scores": [1.0],
                         "text": description},
                        f"Describe track #{track_id}",
                    )

        total_ms = (time.time() - t0) * 1000

        # Add to history record
        record = session_history_dict.get(state.session_id)
        if record:
            target = next((x for x in record["targets"] if x["track_id"] == track_id), None)
            if target:
                target["events"].append({
                    "type": task,
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "query": f"{task} command",
                    "result": summary or str(data),
                    "latency_ms": round(total_ms, 1)
                })

        await _emit(state, {
            "type": "query_result",
            "task":  task,
            "track_id": track_id,
            "data":  data,
            "bbox_at_query_time": live_bbox_xyxy,   # ← live position, NOT lock-on snapshot
            "latency_ms": round(total_ms, 1),
        })
        await _emit(state, {
            "type": "response",
            "task": task,
            "track_id": track_id,
            "summary": summary,
        })

    except Exception as e:
        logger.error(f"[{state.session_id}] Follow-up query '{task}' failed: {e}", exc_info=True)
        try:
            await _emit(state, {
                "type": "error", "code": "query_failed",
                "task": task, "track_id": track_id, "detail": str(e),
            })
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Teardown
# ─────────────────────────────────────────────────────────────────────────────

def _cleanup_session(state: SessionState):
    """Release all resources for a session."""
    state.active = False
    if state.cap is not None and state.cap.isOpened():
        state.cap.release()
    state.track_manager.clear_session(state.session_id)
    for t in list(state.pending_tasks):
        t.cancel()
    if state.pending_targets:
        logger.info(
            f"[{state.session_id}] Dropping {len(state.pending_targets)} pending "
            f"target(s) on session close: "
            f"{[pt.prompt for pt in state.pending_targets.values()]}"
        )
        state.pending_targets.clear()
    logger.info(f"[{state.session_id}] Session resources released.")


# ─────────────────────────────────────────────────────────────────────────────
# Source-specific main loops
# ─────────────────────────────────────────────────────────────────────────────

async def _upload_loop(ws: WebSocket, state: SessionState):
    """
    Message-driven loop for client-pushed frame sources (upload / webcam).
    Server awaits JSON messages; client sends frames one at a time.
    """
    while state.active:
        try:
            msg = await ws.receive_json()
        except WebSocketDisconnect:
            break
        except Exception as e:
            logger.error(f"[{state.session_id}] Receive error: {e}")
            break

        mtype = msg.get("type", "")

        if mtype == "end_session":
            await _emit(state, {"type": "session_ended", "session_id": state.session_id})
            await _emit(state, None)   # sentinel → stops sender
            break

        elif mtype == "frame":
            frame_bgr = _decode_b64_frame(msg.get("data", ""))
            if frame_bgr is not None:
                await _process_frame(state, frame_bgr)
            else:
                await _emit(state, {
                    "type": "error", "code": "bad_frame",
                    "seq": msg.get("seq"),
                })

        elif mtype == "command":
            # Run command handler as a background task to keep the main frame-receive loop completely unblocked!
            task = asyncio.create_task(_handle_command(ws, state, msg.get("text", "").strip()))
            state.pending_tasks.add(task)
            task.add_done_callback(state.pending_tasks.discard)

        elif mtype == "ping":
            await _emit(state, {"type": "pong"})

        else:
            logger.debug(f"[{state.session_id}] Unknown message type: '{mtype}'")


async def _rtsp_loop(ws: WebSocket, state: SessionState):
    """
    Concurrent frame-reader + command-reader for server-side sources (RTSP / file).

    frame_reader — reads frames from cv2.VideoCapture, processes tracking.
    command_reader — receives commands from client, dispatches queries.

    If cap.read() returns False:
      1. Push camera_disconnected error
      2. Sleep 2 s, attempt one reconnect
      3. If still failing → push reconnect_failed and stop
    """
    reconnect_attempted = False

    async def frame_reader():
        nonlocal reconnect_attempted
        loop = asyncio.get_event_loop()
        while state.active:
            ret, frame = await loop.run_in_executor(None, state.cap.read)
            if not ret:
                if not reconnect_attempted:
                    reconnect_attempted = True
                    await _emit(state, {
                        "type": "error", "code": "camera_disconnected",
                        "detail": "Video source ended or RTSP stream dropped",
                    })
                    logger.warning(f"[{state.session_id}] Camera disconnected — attempting reconnect")
                    await asyncio.sleep(2.0)
                    reopened = await loop.run_in_executor(None, lambda: state.cap.open(state.url))
                    if not reopened:
                        await _emit(state, {
                            "type": "error", "code": "reconnect_failed",
                            "detail": "Could not re-open the video source",
                        })
                        state.active = False
                        return
                    ret2, frame2 = await loop.run_in_executor(None, state.cap.read)
                    if not ret2:
                        await _emit(state, {"type": "error", "code": "reconnect_failed"})
                        state.active = False
                        return
                    frame = frame2
                    reconnect_attempted = False
                else:
                    state.active = False
                    return
            else:
                reconnect_attempted = False

            await _process_frame(state, frame)
            await asyncio.sleep(0)   # yield — lets command_reader pick up commands promptly

    async def command_reader():
        while state.active:
            try:
                msg = await ws.receive_json()
                mtype = msg.get("type", "")
                if mtype == "end_session":
                    state.active = False
                    await _emit(state, {"type": "session_ended", "session_id": state.session_id})
                    await _emit(state, None)   # sentinel
                    return
                elif mtype == "command":
                    await _handle_command(ws, state, msg.get("text", "").strip())
                elif mtype == "ping":
                    await _emit(state, {"type": "pong"})
            except WebSocketDisconnect:
                state.active = False
                return
            except Exception as e:
                logger.error(f"[{state.session_id}] Command reader error: {e}")

    await asyncio.gather(frame_reader(), command_reader(), return_exceptions=True)


# ─────────────────────────────────────────────────────────────────────────────
# Main WebSocket handler
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/session")
async def websocket_session(ws: WebSocket):
    """
    WS /ws/session — main entry point.
    Single-writer pattern: all outgoing messages are funnelled through
    out_q → sender() coroutine to prevent concurrent WebSocket write errors.
    """
    await ws.accept()
    session_id = str(uuid.uuid4())[:8]
    state: Optional[SessionState] = None
    sender_task: Optional[asyncio.Task] = None

    # ── Dedicated sender coroutine ────────────────────────────────────────
    async def sender(q: asyncio.Queue):
        while True:
            msg = await q.get()
            if msg is None:   # sentinel — stop sender
                break
            try:
                await ws.send_json(msg)
            except Exception as e:
                logger.debug(f"[{session_id}] Send failed (client likely gone): {e}")
                break

    try:
        # ── Step 1: Init handshake ────────────────────────────────────────
        try:
            raw_init = await asyncio.wait_for(ws.receive_json(), timeout=30.0)
        except asyncio.TimeoutError:
            await ws.send_json({"type": "error", "code": "init_timeout"})
            return

        if raw_init.get("type") != "init":
            await ws.send_json({
                "type": "error", "code": "bad_init",
                "detail": "First message must be {type: 'init', source, localizer, ...}",
            })
            return

        localizer = raw_init.get("localizer", "grounding_dino")
        if localizer not in ("grounding_dino", "sam3"):
            await ws.send_json({
                "type": "error", "code": "invalid_localizer",
                "detail": f"Unknown localizer '{localizer}' — use 'grounding_dino' or 'sam3'",
            })
            return

        source = raw_init.get("source", "upload")
        url    = raw_init.get("url", "")
        conf   = float(raw_init.get("conf", 0.35))
        fps    = float(raw_init.get("fps", 25.0))

        # VRAM headroom check (both models loaded simultaneously)
        if torch.cuda.is_available():
            allocated_gb = torch.cuda.memory_allocated(0) / (1024 ** 3)
            total_gb     = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            usage_pct    = allocated_gb / total_gb * 100
            if usage_pct > 85.0:
                logger.warning(
                    f"[{session_id}] VRAM usage at {usage_pct:.1f}% — "
                    f"both DINO+SAM3 are loaded; monitor for OOM"
                )

        # ── Step 2: Open server-side video source ─────────────────────────
        cap = None
        if source in ("rtsp", "file"):
            if not url:
                await ws.send_json({"type": "error", "code": "missing_url"})
                return
            cap = cv2.VideoCapture(url)
            if not cap.isOpened():
                await ws.send_json({
                    "type": "error", "code": "camera_disconnected",
                    "detail": f"Cannot open source: {url}",
                })
                return
            cap_fps = cap.get(cv2.CAP_PROP_FPS)
            if cap_fps > 0:
                fps = cap_fps

        # Load tracker configuration dynamically
        config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs/config.json"))
        tracking_method = "botsort"
        if os.path.exists(config_path):
            try:
                import json
                with open(config_path, "r") as f:
                    cfg = json.load(f)
                    tracking_method = cfg.get("tracking_algorithm", "botsort")
            except Exception:
                pass

        # ── Create session state and start sender ─────────────────────────
        out_q: asyncio.Queue = asyncio.Queue()
        state = SessionState(
            session_id=session_id,
            localizer=localizer,
            conf=conf,
            source=source,
            url=url,
            cap=cap,
            track_manager=TrackManager(method=tracking_method, frame_rate=int(fps)),
            out_q=out_q,
            fps=fps,
            last_frame_t=0.0,
        )
        _sessions[session_id] = state
        
        # Add to global history archive
        session_history_dict[session_id] = {
            "id": session_id,
            "type": "Live Session",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "start_time": time.time(),
            "duration": "0s",
            "source": source,
            "url": url,
            "localizer": localizer,
            "status": "active",
            "targets": []
        }

        sender_task = asyncio.create_task(sender(out_q))
        state.sender_task = sender_task

        await out_q.put({
            "type": "session_ready",
            "session_id": session_id,
            "localizer": localizer,
            "source": source,
        })
        logger.info(
            f"[{session_id}] Session ready | localizer={localizer} | source={source}"
        )

        # ── Steps 3–9: Main session loop ──────────────────────────────────
        if source in ("rtsp", "file"):
            await _rtsp_loop(ws, state)
        else:
            await _upload_loop(ws, state)

    except WebSocketDisconnect:
        logger.info(f"[{session_id}] Client disconnected")
    except Exception as e:
        logger.error(f"[{session_id}] Unhandled error: {e}", exc_info=True)
        try:
            await ws.send_json({"type": "error", "code": "internal_error", "detail": str(e)})
        except Exception:
            pass
    finally:
        # ── Step 10: Teardown ─────────────────────────────────────────────
        if state:
            # Update final duration and status in history record
            record = session_history_dict.get(state.session_id)
            if record:
                elapsed = time.time() - record["start_time"]
                if elapsed >= 60:
                    record["duration"] = f"{int(elapsed // 60)}m {int(elapsed % 60)}s"
                else:
                    record["duration"] = f"{int(elapsed)}s"
                record["status"] = "completed"
                # Keep objects tracked count
                record["objects"] = len(record["targets"])
            
            _cleanup_session(state)
            _sessions.pop(state.session_id, None)
        if sender_task and not sender_task.done():
            sender_task.cancel()
            try:
                await sender_task
            except asyncio.CancelledError:
                pass
        logger.info(f"[{session_id}] Session fully closed.")
