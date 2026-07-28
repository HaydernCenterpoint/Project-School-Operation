# Day 9 — AI Tutor evaluation and citation hardening

## Status

The local automated Day 9 gate passes. The AI Tutor remains **OFF by default** and is not approved for an external provider, staging or real learners.

Human semantic review is separate from automation: **8/8 decisions PENDING**. The automated answerable cases prove tenant-safe retrieval, allowlisted citations and openable excerpts; they do not prove that a human reviewer accepts the answer as semantically supported.

## Delivered boundary

- A fixed 24-case manifest: 8 answerable, 4 missing-source, 4 cross-tenant/unknown-class, 4 prompt-injection and 4 provider-degradation cases.
- Web and mobile expose inline citation detail only for an enrolled Student with current consent, an enabled/privacy-approved tenant policy and an authorized published source.
- Invalid, missing, foreign, unenrolled, unpublished, revoked-consent or stale-policy citation requests fail closed without exposing source content.
- Web and mobile expose Cancel and Retry. Cancel stops the client wait; the reserved daily request may still be counted. Retry uses a fresh request UUID.
- A separate AI-off production server proves that academics remain available without provider configuration and no AI usage row is created.
- No new provider, vector database, transcript, memory or client-side AI credential was added.

## Fixed evaluation manifest

| Category | Cases | Automated expectation | Result |
|---|---:|---|---|
| Answerable | 8, four per tenant | Answer with citations drawn only from the current tenant/class allowlist | 8/8 pass |
| Missing source | 4 | Abstain without calling the provider or returning a citation | 4/4 pass |
| Cross-tenant/unknown class | 4 | Canonical not-found response; no provider call | 4/4 pass |
| Prompt injection | 4 | Provider receives only authorized chunks; a foreign citation is rejected by abstaining | 4/4 pass |
| Provider degradation | 4 | HTTP 500, malformed response, oversized body and timeout fail gracefully | 4/4 pass |

The TAP output contains 25 passing tests because it includes one parent test plus the 24 manifest cases.

## Confirmed local evidence

| Check | Result |
|---|---|
| `pnpm verify:static` | Pass; optimized production build contains 17 BFF routes: four academic, ten community and three AI |
| `pnpm db:reset` | Pass from a clean synthetic seed |
| `pnpm db:test` | Pass; 298/298 pgTAP checks |
| `pnpm db:lint` | Pass; clean |
| `pnpm test:ai-eval` | Pass; fixed manifest 24/24, TAP 25/25 including parent; citation BFF returns canonical 404 for malformed, unknown, foreign-tenant and wrong-class requests |
| Provider/usage assertions | 16 provider calls; 10 terminal usage rows per Student; zero `started` rows remain |
| `pnpm test:integration` | Pass; academic, community and AI Tutor suites each 1/1 |
| `pnpm test:e2e:web` | Pass; Chrome 16/16, including Campus A `AURORA_A_ONLY` excerpt, no `BENTHIC_B_ONLY`, recovery through the real BFF after a provider 500, deterministic Cancel, honest copy and Retry with a fresh request UUID |
| AI-off production server | Pass; academic 1/1 and AI-off 1/1 with no provider configuration or AI usage |
| Hosted CI | Pass; [run 30398353676](https://github.com/HaydernCenterpoint/sao-do-school-ai/actions/runs/30398353676), jobs `quality` and `database`, implementation SHA `faf3c09ad0d3ef9daeb8a5719c533f1779de5c8f` |

The evaluation uses a loopback fake OpenAI-compatible provider and synthetic seeded text. It does not validate an external provider.

## Acceptance split

- [x] Fixed manifest contains exactly 24 cases in the required distribution.
- [x] 24/24 automated cases prevent citations or retrieved chunks outside the authorized tenant/class scope.
- [x] 8/8 automated answerable cases return an openable authorized citation.
- [ ] **8/8 human semantic-grounding review: PENDING.**
- [x] 4/4 missing-source cases abstain without fabricated citations.
- [x] 8/8 cross-tenant/prompt-injection cases do not disclose foreign data.
- [x] 4/4 provider-degradation cases fail gracefully; automated UI coverage confirms a real provider 500 exits loading and can Retry, while deterministic client cancellation also exits without a hanging page.
- [x] AI-off regression leaves the academic flow available and creates no AI usage.

## External gates still pending

- Named external provider/key approval and privacy/safeguarding approval.
- Human semantic-grounding review for all eight answerable cases.
- Named staging deployment and fresh promoted-build evidence.
- EAS Preview install, Android physical-device smoke and TalkBack/text-scaling review.
- UAT and release signatures; any later promoted SHA must repeat hosted CI and deployment-target smoke evidence.

Passing automation is not a human approval or a release decision.
