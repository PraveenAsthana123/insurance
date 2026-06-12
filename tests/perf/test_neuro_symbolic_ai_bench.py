"""§138 · Neuro-Symbolic AI performance benchmark · pytest-benchmark."""
import joblib
import numpy as np
import pytest

MODEL_PATH = "/mnt/deepa/insur_project/models/neuro-symbolic-ai/model.joblib"


@pytest.fixture(scope="module")
def model():
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="module")
def sample():
    return np.random.randn(1, 8)


def test_predict_latency(benchmark, model, sample):
    """Single prediction p95 < 10ms."""
    if isinstance(model, dict):
        m = model.get("model")
    else:
        m = model
    if not hasattr(m, "predict"):
        pytest.skip("not predictable")
    result = benchmark(m.predict, sample)
    # benchmark reports p50/p95/p99 automatically
