"""§139 · Odysseus performance benchmark · pytest-benchmark."""
import joblib
import numpy as np
import pytest

MODEL_PATH = "/mnt/deepa/insur_project/models/odysseus-ai/model.joblib"


@pytest.fixture(scope="module")
def bundle():
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="module")
def sample(bundle):
    n_features = bundle["model"].n_features_in_
    return np.random.randn(1, n_features)


def test_predict_latency(benchmark, bundle, sample):
    """Single Odysseus prediction p95 < 100ms · 400-tree RF expected ~40ms."""
    result = benchmark(bundle["model"].predict, sample)


def test_predict_proba_latency(benchmark, bundle, sample):
    """predict_proba (for confidence) p95 < 150ms."""
    result = benchmark(bundle["model"].predict_proba, sample)
