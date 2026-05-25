# AI-Use Methodology Disclosure

This project is an AI product (a custom GPT) and was itself consolidated and rebuilt with
AI assistance. In the spirit of COPE / *Nature* / *Science* disclosure conventions, this
document records how AI tools were used and where author responsibility lies.

## Tools used

- **ChatGPT / OpenAI custom GPTs** — the IgniteAI product itself is a ChatGPT custom GPT;
  OpenAI `gpt-4o-mini` powers the reference implementation.
- **Claude Code (Anthropic, CLI)** — used to consolidate the scattered source material
  (three GitHub repos, Google Drive, the live GPT), design the clean repository, and write
  the reference implementation and documentation.

## Tasks performed with AI assistance

- Forensic analysis of the original repos and recovery/triage of source material.
- Repository scaffolding and documentation drafting.
- Clean-room reimplementation of the chatbot reference code from architecture docs + the
  IgniteAI specification (no original GPL code copied — see `decisions.md`).

## Author responsibility statement

Wolfgang Sanyer is responsible for all content in this repository. AI tools were an aid,
not an author. All design decisions, the licensing approach, and the final code/docs were
reviewed and approved by the author. IgniteAI was a team effort by HP FOWA 2024 Team 4 (see
`NOTICE.md`); this repository's authored material is Wolfgang's own.
