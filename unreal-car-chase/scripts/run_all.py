"""
Run the whole setup in order: lighting -> sequence -> render queue.

In the Unreal Editor Cmd console:
    py "<path>/unreal-car-chase/scripts/run_all.py"

Re-running is safe: every step removes what it created last time.
"""

import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

STEPS = ["01_setup_lighting", "02_build_sequence", "03_setup_render_queue"]

# Reload shared modules so edits to the config / shot list are picked up without restarting the editor.
for shared in ("chase_config", "chase_shots", "chase_path", "ue_helpers"):
    if shared in sys.modules:
        importlib.reload(sys.modules[shared])

for step in STEPS:
    module = importlib.import_module(step)
    importlib.reload(module)
    module.main()
