"""
Basic NLP feature extraction utilities.

These helpers transform raw text columns into numeric features suitable for
scikit-learn pipelines. They intentionally avoid heavy dependencies (no NLTK
data download required) so they work out of the box.

For production sentiment analysis, replace the placeholder `polarity_score`
with a proper model (TextBlob, VADER, or a fine-tuned transformer).
"""
from __future__ import annotations

import re
import string
from typing import Sequence

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

_PUNCT_TABLE = str.maketrans("", "", string.punctuation)


def clean_text(text: str) -> str:
    """
    Lowercase, strip punctuation, collapse whitespace.

    Args:
        text: Raw input string.

    Returns:
        Cleaned string.
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = text.translate(_PUNCT_TABLE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Basic numeric features
# ---------------------------------------------------------------------------

def word_count(text: str) -> int:
    """Return the number of whitespace-separated tokens in *text*."""
    if not isinstance(text, str) or not text.strip():
        return 0
    return len(text.split())


def char_count(text: str) -> int:
    """Return number of characters (excluding whitespace) in *text*."""
    if not isinstance(text, str):
        return 0
    return len(text.replace(" ", ""))


def avg_word_length(text: str) -> float:
    """Return average word length; 0.0 for empty strings."""
    if not isinstance(text, str) or not text.strip():
        return 0.0
    words = text.split()
    if not words:
        return 0.0
    return sum(len(w) for w in words) / len(words)


def exclamation_count(text: str) -> int:
    """Count exclamation marks — a rough proxy for emphatic language."""
    if not isinstance(text, str):
        return 0
    return text.count("!")


def question_count(text: str) -> int:
    """Count question marks."""
    if not isinstance(text, str):
        return 0
    return text.count("?")


# ---------------------------------------------------------------------------
# Placeholder sentiment score
# ---------------------------------------------------------------------------

# Simple positive / negative word lists for demo purposes.
_POSITIVE_WORDS = frozenset([
    "good", "great", "excellent", "fantastic", "wonderful", "love",
    "best", "amazing", "positive", "happy", "satisfied", "perfect",
    "outstanding", "superb", "quality", "recommend",
])
_NEGATIVE_WORDS = frozenset([
    "bad", "terrible", "awful", "horrible", "hate", "worst", "poor",
    "negative", "unhappy", "dissatisfied", "broken", "defective",
    "disappointed", "useless", "failure", "problem",
])


def polarity_score(text: str) -> float:
    """
    Naive lexicon-based sentiment polarity score in [-1, 1].

    Returns:
        Positive value → positive sentiment.
        Negative value → negative sentiment.
        0.0 for empty / neutral text.

    Note:
        This is a placeholder. Replace with VADER or a transformer model
        for production use.
    """
    if not isinstance(text, str) or not text.strip():
        return 0.0
    cleaned = clean_text(text)
    tokens = set(cleaned.split())
    pos = len(tokens & _POSITIVE_WORDS)
    neg = len(tokens & _NEGATIVE_WORDS)
    total = pos + neg
    if total == 0:
        return 0.0
    return (pos - neg) / total


# ---------------------------------------------------------------------------
# DataFrame-level feature extraction
# ---------------------------------------------------------------------------

def add_text_features(
    df: pd.DataFrame,
    text_col: str = "text",
    clean: bool = True,
) -> pd.DataFrame:
    """
    Add a suite of text-derived numeric features to *df*.

    Added columns (prefixed with the text column name):
        {text_col}_word_count, {text_col}_char_count,
        {text_col}_avg_word_len, {text_col}_exclamations,
        {text_col}_questions, {text_col}_polarity

    Args:
        df:       Input DataFrame. Must contain ``text_col``.
        text_col: Name of the column holding raw text.
        clean:    Whether to apply :func:`clean_text` before extracting features.

    Returns:
        A copy of ``df`` with new feature columns appended.
    """
    df = df.copy()
    src = df[text_col].astype(str)
    if clean:
        src_clean = src.apply(clean_text)
    else:
        src_clean = src

    prefix = text_col
    df[f"{prefix}_word_count"] = src_clean.apply(word_count)
    df[f"{prefix}_char_count"] = src_clean.apply(char_count)
    df[f"{prefix}_avg_word_len"] = src_clean.apply(avg_word_length)
    df[f"{prefix}_exclamations"] = src.apply(exclamation_count)
    df[f"{prefix}_questions"] = src.apply(question_count)
    df[f"{prefix}_polarity"] = src_clean.apply(polarity_score)

    return df


def tfidf_features(
    texts: Sequence[str],
    max_features: int = 100,
    ngram_range: tuple[int, int] = (1, 2),
) -> tuple[np.ndarray, list[str]]:
    """
    Compute TF-IDF matrix for a sequence of texts.

    Args:
        texts:        Iterable of raw text strings.
        max_features: Maximum number of TF-IDF features.
        ngram_range:  n-gram range for the vectoriser.

    Returns:
        Tuple of (dense matrix [n_samples × max_features], feature_names list).
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    cleaned = [clean_text(t) for t in texts]
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=ngram_range,
        sublinear_tf=True,
        strip_accents="unicode",
    )
    matrix = vectorizer.fit_transform(cleaned).toarray()
    feature_names = vectorizer.get_feature_names_out().tolist()
    return matrix, feature_names
