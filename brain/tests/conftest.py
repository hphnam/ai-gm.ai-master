"""Test-suite environment.

The service is hardened by default and refuses to import without a shared secret
(service/auth.py). The suite opts out explicitly here rather than the default being
open, which is the whole point of the switch: forgetting it anywhere real is loud.

This must run before any test module imports `config`, which is why it lives in a
conftest rather than a fixture.
"""

from __future__ import annotations

import os

os.environ.setdefault("BRAIN_ALLOW_INSECURE", "1")
