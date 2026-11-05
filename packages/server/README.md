# @rubrion/beholder-server

The server half of [Beholder](https://github.com/rubrion/beholder), an agent kit for Cloudflare apps
(formerly `@rubrion/agent-kit-server`).

- `createAgentWorker`: a Worker running Mastra agents with D1 memory, per-tenant context and token
  cost, streaming slim SSE events (text, reasoning, tool calls and results). No public route.
- `createAgentGateway` (from `@rubrion/beholder-server/gateway`): Hono routes mounted in your app's
  own Worker. They decide who may ask (budgets, plans, bring-your-own-key) and forward to the agent
  Worker through a service binding. No Mastra in its bundle.

```sh
npm install @rubrion/beholder-server
```

```ts
import { createAgentWorker } from '@rubrion/beholder-server';

export default createAgentWorker<Env>({
  agents: [{ id: 'main', name: 'Assistant', tagline: 'Everyday questions', tools, instructions }],
  ai: (env) => env.AI,
  memory: (env) => env.MEMORY,
});
```

The browser half is [`@rubrion/beholder-react`](https://www.npmjs.com/package/@rubrion/beholder-react).
Setup, options and a deployable template: [github.com/rubrion/beholder](https://github.com/rubrion/beholder).

MIT
