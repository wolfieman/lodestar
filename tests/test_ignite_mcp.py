"""Unit tests for the MCP server tools (offline).

Importing the module runs the @mcp.tool() registrations, so a clean import already
proves the server wires up. The tool logic is tested via the helper functions.
"""

import pytest

from ignite import mcp_server


@pytest.mark.unit
def test_mcp_server_constructs():
    assert mcp_server.mcp is not None


@pytest.mark.unit
def test_retrieve_tool_offline():
    out = mcp_server._retrieve("scholarships for STEM students")
    assert "scholarship" in out.lower()


@pytest.mark.unit
def test_advice_tool_offline_uses_mock():
    out = mcp_server._advise("How do I improve my resume?")
    assert isinstance(out, str) and out
    assert "TEST_MODE" in out
