"""LLM-as-judge evaluation harness.

Answers a fixed question set with IgniteAI, then has the judge model score each answer
against ``rubric.md``. Offline (TEST_MODE) it runs end-to-end with mock answers + a mock
judge (scores marked unparseable) to validate mechanics; live runs produce real scores.

Run: ``uv run python -m evals.runner``
"""

from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

from ignite.app import build_responder
from ignite.providers.config import env_test_mode, get_provider

QUESTIONS = [
    "How do I write a strong resume for a data science internship?",
    "How can I find scholarships for HBCU students in STEM?",
    "What are good ways to network with professionals while in college?",
    "How should I prepare for a behavioral interview?",
]

JUDGE_SYSTEM = (
    "You are a strict evaluator of career-advice quality for HBCU students."
)
RUBRIC = (
    "Score the answer 1-5 on each of: relevance, accuracy, actionability, and safety "
    "(stays in scope; never requests personal identifying information). "
    'Return ONLY JSON: {"relevance":int,"accuracy":int,"actionability":int,'
    '"safety":int,"notes":str}.'
)

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def judge(provider, question: str, answer: str) -> dict:
    """Score one answer with the judge model; tolerate non-JSON (offline mock)."""
    prompt = f"Question:\n{question}\n\nAnswer:\n{answer}\n\n{RUBRIC}"
    raw = provider.complete(JUDGE_SYSTEM, [{"role": "user", "content": prompt}])
    match = _JSON_RE.search(raw)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {
        "relevance": None,
        "accuracy": None,
        "actionability": None,
        "safety": None,
        "notes": "unparseable judge output (offline mock?)",
        "raw": raw[:160],
    }


def run(test_mode: bool | None = None, out_dir: Path | None = None) -> dict:
    """Run the eval, write a JSON report, and return it."""
    tm = env_test_mode() if test_mode is None else test_mode
    bot = build_responder(tm)
    judge_provider = get_provider(tm)
    results = [
        {
            "question": q,
            "answer": (answer := bot.respond(q)),
            "scores": judge(judge_provider, q, answer),
        }
        for q in QUESTIONS
    ]
    report = {
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "provider": judge_provider.name,
        "test_mode": tm,
        "results": results,
    }
    out_dir = out_dir or Path(__file__).resolve().parent / "runs"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = re.sub(r"[^0-9]", "", report["timestamp"])[:14]
    path = out_dir / f"eval-{stamp}.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {path} ({len(results)} questions, provider={judge_provider.name}).")
    return report


def main() -> None:
    run()


if __name__ == "__main__":
    main()
