"""Parity tests between the Python lean build and the Cloudflare Worker port.

These run inside the existing offline pytest CI job (no new deps, no network).
They turn any drift between the Python source of truth and the duplicated Worker
artifacts into a red build:

* ``worker/src/system-prompt.txt`` byte-equals ``SYSTEM_PROMPT``.
* ``worker/src/context-preamble.txt`` equals the ``build_system`` context joiner.
* User-facing wording (PII gate, 400, 429) appears verbatim in the Worker source.
* ``worker/test/fixtures/bm25_parity.json`` is fresh (regenerate and compare).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lodestar.prompts.system import SYSTEM_PROMPT, build_system
from lodestar.safety import PII_BLOCK_DETAIL

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKER_SRC = REPO_ROOT / "worker" / "src"
SYSTEM_PROMPT_TXT = WORKER_SRC / "system-prompt.txt"
CONTEXT_PREAMBLE_TXT = WORKER_SRC / "context-preamble.txt"
SAFETY_TS = WORKER_SRC / "safety.ts"
CHAT_TS = WORKER_SRC / "chat.ts"
FIXTURE_PATH = REPO_ROOT / "worker" / "test" / "fixtures" / "bm25_parity.json"

# Exact wsgi.py wording reused verbatim by the Worker (chat.ts).
LENGTH_DETAIL = "Message must be 1-1000 characters."
RATE_LIMIT_DETAIL = "Rate limit exceeded; try again shortly."


@pytest.mark.unit
def test_system_prompt_txt_byte_equals_constant():
    """The Worker's system-prompt.txt is byte-identical to SYSTEM_PROMPT.

    Read as raw bytes (line-ending-proof via .gitattributes eol=lf) and compared
    to the UTF-8 encoding of the Python constant.
    """
    file_bytes = SYSTEM_PROMPT_TXT.read_bytes()
    assert file_bytes == SYSTEM_PROMPT.encode("utf-8")
    assert b"\r" not in file_bytes  # no CRLF leaked in


@pytest.mark.unit
def test_context_preamble_txt_matches_joiner():
    """context-preamble.txt is the one-line joiner build_system() inserts.

    Reconstructing SYSTEM_PROMPT + "\\n\\n" + PREAMBLE + "\\n\\n" + context must
    equal build_system(context) for a non-empty context.
    """
    preamble = CONTEXT_PREAMBLE_TXT.read_text(encoding="utf-8")
    assert "\r" not in preamble
    assert preamble == "Use the following reference material when it is relevant:"

    context = "### Foo (bar)\nbaz"
    reconstructed = f"{SYSTEM_PROMPT}\n\n{preamble}\n\n{context}"
    assert reconstructed == build_system(context)


@pytest.mark.unit
def test_pii_block_detail_present_in_safety_ts():
    """PII_BLOCK_DETAIL appears intact (incl. the em dash) in safety.ts.

    The Worker splits the constant across two adjacent string literals; assert
    the full text — including the U+2014 em dash — is reconstructable from the
    source. Guards against someone "fixing" the em dash into a hyphen.
    """
    source = SAFETY_TS.read_text(encoding="utf-8")
    assert "—" in PII_BLOCK_DETAIL  # sanity: the constant has an em dash
    # safety.ts writes the constant as two adjacent string literals concatenated
    # at the SSN/"Lodestar" boundary. Split the Python constant at the same point
    # and confirm both halves (incl. the em dash in the second) appear verbatim.
    split_at = PII_BLOCK_DETAIL.index("Lodestar never needs")
    part_a, part_b = PII_BLOCK_DETAIL[:split_at], PII_BLOCK_DETAIL[split_at:]
    assert "—" in part_b  # the em dash lives in the second literal
    assert part_a in source
    assert part_b in source


@pytest.mark.unit
def test_wsgi_wording_present_in_chat_ts():
    """The 400 (length) and 429 (rate limit) detail strings appear in chat.ts.

    chat.ts lands in a later Phase 2 step (the pipeline); this assertion attaches
    automatically once the file exists so all user-facing parity wording is
    enforced, not just asserted (red-team required change #3).
    """
    if not CHAT_TS.exists():
        pytest.skip("chat.ts not yet present (pipeline step); wording parity pending")
    source = CHAT_TS.read_text(encoding="utf-8")
    assert LENGTH_DETAIL in source
    assert RATE_LIMIT_DETAIL in source
    # The PII gate reuses the exact constant — but chat.ts IMPORTS it from
    # safety.ts (single source of truth) rather than re-inlining the em-dash
    # literal. The constant's exact bytes are enforced in safety.ts by
    # test_pii_block_detail_present_in_safety_ts; here we verify chat.ts wires
    # that constant into the 400 PII response, so the wording cannot drift.
    assert "PII_BLOCK_DETAIL" in source
    assert 'from "./safety"' in source
    assert "{ detail: PII_BLOCK_DETAIL }" in source


@pytest.mark.unit
def test_bm25_fixture_is_fresh():
    """The committed BM25 fixture matches a fresh in-memory regeneration.

    Catches KB edits and rank-bm25 upgrades that would silently desync the
    TypeScript port — forces a regen + commit.
    """
    import scripts.gen_bm25_fixtures as gen

    committed = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    regenerated = gen.build_fixtures()

    assert committed["snippetCount"] == regenerated["snippetCount"]
    assert committed["params"] == regenerated["params"]

    committed_cases = {c["query"]: c for c in committed["cases"]}
    regenerated_cases = {c["query"]: c for c in regenerated["cases"]}
    assert committed_cases.keys() == regenerated_cases.keys()

    for query, regen_case in regenerated_cases.items():
        commit_case = committed_cases[query]
        assert commit_case["rankedIds"] == regen_case["rankedIds"], query
        # Scores are rounded identically by the generator; exact match expected.
        assert commit_case["scores"] == regen_case["scores"], query


AGENT_TS = WORKER_SRC / "agent.ts"
MOCK_TS = WORKER_SRC / "mock.ts"
AGENT_FIXTURE_PATH = (
    REPO_ROOT / "worker" / "test" / "fixtures" / "agent_parity.json"
)


@pytest.mark.unit
def test_agent_fixture_is_fresh():
    """The committed agent fixture matches a fresh in-memory regeneration.

    Catches router/tools/hybrid wording or behavior drift in the Python agent
    stack that would silently desync the Worker port — forces a regen + commit.
    """
    import scripts.gen_agent_fixtures as gen

    committed = json.loads(AGENT_FIXTURE_PATH.read_text(encoding="utf-8"))
    assert committed == gen.build_fixture()


@pytest.mark.unit
def test_agent_strings_present_in_agent_ts():
    """agent.py / anthropic.py / tools.py user-facing strings appear verbatim
    in the Worker's agent.ts (fragments chosen to survive line-wrapping)."""
    src = AGENT_TS.read_text(encoding="utf-8")
    # agent.py:26-31 routing hint fragments.
    assert "Routing hint: this request looks like '" in src
    assert "retrieve_knowledge tool to ground specifics, and web_search for " in src
    assert "current listings." in src
    # anthropic.py:102 exhaustion reply.
    assert "I couldn't complete that within the allotted reasoning steps." in src
    # tools.py descriptions (head + tail fragments around the wrap points).
    assert "Search the HBCU career knowledge base for guidance on resumes, " in src
    assert "interviews, scholarships, internships, networking, and academics." in src
    assert (
        "Search the web for current scholarships, internships, and job postings."
        in src
    )
    assert "No matching knowledge found." in src


@pytest.mark.unit
def test_mock_agent_reply_parity():
    """mock.py run_tools template fragments are pinned on BOTH sides."""
    mock_py = (
        REPO_ROOT / "src" / "lodestar" / "providers" / "mock.py"
    ).read_text(encoding="utf-8")
    mock_ts = MOCK_TS.read_text(encoding="utf-8")
    assert "[TEST_MODE agent] called tool '" in mock_py
    assert "Result preview: " in mock_py
    assert "[TEST_MODE agent] called tool '" in mock_ts
    assert "Result preview: " in mock_ts
