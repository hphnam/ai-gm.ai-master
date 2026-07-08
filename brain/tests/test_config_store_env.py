"""G12.10f · BRAIN_STORE_DIR override (FLAG-STORE-ENV).

The store path must be environment-overridable so the live service can point its
DuckDB at a mounted persistent volume, with the default unchanged for local runs.
Config reads the env var at import, so the override is checked in a fresh
interpreter (subprocess), leaving this process's already-imported config alone.
"""

from __future__ import annotations

import subprocess
import sys


def _config_store_dir(env: dict | None) -> str:
    code = "import config; print(config.STORE_DIR)"
    out = subprocess.run([sys.executable, "-c", code], capture_output=True,
                         text=True, env=env, check=True)
    return out.stdout.strip()


def test_default_store_dir_is_in_repo(monkeypatch):
    import os

    env = {k: v for k, v in os.environ.items() if k != "BRAIN_STORE_DIR"}
    store = _config_store_dir(env)
    assert store.endswith("/brain/store")


def test_brain_store_dir_env_overrides_the_path(tmp_path):
    import os

    env = dict(os.environ, BRAIN_STORE_DIR=str(tmp_path / "mounted"))
    store = _config_store_dir(env)
    assert store == str(tmp_path / "mounted")
