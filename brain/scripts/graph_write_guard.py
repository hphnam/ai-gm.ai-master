#!/usr/bin/env python3
"""Make the graphify manifest stamp follow the graph write instead of the dispatch.

THE DEFECT THIS EXISTS FOR
--------------------------
graphify's build and its manifest save are two separate steps, and the manifest
step does not ask whether the first one succeeded. `save_manifest` stamps every
file that produced extraction OUTPUT; the shrink guard refuses the graph write
independently, in an earlier step. So when the guard fires:

  * graph.json keeps the old, good content                    (correct)
  * manifest.json is stamped as though the new content landed (wrong)

and the next `--update` reads those files as unchanged and skips them
permanently. The extraction is then unreachable: it is not in the graph, and
nothing will re-queue it. This happened twice on 2026-08-07 and was repaired
both times by hand with `git checkout -- graphify-out/manifest.json`, which is
a repair, not a fix.

THE FIX
-------
Bracket the run. `snapshot` records what graph.json was and puts manifest.json
aside; `settle` compares. If graph.json is byte-identical afterwards, no write
happened, so the stamps are rolled back to what they were before. Stamping then
follows the write, which is the invariant the pipeline should have had.

`settle` exiting non-zero is the REPORTABLE outcome, not an error to route
around: it means the refusal was real and the graph still needs a run that
lands.

USAGE
-----
    python3 brain/scripts/graph_write_guard.py snapshot [--out-dir DIR]
    ... run the graphify build / merge / export / save_manifest ...
    python3 brain/scripts/graph_write_guard.py settle   [--out-dir DIR]

    python3 brain/scripts/graph_write_guard.py --self-test

Exit codes for `settle`: 0 the graph was written and the stamps stand;
1 the graph was NOT written and the stamps were rolled back; 2 misuse
(no snapshot taken, missing files).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_OUT_DIR = Path("graphify-out")
SIDECAR_DIR_NAME = ".graph_write_guard"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def snapshot(out_dir: Path) -> int:
    graph = out_dir / "graph.json"
    manifest = out_dir / "manifest.json"
    if not graph.exists():
        # A first build has nothing to protect: there are no prior stamps to
        # lose and no prior graph to shrink.
        print(f"[guard] no {graph} yet — first build, nothing to protect")
        return 0
    if not manifest.exists():
        print(f"[guard] no {manifest} yet — nothing to protect")
        return 0

    side = out_dir / SIDECAR_DIR_NAME
    side.mkdir(exist_ok=True)
    shutil.copy2(manifest, side / "manifest.json")
    digest = _sha256(graph)
    (side / "state.json").write_text(
        json.dumps({"graph_sha256": digest, "graph_size": graph.stat().st_size}),
        encoding="utf-8",
    )
    print(f"[guard] snapshot: graph.json sha {digest[:12]}, manifest.json put aside")
    return 0


def settle(out_dir: Path) -> int:
    side = out_dir / SIDECAR_DIR_NAME
    state_path = side / "state.json"
    if not state_path.exists():
        print("[guard] ERROR: settle called with no snapshot — run snapshot first")
        return 2

    graph = out_dir / "graph.json"
    manifest = out_dir / "manifest.json"
    before = json.loads(state_path.read_text(encoding="utf-8"))["graph_sha256"]
    after = _sha256(graph) if graph.exists() else None

    if after is not None and after != before:
        shutil.rmtree(side)
        print(f"[guard] graph.json WAS written ({before[:12]} -> {after[:12]}); stamps stand")
        return 0

    saved = side / "manifest.json"
    if not saved.exists():
        print("[guard] ERROR: snapshot has no manifest copy — cannot roll back")
        return 2
    changed = (not manifest.exists()) or _sha256(manifest) != _sha256(saved)
    shutil.copy2(saved, manifest)
    shutil.rmtree(side)
    print(
        "[guard] graph.json was NOT written (sha unchanged). "
        + ("manifest.json ROLLED BACK to its pre-run stamps."
           if changed else "manifest.json was already unchanged.")
    )
    print("[guard] the refusal stands — the graph still needs a run that lands.")
    return 1


def self_test() -> int:
    """Exercise the guard against the violation it exists to catch.

    Two cases, and the failing one is the point: a guard that has only ever
    returned quietly is reporting what it decided, not what it can detect.
    """
    script = Path(__file__).resolve()
    results: list[tuple[str, bool, str]] = []

    def run(mode: str, out_dir: Path) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(script), mode, "--out-dir", str(out_dir)],
            capture_output=True,
            text=True,
        )

    with tempfile.TemporaryDirectory() as td:
        # Case 1 — the graph IS written. Stamps must survive.
        out = Path(td) / "written"
        out.mkdir()
        (out / "graph.json").write_text('{"nodes": [1, 2, 3]}', encoding="utf-8")
        (out / "manifest.json").write_text('{"files": {"a": "old"}}', encoding="utf-8")
        run("snapshot", out)
        (out / "graph.json").write_text('{"nodes": [1, 2, 3, 4]}', encoding="utf-8")
        (out / "manifest.json").write_text('{"files": {"a": "new"}}', encoding="utf-8")
        rc = run("settle", out).returncode
        kept = (out / "manifest.json").read_text(encoding="utf-8")
        results.append(
            ("graph written -> stamps stand", rc == 0 and '"new"' in kept,
             f"rc={rc} manifest={kept}")
        )

        # Case 2 — the write was REFUSED but the manifest was stamped anyway.
        # This is the real 2026-08-07 failure, reproduced exactly.
        out = Path(td) / "refused"
        out.mkdir()
        (out / "graph.json").write_text('{"nodes": [1, 2, 3]}', encoding="utf-8")
        (out / "manifest.json").write_text('{"files": {"a": "old"}}', encoding="utf-8")
        run("snapshot", out)
        (out / "manifest.json").write_text('{"files": {"a": "STAMPED"}}', encoding="utf-8")
        rc = run("settle", out).returncode
        rolled = (out / "manifest.json").read_text(encoding="utf-8")
        results.append(
            ("write refused -> stamps rolled back", rc == 1 and '"old"' in rolled,
             f"rc={rc} manifest={rolled}")
        )

        # Case 3 — settle without a snapshot is misuse, not a silent pass.
        out = Path(td) / "misuse"
        out.mkdir()
        (out / "graph.json").write_text("{}", encoding="utf-8")
        rc = run("settle", out).returncode
        results.append(("settle without snapshot -> misuse", rc == 2, f"rc={rc}"))

        # Case 4 — the sidecar must not survive a settle, or the next run
        # would compare against a stale baseline.
        out = Path(td) / "cleanup"
        out.mkdir()
        (out / "graph.json").write_text("{}", encoding="utf-8")
        (out / "manifest.json").write_text("{}", encoding="utf-8")
        run("snapshot", out)
        run("settle", out)
        results.append(
            ("sidecar removed after settle", not (out / SIDECAR_DIR_NAME).exists(), "")
        )

    width = max(len(name) for name, _, _ in results)
    for name, ok, detail in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name:<{width}}  {detail}")
    failed = [n for n, ok, _ in results if not ok]
    print(f"\nself-test: {len(results) - len(failed)}/{len(results)} passed")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("mode", nargs="?", choices=("snapshot", "settle"))
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if not args.mode:
        parser.error("mode is required unless --self-test is given")
    return snapshot(args.out_dir) if args.mode == "snapshot" else settle(args.out_dir)


if __name__ == "__main__":
    sys.exit(main())
