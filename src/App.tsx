import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  MessageSquare,
  Terminal,
  Home,
  CheckSquare,
  Wrench,
  Menu,
  X,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Brain,
  Flashlight,
  Bell,
  Shield,
  Lock,
  Download,
  WifiOff,
  Phone,
} from 'lucide-react';
import {
  AlarmItem,
  AmbientTrack,
  AssistantStateSnapshot,
  CalculationResult,
  ChatMessage,
  DeviceState,
  DraftItem,
  ExecutedAction,
  ExternalActionItem,
  GroundingSource,
  MemoryItem,
  NoteItem,
  PendingConfirmation,
  SmartHomeState,
  SpeechMode,
  TaskItem,
  TimerItem,
  VoiceLanguage,
  VoicePersona,
  WorkspaceTab,
} from './types/assistant';
import { soundEngine } from './utils/audioEngine';
import { OrbStatus, VoiceOrb } from './components/VoiceOrb';
import { ControlCenterPanel } from './components/ControlCenterPanel';
import { CommandsCatalogView } from './components/CommandsCatalogView';
import { SmartHomeView } from './components/SmartHomeView';
import { ProductivityView } from './components/ProductivityView';
import { ToolsView } from './components/ToolsView';
import { LockScreen, SecuritySettingsModal } from './components/SecurityShieldModal';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';

const STORAGE_KEY = 'stonic17_workspace_v1';
const PIN_STORAGE_KEY = 'stonic17_pin_hash_v1';

const DEFAULT_DEVICE: DeviceState = {
  theme: 'light',
  brightness: 100,
  volume: 75,
  muted: false,
  wifi: true,
  bluetooth: true,
  focusMode: false,
  flashlight: false,
  airplaneMode: false,
};

const DEFAULT_SMARTHOME: SmartHomeState = {
  lightsOn: true,
  lightBrightness: 80,
  lightTemp: 'daylight',
  acOn: true,
  acTemp: 24,
  acMode: 'eco',
  doorLocked: true,
  fanSpeed: 1,
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-17',
  role: 'assistant',
  text: 'Namaste! Main Stonic 17 hoon — aapka secure Android AI voice assistant. Aap mujhse Hindi, Hinglish ya English mein baat kar sakte hain, aur phone calls, smart home, timers, notes, aur web search sab control kar sakte hain.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isSensitiveAction(act: ExecutedAction): boolean {
  if (act.name === 'clear_conversation') return true;
  if (act.name === 'control_smart_home' && act.args?.doorLocked === false) return true;
  if (act.name === 'manage_task' && act.args?.action === 'clear_completed') return true;
  return false;
}

export default function App() {
  const saved = useRef(loadSavedState()).current;

  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('assistant');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Security states
  const [pinHash, setPinHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PIN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [safeGuardEnabled, setSafeGuardEnabled] = useState<boolean>(
    saved?.safeGuardEnabled ?? true
  );
  const [ephemeralMode, setEphemeralMode] = useState<boolean>(
    saved?.ephemeralMode ?? false
  );

  const [device, setDevice] = useState<DeviceState>(
    saved?.device ? { ...DEFAULT_DEVICE, ...saved.device } : DEFAULT_DEVICE
  );
  const [smartHome, setSmartHome] = useState<SmartHomeState>(
    saved?.smartHome ? { ...DEFAULT_SMARTHOME, ...saved.smartHome } : DEFAULT_SMARTHOME
  );
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrack>('none');

  const [timers, setTimers] = useState<TimerItem[]>(saved?.timers ?? []);
  const [alarms, setAlarms] = useState<AlarmItem[]>(
    saved?.alarms ?? [
      { id: 'alarm-1', time: '07:00', label: 'Morning Routine', enabled: false },
    ]
  );
  const [tasks, setTasks] = useState<TaskItem[]>(
    saved?.tasks ?? [
      {
        id: 'task-1',
        title: 'Try saying "Lights 40% dim karo aur 5 minute ka timer lagao"',
        priority: 'normal',
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ]
  );
  const [notes, setNotes] = useState<NoteItem[]>(saved?.notes ?? []);
  const [drafts, setDrafts] = useState<DraftItem[]>(saved?.drafts ?? []);
  const [memories, setMemories] = useState<MemoryItem[]>(saved?.memories ?? []);
  const [messages, setMessages] = useState<ChatMessage[]>(
    !saved?.ephemeralMode && saved?.messages?.length ? saved.messages : [WELCOME_MESSAGE]
  );

  // Voice & AI settings
  const [language, setLanguage] = useState<VoiceLanguage>(saved?.language ?? 'auto');
  const [persona, setPersona] = useState<VoicePersona>(saved?.persona ?? 'Kore');
  const [speechMode, setSpeechMode] = useState<SpeechMode>(saved?.speechMode ?? 'neural');
  const [deepThinking, setDeepThinking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  // Input & live status
  const [inputText, setInputText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [orbStatus, setOrbStatus] = useState<OrbStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Refs for async handlers
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRafRef = useRef<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const triggeredAlarmMinuteRef = useRef<string>('');

  // Sync dark mode class onto <html>
  useEffect(() => {
    const root = document.documentElement;
    if (device.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [device.theme]);

  // Sync volume to sound engine & active TTS audio
  useEffect(() => {
    soundEngine.setVolume(device.volume, device.muted);
    if (activeAudioRef.current) {
      activeAudioRef.current.volume = device.muted ? 0 : device.volume / 100;
    }
  }, [device.volume, device.muted]);

  // Persist workspace state (respecting Ephemeral Privacy Mode)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          device,
          smartHome,
          timers,
          alarms,
          tasks,
          notes,
          drafts,
          memories,
          messages: ephemeralMode ? [] : messages.slice(-30),
          language,
          persona,
          speechMode,
          safeGuardEnabled,
          ephemeralMode,
        })
      );
    } catch {
      // Storage quota ignored
    }
  }, [
    device,
    smartHome,
    timers,
    alarms,
    tasks,
    notes,
    drafts,
    memories,
    messages,
    language,
    persona,
    speechMode,
    safeGuardEnabled,
    ephemeralMode,
  ]);

  // Persist PIN hash separately
  const handleSetPin = useCallback((newHash: string | null) => {
    setPinHash(newHash);
    try {
      if (newHash) {
        localStorage.setItem(PIN_STORAGE_KEY, newHash);
      } else {
        localStorage.removeItem(PIN_STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Clock & Alarm / Timer 1-second tick
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      setClockText(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setAlarms((prev) => {
        const hit = prev.find((a) => a.enabled && a.time === hhmm);
        if (hit && triggeredAlarmMinuteRef.current !== `${hhmm}-${hit.id}`) {
          triggeredAlarmMinuteRef.current = `${hhmm}-${hit.id}`;
          soundEngine.playCue('alarm');
          setAlertBanner(`Alarm ringing: ${hit.label} (${hit.time})`);
        }
        return prev;
      });

      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          changed = true;
          const rem = t.remainingSeconds - 1;
          if (rem === 0) {
            soundEngine.playCue('alarm');
            setAlertBanner(`Timer finished: ${t.label}`);
            return { ...t, remainingSeconds: 0, isRunning: false, completed: true };
          }
          return { ...t, remainingSeconds: rem };
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const updateDevice = useCallback((patch: Partial<DeviceState>) => {
    setDevice((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSmartHome = useCallback((patch: Partial<SmartHomeState>) => {
    setSmartHome((prev) => ({ ...prev, ...patch }));
  }, []);

  const changeAmbient = useCallback((track: AmbientTrack) => {
    setAmbientTrack(track);
    if (track === 'none') {
      soundEngine.stopAmbient();
    } else {
      soundEngine.playAmbient(track);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setOrbStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (analyserRafRef.current) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = 0;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startListeningRef = useRef<() => void>(() => {});

  const speakText = useCallback(
    async (text: string) => {
      if (speechMode === 'muted' || device.muted) {
        setOrbStatus('idle');
        return;
      }

      stopSpeaking();
      setOrbStatus('speaking');

      const finishSpeech = () => {
        setOrbStatus('idle');
        if (handsFreeRef.current) {
          window.setTimeout(() => {
            startListeningRef.current();
          }, 350);
        }
      };

      const speakWithBrowserFallback = () => {
        if (!('speechSynthesis' in window)) {
          finishSpeech();
          return;
        }
        const utter = new SpeechSynthesisUtterance(
          text.replace(/[*_`#>-]/g, ' ').slice(0, 800)
        );
        utter.volume = device.muted ? 0 : device.volume / 100;
        utter.lang = language === 'hi-IN' ? 'hi-IN' : 'en-IN';
        utter.onend = finishSpeech;
        utter.onerror = finishSpeech;
        window.speechSynthesis.speak(utter);
      };

      if (speechMode === 'browser') {
        speakWithBrowserFallback();
        return;
      }

      try {
        const res = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: persona,
            style: 'Warm, articulate, friendly conversational AI assistant',
          }),
        });
        if (!res.ok) {
          speakWithBrowserFallback();
          return;
        }
        const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
        if (!data.audioBase64) {
          speakWithBrowserFallback();
          return;
        }
        const audio = new Audio(
          `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
        );
        audio.volume = device.muted ? 0 : device.volume / 100;
        activeAudioRef.current = audio;
        audio.onended = () => {
          activeAudioRef.current = null;
          finishSpeech();
        };
        audio.onerror = () => {
          activeAudioRef.current = null;
          speakWithBrowserFallback();
        };
        await audio.play();
      } catch {
        speakWithBrowserFallback();
      }
    },
    [speechMode, device.muted, device.volume, language, persona, stopSpeaking]
  );

  const applyExecutedActions = useCallback(
    (
      actions: ExecutedAction[]
    ): {
      draft?: DraftItem;
      calculation?: CalculationResult;
      externalAction?: ExternalActionItem;
      cleared?: boolean;
    } => {
      let draft: DraftItem | undefined;
      let calculation: CalculationResult | undefined;
      let externalAction: ExternalActionItem | undefined;
      let cleared = false;

      for (const act of actions) {
        const args = act.args || {};

        switch (act.name) {
          case 'set_device_setting': {
            const patch: Partial<DeviceState> = {};
            if (args.theme === 'light' || args.theme === 'dark') patch.theme = args.theme;
            if (typeof args.brightness === 'number')
              patch.brightness = Math.max(25, Math.min(100, args.brightness));
            if (typeof args.volume === 'number')
              patch.volume = Math.max(0, Math.min(100, args.volume));
            if (typeof args.muted === 'boolean') patch.muted = args.muted;
            if (typeof args.wifi === 'boolean') patch.wifi = args.wifi;
            if (typeof args.bluetooth === 'boolean') patch.bluetooth = args.bluetooth;
            if (typeof args.focusMode === 'boolean') patch.focusMode = args.focusMode;
            if (typeof args.flashlight === 'boolean') patch.flashlight = args.flashlight;
            if (typeof args.airplaneMode === 'boolean') {
              patch.airplaneMode = args.airplaneMode;
              if (args.airplaneMode) patch.wifi = false;
            }
            updateDevice(patch);
            break;
          }

          case 'control_smart_home': {
            const patch: Partial<SmartHomeState> = {};
            if (typeof args.lightsOn === 'boolean') patch.lightsOn = args.lightsOn;
            if (typeof args.lightBrightness === 'number') {
              patch.lightBrightness = Math.max(0, Math.min(100, args.lightBrightness));
              if (patch.lightBrightness > 0 && args.lightsOn === undefined) {
                patch.lightsOn = true;
              }
            }
            if (
              args.lightTemp === 'warm' ||
              args.lightTemp === 'daylight' ||
              args.lightTemp === 'cool'
            ) {
              patch.lightTemp = args.lightTemp;
            }
            if (typeof args.acOn === 'boolean') patch.acOn = args.acOn;
            if (typeof args.acTemp === 'number') {
              patch.acTemp = Math.max(16, Math.min(30, args.acTemp));
              if (args.acOn === undefined) patch.acOn = true;
            }
            if (args.acMode === 'cool' || args.acMode === 'eco' || args.acMode === 'fan') {
              patch.acMode = args.acMode;
            }
            if (typeof args.doorLocked === 'boolean') patch.doorLocked = args.doorLocked;
            if (typeof args.fanSpeed === 'number') {
              patch.fanSpeed = Math.max(0, Math.min(3, Math.round(args.fanSpeed)));
            }
            updateSmartHome(patch);
            break;
          }

          case 'manage_timer': {
            const action = String(args.action || 'start');
            const label = String(args.label || 'Timer');
            const mins = Number(args.minutes || 0);
            const secs = Number(args.seconds || 0);
            const totalSeconds = Math.max(5, Math.round(mins * 60 + secs));

            if (action === 'start') {
              setTimers((prev) => [
                {
                  id: `tmr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  label,
                  durationSeconds: totalSeconds,
                  remainingSeconds: totalSeconds,
                  isRunning: true,
                  completed: false,
                },
                ...prev,
              ]);
            } else if (action === 'pause') {
              setTimers((prev) =>
                prev.map((t) =>
                  !args.label || t.label.toLowerCase().includes(label.toLowerCase())
                    ? { ...t, isRunning: false }
                    : t
                )
              );
            } else if (action === 'resume') {
              setTimers((prev) =>
                prev.map((t) =>
                  !args.label || t.label.toLowerCase().includes(label.toLowerCase())
                    ? { ...t, isRunning: t.remainingSeconds > 0 }
                    : t
                )
              );
            } else if (action === 'reset') {
              setTimers((prev) =>
                prev.map((t) => ({
                  ...t,
                  remainingSeconds: t.durationSeconds,
                  isRunning: false,
                  completed: false,
                }))
              );
            } else if (action === 'delete') {
              setTimers((prev) =>
                args.label
                  ? prev.filter(
                      (t) => !t.label.toLowerCase().includes(label.toLowerCase())
                    )
                  : []
              );
            }
            break;
          }

          case 'manage_alarm': {
            const action = String(args.action || 'add');
            const time = String(args.time || '07:00');
            const label = String(args.label || 'Alarm');
            if (action === 'add') {
              setAlarms((prev) => [
                {
                  id: `alm-${Date.now()}`,
                  time,
                  label,
                  enabled: true,
                },
                ...prev,
              ]);
            } else if (action === 'enable' || action === 'disable') {
              setAlarms((prev) =>
                prev.map((a) =>
                  !args.label || a.label.toLowerCase().includes(label.toLowerCase())
                    ? { ...a, enabled: action === 'enable' }
                    : a
                )
              );
            } else if (action === 'delete') {
              setAlarms((prev) =>
                args.label
                  ? prev.filter(
                      (a) => !a.label.toLowerCase().includes(label.toLowerCase())
                    )
                  : []
              );
            }
            break;
          }

          case 'manage_task': {
            const action = String(args.action || 'add');
            const title = String(args.title || '').trim();
            if (action === 'add' && title) {
              setTasks((prev) => [
                {
                  id: `tsk-${Date.now()}`,
                  title,
                  dueTime: args.dueTime ? String(args.dueTime) : undefined,
                  priority: args.priority === 'high' ? 'high' : 'normal',
                  completed: false,
                  createdAt: new Date().toISOString(),
                },
                ...prev,
              ]);
            } else if (action === 'complete' && title) {
              setTasks((prev) =>
                prev.map((t) =>
                  t.title.toLowerCase().includes(title.toLowerCase())
                    ? { ...t, completed: true }
                    : t
                )
              );
            } else if (action === 'delete' && title) {
              setTasks((prev) =>
                prev.filter((t) => !t.title.toLowerCase().includes(title.toLowerCase()))
              );
            } else if (action === 'clear_completed') {
              setTasks((prev) => prev.filter((t) => !t.completed));
            }
            break;
          }

          case 'manage_note': {
            const action = String(args.action || 'add');
            const title = String(args.title || 'Voice Note');
            const content = String(args.content || title);
            if (action === 'add') {
              setNotes((prev) => [
                {
                  id: `note-${Date.now()}`,
                  title,
                  content,
                  pinned: false,
                  createdAt: new Date().toISOString(),
                },
                ...prev,
              ]);
            } else if (action === 'pin') {
              setNotes((prev) =>
                prev.map((n) =>
                  n.title.toLowerCase().includes(title.toLowerCase())
                    ? { ...n, pinned: true }
                    : n
                )
              );
            } else if (action === 'delete') {
              setNotes((prev) =>
                prev.filter((n) => !n.title.toLowerCase().includes(title.toLowerCase()))
              );
            }
            break;
          }

          case 'control_ambient_audio': {
            const action = String(args.action || 'play');
            const track = String(args.track || 'focus') as AmbientTrack;
            if (action === 'stop') {
              changeAmbient('none');
            } else {
              changeAmbient(track);
            }
            break;
          }

          case 'navigate_workspace': {
            const tab = String(args.tab || 'assistant') as WorkspaceTab;
            if (
              ['assistant', 'commands', 'smarthome', 'productivity', 'tools'].includes(
                tab
              )
            ) {
              setActiveTab(tab);
            }
            break;
          }

          case 'create_draft': {
            draft = {
              id: `drf-${Date.now()}`,
              type: (args.type as DraftItem['type']) || 'message',
              recipient: args.recipient ? String(args.recipient) : undefined,
              subject: args.subject ? String(args.subject) : undefined,
              body: String(args.body || ''),
              createdAt: new Date().toISOString(),
            };
            setDrafts((prev) => [draft!, ...prev]);
            break;
          }

          case 'calculate_or_convert': {
            calculation = {
              expression: String(args.expression || ''),
              result: String(args.result || ''),
              explanation: args.explanation ? String(args.explanation) : undefined,
            };
            break;
          }

          case 'open_external_action': {
            externalAction = {
              actionType:
                (args.actionType as ExternalActionItem['actionType']) || 'search_web',
              query: String(args.query || ''),
              url: String(args.url || 'https://www.google.com'),
              label: String(args.label || 'Open Link'),
            };
            break;
          }

          case 'manage_memory': {
            const action = String(args.action || 'save');
            const fact = String(args.fact || '').trim();
            const category = (
              ['preference', 'person', 'routine', 'general'].includes(String(args.category))
                ? String(args.category)
                : 'general'
            ) as MemoryItem['category'];

            if (action === 'forget' && fact) {
              setMemories((prev) =>
                prev.filter((m) => !m.fact.toLowerCase().includes(fact.toLowerCase()))
              );
            } else if (fact) {
              setMemories((prev) => {
                if (prev.some((m) => m.fact.toLowerCase() === fact.toLowerCase())) {
                  return prev;
                }
                return [
                  {
                    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    fact,
                    category,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ];
              });
            }
            break;
          }

          case 'clear_conversation': {
            cleared = true;
            break;
          }
        }
      }

      return { draft, calculation, externalAction, cleared };
    },
    [changeAmbient, updateDevice, updateSmartHome]
  );

  const handleResolveConfirmation = useCallback(
    (msgId: string, confirm: boolean) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.pendingConfirmation) return m;
          if (confirm) {
            const res = applyExecutedActions(m.pendingConfirmation.actions);
            if (res.cleared) {
              return {
                ...WELCOME_MESSAGE,
                id: `welcome-${Date.now()}`,
              };
            }
          }
          return {
            ...m,
            pendingConfirmation: {
              ...m.pendingConfirmation,
              resolved: confirm ? 'confirmed' : 'cancelled',
            },
          };
        })
      );
    },
    [applyExecutedActions]
  );

  const sendCommand = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      if (!isOnline) {
        setErrorBanner(
          'You are currently offline. Voice AI requires an internet connection, while local controls and timers keep working.'
        );
        return;
      }

      stopSpeaking();
      setErrorBanner(null);
      setInputText('');
      setLiveTranscript('');

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setOrbStatus('thinking');

      try {
        const snapshot: AssistantStateSnapshot = {
          device,
          smartHome,
          ambientTrack,
          timers,
          alarms,
          tasks,
          notes,
          memories,
          activeTab,
        };

        const historyPayload = messages.slice(-10).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const res = await fetch('/api/assistant/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: historyPayload,
            stateSnapshot: snapshot,
            language,
            persona,
            deepThinking,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          actions?: ExecutedAction[];
          sources?: GroundingSource[];
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Request failed');
        }

        const allActions = data.actions || [];
        const sensitiveActions = safeGuardEnabled
          ? allActions.filter(isSensitiveAction)
          : [];
        const immediateActions = safeGuardEnabled
          ? allActions.filter((a) => !isSensitiveAction(a))
          : allActions;

        const { draft, calculation, externalAction, cleared } =
          applyExecutedActions(immediateActions);

        if (cleared) {
          setMessages([WELCOME_MESSAGE]);
          setOrbStatus('idle');
          return;
        }

        const pendingConfirmation: PendingConfirmation | undefined =
          sensitiveActions.length > 0
            ? {
                id: `conf-${Date.now()}`,
                summary: sensitiveActions.map((a) => a.summary).join(' · '),
                actions: sensitiveActions,
              }
            : undefined;

        const replyText =
          pendingConfirmation && immediateActions.length === 0
            ? `Security Shield paused this sensitive command (${pendingConfirmation.summary}). Please tap Confirm below to execute.`
            : data.reply || 'Done.';

        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          executedActions: immediateActions.length > 0 ? immediateActions : undefined,
          pendingConfirmation,
          sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
          draft,
          calculation,
          externalAction,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        await speakText(replyText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to reach Stonic 17 server.';
        setErrorBanner(msg);
        setOrbStatus('idle');
      }
    },
    [
      activeTab,
      alarms,
      ambientTrack,
      applyExecutedActions,
      deepThinking,
      device,
      isOnline,
      language,
      messages,
      notes,
      persona,
      safeGuardEnabled,
      smartHome,
      speakText,
      stopSpeaking,
      tasks,
      timers,
    ]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    stopAudioMonitor();
  }, [stopAudioMonitor]);

  const startAudioLevelMonitor = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!mediaStreamRef.current) {
          try {
            ctx.close();
          } catch {}
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        setAudioLevel(Math.min(1, avg * 2.2));
        analyserRafRef.current = requestAnimationFrame(tick);
      };
      analyserRafRef.current = requestAnimationFrame(tick);
    } catch {}
  }, []);

  const startGeminiRecorderFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      startAudioLevelMonitor(stream);

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopAudioMonitor();
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400) {
          setOrbStatus('idle');
          return;
        }
        setOrbStatus('transcribing');
        try {
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const audioBase64 = btoa(binary);
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: recorder.mimeType || 'audio/webm',
              languageHint: language,
            }),
          });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (data.transcript && data.transcript.trim()) {
            void sendCommand(data.transcript.trim());
          } else {
            setOrbStatus('idle');
          }
        } catch {
          setErrorBanner('Could not transcribe voice audio.');
          setOrbStatus('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setOrbStatus('listening');
      soundEngine.playCue('start');
    } catch {
      setErrorBanner(
        'Microphone access was denied or unavailable. You can still type commands below.'
      );
      setOrbStatus('idle');
    }
  }, [language, sendCommand, startAudioLevelMonitor, stopAudioMonitor]);

  const startListening = useCallback(() => {
    if (orbStatus === 'listening') {
      soundEngine.playCue('end');
      stopListening();
      return;
    }

    stopSpeaking();
    setErrorBanner(null);
    setLiveTranscript('');

    const SpeechRec = getSpeechRecognitionConstructor();
    if (!SpeechRec) {
      void startGeminiRecorderFallback();
      return;
    }

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        startAudioLevelMonitor(stream);
      })
      .catch(() => {});

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'auto' ? 'en-IN' : language;

    let finalText = '';
    let settled = false;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const seg = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += seg + ' ';
        } else {
          interim += seg;
        }
      }
      setLiveTranscript((finalText + interim).trim());
    };

    recognition.onerror = (ev: { error: string }) => {
      if (settled) return;
      settled = true;
      stopAudioMonitor();
      recognitionRef.current = null;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        setErrorBanner('Microphone permission denied. Please allow mic access or type below.');
        setOrbStatus('idle');
      } else if (ev.error === 'network' || ev.error === 'audio-capture') {
        void startGeminiRecorderFallback();
      } else {
        setOrbStatus('idle');
      }
    };

    recognition.onend = () => {
      if (settled) return;
      settled = true;
      stopAudioMonitor();
      recognitionRef.current = null;
      const textToSend = finalText.trim();
      if (textToSend) {
        soundEngine.playCue('end');
        void sendCommand(textToSend);
      } else {
        setOrbStatus('idle');
      }
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setOrbStatus('listening');
      soundEngine.playCue('start');
    } catch {
      void startGeminiRecorderFallback();
    }
  }, [
    language,
    orbStatus,
    sendCommand,
    startAudioLevelMonitor,
    startGeminiRecorderFallback,
    stopAudioMonitor,
    stopListening,
    stopSpeaking,
  ]);

  startListeningRef.current = startListening;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      window.setTimeout(() => setCopiedMsgId(null), 1500);
    } catch {}
  };

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    shortLabel: string;
    icon: typeof MessageSquare;
  }> = [
    { id: 'assistant', label: 'Voice Assistant', shortLabel: 'Voice', icon: MessageSquare },
    { id: 'commands', label: 'All Commands', shortLabel: 'Commands', icon: Terminal },
    { id: 'smarthome', label: 'Smart Home', shortLabel: 'Home', icon: Home },
    { id: 'productivity', label: 'Tasks & Timers', shortLabel: 'Tasks', icon: CheckSquare },
    { id: 'tools', label: 'Drafts & Tools', shortLabel: 'Tools', icon: Wrench },
  ];

  const tabTitle = navItems.find((n) => n.id === activeTab)?.label || 'Voice Assistant';

  const quickChips = [
    'Namaste Stonic! Humse thodi baat karo',
    'Dark mode on karo aur lights 40% dim karo',
    '5 minute ka timer lagao Tea ke liye',
    'Aaj ki top tech news kya hai?',
  ];

  return (
    <div
      className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200"
      style={{
        filter: device.brightness < 100 ? `brightness(${device.brightness}%)` : undefined,
      }}
    >
      {/* Lock Screen Overlay when PIN is set & locked */}
      {isLocked && pinHash && (
        <LockScreen pinHash={pinHash} onUnlock={() => setIsLocked(false)} />
      )}

      {/* Security Settings Modal */}
      <SecuritySettingsModal
        open={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        hasPin={Boolean(pinHash)}
        onSetPin={handleSetPin}
        onLockNow={() => setIsLocked(true)}
        safeGuardEnabled={safeGuardEnabled}
        onToggleSafeGuard={() => setSafeGuardEnabled((s) => !s)}
        ephemeralMode={ephemeralMode}
        onToggleEphemeralMode={() => setEphemeralMode((e) => !e)}
      />

      {/* Screen Flashlight Overlay */}
      {device.flashlight && (
        <div className="fixed inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 text-slate-900">
          <Flashlight className="w-14 h-14 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold">Flashlight Active</h2>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            Android studio torch mode is on.
          </p>
          <button
            type="button"
            onClick={() => updateDevice({ flashlight: false })}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Turn Off Flashlight
          </button>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[264px] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">
                Stonic 17
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Android Edition · Version 17
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Voice Preferences */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Voice Settings
            </p>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="auto">Auto · Hinglish / EN / HI</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                AI Voice Persona
              </label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as VoicePersona)}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="Kore">Kore · Balanced & Clear</option>
                <option value="Zephyr">Zephyr · Warm & Bright</option>
                <option value="Puck">Puck · Energetic</option>
                <option value="Charon">Charon · Deep & Calm</option>
                <option value="Fenrir">Fenrir · Crisp Studio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Audio Output
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {(['neural', 'browser', 'muted'] as SpeechMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSpeechMode(m)}
                    className={`min-h-[34px] rounded text-xs font-medium capitalize transition-colors ${
                      speechMode === m
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSecurityModalOpen(true);
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Security Shield
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {pinHash ? 'PIN On' : 'Configure'}
              </span>
            </button>

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => void install()}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Install on Android
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {tasks.filter((t) => !t.completed).length} tasks · {notes.length} notes
          </span>
          <span className="font-mono tabular-nums">{clockText}</span>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (compact 52px for mobile sticky cap) */}
        <header className="h-[52px] px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Stonic 17
              </span>
              <span className="text-slate-400" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 dark:text-slate-400 truncate">
                {tabTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => void install()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Install App
              </button>
            )}
            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              aria-label="Security Shield"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors ${
                pinHash || safeGuardEnabled
                  ? 'border-blue-600/30 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {pinHash ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() =>
                updateDevice({ theme: device.theme === 'dark' ? 'light' : 'dark' })
              }
              aria-label="Toggle light or dark theme"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {device.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setMessages([WELCOME_MESSAGE]);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>
        </header>

        {/* Connectivity & Alarm/Error Strips */}
        {!isOnline && (
          <div className="px-4 sm:px-6 py-2 bg-amber-500 text-white text-xs font-medium flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode — Local controls and cached data remain active.</span>
          </div>
        )}

        {alertBanner && (
          <div className="px-4 sm:px-6 py-2.5 bg-blue-600 text-white text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium">
              <Bell className="w-4 h-4 shrink-0" />
              <span>{alertBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertBanner(null)}
              className="px-3 py-1 rounded bg-white/15 hover:bg-white/25 text-xs font-medium whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="px-4 sm:px-6 py-2.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-4">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="font-medium underline shrink-0"
            >
              Close
            </button>
          </div>
        )}

        {/* Workspace Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
            {/* Primary Viewport */}
            <div className="min-w-0">
              {activeTab === 'assistant' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-[calc(100vh-11rem)] lg:min-h-[calc(100vh-8.5rem)]">
                  {/* Top Interactive Orb Stage */}
                  <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-col items-center">
                    <VoiceOrb
                      status={orbStatus}
                      audioLevel={audioLevel}
                      onToggleListen={startListening}
                      onStopSpeaking={stopSpeaking}
                      handsFree={handsFree}
                      onToggleHandsFree={() => setHandsFree((h) => !h)}
                    />

                    {liveTranscript && (
                      <p className="mt-1 mb-2 px-4 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 max-w-xl text-center">
                        {liveTranscript}
                      </p>
                    )}

                    {messages.length <= 2 && (
                      <div className="mt-2 mb-1 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                        {quickChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => void sendCommand(chip)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conversation Transcript */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 max-h-[460px]">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-1">
                          <span>{msg.role === 'user' ? 'You' : 'Stonic 17'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {/* Sensitive Action Confirmation Card */}
                          {msg.pendingConfirmation && (
                            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 space-y-2.5">
                              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                <Shield className="w-4 h-4 shrink-0" />
                                <span>
                                  Confirm Sensitive Action: {msg.pendingConfirmation.summary}
                                </span>
                              </div>
                              {msg.pendingConfirmation.resolved ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                  Action {msg.pendingConfirmation.resolved}.
                                </p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResolveConfirmation(msg.id, true)
                                    }
                                    className="min-h-[40px] px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResolveConfirmation(msg.id, false)
                                    }
                                    className="min-h-[40px] px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Executed Commands Summary */}
                          {msg.executedActions && msg.executedActions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                              {msg.executedActions.map((act, idx) => (
                                <div
                                  key={`${msg.id}-act-${idx}`}
                                  className="text-xs text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1.5"
                                >
                                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                  <span>Executed: {act.summary}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Calculation Result Card */}
                          {msg.calculation && (
                            <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {msg.calculation.expression}
                              </p>
                              <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                                {msg.calculation.result}
                              </p>
                              {msg.calculation.explanation && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {msg.calculation.explanation}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Draft Card */}
                          {msg.draft && (
                            <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                                  {msg.draft.type} Draft
                                  {msg.draft.recipient ? ` · ${msg.draft.recipient}` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopy(msg.draft!.id, msg.draft!.body)
                                  }
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium"
                                >
                                  {copiedMsgId === msg.draft.id ? (
                                    <>
                                      <Check className="w-3 h-3" /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copy
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {msg.draft.body}
                              </p>
                            </div>
                          )}

                          {/* Android / External Action Link Card */}
                          {msg.externalAction && (
                            <div className="mt-3">
                              <a
                                href={msg.externalAction.url}
                                target={
                                  msg.externalAction.url.startsWith('http')
                                    ? '_blank'
                                    : undefined
                                }
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                              >
                                {msg.externalAction.actionType === 'phone_call' ? (
                                  <Phone className="w-3.5 h-3.5" />
                                ) : (
                                  <ExternalLink className="w-3.5 h-3.5" />
                                )}
                                <span>{msg.externalAction.label}</span>
                              </a>
                            </div>
                          )}

                          {/* Google Search Grounding Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Sources
                              </p>
                              <div className="flex flex-col gap-1">
                                {msg.sources.slice(0, 4).map((src) => (
                                  <a
                                    key={src.uri}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{src.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {msg.role === 'assistant' && (
                          <div className="mt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void speakText(msg.text)}
                              className="inline-flex items-center gap-1 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                            >
                              {device.muted || speechMode === 'muted' ? (
                                <VolumeX className="w-3 h-3" />
                              ) : (
                                <Volume2 className="w-3 h-3" />
                              )}
                              <span>Speak</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopy(msg.id, msg.text)}
                              className="inline-flex items-center gap-1 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Command Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendCommand(inputText);
                    }}
                    className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setDeepThinking((d) => !d)}
                      title="Toggle deep reasoning mode"
                      className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                        deepThinking
                          ? 'bg-blue-600/10 border-blue-600/40 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Brain className="w-4 h-4" />
                      <span className="hidden sm:inline whitespace-nowrap">
                        Deep Think
                      </span>
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Bolkar ya likhkar command dein..."
                      className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <button
                      type="button"
                      onClick={startListening}
                      aria-label="Voice input"
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors shrink-0 ${
                        orbStatus === 'listening'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || orbStatus === 'thinking'}
                      aria-label="Send command"
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'commands' && (
                <CommandsCatalogView
                  onRunCommand={(cmd) => {
                    setActiveTab('assistant');
                    void sendCommand(cmd);
                  }}
                />
              )}

              {activeTab === 'smarthome' && (
                <SmartHomeView
                  smartHome={smartHome}
                  onUpdateSmartHome={updateSmartHome}
                  ambientTrack={ambientTrack}
                  onChangeAmbient={changeAmbient}
                  onRunCommand={(cmd) => {
                    setActiveTab('assistant');
                    void sendCommand(cmd);
                  }}
                />
              )}

              {activeTab === 'productivity' && (
                <ProductivityView
                  tasks={tasks}
                  onAddTask={(title, dueTime, priority = 'normal') =>
                    setTasks((prev) => [
                      {
                        id: `tsk-${Date.now()}`,
                        title,
                        dueTime,
                        priority,
                        completed: false,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ])
                  }
                  onToggleTask={(id) =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === id ? { ...t, completed: !t.completed } : t
                      )
                    )
                  }
                  onDeleteTask={(id) =>
                    setTasks((prev) => prev.filter((t) => t.id !== id))
                  }
                  notes={notes}
                  onAddNote={(title, content) =>
                    setNotes((prev) => [
                      {
                        id: `note-${Date.now()}`,
                        title,
                        content,
                        pinned: false,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ])
                  }
                  onTogglePinNote={(id) =>
                    setNotes((prev) =>
                      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
                    )
                  }
                  onDeleteNote={(id) =>
                    setNotes((prev) => prev.filter((n) => n.id !== id))
                  }
                  timers={timers}
                  onAddTimer={(label, minutes) =>
                    setTimers((prev) => [
                      {
                        id: `tmr-${Date.now()}`,
                        label,
                        durationSeconds: minutes * 60,
                        remainingSeconds: minutes * 60,
                        isRunning: true,
                        completed: false,
                      },
                      ...prev,
                    ])
                  }
                  onToggleTimer={(id) =>
                    setTimers((prev) =>
                      prev.map((t) =>
                        t.id === id && t.remainingSeconds > 0
                          ? { ...t, isRunning: !t.isRunning }
                          : t
                      )
                    )
                  }
                  onResetTimer={(id) =>
                    setTimers((prev) =>
                      prev.map((t) =>
                        t.id === id
                          ? {
                              ...t,
                              remainingSeconds: t.durationSeconds,
                              isRunning: false,
                              completed: false,
                            }
                          : t
                      )
                    )
                  }
                  onDeleteTimer={(id) =>
                    setTimers((prev) => prev.filter((t) => t.id !== id))
                  }
                  alarms={alarms}
                  onAddAlarm={(time, label) =>
                    setAlarms((prev) => [
                      { id: `alm-${Date.now()}`, time, label, enabled: true },
                      ...prev,
                    ])
                  }
                  onToggleAlarm={(id) =>
                    setAlarms((prev) =>
                      prev.map((a) =>
                        a.id === id ? { ...a, enabled: !a.enabled } : a
                      )
                    )
                  }
                  onDeleteAlarm={(id) =>
                    setAlarms((prev) => prev.filter((a) => a.id !== id))
                  }
                />
              )}

              {activeTab === 'tools' && (
                <ToolsView
                  drafts={drafts}
                  onDeleteDraft={(id) =>
                    setDrafts((prev) => prev.filter((d) => d.id !== id))
                  }
                  memories={memories}
                  onDeleteMemory={(id) =>
                    setMemories((prev) => prev.filter((m) => m.id !== id))
                  }
                  onRunCommand={(cmd) => {
                    setActiveTab('assistant');
                    void sendCommand(cmd);
                  }}
                />
              )}
            </div>

            {/* Right Control Center */}
            <ControlCenterPanel
              device={device}
              onUpdateDevice={updateDevice}
              smartHome={smartHome}
              onUpdateSmartHome={updateSmartHome}
              ambientTrack={ambientTrack}
              onChangeAmbient={changeAmbient}
              timers={timers}
              onToggleTimer={(id) =>
                setTimers((prev) =>
                  prev.map((t) =>
                    t.id === id && t.remainingSeconds > 0
                      ? { ...t, isRunning: !t.isRunning }
                      : t
                  )
                )
              }
              onResetTimer={(id) =>
                setTimers((prev) =>
                  prev.map((t) =>
                    t.id === id
                      ? {
                          ...t,
                          remainingSeconds: t.durationSeconds,
                          isRunning: false,
                          completed: false,
                        }
                      : t
                  )
                )
              }
            />
          </div>
        </main>
      </div>

      {/* Android Thumb-Zone Bottom Tab Bar (< lg) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
