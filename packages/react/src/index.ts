// @rubrion/beholder-react: the browser half of Beholder, the agent kit.
// Wrap the app in <AgentProvider>, drop <ChatBox> in the layout and <AssistantScreen>
// on a route. Import '@rubrion/beholder-react/styles.css' once, and let Tailwind
// scan this package (see README).
export { AgentProvider, DEFAULT_ATTACH_ACCEPT, gatewayAttach, useAgent, type AgentConfig, type AttachConfig, type Conversation } from './provider.js';
export { applyEvent, phaseOf, readEvents, type AgentInfo, type AssistantTurn, type Phase, type Session, type Status, type Step, type StreamEvent, type Turn, type UserTurn } from './events.js';
export { en, ptBR, type Strings } from './strings.js';
export { ChatBox } from './components/ChatBox.js';
export { AssistantScreen, AgentPicker, ConversationList } from './components/AssistantScreen.js';
export { Availability, CompactConversation, Composer, Suggestions, Thread } from './components/Conversation.js';
export { Markdown, ThinkStep, ToolStep } from './components/Steps.js';
export { Mascot } from './components/Mascot.js';
export { Beholder } from './components/Beholder.js';
export { Eye } from './components/Eye.js';
export { Avatar, IconButton } from './components/ui.js';
