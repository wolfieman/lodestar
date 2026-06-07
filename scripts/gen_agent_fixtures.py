#!/usr/bin/env python
"""Generate agent-parity fixtures from the real Python agent stack.

Pins four behaviors the TypeScript Worker port must replicate byte-for-byte:

1. ``router`` — ``lodestar.agents.router.route()`` category per query (including
   the first-match priority order of the keyword table).
2. ``web_search`` — the stub tool's exact output (``tools.py``), which embeds a
   Python ``repr()`` of the query (exercises the pyRepr port).
3. ``rrf`` — ``lodestar.retrieval.hybrid.HybridRetriever`` fusion order over
   synthetic ranked lists (tests the RRF math + tie semantics, NOT embeddings —
   dense vectors are runtime-specific and self-consistent per store).
4. ``routing_hint`` / ``max_iters_reply`` — the exact strings from
   ``agents/agent.py`` and ``providers/anthropic.py`` (source-anchored so this
   generator fails loudly if the Python wording ever changes).

Checked by ``worker/test/agent.test.ts`` and ``worker/test/retrieval.test.ts``;
freshness is enforced in ``tests/test_worker_parity.py``. Python==fixture and
TS==fixture transitively proves Python==TS without a cross-language runner.

Usage (from the repo root): ``uv run python scripts/gen_agent_fixtures.py``
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from lodestar.agents.router import route
from lodestar.agents.tools import web_search_tool
from lodestar.retrieval.base import Snippet
from lodestar.retrieval.hybrid import HybridRetriever

REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "worker" / "test" / "fixtures" / "agent_parity.json"

#: One per category, ties/priority cases, and fall-through to "general".
ROUTER_QUERIES: list[str] = [
    "Help me improve my resume",
    "polish my CV please",
    "writing a cover letter",
    "how to prep for a behavioral interview",
    "explain the STAR method",
    "scholarships and financial aid for first-gen students",
    "any grant or funding tips",
    "summer internship or co-op search",
    "how to network on LinkedIn with alumni",
    "find a mentor to connect with",
    "choosing a major and keeping my GPA up",
    "what degree should I study",
    # Priority: "resume" keyword wins over later categories in the same query.
    "resume tips for my internship interview",
    # Substring behavior: "connect" matches inside "disconnected" (Python `in`).
    "i feel disconnected from campus",
    "hello there",
    "",
]

#: Exercises pyRepr: plain, apostrophe (quote flip), double quote, backslash.
WEB_SEARCH_QUERIES: list[str] = [
    "python internships",
    "what's a good scholarship?",
    'say "hi" to recruiters',
    "O'Neil \"summer\" fellowships",
    "tabs\tand\nnewlines",
]


def _snip(sid: str) -> Snippet:
    return Snippet(id=sid, category="c", title=f"t-{sid}", content="x")


class _StubRetriever:
    """Returns a fixed ranked list (ids in order), capped at k."""

    def __init__(self, ids: list[str]) -> None:
        self._snips = [_snip(sid) for sid in ids]

    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        return self._snips[:k]


#: dense/sparse ranked-id lists + (k) per case; expected computed by the real
#: HybridRetriever. Covers: disjoint, overlap boosting, tie insertion-order,
#: one empty side (degradation invariant), k-truncation, pool clipping.
RRF_CASES: list[dict] = [
    {"dense": ["a", "b", "c"], "sparse": ["d", "e", "f"], "k": 4},
    {"dense": ["a", "b", "c"], "sparse": ["c", "a", "z"], "k": 4},
    {"dense": ["a", "b"], "sparse": ["b", "a"], "k": 2},
    {"dense": [], "sparse": ["a", "b", "c"], "k": 4},
    {"dense": ["a", "b", "c", "d", "e", "f"], "sparse": [], "k": 3},
    # Tie: x and y each appear at the same single rank in one list only ->
    # equal scores; first-seen (dense-list-first) insertion order breaks it.
    {"dense": ["x"], "sparse": ["y"], "k": 2},
    # Pool clipping: lists longer than pool are truncated before fusion.
    {
        "dense": [f"d{i}" for i in range(1, 15)],
        "sparse": [f"s{i}" for i in range(1, 15)],
        "k": 6,
        "pool": 10,
    },
]


def _rrf_expected(case: dict) -> list[str]:
    pool = case.get("pool", 10)
    hybrid = HybridRetriever(
        _StubRetriever(case["dense"]),
        _StubRetriever(case["sparse"]),
        pool=pool,
    )
    return [s.id for s in hybrid.retrieve("q", k=case["k"])]


def _routing_hint_parts() -> list[str]:
    """The agent.py routing-hint fragments, verified present in the source."""
    agent_src = (REPO_ROOT / "src" / "lodestar" / "agents" / "agent.py").read_text(
        encoding="utf-8"
    )
    parts = [
        "Routing hint: this request looks like '",
        "'. Use the ",
        "retrieve_knowledge tool to ground specifics, and web_search for ",
        "current listings.",
    ]
    for part in parts:
        if part not in agent_src:
            raise SystemExit(
                f"agent.py routing-hint drift: fragment not found: {part!r}"
            )
    return parts


def _max_iters_reply() -> str:
    """The run_tools exhaustion reply, extracted from providers/anthropic.py."""
    src = (REPO_ROOT / "src" / "lodestar" / "providers" / "anthropic.py").read_text(
        encoding="utf-8"
    )
    match = re.search(r'return "([^"]+reasoning steps\.)"', src)
    if not match:
        raise SystemExit("anthropic.py max-iters reply not found (wording drift?)")
    return match.group(1)


def build_fixture() -> dict:
    """Build the fixture dict (also used by tests/test_worker_parity.py)."""
    web = web_search_tool()
    category = "scholarship"  # any category; the TS side rebuilds the same hint
    parts = _routing_hint_parts()
    return {
        "router": [{"query": q, "category": route(q)} for q in ROUTER_QUERIES],
        "web_search": [
            {"query": q, "output": web.func(query=q)} for q in WEB_SEARCH_QUERIES
        ],
        "rrf": [
            {**case, "expected": _rrf_expected(case)} for case in RRF_CASES
        ],
        "routing_hint": {
            "category": category,
            "text": f"{parts[0]}{category}{parts[1]}{parts[2]}{parts[3]}",
        },
        "max_iters_reply": _max_iters_reply(),
    }


def main() -> None:
    FIXTURE_PATH.write_text(
        json.dumps(build_fixture(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"wrote {FIXTURE_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
