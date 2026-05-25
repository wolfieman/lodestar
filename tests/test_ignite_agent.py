"""Unit test for the agentic loop (offline: mock provider simulates tool use)."""

import pytest

from ignite.app import build_agent


@pytest.mark.unit
def test_agent_invokes_a_tool_offline():
    agent = build_agent(test_mode=True)
    reply = agent.run("How do I find STEM scholarships?")
    assert isinstance(reply, str) and reply
    # the offline mock provider routes to the first tool (retrieve_knowledge)
    assert "retrieve_knowledge" in reply
    assert len(agent.history) == 2
    assert agent.history[0]["role"] == "user"
