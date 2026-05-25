"""Local knowledge base with lightweight keyword retrieval.

Dependency-light retrieval (stdlib only) over freshly authored sample data in
``data/knowledge.json``. Not a vector database, and not copied from the original team
CSVs — see ``docs/decisions.md``.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "how",
        "i", "in", "is", "it", "my", "of", "on", "or", "should", "some", "the",
        "to", "what", "with", "you", "your",
    }
)
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "knowledge.json"


def _tokenize(text: str) -> set[str]:
    return {t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS}


@dataclass(frozen=True)
class Snippet:
    """A single knowledge-base entry."""

    id: str
    category: str
    title: str
    content: str


class KnowledgeBase:
    """An in-memory knowledge base with keyword-overlap retrieval."""

    def __init__(self, snippets: list[Snippet]) -> None:
        self.snippets = snippets

    @classmethod
    def load(cls, path: Path | None = None) -> KnowledgeBase:
        """Load the knowledge base from a JSON file."""
        records = json.loads((path or DATA_PATH).read_text(encoding="utf-8"))
        return cls([Snippet(**record) for record in records])

    def retrieve(self, query: str, k: int = 3) -> list[Snippet]:
        """Return up to ``k`` snippets ranked by keyword overlap with the query."""
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []
        scored: list[tuple[int, Snippet]] = []
        for snippet in self.snippets:
            title_tokens = _tokenize(snippet.title)
            body_tokens = _tokenize(f"{snippet.content} {snippet.category}")
            # Title matches are the strongest topical signal, so weight them higher.
            score = 2 * len(query_tokens & title_tokens) + len(query_tokens & body_tokens)
            if score:
                scored.append((score, snippet))
        scored.sort(key=lambda pair: (-pair[0], pair[1].id))
        return [snippet for _, snippet in scored[:k]]


def format_snippets(snippets: list[Snippet]) -> str:
    """Render snippets as markdown context for the system prompt."""
    if not snippets:
        return ""
    return "\n\n".join(
        f"### {s.title} ({s.category})\n{s.content}" for s in snippets
    )
