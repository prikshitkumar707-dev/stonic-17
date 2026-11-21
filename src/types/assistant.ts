export type WorkspaceTab =
  | 'assistant'
  | 'commands'
  | 'smarthome'
  | 'productivity'
  | 'tools';

export type VoiceLanguage = 'auto' | 'en-IN' | 'hi-IN' | 'en-US';
export type VoicePersona = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
export type SpeechMode = 'neural' | 'browser' | 'muted';
export type AmbientTrack = 'none' | 'rain' | 'lofi' | 'ocean' | 'focus' | 'whitenoise';

export interface DeviceState {
  theme: 'light' | 'dark';
  brightness: number; // 25 to 100
  volume: number; // 0 to 100
  muted: boolean;
  wifi: boolean;
  bluetooth: boolean;
  focusMode: boolean;
  flashlight: boolean;
  airplaneMode: boolean;
}

export interface SmartHomeState {
  lightsOn: boolean;
  lightBrightness: number; // 0 to 100
  lightTemp: 'warm' | 'daylight' | 'cool';
  acOn: boolean;
  acTemp: number; // 16 to 30 Celsius
  acMode: 'cool' | 'eco' | 'fan';
  doorLocked: boolean;
  fanSpeed: number; // 0 to 3
}

export interface TimerItem {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  completed: boolean;
}

export interface AlarmItem {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  dueTime?: string;
  priority: 'normal' | 'high';
  completed: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export interface DraftItem {
  id: string;
  type: 'email' | 'message' | 'summary' | 'translation';
  recipient?: string;
  subject?: string;
  body: string;
  createdAt: string;
}

export interface CalculationResult {
  expression: string;
  result: string;
  explanation?: string;
}

export interface ExternalActionItem {
  actionType:
    | 'phone_call'
    | 'send_sms'
    | 'whatsapp'
    | 'search_web'
    | 'youtube_search'
    | 'maps_search'
    | 'open_url';
  query: string;
  url: string;
  label: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ExecutedAction {
  name: string;
  summary: string;
  args: Record<string, unknown>;
}

export interface PendingConfirmation {
  id: string;
  summary: string;
  actions: ExecutedAction[];
  resolved?: 'confirmed' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  executedActions?: ExecutedAction[];
  pendingConfirmation?: PendingConfirmation;
  sources?: GroundingSource[];
  draft?: DraftItem;
  calculation?: CalculationResult;
  externalAction?: ExternalActionItem;
}

export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'person' | 'routine' | 'general';
  createdAt: string;
}

export interface AssistantStateSnapshot {
  device: DeviceState;
  smartHome: SmartHomeState;
  ambientTrack: AmbientTrack;
  timers: TimerItem[];
  alarms: AlarmItem[];
  tasks: TaskItem[];
  notes: NoteItem[];
  memories: MemoryItem[];
  activeTab: WorkspaceTab;
}
