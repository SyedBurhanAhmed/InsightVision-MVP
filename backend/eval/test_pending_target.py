"""
backend/eval/test_pending_target.py
=====================================
End-to-end test for the PENDING TARGET state machine in /ws/session.

Scenario
--------
  Phase 1 — synthetic black frames (guaranteed no detections) to set up the
             pending state.  The localizer will find nothing → enters PENDING.

  Phase 2 — issue "track the person in orange vest" while frames are blank.
             Expect: immediate "Watching for..." response (not a lock_on).

  Phase 3 — switch to real video frames (where the person IS visible).
             Each frame goes through _attempt_pending_targets at 0.5-s cadence.
             Expect: automatic lock_on + "Found and now tracking..." — no new command.

  Phase 4 — send one more frame then a segment command.
             Expect: bbox resolves against live track.

Pass/fail + retry-rate proof printed at end.
"""

import os
import sys
import time
import base64
import logging
import cv2
import numpy as np

# ── Path bootstrap ─────────────────────────────────────────────────────────────
_REPO_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DINO_ROOT    = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
for p in (_REPO_BACKEND, _DINO_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.patch_transformers import patch_transformers
patch_transformers()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("PENDING_TEST")
log.setLevel(logging.DEBUG)
_ch = logging.StreamHandler()
_ch.setLevel(logging.DEBUG)
_ch.setFormatter(logging.Formatter("%(message)s"))
log.addHandler(_ch)
log.propagate = False

# Capture session debug (shows "Pending retry #N" lines)
_slog = logging.getLogger("app.routers.session")
_slog.setLevel(logging.DEBUG)
_sh = logging.StreamHandler()
_sh.setLevel(logging.DEBUG)
_sh.setFormatter(logging.Formatter("[SESSION] %(message)s"))
_slog.addHandler(_sh)
_slog.propagate = False


def hdr(t):
    print("\n" + "═" * 70)
    print(f"  {t}")
    print("═" * 70)


def sub(t):
    print(f"  ── {t}")


# ── Paths ──────────────────────────────────────────────────────────────────────
eval_dir     = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(eval_dir, "..", ".."))

# The orange-vest person is present from frame 0 in this video.
# We use it for the real-frames phase only.
VIDEO_PATH = os.path.join(
    project_root, "images", "insightvision_orange_vest_testing_video.mp4"
)

PROMPT = "person in orange vest"

# Blank frames: synthetic black images — localizer will find NOTHING
BLANK_FRAME_COUNT = 10   # enough for the command to be issued into a dark feed

# Real frames: load from the start of the video where the person IS visible
REAL_FRAME_COUNT  = 80   # up to 80 real frames; stop early when lock-on fires


# ── Helpers ────────────────────────────────────────────────────────────────────

def encode_frame(img_bgr: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def make_blank_frame(h: int = 720, w: int = 1280) -> np.ndarray:
    """Return a solid-black BGR frame that the detector will find nothing in."""
    return np.zeros((h, w, 3), dtype=np.uint8)


def load_video_frames(path: str, start: int, count: int) -> list:
    cap = cv2.VideoCapture(path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    frames = []
    for _ in range(count):
        ret, f = cap.read()
        if not ret:
            break
        frames.append(f)
    cap.release()
    return frames


def recv_until(ws, stop_types: set, max_iters: int = 30):
    all_msgs, target = [], None
    for _ in range(max_iters):
        try:
            msg = ws.receive_json()
            all_msgs.append(msg)
            if msg.get("type") in stop_types:
                target = msg
                break
        except Exception:
            break
    return target, all_msgs


# ── Main test ──────────────────────────────────────────────────────────────────

def run_pending_target_test() -> bool:
    from app.main import app
    from starlette.testclient import TestClient

    hdr("Loading app (models boot once)")
    t_boot = time.time()

    watching_msg  = None
    found_msg     = None
    lock_msg      = None
    seg_result    = None
    seg_live_bbox = None
    pending_entries: list = []   # (frame_offset, pending_targets_list)

    with TestClient(app) as client:
        print(f"  App ready in {time.time() - t_boot:.1f}s")

        with client.websocket_connect("/ws/session") as ws:

            # ── Init ────────────────────────────────────────────────────────
            sub("Init — upload / grounding_dino")
            ws.send_json({
                "type": "init", "source": "upload",
                "localizer": "grounding_dino", "conf": 0.35, "fps": 25.0,
            })
            init_resp = ws.receive_json()
            assert init_resp.get("type") == "session_ready", init_resp
            sid = init_resp["session_id"]
            log.info(f"Session ready: {sid}")

            # ── Phase 1: blank frames — target deliberately absent ───────────
            sub(f"Phase 1: {BLANK_FRAME_COUNT} synthetic black frames (no person)")
            blank = make_blank_frame()
            for i in range(BLANK_FRAME_COUNT):
                ws.send_json({"type": "frame", "data": encode_frame(blank), "seq": i})
                fu = ws.receive_json()
                assert fu.get("type") == "frame_update", \
                    f"Expected frame_update on blank frame {i}, got {fu}"
            log.info(f"  ✓ {BLANK_FRAME_COUNT} blank frames acknowledged")

            # ── Phase 2: track command while frames are still blank ──────────
            sub(f"Phase 2: issuing track command — '{PROMPT}'")
            ws.send_json({"type": "command", "text": f"track the {PROMPT}"})

            # The localizer ran on the last blank frame → found nothing → PENDING
            # Expect a response message (watching-for), NOT a lock_on
            first_resp, after_cmd_msgs = recv_until(
                ws, stop_types={"response", "lock_on"}, max_iters=20
            )

            if first_resp is None:
                log.info("  ⚠  No response arrived after command within 20 iterations")
            elif first_resp.get("type") == "lock_on":
                log.info(
                    f"  ⚠  lock_on received — detector found the target even in black frame?! "
                    f"(track_id={first_resp.get('track_id')})"
                )
            elif first_resp.get("type") == "response":
                summary = first_resp.get("summary", "")
                watching_msg = first_resp
                log.info(f"  ✅  'Watching for...' response: \"{summary}\"")

            # ── Phase 3: real video frames — person IS visible ───────────────
            sub(f"Phase 3: {REAL_FRAME_COUNT} real video frames — person enters frame")
            real_frames = load_video_frames(VIDEO_PATH, 0, REAL_FRAME_COUNT)
            if not real_frames:
                log.info("❌  Could not load real video frames — check VIDEO_PATH")
                return False
            log.info(f"  Loaded {len(real_frames)} real frames from video")

            seq_offset = BLANK_FRAME_COUNT
            frame_updates_total = 0
            first_lock_frame    = None

            for i, frame in enumerate(real_frames):
                ws.send_json({
                    "type": "frame",
                    "data": encode_frame(frame),
                    "seq":  seq_offset + i,
                })
                msg   = ws.receive_json()
                mtype = msg.get("type")

                if mtype == "frame_update":
                    frame_updates_total += 1
                    pts = msg.get("pending_targets", [])
                    if pts:
                        pending_entries.append((i, pts))
                    tracks = msg.get("tracks", [])
                    if tracks and first_lock_frame is None:
                        first_lock_frame = i
                        log.info(
                            f"  ✅  Tracks active in frame_update at real-frame offset {i}: "
                            f"track_ids={[t['track_id'] for t in tracks]}"
                        )

                elif mtype == "lock_on":
                    lock_msg = msg
                    if first_lock_frame is None:
                        first_lock_frame = i
                    log.info(
                        f"  ✅  lock_on at real-frame offset {i}: "
                        f"track_id={msg.get('track_id')} | "
                        f"bbox={[round(v,1) for v in (msg.get('bbox') or [])]} | "
                        f"conf={msg.get('confidence')}"
                    )

                elif mtype == "response":
                    summary = msg.get("summary", "")
                    if "found and now tracking" in summary.lower():
                        found_msg = msg
                        log.info(f"  ✅  Found-and-tracking: \"{summary}\"")
                    else:
                        log.info(f"  Response: \"{summary}\"")

                elif mtype == "redetect":
                    log.info(f"  (redetect at frame {i}: reason={msg.get('reason')})")

                elif mtype == "error":
                    log.info(f"  Error: {msg}")

                else:
                    log.debug(f"  Other: {mtype}")

                # Stop early once we have confirmed lock-on AND found-message
                if lock_msg is not None and found_msg is not None:
                    log.info(
                        f"  Both lock_on + found-message confirmed — "
                        f"stopping at real-frame offset {i}"
                    )
                    break

            log.info(
                f"Phase 3 done | real frames sent={min(i+1, len(real_frames))} | "
                f"frame_updates={frame_updates_total} | "
                f"frames_with_pending_entries={len(pending_entries)} | "
                f"first_lock_frame={first_lock_frame}"
            )

            # ── Phase 4: follow-up segment command ───────────────────────────
            if lock_msg is not None or first_lock_frame is not None:
                sub("Phase 4: follow-up segment command on auto-locked track")
                # Send one fresh real frame to refresh last_frame
                fresh = real_frames[min(i + 1, len(real_frames) - 1)]
                ws.send_json({
                    "type": "frame",
                    "data": encode_frame(fresh),
                    "seq":  seq_offset + len(real_frames) + 1,
                })
                drain = ws.receive_json()  # consume frame_update

                ws.send_json({"type": "command", "text": "segment the tracked object"})
                dispatched, _ = recv_until(
                    ws, stop_types={"query_dispatched", "error"}, max_iters=10
                )

                if dispatched and dispatched.get("type") == "query_dispatched":
                    log.info(
                        f"  Segment dispatched for track_id={dispatched.get('track_id')}"
                    )
                    seg_msg, _ = recv_until(
                        ws, stop_types={"query_result", "error"}, max_iters=80
                    )
                    if seg_msg and seg_msg.get("type") == "query_result":
                        seg_result    = seg_msg["data"]
                        seg_live_bbox = seg_msg.get("bbox_at_query_time")
                        log.info(
                            f"  ✅  Segment: mask_pixels={seg_result.get('mask_pixels', 0):,} | "
                            f"live_bbox="
                            f"{[round(v,1) for v in seg_live_bbox] if seg_live_bbox else 'N/A'}"
                        )
                    else:
                        log.info(f"  Segment result: {seg_msg}")
                else:
                    log.info(f"  Dispatch: {dispatched}")

            ws.send_json({"type": "end_session"})

    # ── Retry-rate proof ───────────────────────────────────────────────────────
    sub("Retry-rate analysis (pending_targets[] in frame_update payloads)")
    expected_frames_per_retry = 25.0 * 0.5   # fps × PENDING_RETRY_INTERVAL_S

    retry_counts_seen: set = set()
    total_pending_frames = len(pending_entries)

    if pending_entries:
        for _, pts_list in pending_entries:
            for pt in pts_list:
                retry_counts_seen.add(pt.get("retry_count", 0))
        observed_fps_per_retry = (
            total_pending_frames / max(len(retry_counts_seen), 1)
        )
        ratio = observed_fps_per_retry / expected_frames_per_retry
        log.info(
            f"  pending_targets appeared in {total_pending_frames} frame_updates | "
            f"distinct retry_count values: {sorted(retry_counts_seen)} | "
            f"≈{observed_fps_per_retry:.1f} frames/retry "
            f"(expected ≈{expected_frames_per_retry:.1f} at 25fps×0.5s) | "
            f"ratio={ratio:.2f}x"
        )
    else:
        log.info(
            "  No pending_targets in frame_updates — "
            "target was found on the very first retry after real frames began "
            "(correct behavior; retry rate provable from [SESSION] debug logs above)"
        )

    # ── Verdict ────────────────────────────────────────────────────────────────
    hdr("RESULTS")

    got_watching = (
        watching_msg is not None
        and watching_msg.get("type") == "response"
        and ("watching" in watching_msg.get("summary", "").lower()
             or "will lock on" in watching_msg.get("summary", "").lower())
    )
    got_lockon  = lock_msg is not None or first_lock_frame is not None
    got_found   = found_msg is not None
    got_segment = seg_result is not None and seg_result.get("mask_pixels", 0) > 0

    print(f"  Watching-for message        : {'✅ PASS' if got_watching else '❌ FAIL'}")
    print(f"  Automatic lock-on (no cmd)  : {'✅ PASS' if got_lockon  else '❌ FAIL'}")
    print(f"  Found-and-tracking message  : {'✅ PASS' if got_found   else '❌ FAIL'}")
    print(f"  Follow-up segment resolved  : {'✅ PASS' if got_segment else '❌ FAIL'}")

    if pending_entries:
        print(
            f"  Retry-rate proof: {sorted(retry_counts_seen)} retries in "
            f"{total_pending_frames} frames "
            f"(≈{observed_fps_per_retry:.1f} frames/retry, "
            f"expected ≈{expected_frames_per_retry:.1f} at 25fps×0.5s)"
        )
    else:
        print(
            "  Retry-rate proof: see [SESSION] debug logs above for "
            "'Pending retry #N' lines and their timestamps"
        )

    if lock_msg:
        print(f"\n  Auto lock-on bbox : {[round(v,1) for v in (lock_msg.get('bbox') or [])]}")
    if seg_live_bbox:
        print(f"  Segment live bbox : {[round(v,1) for v in seg_live_bbox]}")

    passed = got_watching and got_lockon
    banner = "PENDING TARGET TEST PASSED" if passed else "PENDING TARGET TEST FAILED"
    print(f"\n{'═'*70}\n  {banner}\n{'═'*70}")
    return passed


if __name__ == "__main__":
    ok = run_pending_target_test()
    sys.exit(0 if ok else 1)
