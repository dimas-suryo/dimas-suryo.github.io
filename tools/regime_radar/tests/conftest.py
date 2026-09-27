import pytest

from tools.regime_radar import build


@pytest.fixture(autouse=True, scope="session")
def fast_defaults():
    """Cheap defaults for every test, set once per session so that module-scoped
    fixtures see them too (a function-scoped fixture would be set up after them).

    - 300 bootstrap replicates: the logic does not depend on the count.
    - HMM panel off: it adds real fits to every build; tests that need it turn it on.
    """
    mp = pytest.MonkeyPatch()
    mp.setitem(build.PARAMS, "bootstrap_reps", 300)
    mp.setitem(build.PARAMS, "hmm_enabled", False)
    yield
    mp.undo()
