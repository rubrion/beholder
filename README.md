# Beholder

[![@rubrion/beholder-server](https://img.shields.io/npm/v/@rubrion/beholder-server?label=%40rubrion%2Fbeholder-server)](https://www.npmjs.com/package/@rubrion/beholder-server) [![@rubrion/beholder-react](https://img.shields.io/npm/v/@rubrion/beholder-react?label=%40rubrion%2Fbeholder-react)](https://www.npmjs.com/package/@rubrion/beholder-react)

An agent kit for Cloudflare apps, named after its mascot. An AI assistant you can drop into any Cloudflare app: Mastra agents on a Worker
with D1 memory, a gateway in your app's API, and a React chat UI that streams the
agent's thinking, tool calls and answer. Extracted from the Cerne assistant. Formerly `@rubrion/agent-kit-*`: the API is the same, only the package names changed.

Live demo (Rubrion team, Cloudflare Access): https://agent-kit.rubrion.ai

```
browser ──► app Worker /api/agent/*  (gateway: who is asking? may they ask?)
                 │ service binding, X-Agent-* headers
                 ▼
            agent Worker  (Mastra agents + tools, D1 memory, slim SSE)  ── no public route
```

| Package | What it is |
|---|---|
| [`@rubrion/beholder-server`](packages/server) | `createAgentWorker` (the agent Worker) and, from `@rubrion/beholder-server/gateway`, `createAgentGateway` (Hono routes for your API, no Mastra in its bundle) |
| [`@rubrion/beholder-react`](packages/react) | `AgentProvider`, `ChatBox` (floating, non-modal, on every screen), `AssistantScreen` (full page with agent picker and conversations), and the pieces they are made of |
| [`template/`](template) | A working app with both: `template/agent` (the agent Worker) and `template/web` (Vite + React + Tailwind, the Worker serving it with the gateway behind Cloudflare Access). This is what runs at agent-kit.rubrion.ai |

## Demo

A playground for the mascot (every phase, sizes, colors, light and dark), live at https://beholder.rubrion.ai. To run it from this repo's library:

```sh
npm install
npm run demo        # http://localhost:5180
```

## Start a new project from the template

```bash
cp -r beholder/template my-app && cd my-app
# in agent/package.json and web/package.json, change "*" to the published versions
# (or keep the template inside this repo's workspaces while the packages are unpublished)
```

1. **Agents and tools.** Edit `agent/src/agents.ts` and `agent/src/tools.ts`.
2. **Memory.** `wrangler d1 create my-app-agent-memory` and put the id in `agent/wrangler.jsonc`.
3. **Identity.** In `web/src/worker/index.ts`, `who()` turns the session into a `Caller`
   `{ tenant, person, role, name }`. The template reads Cloudflare Access and verifies its JWT
   (`web/src/worker/access.ts`); a real app uses its own login.
4. **Names.** Worker names, `account_id`, custom domain and the Access `ACCESS_TEAM_DOMAIN` /
   `ACCESS_AUD` in both `wrangler.jsonc`.
5. **Run.** `npm run dev` (root): Vite runs both Workers; set `DEV_USER=you@x.com` in
   `web/.dev.vars` to skip Access locally. Workers AI always runs remote, so be logged in to wrangler.
6. **Deploy.** `npm run deploy -w template/agent`, then `npm run deploy -w template/web`.

## Adding it to an existing app

**1. The agent Worker** (a new Worker, no route):

```ts
import { createAgentWorker } from '@rubrion/beholder-server';

export default createAgentWorker<Env>({
  agents: [{ id: 'main', name: 'Assistant', tagline: 'Everyday questions', tools, instructions }],
  ai: (env) => env.AI,
  memory: (env) => env.MEMORY,                       // D1; tables created on first use
  context: ({ caller }) => snapshot(caller.tenant),  // appended to the instructions on every question
  scope: ({ caller, env }, next) => tenant.run(caller.tenant, next), // tools read the tenant from here
  onUsage: (u, env) => logCost(env, u),              // tokens and USD per answer
  providers: { anthropic: () => import('@ai-sdk/anthropic') },      // optional bring-your-own-key
});
```

`wrangler.jsonc` needs `"compatibility_flags": ["nodejs_compat", "new_module_registry"]`, an `ai`
binding, a D1 binding, and `"workers_dev": false` (only the gateway may call it).

**2. The gateway** in your API Worker, with a service binding `AGENT` to the agent Worker:

```ts
import { createAgentGateway } from '@rubrion/beholder-server/gateway';

app.route('/api/agent', createAgentGateway({
  agent: (c) => c.env.AGENT,
  identify: (c) => ({ tenant: String(c.get('officeId')), person: String(c.get('userId')), role: c.get('role'), name: c.get('name') }),
  preflight: async (c, caller) => {
    if (await overBudget(c, caller)) return { ok: false, status: 429, reason: 'budget', message: 'Monthly AI budget reached.' };
    return { ok: true, model: await tenantModel(c, caller) }; // e.g. { provider: 'anthropic', model, key }
  },
  canUse: (c, caller, agentId) => agentId !== 'deep' || planHasDeep(c) || { status: 403, reason: 'plan', message: 'Upgrade to use this agent.' },
}));
```

**3. The UI**, above the router:

```tsx
import { AgentProvider, AssistantScreen, ChatBox, ptBR } from '@rubrion/beholder-react';
import '@rubrion/beholder-react/styles.css';

<AgentProvider person={me.id} personName={me.name} strings={ptBR}
  toolLabels={{ list_projects: ['Consultando os projetos', 'Consultou os projetos'] }}
  suggestions={['O que vence esta semana?']}
  actionableError={(m) => m.includes('Configurações')}
  renderMascot={({ phase, size }) => <MyMascot phase={phase} size={size} />}
  renderBlocked={(status) => <SetupNotice status={status} />}>
  <Router />
  <ChatBox onExpand={() => navigate('/assistant')} hidden={path === '/assistant'} />
</AgentProvider>

// on /assistant
<AssistantScreen panelSide="right" />
```

**Attachments** (optional): give `attach` and the composer gets a paperclip. The app uploads each
file its own way and returns the line the agent reads, usually a reference a tool takes; the lines
go out with the question.

```tsx
attach={{ accept: '.pdf', upload: async (file) => {
  const r = await uploadToMyApi(file);
  return r.ok ? { note: `Attached: ${file.name}, document_id ${r.id}` } : { error: r.message };
} }}
```

### Files out of the box

People attach PDFs, Word, Excel, CSV or HTML files in the chat and the agent reads them, a
piece at a time: it lists a document's headings (a workbook's sheets), then reads one section
or the lines around a word. Three lines turn it on, with one R2 bucket (add a lifecycle rule,
e.g. 30 days, so it stays small):

```ts
// app Worker
createAgentGateway({ ..., files: { bucket: (c) => c.env.FILES } });            // POST /files
// agent Worker
createAgentWorker({ ..., files: { bucket: (env) => env.FILES } });              // read_file on every agent
```
```tsx
<AgentProvider ... attach>                                                        {/* the paperclip */}
```

Each file goes to `files/<tenant>/<person>/…` and only that person's questions can read it. The
converted text is cached per file version, and a file's text is sent with the turn that read it,
not with every message after. More places to read from (a bucket of reference documents, a
repository) go in `files.sources`, e.g. `{ docs: r2Source({ bucket: (ctx) => env.DOCS, describe: 'A key such as "reports/q3.pdf".' }) }`;
the model picks the source.

The components use the shadcn/ui tokens (`bg-card`, `text-muted-foreground`, `ring-ring`…), so
they match a shadcn app. Tailwind must scan the package; in your CSS:

```css
@source "../node_modules/@rubrion/beholder-react/dist";
```

On a site without Tailwind's preflight, import only `tailwindcss/theme` and
`tailwindcss/utilities`, limit `@source` to the package, and define the tokens: the kit's roots
(`.ak`) reset their own elements, so the rest of the page keeps its styles.

## How it behaves

- **The browser sends only the new question.** Mastra Memory recalls the thread (last 8 messages
  by default); the browser remembers only which thread was open.
- **Conversations are private** to tenant + person, one agent each; up to 50 per person.
- **Steps stream as they happen:** reasoning (folded after), one card per tool call (args and
  result inside), then the text. The mascot (Beholder: a flame-shaped body with one big eye and five eyestalks, every eye following the cursor) shows the phase: idle, thinking, using a tool, speaking.
- **Slim SSE.** Only what the UI draws leaves the agent Worker; prompts and step outputs never do.
- **Nothing runs until used.** The provider only calls the gateway once the chat box opens or the
  assistant screen shows.
- **Blocked states** come from the gateway preflight (`/status`) and replace the conversation.

## Writing good tools

- Small, read-only, one kind of question each. Return **facts already computed** (dates,
  totals, "overdue by 3 days") so the model never does math.
- Missing data is explicit: `{ found: false, reason }`, so the agent asks instead of inventing.
- Resolve names to ids in one search tool; the others take ids. When the search finds none or
  several, the agent asks which one.
- To change data, return a **draft** (never write): the UI shows a card with a link, the person
  confirms, and the app's normal API saves it.
- Scope every query by `caller.tenant` (the `scope` option) and test that tenant B never sees A.
- A tool that returns a lot of text (a document, a web page): `inputProcessors: [forgetResults(['read_doc'])]`
  on the agent definition (`forgetResults` from `@rubrion/mastra-cloudflare`) sends it with the turn
  that read it, not with every message after. Ready-made `readFileTool` and `browseTool` live there too (the `files` option already wires `read_file`).

## Develop

```bash
npm install
npm run build   # both packages
npm test        # unit tests (stream events, headers, models, turns, UI reducer)
npm run dev     # the template with both Workers
```

A Mastra agent Worker bundles to about 9 MB (2.3 MB gzip). If `wrangler deploy` drops the upload on
a flaky connection, `wrangler deploy --dry-run --outdir out` and upload `out/` with the Workers API
over HTTP/1.1.

## License

MIT

## Releases

Every push to `main` is released by CI (`.github/workflows/release.yml`): semantic-release runs once per package, reading only the commits that touch its folder. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org), scoped by package (`feat(react): …`, `fix(server): …`): `fix` publishes a patch, `feat` a minor, a breaking change (`feat!:` or a `BREAKING CHANGE:` footer) a major; `docs`, `chore`, `ci`, `test` and `refactor` publish nothing. npm trusts the workflow (trusted publishing), so there is no token and each version carries provenance. Versions live in git tags (`@rubrion/beholder-react-v0.2.0`) and on npm, not in `package.json`.
