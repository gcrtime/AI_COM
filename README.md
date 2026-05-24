# CambioML AI Agent Dashboard

基于 [Vercel ai-sdk-computer-use](https://github.com/vercel-labs/ai-sdk-computer-use) 改造的生产级 AI Agent 控制台。用户通过聊天驱动远程桌面沙箱中的 Claude Agent，完成浏览器操作、命令执行等任务；界面提供双栏 Dashboard、结构化事件管道、多会话历史与移动端适配。

## 功能概览

### Dashboard 布局

- **左栏**：流式聊天、内联 Tool 调用卡片、可折叠 Debug 面板
- **右栏**：VNC 实时桌面 + Activity 面板（Tool 详情与时间线）
- **可拖拽分栏**：水平 / 垂直方向均支持 `react-resizable-panels` 调整比例
- **会话侧栏**：创建、切换、删除会话；支持折叠

### Agent 与 Tool

- 模型：**Claude Opus 4.5**（可通过 `ANTHROPIC_BASE_URL` 对接代理）
- Tool：`computer`（截图、点击、输入、滚动等）+ `bash`（Shell 命令）
- 聊天内 Tool 卡片展示：**类型、状态、耗时**，以及截图缩略图 / 命令输出
- 点击 Tool 卡片可在右侧 Activity 面板查看完整结果

### 事件管道

所有 Tool 调用经 `lib/agent-events.ts` 统一建模，字段包括：

| 字段 | 说明 |
|------|------|
| `id` | Tool call ID |
| `timestamp` | 开始时间 |
| `type` | 动作类型（bash、screenshot、click…） |
| `payload` | 结构化参数（判别联合） |
| `status` | `pending` / `complete` / `error` |
| `duration` | 执行耗时（ms） |

派生状态：按类型计数、Agent 状态（Idle / Thinking / Using tools / Ready / Error）、Debug 时间线。

### 多会话与持久化

- 每个会话独立保存 messages + events
- 自动写入 `localStorage`（key: `ai-sdk-dashboard-sessions`）
- 空会话自动清理；切换会话时保留已 warm 的 Chat 实例

### 移动端（`< 1024px`）

- 左侧会话列表默认隐藏，左上角按钮抽屉式滑出
- 沙箱后台自动连接，VNC 默认隐藏；首次 Tool 调用后底部展示桌面面板
- Quick Actions 在移动端隐藏

### 性能

- VNC iframe 通过 `DesktopVncFrame` 独立 memo，仅订阅沙箱 stream context
- `DesktopWorkspace` 对 events 深比较，避免纯文本流式更新触发右栏重渲染

---

## 架构

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

**数据流简述：**

1. 页面 hydrate 后 `SharedDesktopProvider` 空闲时启动沙箱，获取 VNC `streamUrl`
2. 用户发送消息 → `useChat` 流式请求 `/api/chat`，携带 `sandboxId`
3. 服务端 `streamText` 注册 `computer` / `bash` tools，在沙箱内执行
4. 客户端从 message parts 构建 `AgentEvent[]`，持久化并驱动 UI

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 19 |
| AI | AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) |
| 沙箱 | [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) + 预构建 snapshot |
| UI | Tailwind CSS 4、shadcn/ui、Motion、Lucide |
| 状态 | React state + localStorage；事件层 TypeScript 判别联合 |

---

## 项目结构

```
app/
  page.tsx                 # Dashboard 主布局（桌面双栏 + 移动布局）
  api/chat/route.ts        # 流式 Chat API + Tool 注册
  api/kill-desktop/route.ts

components/
  dashboard/
    chat-panel.tsx         # 聊天、Debug、输入框
    session-sidebar.tsx    # 会话列表
    session-chat-stack.tsx # 多会话 Chat 保活
    desktop-workspace.tsx  # 右栏 VNC + Activity
    desktop-vnc-frame.tsx  # VNC iframe（memo 隔离）
    tool-inspector.tsx     # Activity 时间线 + 详情
    debug-panel.tsx        # 可折叠 Debug
    shared-desktop-provider.tsx
    mobile-session-drawer.tsx
    mobile-desktop-panel.tsx
  message.tsx              # 消息与 Tool 卡片渲染
  tool-invocation-status.tsx

lib/
  agent-events.ts          # 事件管道 + 会话类型 + buildAgentEvents
  agent-status.ts          # Agent 状态推导
  tool-invocation-state.ts # Tool 视觉状态
  session-storage.ts       # localStorage 读写与迁移
  sandbox/                 # 沙箱创建、Tool 实现
  anthropic.ts             # Anthropic legacy provider（支持 ANTHROPIC_BASE_URL）
```

---

## 快速开始

### 前置条件

- Node.js 18+
- [Vercel](https://vercel.com) 账号（Sandbox 权限）
- [Anthropic API Key](https://console.anthropic.com/)（或兼容 Anthropic Messages API 的代理）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 Vercel 凭证

```bash
pnpm install -g vercel
vercel link
vercel env pull
```

会在 `.env.local` 中写入 `VERCEL_OIDC_TOKEN`。也可手动配置：

```env
VERCEL_TOKEN=...
VERCEL_TEAM_ID=...
VERCEL_PROJECT_ID=...
```

### 3. 创建 Sandbox Snapshot

Snapshot 预装 Xvnc、Chrome、openbox、noVNC、xdotool、ImageMagick，冷启动约数秒。

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

完成后将输出的 ID 写入环境变量（约 10 分钟）：

```env
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxx
```

### 4. 配置模型 API

```env
ANTHROPIC_API_KEY=sk-ant-...
# 可选：Anthropic 兼容代理（需支持 /v1/messages）
ANTHROPIC_BASE_URL=https://your-proxy.example/v1
```

### 5. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
pnpm build
pnpm start
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `ANTHROPIC_API_KEY` | 是 | Anthropic（或代理）API Key |
| `SANDBOX_SNAPSHOT_ID` | 是 | 桌面环境 Snapshot ID |
| `VERCEL_OIDC_TOKEN` | 二选一 | `vercel env pull` 自动写入 |
| `VERCEL_TOKEN` | 二选一 | 个人 Access Token |
| `VERCEL_TEAM_ID` | 配合 TOKEN | Vercel Team ID |
| `VERCEL_PROJECT_ID` | 配合 TOKEN | Vercel Project ID |
| `ANTHROPIC_BASE_URL` | 否 | 自定义 API Base URL（代理场景） |

---

## 响应式断点

| 视口 | 布局 |
|------|------|
| `≥ lg` (1024px) | 双栏 Dashboard + 固定/可折叠侧栏 |
| `< lg` | 单栏聊天 + 抽屉会话菜单 + 按需底部 VNC |

---

## 开发说明

### 禁用沙箱 UI

仅调试聊天 / 事件 UI 时，可在 `lib/feature-flags.ts` 设置：

```ts
export const SANDBOX_UI_DISABLED = true;
```

### 会话存储版本

`SESSION_STORAGE_VERSION` 变更时会通过 `migratePersistedSessionState` 迁移旧数据。当前版本：`2`。

### 模型切换

修改 `app/api/chat/route.ts` 中的模型 ID，需确保所用 API 分组支持对应模型及 computer use tools。

### Lint

```bash
pnpm lint
```

---

## 与上游 Demo 的主要差异

| 能力 | 上游 Demo | 本项目 |
|------|-----------|--------|
| 布局 | 单页 Chat + VNC | 双栏 Dashboard + 会话侧栏 |
| 事件系统 | 无 | 完整 typed event pipeline |
| 多会话 | 无 | localStorage 持久化 |
| Debug | 无 | 可折叠事件 / 状态面板 |
| Tool UI | 基础展示 | 状态色、耗时、右侧详情联动 |
| 移动端 | 无 | 抽屉菜单 + 按需 VNC |
| VNC 性能 | — | iframe memo 隔离 |

---

## 许可证

继承上游 [ai-sdk-computer-use](https://github.com/vercel-labs/ai-sdk-computer-use) 项目许可。部署与 API 使用须遵守 Anthropic、Vercel 各自服务条款。
