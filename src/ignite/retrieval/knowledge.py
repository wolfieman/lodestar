"""Knowledge-base loading and vector retrieval."""

from __future__ import annotations

import json
from pathlib import Path

from ignite.retrieval.base import Embedder, Snippet
from ignite.retrieval.vector_store import VectorStore

# src/ignite/retrieval/knowledge.py → parents[3] is the repo root.
DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "knowledge.json"


def load_snippets(path: Path | None = None) -> list[Snippet]:
    """Load knowledge snippets from a JSON file."""
    records = json.loads((path or DATA_PATH).read_text(encoding="utf-8"))
    return [Snippet(**record) for record in records]


class VectorRetriever:
    """Embeds snippets into a vector store and retrieves by semantic similarity."""

    def __init__(self, embedder: Embedder, store: VectorStore | None = None) -> None:
        self.embedder = embedder
        self.store = store or VectorStore()

    def ingest(self, snippets: list[Snippet]) -> None:
        """Embed and index the given snippets."""
        texts = [f"{s.title}. {s.content}" for s in snippets]
        vectors = self.embedder.embed(texts)
        rows = [
            {
                "id": s.id,
                "category": s.category,
                "title": s.title,
                "content": s.content,
                "vector": vec,
            }
            for s, vec in zip(snippets, vectors, strict=True)
        ]
        self.store.build(rows)

    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        """Return the ``k`` snippets most similar to ``query``."""
        query_vec = self.embedder.embed([query])[0]
        rows = self.store.search(query_vec, k)
        return [
            Snippet(
                id=r["id"],
                category=r["category"],
                title=r["title"],
                content=r["content"],
            )
            for r in rows
        ]


def format_snippets(snippets: list[Snippet]) -> str:
    """Render snippets as markdown context for the system prompt."""
    if not snippets:
        return ""
    return "\n\n".join(
        f"### {s.title} ({s.category})\n{s.content}" for s in snippets
    )
