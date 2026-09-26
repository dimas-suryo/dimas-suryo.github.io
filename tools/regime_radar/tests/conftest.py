import pytest

from tools.regime_radar import build


@pytest.fixture(autouse=True)
def fewer_bootstrap_reps(monkeypatch):
    """The bootstrap logic does not depend on the replicate count; 300 keeps the suite fast."""
    monkeypatch.setitem(build.PARAMS, "bootstrap_reps", 300)
