# Privacy & Data Handling

IgniteAI serves students, so it was designed with student-data protection in mind. This
note records the intended posture; the reference implementation demonstrates the principles
at small scale (see `src/lodestar/privacy.py`).

## Principles

- **FERPA** — student education records are protected: encryption at rest and in transit,
  strict access controls, and audit trails for data access.
- **GDPR** — data minimization (collect only what is needed), explicit user consent, and
  support for the rights to access and erasure.
- **No PII in prompts** — the assistant is instructed not to request personally
  identifying information; advice is general and resource-oriented.

## In the reference implementation

`src/lodestar/privacy.py` provides Fernet symmetric encryption helpers as a concrete
demonstration of encrypting sensitive fields. It is illustrative, not a production data
pipeline; the production design (Airtable-backed, access-controlled) is described in
`architecture.md`.

> Status: posture documented; production data layer is out of local scope.
