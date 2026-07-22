import os
import glob
import re

def find_orphans(directory, extensions, ignore_dirs, entry_points):
    files = []
    for root, dirs, filenames in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for f in filenames:
            if any(f.endswith(ext) for ext in extensions):
                files.append(os.path.join(root, f))
    
    orphans = []
    for f in files:
        basename = os.path.basename(f)
        if basename in entry_points or basename.startswith('test_'):
            continue
        
        name_without_ext = os.path.splitext(basename)[0]
        
        # Check if name_without_ext is mentioned in any other file
        found = False
        for other_f in files:
            if other_f == f:
                continue
            try:
                with open(other_f, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if name_without_ext in content:
                        found = True
                        break
            except Exception:
                pass
        
        if not found:
            orphans.append(f)
            
    return orphans

backend_orphans = find_orphans('backend', ['.py'], ['__pycache__', 'outputs', 'node_modules', '.git', 'eval'], ['main.py', '__init__.py', 'session.py', 'query.py', 'vision.py', 'benchmark_cache.py', 'test_black_dino.py', 'test_botsort.py', 'test_botsort_lost.py', 'test_botsort_warmup.py', 'test_concrete_tracker.py', 'test_sam3_frame0.py', 'test_sam3_raw.py', 'test_sam3_scores.py', 'test_session_sim.py', 'test_session_sim2.py', 'test_session_ws_sim.py'])
frontend_orphans = find_orphans('frontend', ['.ts', '.tsx', '.js', '.jsx'], ['node_modules', '.git', 'build', 'dist'], ['index.tsx', 'index.ts', 'main.tsx', 'main.ts', 'App.tsx'])

print("Backend orphans:")
for o in backend_orphans: print(o)

print("Frontend orphans:")
for o in frontend_orphans: print(o)
