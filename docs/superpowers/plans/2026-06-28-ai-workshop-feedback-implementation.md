# AI Workshop Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a production-ready workshop feedback web application at `https://feedback.thatumdonruea.com` with a participant form, hidden presenter access, live word cloud, live emoji results, MariaDB persistence, and Plesk deployment assets.

**Architecture:** A single Node.js application serves the React production build, REST API, and Socket.IO endpoint from one origin. Express validates requests and writes normalized submissions to MariaDB in transactions; authenticated presenter sessions receive aggregate-only results over REST and Socket.IO. Shared pure TypeScript modules own validation, word normalization, grouping, and result types so UI and server behavior stay consistent and testable.

**Tech Stack:** React, TypeScript, Vite, Express, Socket.IO, MariaDB via `mysql2`, Zod, `express-session`, `express-mysql-session`, Argon2id, Vitest, Testing Library, Supertest, Playwright, Plesk Node.js Toolkit.

## Global Constraints

- Production URL is exactly `https://feedback.thatumdonruea.com`.
- Participant question 1 requires exactly three answers, each 1–40 characters after trimming.
- Participant question 2 requires exactly two distinct values from the eight approved Emoji IDs.
- A signed `HttpOnly` participant token permits only one submission per browser token.
- Hidden presenter access requires five logo activations within three seconds, then a PIN.
- Presenter PIN is stored only as an Argon2id hash in `PRESENTER_PIN_HASH`.
- Presenter cookies are `HttpOnly`, `Secure` in production, and `SameSite=Strict`.
- Public clients cannot read raw submissions or aggregate results.
- Presenter receives aggregates only, never participant tokens or session records.
- UI brand colors use only blue, yellow, and pink families; white/gray neutrals and native Emoji colors are exempt.
- Production process listens on `process.env.PORT` and supports Socket.IO long-polling fallback.
- All visible Thai copy follows the approved design specification and reference images.

---

## Planned File Structure

```text
ai-workshop-feedback/
├── client/
│   ├── index.html
│   └── src/
│       ├── app/App.tsx
│       ├── app/router.tsx
│       ├── components/BrandHeader.tsx
│       ├── components/SecretPresenterAccess.tsx
│       ├── components/StatusBanner.tsx
│       ├── features/participant/ParticipantPage.tsx
│       ├── features/participant/AnswerFields.tsx
│       ├── features/participant/EmojiPicker.tsx
│       ├── features/participant/api.ts
│       ├── features/presenter/PresenterPage.tsx
│       ├── features/presenter/WordCloudCard.tsx
│       ├── features/presenter/EmojiResultsCard.tsx
│       ├── features/presenter/api.ts
│       ├── features/presenter/socket.ts
│       ├── styles/tokens.css
│       ├── styles/global.css
│       └── test/setup.ts
├── server/
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── config.ts
│       ├── db/pool.ts
│       ├── db/migrate.ts
│       ├── db/submissionRepository.ts
│       ├── middleware/originGuard.ts
│       ├── routes/publicRoutes.ts
│       ├── routes/presenterRoutes.ts
│       ├── services/submissionService.ts
│       ├── services/resultsService.ts
│       ├── services/presenterAuthService.ts
│       └── realtime/realtimeGateway.ts
├── shared/
│   ├── emoji.ts
│   ├── schemas.ts
│   ├── results.ts
│   ├── wordAliases.ts
│   └── wordNormalizer.ts
├── migrations/001_initial.sql
├── public/brand/ipst-logo.svg
├── scripts/hash-presenter-pin.mjs
├── scripts/smoke-production.mjs
├── e2e/workshop-flow.spec.ts
├── server.js
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.server.json
├── package.json
├── .env.example
└── README.md
```

---

### Task 1: Project Toolchain and Shared Domain Contracts

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `vitest.config.ts`
- Create: `client/index.html`, `client/src/main.tsx`, `client/src/test/setup.ts`
- Create: `shared/emoji.ts`, `shared/schemas.ts`, `shared/results.ts`
- Test: `shared/schemas.test.ts`

**Interfaces:**
- Produces: `EmojiId`, `EMOJI_OPTIONS`, `createSubmissionSchema`, `CreateSubmissionInput`, `ResultsSnapshot`.
- Consumes: none.

- [ ] **Step 1: Write failing domain contract tests**

```ts
import { describe, expect, it } from 'vitest';
import { createSubmissionSchema } from './schemas';

describe('createSubmissionSchema', () => {
  it('accepts exactly three trimmed answers and two distinct emoji IDs', () => {
    const result = createSubmissionSchema.parse({
      answers: [' AI ', 'สร้างสรรค์', 'นำไปใช้'],
      emojis: ['wow', 'fun'],
    });
    expect(result.answers).toEqual(['AI', 'สร้างสรรค์', 'นำไปใช้']);
  });

  it.each([
    { answers: ['', 'สอง', 'สาม'], emojis: ['wow', 'fun'] },
    { answers: ['หนึ่ง', 'สอง'], emojis: ['wow', 'fun'] },
    { answers: ['หนึ่ง', 'สอง', 'สาม'], emojis: ['wow', 'wow'] },
    { answers: ['หนึ่ง', 'สอง', 'สาม'], emojis: ['wow', 'unknown'] },
  ])('rejects invalid payload %#', (payload) => {
    expect(() => createSubmissionSchema.parse(payload)).toThrow();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `npm test -- shared/schemas.test.ts`  
Expected: FAIL because the shared schema and toolchain do not exist.

- [ ] **Step 3: Add the workspace toolchain and minimal shared contracts**

```ts
export const EMOJI_IDS = [
  'love', 'wow', 'excited', 'fun', 'okay', 'bored', 'dissatisfied', 'angry',
] as const;
export type EmojiId = (typeof EMOJI_IDS)[number];

export interface WordResult {
  key: string;
  label: string;
  count: number;
}

export interface EmojiResult {
  id: EmojiId;
  count: number;
}

export interface ResultsSnapshot {
  totalSubmissions: number;
  words: WordResult[];
  emojis: EmojiResult[];
  updatedAt: string;
}

export const createSubmissionSchema = z.object({
  answers: z.tuple([answerSchema, answerSchema, answerSchema]),
  emojis: z.tuple([z.enum(EMOJI_IDS), z.enum(EMOJI_IDS)]),
}).superRefine((value, context) => {
  if (value.emojis[0] === value.emojis[1]) {
    context.addIssue({ code: 'custom', path: ['emojis'], message: 'เลือกความรู้สึก 2 แบบที่แตกต่างกัน' });
  }
});
```

- [ ] **Step 4: Install dependencies and run tests/typecheck**

Run: `npm install`  
Run: `npm test -- shared/schemas.test.ts`  
Run: `npm run typecheck`  
Expected: tests and TypeScript checks PASS.

- [ ] **Step 5: Commit the working contracts**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts vitest.config.ts client shared
git commit -m "chore: establish typed app toolchain"
```

### Task 2: Word Normalization and Aggregate Results

**Files:**
- Create: `shared/wordAliases.ts`, `shared/wordNormalizer.ts`, `shared/wordNormalizer.test.ts`
- Create: `server/src/services/resultsService.ts`, `server/src/services/resultsService.test.ts`

**Interfaces:**
- Consumes: `EmojiId`, `ResultsSnapshot` from Task 1.
- Produces: `normalizeAnswer(value: string): string`, `groupAnswers(values: string[]): WordResult[]`, `buildResults(rows): ResultsSnapshot`.

- [ ] **Step 1: Write failing normalization and grouping tests**

```ts
it('groups case, whitespace, punctuation, aliases, and close misspellings', () => {
  const words = groupAnswers([' AI ', 'ai!', 'เอไอ', 'สร้างสรรค์', 'สร้างสรร']);
  expect(words).toEqual([
    expect.objectContaining({ label: 'AI', count: 3 }),
    expect.objectContaining({ label: 'สร้างสรรค์', count: 2 }),
  ]);
});

it('does not merge unrelated Thai words', () => {
  expect(groupAnswers(['สนุก', 'สงบ'])).toHaveLength(2);
});
```

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npm test -- shared/wordNormalizer.test.ts server/src/services/resultsService.test.ts`  
Expected: FAIL because grouping and aggregation functions are missing.

- [ ] **Step 3: Implement deterministic normalization and aggregation**

```ts
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ')
    .replace(/^\p{P}+|\p{P}+$/gu, '').toLocaleLowerCase('th-TH');
}

export function similarity(left: string, right: string): number {
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length, 1);
}
```

- [ ] **Step 4: Run focused and full unit tests**

Run: `npm test -- shared/wordNormalizer.test.ts server/src/services/resultsService.test.ts`  
Expected: PASS with exact counts and stable ordering.

- [ ] **Step 5: Commit aggregate behavior**

```bash
git add shared server/src/services
git commit -m "feat: aggregate workshop responses"
```

### Task 3: MariaDB Schema and Transactional Submission Service

**Files:**
- Create: `migrations/001_initial.sql`
- Create: `server/src/config.ts`, `server/src/db/pool.ts`, `server/src/db/migrate.ts`
- Create: `server/src/db/submissionRepository.ts`, `server/src/services/submissionService.ts`
- Test: `server/src/services/submissionService.test.ts`, `server/src/db/submissionRepository.integration.test.ts`

**Interfaces:**
- Consumes: `CreateSubmissionInput` from Task 1.
- Produces: `SubmissionRepository.create(tokenHash, input)`, `SubmissionRepository.listResultRows()`, `SubmissionService.submit(rawToken, input)`.

- [ ] **Step 1: Write failing service tests with a repository fake**

```ts
it('hashes the participant token and delegates one atomic create', async () => {
  const repository = { create: vi.fn().mockResolvedValue({ id: 7 }) };
  const service = new SubmissionService(repository as never);
  await service.submit('raw-token', validSubmission);
  expect(repository.create).toHaveBeenCalledWith(
    expect.stringMatching(/^[a-f0-9]{64}$/), validSubmission,
  );
});
```

- [ ] **Step 2: Run the service test and confirm red**

Run: `npm test -- server/src/services/submissionService.test.ts`  
Expected: FAIL because the service and repository are missing.

- [ ] **Step 3: Add SQL schema, prepared statements, and transaction code**

```sql
CREATE TABLE submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_token_hash CHAR(64) NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  schema_version SMALLINT UNSIGNED NOT NULL DEFAULT 1
);
```

Repository behavior must `BEGIN`, insert the submission, insert three indexed answer rows,
insert two Emoji rows, `COMMIT`, and `ROLLBACK` on every thrown error.

- [ ] **Step 4: Run unit tests and MariaDB integration tests when `TEST_DATABASE_URL` is set**

Run: `npm test -- server/src/services/submissionService.test.ts`  
Run: `npm run test:db`  
Expected: unit PASS; DB suite PASS against test MariaDB or reports an explicit skip when the variable is absent.

- [ ] **Step 5: Commit persistence**

```bash
git add migrations server/src/config.ts server/src/db server/src/services/submissionService*
git commit -m "feat: persist submissions transactionally"
```

### Task 4: Express API, Participant Cookie, and Presenter Authentication

**Files:**
- Create: `server/src/app.ts`, `server/src/index.ts`, `server/src/middleware/originGuard.ts`
- Create: `server/src/routes/publicRoutes.ts`, `server/src/routes/presenterRoutes.ts`
- Create: `server/src/services/presenterAuthService.ts`
- Test: `server/src/app.test.ts`, `server/src/services/presenterAuthService.test.ts`

**Interfaces:**
- Consumes: submission and result services from Tasks 2–3.
- Produces: `createApp(dependencies)`, endpoints `POST /api/submissions`, `POST /api/presenter/login`, `POST /api/presenter/logout`, `GET /api/presenter/session`, `GET /api/presenter/results`, `GET /health`.

- [ ] **Step 1: Write failing Supertest API tests**

```ts
it('creates a participant cookie and returns 201 for a valid submission', async () => {
  const response = await request(app).post('/api/submissions')
    .set('Origin', 'https://feedback.thatumdonruea.com')
    .send(validSubmission);
  expect(response.status).toBe(201);
  expect(response.headers['set-cookie'][0]).toContain('participant=');
});

it('keeps presenter results private', async () => {
  expect((await request(app).get('/api/presenter/results')).status).toBe(401);
});
```

- [ ] **Step 2: Run API tests and confirm red**

Run: `npm test -- server/src/app.test.ts`  
Expected: FAIL because no Express application exists.

- [ ] **Step 3: Implement middleware, routes, Argon2 verification, sessions, and rate limits**

```ts
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser(config.cookieSecret));
app.use(session(sessionOptions));
app.use('/api', originGuard(config.appOrigin));
```

Map duplicate tokens to HTTP `409`, validation failures to `400`, invalid PIN to `401`,
rate-limit responses to `429`, and unexpected failures to a generic `500` body.

- [ ] **Step 4: Run API/security tests and typecheck**

Run: `npm test -- server/src/app.test.ts server/src/services/presenterAuthService.test.ts`  
Run: `npm run typecheck`  
Expected: PASS; no secret or stack trace appears in response bodies.

- [ ] **Step 5: Commit the secured API**

```bash
git add server/src
git commit -m "feat: expose secured workshop API"
```

### Task 5: Socket.IO Presenter Realtime Gateway

**Files:**
- Create: `server/src/realtime/realtimeGateway.ts`
- Modify: `server/src/index.ts`, `server/src/services/submissionService.ts`
- Test: `server/src/realtime/realtimeGateway.test.ts`

**Interfaces:**
- Consumes: Express session middleware and `ResultsSnapshot`.
- Produces: `attachRealtime(server, sessionMiddleware, resultsService)` and `publishResults(snapshot)`.

- [ ] **Step 1: Write failing authenticated socket tests**

```ts
it('rejects sockets without a presenter session', async () => {
  const socket = createClient(url, { transports: ['websocket'], reconnection: false });
  await expect(waitForConnectError(socket)).resolves.toMatch(/unauthorized/i);
});

it('publishes aggregate-only results to the presenter room', async () => {
  const payload = await waitForEvent(authenticatedSocket, 'results:update', () => publishResults(snapshot));
  expect(payload).toEqual(snapshot);
  expect(payload).not.toHaveProperty('participantToken');
});
```

- [ ] **Step 2: Run socket tests and confirm red**

Run: `npm test -- server/src/realtime/realtimeGateway.test.ts`  
Expected: FAIL because no Socket.IO server is attached.

- [ ] **Step 3: Implement session sharing, presenter room, and post-commit publish**

```ts
io.engine.use(sessionMiddleware);
io.use((socket, next) => socket.request.session.presenter ? next() : next(new Error('unauthorized')));
io.on('connection', (socket) => socket.join('presenters'));
const publishResults = (snapshot: ResultsSnapshot) => io.to('presenters').emit('results:update', snapshot);
```

- [ ] **Step 4: Run socket tests including polling transport**

Run: `npm test -- server/src/realtime/realtimeGateway.test.ts`  
Expected: PASS for WebSocket and long-polling clients.

- [ ] **Step 5: Commit realtime behavior**

```bash
git add server/src/realtime server/src/index.ts server/src/services/submissionService.ts
git commit -m "feat: stream presenter results in real time"
```

### Task 6: Participant Experience Matching the Approved Reference

**Files:**
- Create: `client/src/app/App.tsx`, `client/src/app/router.tsx`
- Create: `client/src/components/BrandHeader.tsx`, `client/src/components/SecretPresenterAccess.tsx`, `client/src/components/StatusBanner.tsx`
- Create: `client/src/features/participant/ParticipantPage.tsx`, `AnswerFields.tsx`, `EmojiPicker.tsx`, `api.ts`
- Create: `client/src/styles/tokens.css`, `client/src/styles/global.css`
- Create: `public/brand/ipst-logo.svg`
- Test: co-located `*.test.tsx` files for participant components and secret access.

**Interfaces:**
- Consumes: shared schema and Emoji options; `POST /api/submissions`.
- Produces: mobile-first participant page and `onPresenterUnlock()` after five activations in three seconds.

- [ ] **Step 1: Write failing participant behavior tests**

```tsx
it('enables submission only after three answers and two emoji selections', async () => {
  render(<ParticipantPage />);
  const submit = screen.getByRole('button', { name: 'ส่งคำตอบ' });
  expect(submit).toBeDisabled();
  await fillThreeAnswers(user);
  await user.click(screen.getByRole('button', { name: /ว้าว/ }));
  await user.click(screen.getByRole('button', { name: /สนุกสนาน/ }));
  expect(submit).toBeEnabled();
});
```

- [ ] **Step 2: Run participant tests and confirm red**

Run: `npm test -- client/src/features/participant`  
Expected: FAIL because participant components are missing.

- [ ] **Step 3: Implement semantic components, approved Thai copy, three-tone tokens, and responsive CSS**

```css
:root {
  --blue-900: #0b356f;
  --blue-600: #1976df;
  --blue-100: #eaf4ff;
  --yellow-400: #ffc857;
  --pink-400: #ff7da8;
  --surface: #ffffff;
}
```

Use the supplied reference images for proportions: rounded white cards, soft shadows,
four-column Emoji grid on larger phones, two columns on narrow screens, and a capsule submit button.

- [ ] **Step 4: Run participant tests and an accessibility scan**

Run: `npm test -- client/src/features/participant client/src/components/SecretPresenterAccess.test.tsx`  
Run: `npm run test:a11y`  
Expected: PASS with no serious axe violations.

- [ ] **Step 5: Commit the participant UI**

```bash
git add client public/brand
git commit -m "feat: build participant feedback experience"
```

### Task 7: Presenter Dashboard, Word Cloud, and Emoji Scaling

**Files:**
- Create: `client/src/features/presenter/PresenterPage.tsx`, `WordCloudCard.tsx`, `EmojiResultsCard.tsx`, `api.ts`, `socket.ts`
- Test: co-located `*.test.tsx` files for all presenter components.

**Interfaces:**
- Consumes: `GET /api/presenter/session`, `GET /api/presenter/results`, Socket.IO `results:update`, `ResultsSnapshot`.
- Produces: authenticated presenter dashboard, stable horizontal word layout, square-root Emoji sizing, reconnect status.

- [ ] **Step 1: Write failing presenter visualization tests**

```tsx
it('renders larger words and emoji for higher counts', () => {
  render(<PresenterPage initialResults={sampleResults} />);
  expect(screen.getByText('AI')).toHaveStyle({ fontSize: '96px' });
  expect(screen.getByLabelText('ว้าว 20 คน')).toHaveAttribute('data-rank', '1');
});

it('keeps the latest results visible while reconnecting', () => {
  render(<PresenterPage initialResults={sampleResults} socketState="reconnecting" />);
  expect(screen.getByText('กำลังเชื่อมต่อใหม่')).toBeVisible();
  expect(screen.getByText('AI')).toBeVisible();
});
```

- [ ] **Step 2: Run presenter tests and confirm red**

Run: `npm test -- client/src/features/presenter`  
Expected: FAIL because presenter components are missing.

- [ ] **Step 3: Implement the 60/40 dashboard and deterministic layouts**

```ts
export function emojiSize(count: number, maxCount: number): number {
  if (maxCount <= 0) return 48;
  return Math.round(48 + 72 * Math.sqrt(count / maxCount));
}
```

Word sizes use a clamped square-root scale, all words stay horizontal, stable keys retain
transitions, and a ranked list fallback appears if cloud layout cannot fit.

- [ ] **Step 4: Run presenter and realtime component tests**

Run: `npm test -- client/src/features/presenter`  
Expected: PASS for initial, empty, live update, disconnect, reconnect, and reduced-motion states.

- [ ] **Step 5: Commit presenter dashboard**

```bash
git add client/src/features/presenter client/src/app
git commit -m "feat: visualize live workshop feedback"
```

### Task 8: Production Build, Plesk Runtime, and Operations Documentation

**Files:**
- Create: `server.js`, `.env.example`, `scripts/hash-presenter-pin.mjs`, `scripts/smoke-production.mjs`
- Create: `README.md`
- Modify: `package.json`, `server/src/index.ts`, `server/src/app.ts`
- Test: `server/src/productionAssets.test.ts`

**Interfaces:**
- Consumes: completed server and Vite build.
- Produces: `npm run build`, root Plesk startup file, migrations, secure environment guide, health/smoke check.

- [ ] **Step 1: Write failing production asset tests**

```ts
it('serves the SPA and preserves API 404 semantics', async () => {
  expect((await request(app).get('/presenter')).type).toMatch(/html/);
  expect((await request(app).get('/api/unknown')).status).toBe(404);
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `npm test -- server/src/productionAssets.test.ts`  
Expected: FAIL because production assets and fallback are absent.

- [ ] **Step 3: Implement build scripts, startup, health endpoint, PIN hashing, and deployment guide**

```js
// server.js
import './dist/server/index.js';
```

README must include exact Plesk values: application root, document root `dist/public`,
startup file `server.js`, Production mode, environment variables, `npm run migrate`, restart,
SSL issuance, log location, Socket.IO smoke test, backup, and rollback instructions.

- [ ] **Step 4: Build and run local production smoke test**

Run: `npm run build`  
Run: `npm run start`  
Run: `node scripts/smoke-production.mjs http://127.0.0.1:$PORT`  
Expected: health, participant SPA, presenter guard, and Socket.IO handshake PASS.

- [ ] **Step 5: Commit Plesk deliverables**

```bash
git add server.js .env.example scripts README.md package.json server
git commit -m "docs: prepare Plesk production deployment"
```

### Task 9: End-to-End and Visual Verification

**Files:**
- Create: `playwright.config.ts`, `e2e/workshop-flow.spec.ts`, `e2e/visual.spec.ts`
- Create: `e2e/fixtures/reference-notes.md`
- Modify: UI styles/components found during visual review.

**Interfaces:**
- Consumes: complete application running against an isolated test database.
- Produces: reproducible participant-to-presenter E2E proof and screenshots at target widths.

- [ ] **Step 1: Write failing end-to-end scenarios**

```ts
test('a submitted response appears on the authenticated presenter screen', async ({ browser }) => {
  const participant = await browser.newPage();
  const presenter = await authenticatedPresenterPage(browser);
  await submitParticipantFeedback(participant, ['AI', 'สร้างสรรค์', 'นำไปใช้'], ['wow', 'fun']);
  await expect(presenter.getByText('AI')).toBeVisible();
  await expect(presenter.getByLabel('ว้าว 1 คน')).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and confirm gaps before polishing**

Run: `npm run test:e2e`  
Expected: first run identifies missing fixture/config or visual differences.

- [ ] **Step 3: Fix only evidence-backed E2E, responsive, and visual issues**

Capture participant widths 320, 375, and 768; presenter widths 1024, 1440, and 1920.
Compare spacing, hierarchy, card proportions, three-tone palette, and overflow against the two
approved PNG references. Record intentional differences in `reference-notes.md`.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm test`  
Run: `npm run typecheck`  
Run: `npm run build`  
Run: `npm run test:e2e`  
Run: `npm audit --omit=dev`  
Expected: all tests/build PASS and no high/critical production vulnerabilities remain unresolved.

- [ ] **Step 5: Commit verified polish**

```bash
git add e2e client server shared package-lock.json
git commit -m "test: verify complete workshop feedback flow"
```

### Task 10: Plesk Deployment and Production Acceptance

**Files:**
- Modify only if production evidence requires: `README.md`, deployment scripts, config validation.

**Interfaces:**
- Consumes: verified build artifact and Plesk access supplied by the owner.
- Produces: healthy production application at `https://feedback.thatumdonruea.com`.

- [ ] **Step 1: Complete a non-secret preflight checklist**

Confirm DNS resolves, Let's Encrypt covers the exact subdomain, Plesk Node.js Toolkit is enabled,
an LTS runtime is selected, MariaDB database/user exist, and a backup/rollback point is available.

- [ ] **Step 2: Configure secrets and database without logging values**

Set the documented Plesk environment variable names, generate `SESSION_SECRET`, generate a PIN
hash with `npm run hash-pin`, run `npm run migrate`, and never print secret values into logs.

- [ ] **Step 3: Upload or pull, install, build, and restart**

Use Plesk Git or File Manager while preserving directory structure, run dependency installation,
run `npm run build`, select `server.js`, and use Restart App.

- [ ] **Step 4: Run production acceptance**

Run the smoke script against `https://feedback.thatumdonruea.com`, submit one marked test response,
authenticate through five logo taps and PIN, confirm the word and Emoji appear live, then remove the
test row through an explicit maintenance SQL command documented in the deployment log.

- [ ] **Step 5: Record deployment evidence and final status**

Record runtime version, migration version, health response, SSL result, smoke result, and deployment
timestamp without secrets. Commit documentation corrections if production differed from the guide.
