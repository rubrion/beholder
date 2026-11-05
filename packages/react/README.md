# @rubrion/beholder-react

The browser half of [Beholder](https://github.com/rubrion/beholder), an agent kit for Cloudflare apps
(formerly `@rubrion/agent-kit-react`).

- `AgentProvider`: conversation state above your router.
- `ChatBox`: a floating, non-modal chat on every screen. `AssistantScreen`: a full page with an
  agent picker and conversations. Both stream the agent's thinking, tool calls and answer, and take
  file attachments.
- `Beholder`: the default mascot, a flame-shaped body with one big eye and five eyestalks, every eye
  following the cursor; it shows the phase (idle, thinking, using a tool, speaking). Recolor it with
  the `--ak-beholder-*` CSS variables, or swap it with `renderMascot` (the plain `Eye` ships too).

```sh
npm install @rubrion/beholder-react
```

```tsx
import { AgentProvider, AssistantScreen, ChatBox } from '@rubrion/beholder-react';
import '@rubrion/beholder-react/styles.css';

<AgentProvider person={me.id} personName={me.name}>
  <App />
  <ChatBox onExpand={() => navigate('/assistant')} />
</AgentProvider>
```

Styled with shadcn/ui tokens; let Tailwind scan this package (see the main README). The server half
is [`@rubrion/beholder-server`](https://www.npmjs.com/package/@rubrion/beholder-server).
Setup and options: [github.com/rubrion/beholder](https://github.com/rubrion/beholder).

MIT
