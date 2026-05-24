Author: guchengrong

# CambioML AI Agent Dashboard

A production-grade AI Agent console built on [Vercel ai-sdk-computer-use](https://github.com/vercel-labs/ai-sdk-computer-use). Users drive a Claude Agent inside a remote desktop sandbox via chat to perform browser automation, shell commands, and more. The UI provides a dual-pane dashboard, a typed event pipeline, multi-session history, and mobile layouts.

## Features

### Dashboard layout

- **Left pane**: Streaming chat, inline tool invocation cards, collapsible debug panel
- **Right pane**: Live VNC desktop + Activity panel (tool details and timeline)
- **Resizable split**: Horizontal and vertical layouts via `react-resizable-panels`
- **Session sidebar**: Create, switch, and delete sessions; collapsible

### Agent and tools

- **Model**: Claude Opus 4.5 (proxy via `ANTHROPIC_BASE_URL` supported)
- **Tools**: `computer` (screenshot, click, type, scroll, etc.) and `bash` (shell)
- **Tool cards in chat**: Type, status, duration, plus screenshot thumbnails or command output
- **Click a tool card** to open full results in the right Activity panel

### Event pipeline

All tool calls are normalized in `lib/agent-events.ts`:

| Field | Description |
|-------|-------------|
| `id` | Tool call ID |
| `timestamp` | Start time |
| `type` | Action type (`bash`, `screenshot`, `click`, …) |
| `payload` | Structured parameters (discriminated union) |
| `status` | `pending` / `complete` / `error` |
| `duration` | Execution time (ms) |

Derived state includes per-type counts, agent status (Idle / Thinking / Using tools / Ready / Error), and a debug timeline.

### Multi-session persistence

- Each session stores its own messages and events
- Auto-saved to `localStorage` (key: `ai-sdk-dashboard-sessions`)
- Empty sessions are pruned; warmed chat instances are kept when switching sessions

### Mobile (`< 1024px`)

- Session list hidden by default; slide-out drawer from the top-left
- Sandbox connects in the background; VNC hidden until the first tool call, then shown in a bottom panel
- Quick Actions hidden on mobile

### Performance

- VNC iframe isolated in memoized `DesktopVncFrame`, subscribed only to sandbox stream context
- `DesktopWorkspace` deep-compares events to avoid right-pane re-renders during text streaming

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js)                        │
├──────────────────────────────┬──────────────────────────────────┤
│  Session Sidebar             │  VNC (noVNC iframe)               │
│  Chat + Tool Cards           │  Tool Inspector (Activity)        │
│  Debug Panel                 │                                   │
└──────────────┬───────────────┴──────────────────┬───────────────┘
               │ useChat (AI SDK)                  │ SharedDesktopProvider
               ▼                                   ▼
        POST /api/chat                    Vercel Sandbox (snapshot)
               │                                   │
               ├─ streamText + tools ──────────────┤
               │   computer / bash                 │
               ▼                                   ▼
        Claude (Anthropic API)            Xvnc + Chrome + websockify
```

**Data flow:**

1. After hydrate, `SharedDesktopProvider` starts the sandbox when idle and obtains the VNC `streamUrl`
2. User sends a message → `useChat` streams to `/api/chat` with `sandboxId`
3. Server `streamText` registers `computer` / `bash` tools and runs them in the sandbox
4. Client builds `AgentEvent[]` from message parts, persists them, and drives the UI

---

## Tech stack

| Category | Choice |
|----------|--------|
| Framework | Next.js 15 (App Router) + React 19 |
| AI | AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) |
| Sandbox | [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) + prebuilt snapshot |
| UI | Tailwind CSS 4, shadcn/ui, Motion, Lucide |
| State | React state + localStorage; typed discriminated unions for events |

---

## Project structure

```
app/
  page.tsx                 # Main dashboard (desktop dual-pane + mobile)
  api/chat/route.ts        # Streaming chat API + tool registration
  api/kill-desktop/route.ts

components/
  dashboard/
    chat-panel.tsx         # Chat, debug, input
    session-sidebar.tsx    # Session list
    session-chat-stack.tsx # Multi-session chat keep-alive
    desktop-workspace.tsx  # Right pane VNC + Activity
    desktop-vnc-frame.tsx  # VNC iframe (memo isolation)
    tool-inspector.tsx     # Activity timeline + details
    debug-panel.tsx        # Collapsible debug
    shared-desktop-provider.tsx
    mobile-session-drawer.tsx
    mobile-desktop-panel.tsx
  message.tsx              # Messages and tool card rendering
  tool-invocation-status.tsx

lib/
  agent-events.ts          # Event pipeline + session types + buildAgentEvents
  agent-status.ts          # Agent status derivation
  tool-invocation-state.ts # Tool visual state
  session-storage.ts       # localStorage read/write and migration
  sandbox/                 # Sandbox creation and tool implementations
  anthropic.ts             # Anthropic legacy provider (ANTHROPIC_BASE_URL)
```

---

## Quick start

### Prerequisites

- Node.js 18+
- [Vercel](https://vercel.com) account with Sandbox access
- [Anthropic API key](https://console.anthropic.com/) (or a proxy compatible with the Anthropic Messages API)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Vercel credentials

```bash
pnpm install -g vercel
vercel link
vercel env pull
```

This writes `VERCEL_OIDC_TOKEN` to `.env.local`. You can also set manually:

```env
VERCEL_TOKEN=...
VERCEL_TEAM_ID=...
VERCEL_PROJECT_ID=...
```

### 3. Create a sandbox snapshot

The snapshot includes Xvnc, Chrome, openbox, noVNC, xdotool, and ImageMagick for cold starts in a few seconds.

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

Copy the printed ID into your environment (valid ~10 minutes):

```env
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxx
```

### 4. Configure the model API

```env
ANTHROPIC_API_KEY=sk-ant-...
# Optional: Anthropic-compatible proxy (must support /v1/messages)
ANTHROPIC_BASE_URL=https://your-proxy.example/v1
```

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
pnpm build
pnpm start
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic (or proxy) API key |
| `SANDBOX_SNAPSHOT_ID` | Yes | Desktop environment snapshot ID |
| `VERCEL_OIDC_TOKEN` | One of | Written by `vercel env pull` |
| `VERCEL_TOKEN` | One of | Personal access token |
| `VERCEL_TEAM_ID` | With TOKEN | Vercel team ID |
| `VERCEL_PROJECT_ID` | With TOKEN | Vercel project ID |
| `ANTHROPIC_BASE_URL` | No | Custom API base URL (proxy) |

---

## Responsive breakpoints

| Viewport | Layout |
|----------|--------|
| `≥ lg` (1024px) | Dual-pane dashboard + fixed/collapsible sidebar |
| `< lg` | Single-pane chat + drawer sessions + on-demand bottom VNC |

---

## Development notes

### Disable sandbox UI

To debug chat/events only, set in `lib/feature-flags.ts`:

```ts
export const SANDBOX_UI_DISABLED = true;
```

### Session storage version

When `SESSION_STORAGE_VERSION` changes, `migratePersistedSessionState` migrates old data. Current version: `2`.

### Switching models

Edit the model ID in `app/api/chat/route.ts`. Ensure your API tier supports the model and computer-use tools.

### Lint

```bash
pnpm lint
```

---

## Differences from the upstream demo

| Capability | Upstream demo | This project |
|------------|---------------|--------------|
| Layout | Single-page chat + VNC | Dual-pane dashboard + session sidebar |
| Events | None | Full typed event pipeline |
| Multi-session | None | localStorage persistence |
| Debug | None | Collapsible events/status panel |
| Tool UI | Basic | Status colors, duration, right-pane detail sync |
| Mobile | None | Drawer menu + on-demand VNC |
| VNC performance | — | Memo-isolated iframe |

---

## Collaborators

This repository is private. Collaborators with access:

- `lingjiekong`
- `ghamry03`
- `goldmermaid`
- `EnergentAI`

To invite additional collaborators (repo admin):

```bash
gh api repos/gcrtime/AI_COM/collaborators/{username} -X PUT -f permission=push
```

Or use **Settings → Collaborators** on GitHub.

---

## License

Inherits licensing from upstream [ai-sdk-computer-use](https://github.com/vercel-labs/ai-sdk-computer-use). Deployment and API usage must comply with Anthropic and Vercel terms of service.
