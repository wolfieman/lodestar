# Case Study — IgniteAI (HP FOWA 2024, First Place 🥇)

> An AI career-advising assistant for HBCU students, built in a six-week accelerator and
> awarded **first place** at the HP Future of Work Accelerator (HBCU Technology Conference,
> 2024). This is the record of what the team built; the technical reproduction and the
> 2026 rebuild live in the rest of this repository (see [`../docs/roadmap.md`](../docs/roadmap.md)).

## At a glance

| | |
|---|---|
| **Program** | HP Future of Work Accelerator (FOWA) — HBCU Technology Conference (HTC24) |
| **Team** | Team 4 (cross-functional, 8 roles) |
| **Result** | 🥇 First place (final pitch September 10, 2024) |
| **Product** | IgniteAI — a ChatGPT custom GPT for HBCU student career support |
| **My role** | Information Systems Manager (architecture, integration, security/compliance); co-Project Manager |

## The challenge

HBCU students often have limited access to personalized, always-available career guidance —
resume help, interview preparation, internship discovery, and scholarship navigation. The
accelerator challenge was to design an AI product that closes that gap, complete with a
viable business model, a security/compliance posture, and a go-to-market plan — judged on
technical proficiency, project management, innovation, business impact, and presentation.

## The solution — IgniteAI

A conversational assistant, *"Empowering HBCU Students with AI-Driven Career Support,"*
delivered as a **ChatGPT custom GPT**. Per the team's Business Model Canvas:

- **Who it serves:** primarily HBCU students; secondarily university administration and employers.
- **What it does:** personalized academic advice, career counseling, internship matching, and
  technical & behavioral interview prep, with goal-setting and progress monitoring.
- **How it reaches students:** web/mobile and university career-center portals.
- **How it sustains itself:** university subscriptions and employer access fees, with options
  for per-HBCU customized bots and premium features (e.g., live interview practice with
  real-time feedback).

## Architecture & build

The team designed a scalable, compliant system (full detail in
[`../docs/architecture.md`](../docs/architecture.md)): a custom-GPT conversational engine,
data integration to academic/career/internship sources, an Airtable data layer, Make.com
workflow automation, and a cloud deployment posture with FERPA/GDPR safeguards. The shipped
product was the custom GPT; the broader integration architecture was the design vision —
which the **v2 track** in this repo now aims to realize.

## Business case (highlights)

The team produced a full slate of business deliverables: a Business Model Canvas, a
business-development and market-entry plan, a marketing plan (including AI-generated
collateral and student user-interviews), an ROI/financial analysis with cost structure and
break-even, and an infrastructure & cybersecurity plan. Monetization centered on university
subscriptions, with sponsorship, per-institution customization, and premium tiers as
additional streams.

## My role & contributions

As **Information Systems Manager (ISM)** I owned the system and integration design:

- **System architecture** — a flexible, scalable chatbot on the custom-GPT platform, designed
  to adapt to evolving needs and future functionality.
- **Prompt engineering & conversation-flow design** — interaction flows that anticipate
  student needs and guide them through resume, interview, and career conversations.
- **Security & cybersecurity** — secure data handling with encryption, access controls, and
  monitoring; a multi-layered approach recommended for later phases.
- **Compliance & accessibility** — GDPR/CCPA alignment and inclusive design.
- **Backend integration & deployment** — integration with existing systems and a cloud
  (AWS/Azure) scalability plan.

I also served as **co-Project Manager**, co-authored the **Business Model Canvas**, and wrote
the **information-system requirements & architecture specification** that anchored the build.

## The team

A cross-functional Team 4 (by role):

| Role | Member(s) |
|---|---|
| Project Manager | Candace, **Wolfgang** |
| Information Systems Manager | **Wolfgang**, Grace |
| Software Engineering | Jeremy, Chinyemba |
| Infrastructure / Cybersecurity | Grace, Jeremy |
| Product Manager | Chinyemba, Samantha |
| Business Developer | Sunday |
| Marketing Director | June, Candace |
| Financial Analyst | Joachim |

*(First names as recorded in the team's role documents; full roster in the team records.)*

## The outcome

IgniteAI won **first place** at HP FOWA 2024. Judging weighted technical proficiency (30%),
project management (20%), innovation (20%), business impact & rollout (20%), and presentation
(10%), with a ≤10-minute pitch plus Q&A. Award artifacts are indexed in
[`../competitions/hp-fowa-2024/`](../competitions/hp-fowa-2024/).

## From prototype to v2

IgniteAI won as a custom GPT — a strong prototype, but the team's full architecture (real data
integration, automation, compliance-grade infrastructure) was a design, not a build. Two years
on, this repository (a) reproduces the as-shipped product faithfully and (b) rebuilds it with
current AI — turning the 2024 vision into a working system. See
[`../docs/roadmap.md`](../docs/roadmap.md).
