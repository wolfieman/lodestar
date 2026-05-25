"""Embedders: a real local model (fastembed) and an offline deterministic fallback."""

from __future__ import annotations

import hashlib
import math


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
    """Local ONNX embeddings via fastembed (downloads the model on first use)."""

    def __init__(self, model: str = "BAAI/bge-small-en-v1.5") -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model)
        self.dim = 384

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[float(x) for x in vec] for vec in self._model.embed(list(texts))]
