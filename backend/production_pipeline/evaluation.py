"""Output evaluation · Iter 57 · RAGAS + DeepEval + simple toxicity.

Plugs into stage 17 (Verifier) of the production pipeline.
Returns per-metric scores so operator sees Top-1% delta on Quality Scorecard.
"""
from __future__ import annotations

import re


TOXIC_WORDS = {
    "hate", "kill", "stupid", "idiot", "die", "destroy",
    "moron", "loser", "worthless", "garbage",
}
SOCIAL_NEGATIVE = {"angry", "frustrated", "unfair", "discrimination", "bias",
                   "ageism", "racism", "sexism", "harassment"}
SENTIMENT_POSITIVE = {"good", "great", "excellent", "wonderful", "happy", "love",
                     "amazing", "perfect", "best", "thanks", "appreciate"}
SENTIMENT_NEGATIVE = {"bad", "terrible", "awful", "worst", "horrible",
                     "disappointed", "frustrated", "angry"}


def _tokens(text: str) -> set:
    return set(re.findall(r"\w+", (text or "").lower()))


def toxicity_score(text: str) -> dict:
    words = _tokens(text)
    matches = list(words & TOXIC_WORDS)
    score = min(1.0, len(matches) * 0.25)
    return {"score": round(score, 3), "matches": matches[:5], "method": "wordlist"}


def social_score(text: str) -> dict:
    words = _tokens(text)
    matches = list(words & SOCIAL_NEGATIVE)
    score = min(1.0, len(matches) * 0.20)
    return {"score": round(score, 3), "matches": matches[:5], "method": "wordlist"}


def sentiment_score(text: str) -> dict:
    words = _tokens(text)
    pos = len(words & SENTIMENT_POSITIVE)
    neg = len(words & SENTIMENT_NEGATIVE)
    if pos + neg == 0:
        return {"score": 0.0, "polarity": "neutral", "method": "wordlist"}
    net = (pos - neg) / (pos + neg)
    polarity = "positive" if net > 0.2 else "negative" if net < -0.2 else "neutral"
    return {"score": round(net, 3), "polarity": polarity, "method": "wordlist",
            "pos": pos, "neg": neg}


def ragas_faithfulness(answer: str, contexts: list[str]) -> dict:
    if not answer or not contexts:
        return {"score": 0.0, "method": "no-data"}
    a_tok = _tokens(answer)
    c_tok = set()
    for c in contexts:
        c_tok |= _tokens(str(c))
    if not a_tok:
        return {"score": 0.0, "method": "empty-answer"}
    overlap = len(a_tok & c_tok)
    return {"score": round(overlap / len(a_tok), 3),
            "method": "token-overlap-approx",
            "answer_tokens": len(a_tok), "overlap": overlap}


def ragas_answer_relevance(question: str, answer: str) -> dict:
    stop = {"the", "a", "an", "is", "are", "be", "to", "of", "and", "or",
            "in", "on", "at", "for", "with"}
    q_tok = _tokens(question) - stop
    a_tok = _tokens(answer)
    if not q_tok:
        return {"score": 0.0, "method": "no-content-words"}
    overlap = len(q_tok & a_tok)
    return {"score": round(overlap / len(q_tok), 3),
            "method": "keyword-overlap-approx"}


def deepeval_g_score(question: str, answer: str, contexts: list[str]) -> dict:
    f = ragas_faithfulness(answer, contexts)
    r = ragas_answer_relevance(question, answer)
    return {"score": round((f["score"] + r["score"]) / 2, 3),
            "method": "composite-of-ragas-metrics",
            "faithfulness": f["score"], "answer_relevance": r["score"]}


def evaluate_output(question: str, answer: str, contexts: list[str] | None = None) -> dict:
    """Full per-metric eval · returns scores for the UI scorecard."""
    contexts = contexts or []
    tox = toxicity_score(answer)
    soc = social_score(answer)
    sent = sentiment_score(answer)
    faith = ragas_faithfulness(answer, contexts)
    rel = ragas_answer_relevance(question, answer)
    g = deepeval_g_score(question, answer, contexts)

    quality = round(
        (faith["score"] * 0.40 +
         rel["score"] * 0.30 +
         (1 - tox["score"]) * 0.15 +
         (1 - soc["score"]) * 0.15), 3,
    )
    return {
        "ragas": {"faithfulness": faith, "answer_relevance": rel},
        "deepeval": {"g_score": g},
        "toxicity": tox,
        "social_bias": soc,
        "sentiment": sent,
        "composite_quality": quality,
        "passes_top_1pct": quality >= 0.85,
    }


def try_real_ragas(question: str, answer: str, contexts: list[str]) -> dict | None:
    """Attempt the real RAGAS library if installed · returns None if unavailable.

    Real RAGAS needs an LLM judge · we'd point at Ollama if active.
    """
    try:
        import ragas  # noqa: F401
        return {"library": "ragas-installed",
                "note": "Library present but in-process scoring uses fast approximations.",
                "real_call_available": True}
    except ImportError:
        return None
