"""Runtime identity for generated artefacts.

`sec:repro` names three coordinates that change a reported number while leaving the code
untouched: the store ceiling, the library resolution, and the compute device. An artefact
that states none of them is not reproducible, and the chapter argues exactly that. Until
report 59 no artefact carried the last two, which became concrete when the LOVO gate's
foundation clause turned out to depend on whether a backbone was importable: the same
command, the same store, two different verdicts, and nothing on the page to tell them
apart.

This module is the one place that answers "what produced this". Every field is best-effort
and never raises: a stamp that crashes a report generator would be worse than a missing
field, and a missing field is visible as `unknown` rather than silently absent.

Usage:
    from provenance import stamp_lines
    lines += stamp_lines()
"""

from __future__ import annotations

import os
import platform
import sys
from importlib.metadata import PackageNotFoundError, version

# The libraries whose resolution has actually moved a number in this project. Not an
# inventory of the environment: a lockfile is the inventory, and a stamp long enough to
# scroll past is a stamp nobody reads. `sec:flip` is the reason the first four are here.
STAMPED_PACKAGES = (
    "numpy",
    "pandas",
    "scikit-learn",
    "statsmodels",
    "duckdb",
    "torch",
    "chronos-forecasting",
)


def venv_name() -> str:
    """The environment directory's name, e.g. `.venv-forecast`.

    The project runs four venvs deliberately and they do not agree on what is installed,
    so which one ran is part of a result's identity. `sys.prefix` is the running
    interpreter's environment whether or not it was activated through a shell.
    """
    prefix = sys.prefix
    if prefix == getattr(sys, "base_prefix", prefix):
        return "system (no virtualenv)"
    return os.path.basename(prefix.rstrip("/")) or prefix


def torch_device() -> str:
    """The device Chronos loads onto, or why there is none.

    Reported even when torch is absent, because "no backend" is the fact that decided the
    foundation clause for as long as it went unnoticed.
    """
    try:
        import torch
    except Exception:
        return "n/a (torch not installed)"
    override = os.environ.get("BRAIN_TORCH_DEVICE")
    if override:
        return f"{override} (BRAIN_TORCH_DEVICE)"
    try:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def package_versions() -> dict[str, str]:
    return {name: _version_or_unknown(name) for name in STAMPED_PACKAGES}


def store_ceiling() -> str:
    """Imported lazily: a stamp must not pull the warehouse into a module that has no
    other reason to open it, and a report generated without a store still deserves the
    rest of its identity."""
    try:
        from store.warehouse import store_ceiling as _ceiling

        return str(_ceiling())
    except Exception:
        return "unknown"


def runtime_stamp(*, include_store: bool = True) -> dict:
    stamp = {
        "environment": venv_name(),
        "python": platform.python_version(),
        "platform": f"{platform.system()} {platform.machine()}",
        "device": torch_device(),
        "packages": package_versions(),
    }
    if include_store:
        stamp["store_ceiling"] = store_ceiling()
    return stamp


def stamp_lines(*, include_store: bool = True) -> list[str]:
    """Markdown block for the foot of a generated artefact."""
    s = runtime_stamp(include_store=include_store)
    installed = ", ".join(f"{k} {v}" for k, v in s["packages"].items()
                          if v != "not installed")
    absent = [k for k, v in s["packages"].items() if v == "not installed"]
    lines = [
        "",
        "## Runtime identity",
        f"- environment: `{s['environment']}` · Python {s['python']} · {s['platform']}",
        f"- compute device: {s['device']}",
        f"- libraries: {installed}",
    ]
    if absent:
        lines.append(f"- not installed: {', '.join(absent)}")
    if include_store:
        lines.append(f"- store ceiling: {s['store_ceiling']}")
    return lines


def _version_or_unknown(name: str) -> str:
    try:
        return version(name)
    except PackageNotFoundError:
        return "not installed"
    except Exception:
        return "unknown"
