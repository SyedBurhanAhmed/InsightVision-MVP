"""
backend/eval/test_pending_target_ws.py
========================================
Pending-target E2E test against a REAL running uvicorn server (no TestClient).
Run the server first:
  cd backend && conda run -n env_sam3 uvicorn app.main:app --host 127.0.0.1 --port 8001

Then run this script:
  conda run -n env_sam3 python -u backend/eval/test_pending_target_ws.py
"""

import os, sys, time, base64, logging, asyncio, json
import cv2, numpy as np, websockets

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.WARNING)
log = logging.getLogger("PENDING_TEST")
log.setLevel(logging.DEBUG)
_h = logging.StreamHandler(); _h.setFormatter(logging.Formatter("%(message)s"))
log.addHandler(_h); log.propagate = False

WS_URL = "ws://127.0.0.1:8001/ws/session"

eval_dir     = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(eval_dir, "..", ".."))
VIDEO_PATH   = os.path.join(project_root, "images",
                            "insightvision_orange_vest_testing_video.mp4")
PROMPT       = "person in orange vest"

BLANK_FRAME_COUNT = 10    # synthetic black frames — target definitely absent
REAL_FRAME_COUNT  = 80    # real video frames — target appears here


def enc(bgr): 
    _, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return base64.b64encode(buf).decode()

def blank(h=720, w=1280): return np.zeros((h, w, 3), dtype=np.uint8)

def load_frames(path, start, n):
    cap = cv2.VideoCapture(path); cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    frames = []
    for _ in range(n):
        ok, f = cap.read()
        if not ok: break
        frames.append(f)
    cap.release(); return frames

def hdr(t): print(f"\n{'═'*70}\n  {t}\n{'═'*70}")
def sub(t): print(f"  ── {t}")


async def run():
    watching_msg = found_msg = lock_msg = None
    pending_entries = []   # (frame_offset, pending_targets_list)
    seg_result = seg_live_bbox = None
    first_lock_frame = None

    hdr("Connecting to real uvicorn server")
    async with websockets.connect(WS_URL, max_size=20*1024*1024) as ws:

        async def send(obj): await ws.send(json.dumps(obj))
        async def recv():    return json.loads(await ws.recv())

        # ── Init ──────────────────────────────────────────────────────────
        sub("Init — upload / grounding_dino")
        await send({"type":"init","source":"upload","localizer":"grounding_dino",
                    "conf":0.35,"fps":25.0})
        ir = await recv()
        assert ir.get("type") == "session_ready", ir
        log.info(f"Session ready: {ir['session_id']}")

        # ── Phase 1: blank frames (target absent) ─────────────────────────
        sub(f"Phase 1: {BLANK_FRAME_COUNT} synthetic black frames")
        bf = blank()
        for i in range(BLANK_FRAME_COUNT):
            await send({"type":"frame","data":enc(bf),"seq":i})
            fu = await recv()
            assert fu.get("type") == "frame_update", fu
        log.info(f"  ✓ {BLANK_FRAME_COUNT} blank frames acknowledged")

        # ── Phase 2: track command while frame is black ───────────────────
        sub(f"Phase 2: track command — '{PROMPT}'")
        t_cmd = time.time()
        await send({"type":"command","text":f"track the {PROMPT}"})

        # Groq Cloud parse + DINO inference on a cold GPU can take 20-40 s.
        # Use 60 s timeout. With emit_on_miss=False the server no longer sends
        # lock_on(track_id=None); it sends exactly one "response" with the
        # "Watching for..." summary — so we just wait for that.
        for _ in range(5):
            msg = await asyncio.wait_for(recv(), timeout=60.0)
            mtype = msg.get("type")
            if mtype == "response":
                summary = msg.get("summary","")
                if "watching" in summary.lower() or "will lock on" in summary.lower():
                    watching_msg = msg
                    log.info(f"  ✅  Watching-for ({time.time()-t_cmd:.1f}s): \"{summary}\"")
                else:
                    log.info(f"  Response (unexpected summary): \"{summary}\"")
                break
            elif mtype == "lock_on":
                # Should not happen with emit_on_miss=False, but handle defensively
                tid = msg.get("track_id")
                if tid is not None:
                    lock_msg = msg
                    log.info(f"  ℹ️  lock_on on blank frame track_id={tid} — "
                             "target was visible even in synthetic frame?")
                    break
                else:
                    log.debug("  (skipping null lock_on — server older version?)")
            elif mtype == "error":
                log.info(f"  Error after command: {msg}")
                break
            else:
                log.debug(f"  (skipping {mtype} after command)")

        # ── Phase 3: real video frames — person walks in ──────────────────
        sub(f"Phase 3: {REAL_FRAME_COUNT} real video frames")
        real_frames = load_frames(VIDEO_PATH, 0, REAL_FRAME_COUNT)
        log.info(f"  Loaded {len(real_frames)} real frames")

        seq = BLANK_FRAME_COUNT
        for i, frame in enumerate(real_frames):
            await send({"type":"frame","data":enc(frame),"seq":seq+i})
            msg   = await asyncio.wait_for(recv(), timeout=20.0)
            mtype = msg.get("type")

            if mtype == "frame_update":
                pts = msg.get("pending_targets",[])
                if pts: pending_entries.append((i, pts))
                tracks = msg.get("tracks",[])
                if tracks and first_lock_frame is None:
                    first_lock_frame = i
                    log.info(f"  ✅  Tracks in frame_update at offset {i}: "
                             f"ids={[t['track_id'] for t in tracks]}")
            elif mtype == "lock_on":
                lock_msg = msg
                if first_lock_frame is None: first_lock_frame = i
                log.info(f"  ✅  lock_on at offset {i}: "
                         f"track_id={msg.get('track_id')} | "
                         f"bbox={[round(v,1) for v in (msg.get('bbox') or [])]} | "
                         f"conf={msg.get('confidence')}")
            elif mtype == "response":
                s = msg.get("summary","")
                if "found and now tracking" in s.lower():
                    found_msg = msg
                    log.info(f"  ✅  Found-and-tracking: \"{s}\"")
                else:
                    log.info(f"  Response: \"{s}\"")
            elif mtype == "redetect":
                log.info(f"  (redetect at {i}: reason={msg.get('reason')})")
            elif mtype == "error":
                log.info(f"  Error: {msg}")
            else:
                log.debug(f"  Other: {mtype}")

            if lock_msg is not None and found_msg is not None:
                log.info(f"  Both confirmed — stopping at real-frame {i}")
                break

        log.info(f"Phase 3 done | first_lock_frame={first_lock_frame} | "
                 f"frames_with_pending={len(pending_entries)}")

        # ── Phase 4: follow-up segment ────────────────────────────────────
        if lock_msg is not None or first_lock_frame is not None:
            sub("Phase 4: segment follow-up on auto-locked track")
            fresh = real_frames[min(len(real_frames)-1, (first_lock_frame or 0)+2)]
            await send({"type":"frame","data":enc(fresh),"seq":seq+len(real_frames)+1})
            await asyncio.wait_for(recv(), timeout=10.0)   # drain frame_update

            await send({"type":"command","text":"segment the tracked object"})
            for _ in range(10):
                msg = await asyncio.wait_for(recv(), timeout=5.0)
                if msg.get("type") == "query_dispatched":
                    log.info(f"  Segment dispatched track_id={msg.get('track_id')}")
                    break

            for _ in range(80):
                msg = await asyncio.wait_for(recv(), timeout=5.0)
                if msg.get("type") == "query_result":
                    seg_result    = msg["data"]
                    seg_live_bbox = msg.get("bbox_at_query_time")
                    log.info(f"  ✅  Segment: "
                             f"mask_px={seg_result.get('mask_pixels',0):,} | "
                             f"bbox={[round(v,1) for v in seg_live_bbox] if seg_live_bbox else 'N/A'}")
                    break
                elif msg.get("type") == "error":
                    log.info(f"  Segment error: {msg}"); break

        await send({"type":"end_session"})

    # ── Retry-rate analysis ────────────────────────────────────────────────
    sub("Retry-rate analysis")
    expected_fpretry = 25.0 * 0.5   # fps × PENDING_RETRY_INTERVAL_S
    retry_counts: set = set()
    n_pending_frames = len(pending_entries)

    if pending_entries:
        for _, pts in pending_entries:
            for pt in pts:
                retry_counts.add(pt.get("retry_count",0))
        obs_fpretry = n_pending_frames / max(len(retry_counts), 1)
        log.info(
            f"  pending_targets in {n_pending_frames} frame_updates | "
            f"retry_counts={sorted(retry_counts)} | "
            f"≈{obs_fpretry:.1f} frames/retry (expected ≈{expected_fpretry:.1f}) | "
            f"ratio={obs_fpretry/expected_fpretry:.2f}x"
        )
    else:
        log.info("  No pending_targets entries in frame_updates "
                 "(target found on first retry — check [SESSION] debug logs above)")

    # ── Verdict ───────────────────────────────────────────────────────────
    hdr("RESULTS")
    got_watching = (watching_msg is not None
                    and ("watching" in watching_msg.get("summary","").lower()
                         or "will lock on" in watching_msg.get("summary","").lower()))
    got_lockon   = lock_msg is not None or first_lock_frame is not None
    got_found    = found_msg is not None
    got_segment  = seg_result is not None and seg_result.get("mask_pixels",0) > 0

    print(f"  Watching-for message        : {'✅ PASS' if got_watching else '❌ FAIL'}")
    print(f"  Automatic lock-on (no cmd)  : {'✅ PASS' if got_lockon  else '❌ FAIL'}")
    print(f"  Found-and-tracking message  : {'✅ PASS' if got_found   else '❌ FAIL'}")
    print(f"  Follow-up segment resolved  : {'✅ PASS' if got_segment else '❌ FAIL'}")

    if pending_entries:
        print(f"  Retry-rate: {sorted(retry_counts)} retries in {n_pending_frames} frames "
              f"(≈{obs_fpretry:.1f} f/retry, expected ≈{expected_fpretry:.1f} at 25fps×0.5s)")
    if lock_msg:
        print(f"\n  Auto lock-on bbox : {[round(v,1) for v in (lock_msg.get('bbox') or [])]}")
    if seg_live_bbox:
        print(f"  Segment live bbox : {[round(v,1) for v in seg_live_bbox]}")

    passed = got_watching and got_lockon
    banner = "PENDING TARGET TEST PASSED" if passed else "PENDING TARGET TEST FAILED"
    print(f"\n{'═'*70}\n  {banner}\n{'═'*70}")
    return passed


if __name__ == "__main__":
    ok = asyncio.run(run())
    sys.exit(0 if ok else 1)
