# Codebase Hygiene and Discrepancy Audit Report

| Category | File:Line / Target | Finding | Confidence | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Unused Imports (Pyflakes/Vulture)** | `backend/test_botsort_lost.py:2` | 'cv2' imported but unused | High | Remove import |
| | `backend/test_botsort.py:2` | 'cv2' imported but unused | High | Remove import |
| | `backend/test_black_dino.py:1` | 'cv2' imported but unused | High | Remove import |
| | `backend/test_sam3_raw.py:2-4` | 'numpy as np', 'time', 'app.core.state.ml_models' unused | High | Remove imports |
| | `backend/test_session_ws_sim.py:4` | 'time' imported but unused | High | Remove import |
| | `backend/benchmark_cache.py:2-3` | 'hashlib', 'json' imported but unused | High | Remove imports |
| | `backend/test_concrete_tracker.py:2` | 'cv2' imported but unused | High | Remove import |
| | `backend/test_session_sim2.py:2` | 'numpy as np' imported but unused | High | Remove import |
| | `backend/test_sam3_scores.py:2-9` | 'numpy', 'time', 'ml_models', 'Sam3Processor' unused | High | Remove imports |
| | `backend/app/routers/session.py:704` | local variable 't0_det' is assigned to but never used | High | Remove or use variable |
| | `backend/app/routers/query.py:159` | local variable 'seg_res' is assigned to but never used | High | Remove or use variable |
| | `backend/app/routers/vision.py:14` | 'torch' imported but unused | High | Remove import |
| | `backend/app/routers/vision.py:248` | local variable 'seg_res' is assigned to but never used | High | Remove or use variable |
| | `backend/app/models/schemas.py:19` | 'time' imported but unused | High | Remove import |
| | `backend/app/services/segmenter.py:5-7` | 'torch', 'typing.Dict', 'typing.List' unused | High | Remove imports |
| | `backend/app/services/composer.py:2-6` | 'time', 'typing.Dict', 'typing.Any' unused | High | Remove imports |
| | `backend/app/services/query_parser.py:7` | 'ollama' imported but unused | High | Remove import |
| | `backend/app/services/reader.py:7` | 'typing.Dict' imported but unused | High | Remove import |
| | `backend/app/services/detector.py:1,84` | 'os', 'cv2' imported but unused | High | Remove imports |
| | `backend/app/services/cache.py:6` | 'typing.Any' imported but unused | High | Remove import |
| | `backend/eval/*.py` | 27 unused imports and f-strings without placeholders | High | Fix f-strings, remove imports |
| **Phase 1: Frontend Dependencies** | `frontend/package.json` | Missing `react-router` dependency (used in `App.tsx`) | High | Run `npm install react-router` |
| | `frontend/package.json` | Unused dependency `tailwindcss` | Medium | Remove (unless implicitly needed by PostCSS/Vite) |
| **Phase 2: Orphaned Files** | `frontend/src/components/pages/VisionLanguage.tsx` | File never imported or referenced in frontend router | High | Remove file |
| | `frontend/src/components/pages/FewShotLearning.tsx` | File never imported or referenced in frontend router | High | Remove file |
| | `frontend/src/components/figma/ImageWithFallback.tsx` | File never imported or referenced | High | Remove file |
| | `frontend/src/components/ui/*.tsx` | 22 shadcn/ui components (e.g. accordion, avatar) are unused | Medium | Safe to keep as UI lib, or prune if strict cleanup |
| **Phase 3: Suspicious Markers (TODOs & Mocks)** | `backend/benchmark_cache.py:9-88` | Uses `dummy_image_bytes`, `dummy_response_data`, `dummy_ocr_result` | High | Clean up test/dummy data logic in benchmarks |
| | `backend/eval/test_reader_voting.py:38` | Contains `mock detections [x1, y1...]` | Low | Expected in test file |
| | `frontend/src/components/pages/About.tsx:9-44` | Multiple "TODO: confirm full wording with Waleed/Fatima before defense" | High | Resolve text placeholders before defense |
| | `frontend/src/components/pages/History.tsx:198-219` | Mentions "fallback to mock data" and checks for `id.startsWith('mock-')` | High | Ensure mock logic doesn't leak into production UI |
| | `frontend/src/components/pages/LiveCamera.tsx:721` | UI Input placeholders | Low | Intentional UI placeholder strings (false positives) |
| | `docs/flutter_contract_audit.md:6` | States features are "fully mocked locally in the screens" | High | Review flutter implementation if supposed to be integrated |
| **Phase 4: Unused PyPI Packages** | `backend/requirements.txt` | `torchvision` installed but never imported | High | Remove from requirements.txt |
| | `backend/requirements.txt` | `supervision` installed but never imported (only in comments) | High | Remove from requirements.txt |
| | `backend/requirements.txt` | `lapx` installed but never imported | Medium | Remove (unless ByteTrack requires it dynamically) |
| | `backend/requirements.txt` | `uvicorn`, `python-multipart` never imported | Low | Keep (uvicorn is a CLI runner, multipart handles FastAPI forms) |
| **Phase 5: Doc-to-Source Drift** | `docs/InsightVision_Antigravity_Prompts.md` | Paths like `backend/eval/test_reader.py`, `backend/eval/results.csv` do not exist | High | Update or deprecate doc |
| | `docs/fatima_backend_audit.md` | Paths like `backend/src/models/User.js`, `backend/src/routes/queries.js` do not exist | High | Expected if backend is Python, but flag to clarify docs |
| | `docs/insightvision_prompts_v2 (2).md` | References `backend/app/services/camera_source_base.py` which doesn't exist | High | Deprecate document |
| **Phase 6: Redundant/Superseded Files** | `backend/test_session_sim2.py` | Looks like a duplicate/iteration of `test_session_sim.py` | High | Consolidate and remove duplicate |
| | `docs/insightvision_prompts_v2 (2).md` | Duplicate file created from copy-pasting | High | Remove file |
| | `docs/InsightVision_Antigravity_Prompts.md` | Older superseded prompt docs | High | Remove file |
| | `docs/localizer_and_tracker_decision.md` | Likely superseded by the newer `tracker_decision.md` | High | Consolidate or remove |
