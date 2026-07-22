# InsightVision — Antigravity Task Prompts (v2: Real-Time Tracking Pivot)

**Status:** Query parser, Grounding DINO detector, and Florence-2 reader/OCR are already integrated and working. A Detection screen (image upload + phrase-grounding query + bounding box overlay) is also already built on the frontend — Prompt 7 below audits and adapts it rather than building it from scratch. **YOLO / closed-vocab detection was never built and is deliberately dropped from this plan** — the product's real queries are compositional referring expressions ("person in white on a bike"), which is exactly what a closed-vocab detector can't handle and Grounding DINO can.

**What changed and why this version exists:** InsightVision is not "detection on images with a chat wrapper." It's a live camera system you talk to — "track the person in white on a bike," then follow-up queries ("what's the number on the bike," "segment the person") that act on the *thing already being tracked*, not a fresh detection. That reframes the module order (tracking comes right after detection, before OCR/segmentation), the live API shape (WebSocket stream, not one-shot POST for the camera path), the camera input layer (webcam, uploaded video, AND direct RTSP from lab cameras — three different source types, not one), and the frontend (a live tracking screen plus a separate static-image screen, not a stats dashboard).

**Offline scope:** Grounding DINO, Florence-2, and SAM2 already run locally on your GPU — the CV pipeline is offline-capable today. The query parser and composer currently call a cloud LLM API, which is the one piece that isn't. Since RTSP lab cameras imply local-network operation and a defense demo shouldn't depend on internet availability, this version swaps that cloud call for a small model served locally via Ollama (Prompt 8). This is worth stating explicitly in your defense: the system runs fully on-device, no external API dependency.

Same ground rules as before: run the code, show real output, review scoring logic yourself line by line, commit after every working prompt.

---

## Prompt 5 — Architecture & Frontend Audit (do this first, don't skip it)

```
Before we build anything new, audit the current InsightVision codebase and frontend against this product description:

InsightVision is a real-time system attached to a live camera. A user issues natural-language commands and the system tracks the referenced object continuously:
- "Track the person in white on a bike" → detect once with Grounding DINO, lock onto that
  target, then track it frame-to-frame without re-running detection every frame.
- Follow-up queries reference the SAME active track: "what's the number on the bike" (OCR
  via Florence-2 on the tracked bike's plate, voted across several frames), "segment the
  person" (SAM2 on the tracked person's current bbox). These are NOT new detections — they
  act on state.
- Multiple simultaneous tracks are possible (e.g. two people tracked at once).
- Camera input can come from three sources: a browser webcam, an uploaded video file (for
  testing), or a direct RTSP connection to a physical camera (our lab's cameras connect via
  RTSP). RTSP is a server-side network stream — the backend connects to it directly, the
  browser is not involved in capturing that feed.
- There is also a simpler, separate static-image mode: upload a single image, type a
  natural-language query, get back bounding boxes and a summary — no tracking involved.
  Useful both as a demo and as a debugging tool to isolate detection issues from tracking
  issues.
- Grounding DINO is the sole detector (no closed-vocab fallback). It is NOT real-time
  frame-by-frame (roughly single-digit FPS on our GPU) — the live-tracking path must not
  call it on every frame.
- The system should run fully offline / on-device — no dependency on an external LLM API for
  query parsing or response composition. This matters because RTSP lab cameras run on a
  local network and a defense demo shouldn't depend on internet availability.
- Cross-camera / re-entry re-identification (recognizing the same object if it leaves frame
  and comes back, or appears on a different camera in a multi-camera setup) is explicitly
  OUT of scope for now — Phase 2. The current design should assume a single camera/session
  at a time, though the RTSP source should be built so multiple camera profiles CAN be
  configured later without a rewrite.

Do the following and write the findings to docs/architecture_audit.md:

1. Review backend/app/services/ (query_parser, detector, reader) against this description.
   Confirm the existing Grounding DINO and Florence-2 integrations are being called the way
   this design needs, and confirm exactly where the current cloud LLM dependency lives (both
   query_parser and composer) so Prompt 8 knows exactly what to swap.

2. Review the frontend screenshot I'm providing you against the product description above.
   Flag which nav items make sense for this two-mode product (live tracking + static image
   query) vs which look like leftover template scaffolding, and whether the live tracking
   screen needs a camera-source selector (webcam / upload / RTSP URL) as part of its design.

3. Propose the color scheme change: red is currently the dominant accent throughout (logo,
   active nav state, borders, status text). Propose a palette where red is reserved only for
   actual alert states (target lost, RTSP connection dropped, system error) and a calmer
   color carries the primary brand/active-state role.

4. Propose a concrete revised nav structure and screen list, including the static-image-query
   screen and the live tracking screen with its camera-source picker. Don't rebuild anything
   yet — write the plan and get my sign-off before Prompt 6.
```

**Definition of done:** you've read `docs/architecture_audit.md`, agree with (or corrected) the proposal, and given explicit sign-off before Prompt 6 starts.

---

## Prompt 6 — Speed Benchmark (Grounding DINO + Florence-2 + candidate local LLM)

```
First, install Ollama if it isn't already on this machine (WSL2 Ubuntu Noble):

  curl -fsSL https://ollama.com/install.sh | sh

Confirm it's running (`ollama --version`, `ollama serve` if it isn't already active as a
service) and specifically confirm it's using the GPU, not silently falling back to CPU —
run `ollama pull qwen3:7b`, then `ollama run qwen3:7b "test"` while watching `nvidia-smi` in
a second terminal to confirm VRAM usage actually shows up. We've already hit one silent
GPU-incompatibility issue on this machine (PyTorch needed the cu128 index for Blackwell) —
don't assume Ollama's WSL2 GPU passthrough just works, verify it before benchmarking
anything on top of it.

Add backend/eval/detector_speed.py and extend it to benchmark all three components that
will run concurrently on this GPU:

- Grounding DINO's real per-call latency at typical camera resolution, averaged over 20 runs
- Florence-2's real per-call OCR latency the same way (the OCR-voting design later calls it
  4-5 times per query — this number tells us if that's viable in under a couple seconds)
- Pull qwen3:7b via Ollama and benchmark its latency on a short structured-JSON
  classification prompt similar to what the query parser will send. Run this twice: once
  normally (GPU-accelerated, competing for VRAM with the CV models already loaded) and once
  forced to CPU-only (`OLLAMA_NUM_GPU=0` or equivalent) so we have a real number for the
  "no VRAM headroom left" case, not a guess. Also try phi4-mini the same way if qwen3:7b
  doesn't leave enough VRAM for the CV models at full quality.

Run all of these and show me the real numbers: latency for GPU-local, CPU-local, and VRAM
usage with all three CV models loaded. These numbers directly decide the LLM hosting
approach in Prompt 8 — don't guess which tier (GPU-local / CPU-local / cloud) is viable,
measure it.
```
Extend backend/eval/detector_speed.py to benchmark two additional candidates before we
commit to any architecture change:

PART A — SAM 3.1 vs current SAM2 pipeline:
1. Request access to SAM 3.1 weights on HuggingFace if not already approved, download the
   checkpoint (see facebookresearch/sam3 repo, RELEASE_SAM3p1.md).
2. Benchmark SAM 3.1's text-prompted "cold" detection+segmentation on a single frame,
   averaged over 20 runs — this is the "lock onto a new target" case, our real bottleneck.
3. Benchmark SAM 3.1's video propagation/tracking latency per frame over a 20-frame
   sequence, using Object Multiplex if two simultaneous tracks are active — this is the
   frame-to-frame tracking case.
4. Record VRAM usage for SAM 3.1 alone, then VRAM usage with SAM 3.1 loaded alongside
   whatever else is resident (Gemma 4, if Part B below is also loaded).
5. Print a direct comparison table: current GDINO+SAM2+ByteTrack (cold detect / per-frame
   track) vs SAM 3.1 (cold detect / per-frame track), latency and VRAM side by side.

PART B — Gemma 4 E4B as unified router + OCR:
1. Pull google/gemma-4-E4B (or the it-tuned variant) via Ollama if available, otherwise
   HuggingFace transformers.
2. Benchmark it in TEXT mode on 10 of our existing router test queries from Prompt 3 — same
   latency measurement as the current Groq/qwen3 router, real comparison.
3. Benchmark it in VISION mode on our existing OCR test set from Prompt 7, using a visual
   token budget of 560 (Google's guidance for small-text OCR) — same exact-match/CER
   measurement we already compute, so the numbers are directly comparable to Florence-2's.
4. Record VRAM for Gemma 4 E4B alone, resident continuously (it will be loaded once and
   serve both call types).
5. Print: side-by-side accuracy AND latency for Gemma 4 E4B OCR vs our existing Florence-2
   numbers, and Gemma 4 E4B routing accuracy/latency vs our existing Groq/qwen3 numbers.

PART C — Combined VRAM check:
Load SAM 3.1 (if Part A looks promising) + Gemma 4 E4B + Grounding DINO (still needed as a
fallback detector even in the SAM 3.1 case if its cold-start latency is too high)
simultaneously. Report total VRAM. Flag clearly if this exceeds our 16GB budget with no
headroom left.

Show me all three real result tables. Do not recommend a decision — just give me the
numbers, I'll decide the architecture from there.

**Definition of done:** real measured latency and VRAM figures for all three models loaded together on your own GPU, not an assumption.

---

## Prompt 7 — Audit & Adapt the Existing Detection Screen (don't rebuild it)

```
The Detection screen (phrase grounding on an uploaded image) is already built and working —
image upload, a "Detect Phrase" query box, bounding box overlay with confidence, and a
stats footer. This covers most of what a static-image analysis mode needs. Don't rebuild it
— audit it against the following and fix what's actually wrong, write findings +
fixes to docs/architecture_audit.md alongside the earlier audit notes:

1. CONFIRMED, no change needed: both Grounding DINO and Florence-2 endpoints are real and
   both work — this is an intentional dual-model setup (the dropdown picks which one runs),
   not a bug. Genuinely useful for the benchmark/comparison screen later (Prompt 17d) since
   it means real head-to-head accuracy/latency numbers between the two are already
   obtainable. Leave this as is.

2. Remove or reframe the FPS metric on this screen. "3.4 FPS" implies continuous processing,
   but this is a one-shot analysis of a single uploaded image — FPS doesn't mean anything
   here. Keep latency (that's real and useful), drop the FPS framing, or if you want a
   throughput-style number, label it clearly as something like "equivalent throughput if
   run continuously" so it isn't misread as a live number.

3. Check whether the "Masks" toggle next to "Labels" actually calls SAM2, or if it's a UI
   element with no backend behind it yet. If it's not wired, wire it: a segment-style query
   (or a toggle after a detect result) should call the real segmenter module and render the
   mask, not just flip a UI state with nothing behind it.

4. Check whether this screen supports the OCR and count/describe task types, or only
   detection/phrase-grounding right now. If it's detection-only, extend the query handling
   so a query like "what does the sign say" routes to the reader module and an OCR result
   renders here too — this screen should be the general "ask anything about this one image"
   mode, not detection-only.

5. Confirm the backend endpoint behind this screen returns a response shape consistent with
   the QueryResponse schema used elsewhere in the pipeline (structured result + summary +
   latency breakdown), even though this is a one-shot REST call and not part of the live
   tracking WebSocket — we'll want this screen's results feeding the same benchmark/
   comparison data later (Prompt 17d), so the shape needs to match now rather than needing
   translation later.

6. Small styling fix tied to the earlier palette audit: "Export Results" is styled in the
   same alert-red as error/warning states elsewhere. Recolor it to the calm primary accent —
   red should be reserved for actual alerts, not a benign export action.

7. Update the nav: since this one screen already covers what were separately planned as
   "Detection" and "VL Query," consolidate — confirm with me what the final nav item should
   be called (I'd suggest "Analyze Image," but check whether that reads clearly against the
   Live Tracking screen we'll build later) and remove the now-redundant separate "VL Query"
   entry if this screen fully replaces it.

Show me: the corrected model-badge behavior with a real request, confirmation of whether
Masks/OCR were already wired or needed building (and the fix if they didn't), and the
updated QueryResponse-shaped output from a real request.
```

**Definition of done:** you've run a real query through this screen and confirmed the model badge, mask toggle, and OCR path are all telling the truth about what actually executed — not just that the UI looks complete.

---

## Prompt 8 — LLM Hosting Decision (GPU-local / CPU-local / Cloud, based on real numbers)

```
Using the real numbers from Prompt 6, decide the hosting tier for query_parser.py and
composer.py, in this priority order — pick the first one that's actually viable, don't
default to the lowest tier just because it's simplest:

TIER 1 - GPU-local (preferred): if qwen3:7b (or phi4-mini) fits in VRAM alongside Grounding
DINO + Florence-2 + SAM2 at full quality with comfortable headroom, use this. Fully offline,
fast, no compromise on CV model quality.

TIER 2 - CPU-local: if GPU VRAM is too tight, run the same model CPU-only
(`OLLAMA_NUM_GPU=0` or equivalent). This is called only per-command, not per-frame, so a few
extra seconds of latency here doesn't block live tracking, which keeps running on the
tracker regardless. Still fully offline. Use the CPU latency number from Prompt 6 to decide
if this is acceptably fast for a live demo, not just theoretically viable.

TIER 3 - Cloud API (if both above are genuinely too slow or too constrained): keep the
original cloud LLM design. This is a legitimate choice, not a downgrade — the actual thesis
contribution is the CV pipeline (detection, tracking, OCR voting, segmentation), which stays
fully local and unaffected by this decision either way. If you land here, ALSO build a
minimal fallback: a regex/keyword-based parser in query_parser.py that handles the small set
of core command shapes ("track the X", "what's the Y", "segment Z") without calling the LLM
at all, activated automatically if the cloud API call fails or times out. Not
LLM-quality, but it means a dropped connection during a live demo degrades gracefully
instead of breaking the whole system.

Implement whichever tier the real numbers point to (build Tier 3's fallback parser
regardless of which tier you land on primarily — it's cheap insurance either way).

Requirements common to all tiers:
- Keep the client swap isolated (a config value / feature flag choosing GPU-local vs
  CPU-local vs cloud), so we can switch tiers later without rewriting the parsing logic.
- Re-run test_router.py (15 example queries) and test_composer.py (5 example results)
  against whichever tier you implement. Compare accuracy/readability to the original cloud
  baseline — I want to know if the chosen tier actually holds up on this task.
- If you implemented Tier 1 or Tier 2: write a real offline verification test (network
  disabled) proving one full parse -> detect -> compose cycle completes with zero external
  calls.
- If you implemented Tier 3: write a test that kills the network mid-request and confirms
  the regex fallback parser catches the core command shapes instead of the request just
  failing.

Show me: which tier you landed on and why (tie it back to the Prompt 6 numbers), the
accuracy/quality comparison table, and the relevant verification test output.
```

**Definition of done:** the tier chosen is backed by real measured numbers, not a default assumption — and you've personally watched the relevant fallback/offline behavior work, whichever tier it ended up being.

---

## Prompt 9 — Tracker Module

```
Create backend/app/services/tracker_base.py — TrackerBase (ABC) with:
- init_track(image, bbox, label) -> track_id: registers a new tracked target from a
  detection box, returns a persistent track_id
- update(image) -> list[dict]: advances all active tracks by one frame, returns
  [{"track_id": str, "bbox": [...], "confidence": float, "lost": bool}, ...]
- remove_track(track_id): drops a track

Implement a concrete tracker in tracker.py using BoT-SORT via the `boxmot` package
(detector-agnostic — it doesn't need to know Grounding DINO is the detector). Use BoT-SORT
specifically for its identity stability under occlusion, not ByteTrack — document why in a
comment, in case we need to swap later for speed.

Optional, cheap, worth doing now even though re-identification itself is Phase 2: when
init_track() creates a new track, also compute and store a simple appearance embedding for
that target. Don't build any matching/re-id logic against it yet — just store it on the
track record.

Build the detect-then-track loop in a new backend/app/services/track_manager.py:
- On a new "track X" command: run Grounding DINO once on the current frame to localize the
  target, then call tracker.init_track() with that box.
- On every subsequent frame: call tracker.update() — this does NOT call Grounding DINO.
- Every N seconds (configurable, default 3s) OR whenever a track's confidence drops below a
  threshold: re-run Grounding DINO on the current frame near the track's last known
  position to correct drift, and re-seed the tracker. Log every re-detection event.
- Maintain a registry of currently active tracks (track_id -> label, bbox, last_seen) that
  other modules (OCR, segmenter) can query by track_id. This registry is scoped to a single
  camera/session — no cross-session lookups (that's the Phase 2 boundary).

Write backend/eval/test_tracker.py: feed it a short local video clip, run the full
detect-then-track loop, draw the track_id and box on every frame, save the output as an
annotated video file.

Run it and show me: the saved video, how many re-detection events fired, and whether any
identity switches happened.
```

**Definition of done:** you've watched the annotated output video and confirmed the track_id stays locked on the correct object with no identity switches, or you've noted exactly where it failed.

---

## Prompt 10 — Query & Session Context Manager

```
Extend the query parser so it can distinguish a NEW target query from a FOLLOW-UP query on
an already-active track.

Update query_parser.py's output schema to:
{"task": "track|ocr|segment|count|describe", "target_description": str | null,
 "reference": "new_target" | "active_track", "track_hint": str | null}

- "track the person in white on a bike" -> reference: new_target
- "what's the number on the bike" (asked after) -> reference: active_track, track_hint
  helps resolve WHICH active track if more than one exists
- If there's exactly one active track and the query is ambiguous but plausibly about it,
  resolve to it. If there are multiple candidates, return needs_clarification: true instead
  of guessing.

This needs the local LLM's prompt (from Prompt 8) to see the current list of active tracks
as context so it can make this decision. Update the system prompt accordingly, and re-verify
this still works well on the local model, not just the cloud model it may have been tuned
against originally.

Write backend/eval/test_context.py with a realistic 6-turn conversation covering: a new
track command, two follow-ups on that track, a second new track while the first is active,
an ambiguous follow-up between two tracks, and a command referencing a lost track. Run it
and print each turn's classification.
```

**Definition of done:** you've read all 6 classifications and confirmed the logic matches what you'd expect a human dispatcher to do, using the local model.

---

## Prompt 11 — Reader: Multi-Frame OCR Voting (Florence-2, track-aware)

```
Extend the existing Florence-2 reader integration into read(track_id):

- Pulls the CURRENT bbox for that track_id from track_manager's active registry.
- Sample 4-5 frames of that region over roughly 1 second, spaced out enough that motion
  blur/angle varies between samples. Use the real Florence-2 latency number from Prompt 6
  to confirm this sample count is feasible in under a couple seconds; reduce it if not.
- Run Florence-2 on each cropped sample independently.
- Normalize each raw output (strip whitespace, uppercase, remove OCR-typical noise chars)
  before comparing. Take the majority vote. On a tie, return the highest-individual-
  confidence candidate and flag low_confidence: true.
- Return {"text": str, "vote_count": int, "total_samples": int, "confidence": float}.

Write backend/eval/test_reader_voting.py driving this through the tracker: initialize a
track on a test image, call read(track_id), compare to ground truth. Report exact-match
rate AND average vote confidence for correct vs incorrect predictions.
```

**Definition of done:** real exact-match rate, and a real correlation check between vote confidence and correctness.

---

## Prompt 12 — Segmenter (track-aware)

```
Implement segmenter.py (SegmenterBase) using SAM2, with segment(track_id) pulling the
current bbox from track_manager's active registry, same pattern as the Reader module.

Write backend/eval/test_segmenter.py: initialize a track, call segment(track_id), overlay
the mask, save to data/images/output/. Run it, show me the overlay and per-call latency.
```

**Definition of done:** you visually confirm mask quality, plus real latency, via the track-aware call path.

---

## Prompt 13 — Composer (track-aware, local LLM)

```
Implement composer.py (ComposerBase) using the local LLM client from Prompt 8, producing
track-aware summaries:
- New track: "Tracking 1 person in a white shirt on a bike."
- OCR follow-up: "The bike's plate reads ABC-123 (4/5 frames agreed)."
- Segment follow-up: "Segmented the tracked person."
- Ambiguous case: compose a clarifying question, not an error message.

Write backend/eval/test_composer.py with 5 example structured results covering each case.
Show me the 5 outputs.
```

**Definition of done:** you've read all 5 and confirmed they sound like a person talking.

---

## Prompt 14 — Camera Source Abstraction (Webcam / Uploaded Video / RTSP)

```
Create backend/app/services/camera_source_base.py — CameraSourceBase (ABC) with:
- start(): begin producing frames
- read_latest_frame() -> np.ndarray | None: returns the most recent available frame,
  non-blocking
- stop(): release resources
- is_connected() -> bool

Implement three concrete sources:

1. WebcamSource — receives frames pushed from the browser client over the WebSocket
   (Prompt 15 handles the wire protocol; this class just buffers/exposes the latest one).

2. UploadedVideoSource — reads a local video file frame by frame for testing, same interface
   as the others so test scripts don't need special-casing.

3. RTSPSource — connects DIRECTLY to an RTSP URL server-side (this is the lab camera case;
   no browser involvement in frame capture). Requirements:
   - Use cv2.VideoCapture(url, cv2.CAP_FFMPEG). RTSP credentials/URL come from a config file
     or env var per camera profile — never hardcoded.
   - Run frame grabbing in a background thread that continuously calls .grab() and only
     .retrieve()s the newest frame when read_latest_frame() is called — RTSP streams push
     frames in real time regardless of whether the consumer keeps up, so a naive blocking
     read() will accumulate lag over a session. Confirm this actually prevents lag buildup
     during a multi-minute test, not just a quick one.
   - Auto-reconnect with backoff if the stream drops (lab network hiccups, camera reboot,
     etc.) — log every disconnect/reconnect event, don't crash the session.
   - Default to TCP transport for reliability over UDP's lower latency, unless testing shows
     TCP-induced latency is a real problem on our lab's network.

Write backend/eval/test_camera_sources.py: run all three sources for ~30 seconds each,
report actual measured end-to-end latency (frame captured -> available via
read_latest_frame()) and whether any drops/reconnects happened. For RTSPSource specifically,
test against one of our actual lab cameras, not a mocked stream.

Show me the real latency numbers for all three, and the real reconnect log from the RTSP
test if any drops occurred.
```

**Definition of done:** you've run this against a real lab RTSP camera (not simulated) and confirmed it holds a connection, recovers from at least one forced disconnect, and doesn't accumulate lag over a multi-minute run.

---

## Prompt 15 — Full Integration (WebSocket, source-aware)

```
Build a persistent WebSocket endpoint at /ws/session in backend/app/routers/session.py for
the live-tracking mode (the static-image mode from Prompt 7 stays on its own simple REST
endpoint).

The session must support any of the three camera sources from Prompt 14, selected at
connection time: {"type": "init", "source": "webcam" | "rtsp" | "upload", "rtsp_url":
str | null, ...}

- For source="webcam": client streams frames to the server over the WebSocket as before.
- For source="rtsp" or "upload": the backend pulls frames itself via the corresponding
  CameraSource — the client does NOT push video frames for these. The server should relay a
  downsampled frame (e.g. JPEG snapshot every few hundred ms) back to the client so the UI
  can still show a live preview, separate from the full-rate frames used internally for
  tracking.
- Client can send a text command at any time on the same connection: {"type": "command",
  "text": "track the person in white on a bike"}
- Server runs the frame through track_manager.update() on every internal frame, and runs the
  full parse -> detect/track -> (ocr|segment) -> compose pipeline whenever a new command
  arrives.
- Server pushes a state update after processing: {"type": "state", "tracks": [...],
  "summary": str | null, "inference_breakdown_ms": {...}, "preview_frame": base64 | null}
- All services instantiated once at startup, shared across sessions.
- Wrap each stage in try/except; degrade gracefully rather than dropping the connection. A
  dropped RTSP connection specifically should surface as a clear "camera disconnected,
  reconnecting" state rather than the session silently going quiet.

Test it with a Python WebSocket client script covering two runs: one with source="upload"
using a local test video, and one with source="rtsp" against a real lab camera. Send one
"track X" command and one follow-up in each run. Print every state update, including real
latency breakdowns.

Show me the actual real logged output from both runs.
```

**Definition of done:** you've watched real state updates stream back over an actual WebSocket connection for both an uploaded video and a real RTSP camera, including the track lifecycle and a follow-up resolving correctly.

---

## Prompt 16 — Redis Caching (repositioned)

```
Live camera frames are essentially never identical twice, so per-frame caching doesn't help
here — cache OCR voting results and segment results keyed by (track_id, task,
rounded_timestamp_bucket) with a short TTL (e.g. 5s), so a duplicate follow-up command fired
twice in quick succession for the same track doesn't redundantly re-run the VLM OCR pass.
Also cache static-image-mode results (Prompt 7) by image hash + query.

Add Redis to docker-compose.yml. Test both cases and show me cache-miss vs cache-hit
latency for each.
```

**Definition of done:** real measured latency difference for both cases.

---

## Prompt 17 — Frontend Rebuild, Screen by Screen

Do NOT paste this as one prompt — go screen by screen, verify each before moving on.

### 17a — Design System Update

```
Update the frontend's design tokens based on the signed-off audit from Prompt 5: dark
neutral base, a single calm primary accent for active/interactive states, red reserved
exclusively for alert states (target lost, RTSP disconnected, system fault). Apply to the
shared theme file only — don't touch layouts yet. Show me a screenshot of the updated
Dashboard so I can sign off before we touch layout.
```

**Definition of done:** the new palette reads as a monitoring tool, not an alert panel.

### 17b — Live Tracking Screen

```
Build the live tracking screen with:
- A camera-source picker at the top: Webcam / Upload Video / RTSP (with a URL input and
  optionally a dropdown of saved lab camera profiles if we've configured more than one)
- Video preview connected to the /ws/session WebSocket from Prompt 15, driven by whichever
  source is active
- Overlay canvas drawing live bounding boxes + track_id labels
- A command input that sends {"type": "command", ...} over the same connection
- An "active tracks" chip list for context
- The composed NL summary shown as a chat-like log under the video

Update the nav so it's clear these are two distinct modes: "Analyze Image" (Prompt 7) and
"Live Tracking" (this one).

Walk me through one real session using an uploaded video, then one using the actual lab
RTSP camera: issue a track command, watch the overlay lock on, issue a follow-up, confirm
the summary log updates.
```

**Definition of done:** you personally ran one real session against a local video AND one against a real RTSP camera through the actual UI, and both worked.

### 17c — Track History / Session Log

```
Repurpose "History" to show a log of this session's tracked targets and the commands/
results issued against each — actual track timelines, not generic recent-queries. Pull from
state already pushed over the WebSocket.
```

**Definition of done:** you can look back at a completed session and see a coherent timeline.

### 17d — Benchmark / Comparison Screen (doubles as thesis evidence)

```
Repurpose "Comparison" and "Performance" into one real benchmark screen backed by
backend/eval/benchmark.py results, not mock stat cards. Show real per-task accuracy, real
latency breakdowns per pipeline stage — this screen becomes part of your defense material.
```

**Definition of done:** every number traces back to a real eval run in results.csv.

### 17e — Cross-Camera Re-ID (explicitly deferred)

```
Leave a "multi-camera" nav item or settings toggle as disabled/coming-soon — don't build it.
It depends on matching the appearance embeddings already stored per track (Prompt 9) across
sessions/cameras, which is real work deferred to Phase 2. Just make sure the nav doesn't
imply it's live when it isn't.
```

**Definition of done:** nothing half-built is presented as working in the UI you'll demo.

---

## Prompt 18 — Full Live Demo Run-Through

```
Run one complete real session end to end against the actual lab RTSP camera: "track the
person in white on a bike" -> overlay locks on -> "what's the number of the bike" -> real
OCR-voted answer -> "segment the person" -> mask renders -> target leaves frame -> system
reports the track as lost, not frozen. Also run one static-image-mode query for contrast.

Additionally: disable this machine's internet connection entirely and repeat one full
command cycle, to demonstrate the system runs with zero external dependency — this is worth
capturing separately as defense evidence, since "fully on-device, works against real
infrastructure with no internet" is a genuinely strong claim to be able to show, not just
state.

Capture both runs (screen recording or screenshots at each step).
```

**Definition of done:** you have real captured evidence of the full pipeline working live against a real RTSP camera, and separately with no internet connection at all.

---

## Notes

- Same review discipline as before: read the actual code, don't just trust the agent's summary; independently re-run anything you doubt; commit after every prompt that ends working.
- Benchmark dataset construction still applies once the pipeline is stable — point `benchmark.py` at both the static-image endpoint and the track-aware live calls.
- Cross-camera re-ID (Prompt 17e) is the only feature deliberately built toward-but-not-built: the appearance embedding hook in Prompt 9 is the only forward work done now.
- The SaaS-vs-FYP decision doesn't need to be made now. Build this as the strongest possible research system first; the productization question can wait until after your defense and until Libellula/HafizApp resolve.
