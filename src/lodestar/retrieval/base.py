"""Retrieval interfaces and the core knowledge record."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class Snippet:
    """A single knowledge-base entry."""

    id: str
    category: str
    title: str
    content: str


@runtime_checkable
class Embedder(Protocol):
    """Turns texts into fixed-dimension vectors."""

    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...


@runtime_checkable
class Retriever(Protocol):
    """Returns the snippets most relevant to a query."""

    def retrieve(self, query: str, k: int = 4) -> list[Snippet]: ...
