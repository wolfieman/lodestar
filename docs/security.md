# Security & Governance

Lodestar serves students, so it's built with an LLM-security and FERPA/GDPR posture from
the start. This maps the relevant **OWASP Top 10 for LLM Applications** risks to concrete
mitigations in this repo, per the AI-Security track of the IBM curriculum.

## OWASP LLM Top-10 → mitigations

| Risk | Mitigation in Lodestar |
|---|---|
| **LLM01 Prompt injection** | The system prompt (`prompts/system.py`) instructs the model to ignore any instruction — including text inside retrieved material or user input — that tries to override its rules. Retrieved snippets are presented as *reference material*, not commands. |
| **LLM02 Insecure output handling** | Tool results are returned as data; the CLI renders text only (no eval/exec). The `web_search` tool is a stub (no live fetch executed yet). |
| **LLM06 Sensitive information disclosure** | The system prompt forbids requesting PII and forbids revealing its own configuration. `safety.detect_pii()` flags SSN/email/phone: the **hosted chat endpoints block such messages with a 400 before any model call** (`wsgi.py`, `web.py`, and the Worker — `PII_BLOCK_DETAIL`); under streaming, the reply-side check is post-hoc advisory (already-sent tokens can't be retracted), reported in the SSE `done` event (FERPA/GDPR data-minimization). |
| **LLM07 Insecure plugin/tool design** | Tools have explicit JSON-schema inputs and bounded behavior; the agent loop is capped (`max_iters`). |
| **LLM08 Excessive agency** | The agent only has read-only retrieval + a stubbed search tool — no write/side-effecting actions. |
| **LLM09 Overreliance** | `verify-checklist`-derived self-check in the system prompt; the evals harness (`evals/`) scores answer quality (LLM-as-judge) so quality is measured, not assumed. |
| **LLM10 Model theft / key exposure** | Keys live only in `.env` (gitignored); no secrets in the repo. (A leaked key in the *original* team repo was flagged for revocation — see `docs/decisions.md`.) |

## FERPA / GDPR posture

- **Data minimization** — the assistant gives general, resource-oriented advice and does
  not request personal identifiers; `detect_pii()` backs this at the input boundary.
- **No persistence of PII** — the reference impl holds conversation state in memory only;
  there is no student-record store. (`privacy.py` demonstrates field encryption for when
  one is added.)
- **Transparency** — AI use is disclosed (`docs/ai-methodology.md`).

## Rate limiting & cost control (hosted demo)

The Worker declares a per-IP rate-limit binding (12/min in `worker/wrangler.jsonc`);
note Cloudflare's binding is per-colo/approximate and was observed not to enforce on
the free plan, so the deploy pairs it with a zone **WAF rate-limiting rule** on
`/api/chat`. The true cost backstops are the provider **spend cap**, the 1000-char
input cap, and `max_tokens` 1024. A campus-NAT caveat applies to any per-IP limit
(many students can share one egress IP) — limits are tuned generously for that.

## Not yet hardened (documented, for a production pass)

Authn/z, audit logging, output moderation, and a real (sandboxed) search
tool are production concerns documented in `docs/architecture.md`, out of scope for the
local reference implementation.
