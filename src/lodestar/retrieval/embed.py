"""Embedders: a real local model (fastembed) and an offline deterministic fallback."""

from __future__ import annotations

import hashlib
import math
import os
from pathlib import Path


class HashEmbedder:
    """Deterministic, dependency-free embedder for offline tests / TEST_MODE.

    Hashes tokens into a fixed-width vector. **Not semantic** — exercises the retrieval
    mechanics without downloading a model. Real relevance uses ``FastEmbedEmbedder``.
    """

    def __init__(self, dim: int = 64) -> None:
        self.dim = dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            vec = [0.0] * self.dim
            for token in text.lower().split():
                bucket = int(hashlib.md5(token.encode()).hexdigest(), 16) % self.dim
                vec[bucket] += 1.0
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            vectors.append([x / norm for x in vec])
        return vectors


class FastEmbedEmbedder:
    """Local ONNX embeddings via fastembed.

    Defaults to a repo-local model cache (``.models/``, gitignored) so a model
    is reused offline; override with the ``FASTEMBED_CACHE_PATH`` env var. If the model
    isn't cached and can't be fetched, ``app._build_retriever`` falls back to BM25.
    """

    def __init__(self, model: str = "BAAI/bge-small-en-v1.5") -> None:
        from fastembed import TextEmbedding

        cache_dir = os.getenv("FASTEMBED_CACHE_PATH") or str(
            Path(__file__).resolve().parents[3] / ".models"
        )
        self._model = TextEmbedding(model, cache_dir=cache_dir)
        self.dim = 384

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[float(x) for x in vec] for vec in self._model.embed(list(texts))]
