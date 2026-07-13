import re
import os
import glob

doc_files = glob.glob('docs/*.md')
path_pattern = re.compile(r'([a-zA-Z0-9_\-\./]+/?[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)')

for doc in doc_files:
    with open(doc, 'r') as f:
        content = f.read()
    paths = path_pattern.findall(content)
    # Check for paths like backend/app/... or frontend/src/...
    for p in paths:
        if ('backend/' in p or 'frontend/' in p) and not p.startswith('http'):
            # clean up path
            clean_p = p.strip('`').strip('*').strip(',').strip(')')
            if '/' in clean_p and not os.path.exists(clean_p):
                print(f"Drift in {doc}: Path {clean_p} does not exist.")

