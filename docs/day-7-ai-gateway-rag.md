# Day 7 AI Gateway and citation-grounded Tutor

This document records the bounded Day 7 AI Tutor slice in the local candidate. It does not describe a staging or production service.

## Current boundary

| Area | Local candidate |
|---|---|
| Effective runtime | **OFF by default** because `.env.example` sets `AI_TUTOR_ENABLED=false` |
| User surface | Student-only `AiTutorPanel` in the web portal and Expo `/tutor` stack screen reached from the Today CTA |
| Provider | One configured OpenAI-compatible endpoint; local CI uses a loopback fake provider |
| Provider credential | Server-only `AI_PROVIDER_API_KEY`; never a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` value |
| Grounding corpus | Synthetic or de-identified, pre-chunked seed text scoped to a tenant and class |
| Retrieval | PostgreSQL lexical full-text search with `tsvector`, GIN and `websearch_to_tsquery` |
| Evidence policy | An answer must cite retrieved chunk IDs; otherwise the gateway abstains |
| Persistence | Consent state and content-free usage metadata only; no prompt, chat or answer text |

The two seeded tenant policies are enabled for deterministic local authorization tests. That database state does not turn on the runtime. A request is available only when the server flag is `true`, the configured provider and model match the tenant policy, privacy approval is present, and the Student has granted the current policy version.

Core class, assignment, submission, feedback and Community Safety flows do not depend on an AI provider or AI credential.

Both Student surfaces load the current consent state, allow grant or revocation, select an enrolled class, submit one question and display one answer or abstention with citations. They do not render a transcript or retain conversation history. The default-off state remains visible as a paused/unavailable Tutor instead of bypassing the server gate.

## Request path

1. The BFF authenticates the caller's Bearer JWT and requires the `student` role.
2. PostgreSQL verifies that the Student is enrolled in the requested class.
3. The gateway requires current, tenant-scoped consent and reserves one request against the Student's UTC-day database quota.
4. PostgreSQL retrieves at most five published, ready chunks from the same tenant and eligible class scope.
5. The server sends the question and retrieved chunk IDs, titles and text to the one configured provider.
6. The gateway accepts only the exact provider response shape containing an answer and citation IDs.
7. Every citation ID must belong to the retrieved allowlist. Missing evidence, an empty answer, no citations or any citation outside that allowlist produces an `abstained` response with no answer.
8. Provider failure or timeout produces a non-answering `503` response. There is no provider fallback.

The provider timeout is capped at 8,000 ms. `AI_PROVIDER_TIMEOUT_MS` may shorten that limit. The gateway also caps the question at 2,000 characters, retrieved context at five chunks, provider output at 600 tokens and accepted answer text at 4,000 characters.

## API surface

| Method | Route | Contract |
|---|---|---|
| `GET` | `/api/ai/consent` | Returns configured Tutor availability, current policy version and the Student's current consent state |
| `POST` | `/api/ai/consent` | Accepts exactly `granted` and `policyVersion`; grants or revokes consent for the authenticated Student |
| `POST` | `/api/ai/tutor` | Accepts exactly `requestId`, `classId` and `question`; returns one answered or abstained result |

The tutor response contains `status`, `answer`, `citations` and `dailyRemaining`. Each citation contains only its chunk ID, document title, source name and optional page number. A request UUID cannot be replayed: duplicate request IDs return a conflict instead of reusing a prior answer.

## Retrieval and fixture limits

The implementation uses PostgreSQL `simple`-configuration lexical matching and rank ordering. It is not semantic search and does not use embeddings, a vector database or `pgvector`.

The seed provides already extracted text chunks for two synthetic tenant-isolation fixtures. A `.pdf` source name and MIME type are metadata only; the local runtime does not upload, parse or OCR a PDF. There is no upload UI.

The database has a bounded ingestion RPC for pre-processed text chunks, but Day 7 does not expose it as an HTTP route or operator upload workflow.

## Privacy, safeguarding and telemetry

- Consent is explicit, revocable, tenant-scoped and tied to the current privacy policy version. A stale version is rejected.
- The daily quota is reserved atomically in PostgreSQL before retrieval or provider use.
- The provider receives the Student's one question plus the retrieved source text required for that request. Do not enable an external provider until privacy and safeguarding review approves that transfer.
- `ai_usage_events` stores request and class IDs, provider/model, status, input character count, latency, token counts, error code, answer hash and retrieved chunk count.
- Usage and audit records do not contain prompts, answers, source text, chat history or free-form provider metadata.
- The gateway does not persist a conversation, prompt or generated answer. It has no tools, agent actions, memory or provider fallback.

## Server configuration

Keep the default local configuration off:

```text
AI_TUTOR_ENABLED=false
AI_PROVIDER_URL=
AI_PROVIDER_API_KEY=
AI_PROVIDER_ID=
AI_PROVIDER_MODEL=
```

`AI_PROVIDER_TIMEOUT_MS` is optional. Provider URLs must use HTTPS, except that local testing may use HTTP on `127.0.0.1`, `localhost` or `::1`. URLs containing embedded credentials are rejected.

Never add the provider key to a mobile build, browser-exposed environment variable, committed environment file, seed or client request.

## Explicitly out of scope

- Provider fallback or provider selection at request time
- Tools, autonomous actions, multi-turn chat or memory
- Prompt or answer persistence
- Upload UI, runtime PDF parsing or OCR
- Embeddings, semantic/vector retrieval or `pgvector`
- A dynamic model registry
- Real learner content or an approved external provider integration

## Verification ledger

Fresh local evidence collected on 29 July 2026:

| Check | Exact command | Result |
|---|---|---|
| Workspace lint/typecheck, optimized web build, Expo Android export, configuration, contrast, security canary and repository/runtime scan | `pnpm verify:static` | Pass; Next.js contains 16 BFF route files: four academic, ten community and two AI; config 2/2, contrast 2/2, security canary 1/1 |
| Clean local migration and synthetic seed | `pnpm db:reset` | Pass |
| PostgreSQL authorization, consent, quota, lexical retrieval and content-free telemetry | `pnpm db:test` | Pass; four files, 286/286 pgTAP checks, including two-session ingest concurrency |
| Database schema lint | `pnpm db:lint` | Pass; clean |
| Populated migration `002 → current` | `$env:ALLOW_LOCAL_DB_UPGRADE_SMOKE = "1"; pnpm db:upgrade-smoke; Remove-Item Env:ALLOW_LOCAL_DB_UPGRADE_SMOKE` | Pass on the disposable local database |
| Backup/restore | `$env:ALLOW_LOCAL_DB_RESTORE_SMOKE = "1"; pnpm db:restore-smoke; Remove-Item Env:ALLOW_LOCAL_DB_RESTORE_SMOKE` | Pass; fingerprint includes the AI tables |
| Seeded local BFF integration with the loopback fake provider | `pnpm test:integration` | Pass; academic 1/1, community 1/1 and AI Tutor 1/1 |
| Local Chrome UI E2E | `pnpm test:e2e:web` | Pass; 16/16 including Tutor consent, class-switch reset, answer/citation, announced unavailable state, accessibility tree and overflow |
| Explicit new AI/UI and generated-runtime scan | `pnpm security:check apps/web/src/app/api/ai apps/web/src/components/AiTutorPanel.tsx apps/web/src/lib/ai-gateway.ts apps/mobile/app/tutor.tsx` | Pass; new files included and one runtime binary scanned |
| Generated client-bundle provider exposure check | `rg -n -e "AI_PROVIDER_" -e "local-ci-placeholder" -e "openai-compatible" -e "citation-model-v1" apps/web/.next/static apps/mobile/dist` | Pass; no configured provider environment name or value found |

The integration command requires the production BFF, local Supabase variables and the CI-only loopback provider configuration shown in `.github/workflows/ci.yml`. The evidence is for this local candidate and does not validate an external provider.

## Promotion gates

The bounded slice remains a local candidate. Enabling it outside deterministic local testing requires:

- a named, approved external OpenAI-compatible provider and server-only credential;
- privacy and safeguarding approval for the provider transfer and current consent text;
- a named staging environment with HTTPS BFF and tenant policy configuration;
- fresh database, integration, security and failure-mode evidence against that staging deployment;
- physical-device and Android TalkBack checks for the Student web/Expo experience;
- named Student/Teacher/safeguarding UAT and independent QA/Security sign-off.

External enablement is not part of this local candidate.
