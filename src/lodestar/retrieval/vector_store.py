"""LanceDB-backed vector store — embedded, single-directory, no infrastructure.

Defaults to a fresh temp directory (rebuilt per process). For large corpora, pass a
persistent ``path`` and ingest once.
"""

from __future__ import annotations

import tempfile
from pathlib import Path


class VectorStore:
    """A thin wrapper over a LanceDB table holding embedded knowledge snippets."""

    def __init__(self, path: Path | None = None, table: str = "knowledge") -> None:
        import lancedb  # lazy: a lean (BM25-only) deploy can omit this heavy dep

        self.path = str(path or Path(tempfile.mkdtemp(prefix="lodestar-lancedb-")))
        self.table = table
        self._db = lancedb.connect(self.path)
        self._tbl = None

    def build(self, rows: list[dict]) -> None:
        """(Re)create the table from rows that each include a ``vector`` field."""
        self._tbl = self._db.create_table(self.table, data=rows, mode="overwrite")

    def search(self, vector: list[float], k: int = 4) -> list[dict]:
        """Return the ``k`` nearest rows to ``vector``."""
        tbl = self._tbl if self._tbl is not None else self._db.open_table(self.table)
        return tbl.search(vector).limit(k).to_list()
