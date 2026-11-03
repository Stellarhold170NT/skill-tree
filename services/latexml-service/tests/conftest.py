"""Shared test fixtures: renders land in a throwaway dir per pytest run."""

import os
import pathlib
import sys
import tempfile

# Configure environment BEFORE importing the app package.
_TMPDIR = tempfile.mkdtemp(prefix="latexml-service-tests-")
os.environ["RENDERS_DIR"] = _TMPDIR

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
