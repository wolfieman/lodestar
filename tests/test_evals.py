"""Unit test for the eval harness mechanics (offline; mock answers + mock judge)."""

import pytest

from evals.runner import QUESTIONS, run


@pytest.mark.unit
def test_eval_harness_runs_offline(tmp_path):
    report = run(test_mode=True, out_dir=tmp_path)
    assert len(report["results"]) == len(QUESTIONS)
    assert all("answer" in r and "scores" in r for r in report["results"])
    assert report["provider"] == "mock"
    assert list(tmp_path.glob("eval-*.json"))  # a report file was written
