import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type { FunctionDeclaration, Part, Content } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const ALLOWED_VOICES = new Set(['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir']);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
]);

function sanitizeActionUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('sms:') ||
    trimmed.startsWith('mailto:')
  ) {
    // Allow only safe characters in phone/sms/email URIs
    return /^[a-z]+:[0-9+\-.,;?*#@\s%a-zA-Z_&=]+$/.test(trimmed) ? trimmed : null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// In-memory sliding-window rate limiter for /api routes
const rateBucket = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;

function apiRateLimiter(req: Request, res: Response, next: () => void) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'local';
  const now = Date.now();
  const stamps = (rateBucket.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (stamps.length >= RATE_MAX_REQUESTS) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    return;
  }
  stamps.push(now);
  rateBucket.set(ip, stamps);
  next();
}

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add it in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'set_device_setting',
    description:
      'Control device system settings including theme (light/dark), screen brightness (25-100), audio volume (0-100), mute, wifi, bluetooth, focusMode (do not disturb), flashlight, or airplaneMode.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        theme: {
          type: Type.STRING,
          description: "Theme mode: 'light' or 'dark'",
        },
        brightness: {
          type: Type.NUMBER,
          description: 'Screen brightness percentage from 25 to 100',
        },
        volume: {
          type: Type.NUMBER,
          description: 'Audio volume percentage from 0 to 100',
        },
        muted: {
          type: Type.BOOLEAN,
          description: 'Mute or unmute audio output',
        },
        wifi: {
          type: Type.BOOLEAN,
          description: 'Turn Wi-Fi on (true) or off (false)',
        },
        bluetooth: {
          type: Type.BOOLEAN,
          description: 'Turn Bluetooth on (true) or off (false)',
        },
        focusMode: {
          type: Type.BOOLEAN,
          description: 'Turn Focus / Do Not Disturb mode on or off',
        },
        flashlight: {
          type: Type.BOOLEAN,
          description: 'Turn screen flashlight / torch on or off',
        },
        airplaneMode: {
          type: Type.BOOLEAN,
          description: 'Turn Airplane mode on or off',
        },
      },
    },
  },
  {
    name: 'control_smart_home',
    description:
      'Control smart home devices: room lights (on/off, brightness 0-100, color temp warm/daylight/cool), AC thermostat (on/off, temperature 16-30C, mode cool/eco/fan), front door lock (locked true/false), and ceiling fan speed (0-3).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lightsOn: { type: Type.BOOLEAN, description: 'Turn room lights on or off' },
        lightBrightness: {
          type: Type.NUMBER,
          description: 'Light brightness from 0 to 100',
        },
        lightTemp: {
          type: Type.STRING,
          description: "Light color temperature: 'warm', 'daylight', or 'cool'",
        },
        acOn: { type: Type.BOOLEAN, description: 'Turn air conditioner on or off' },
        acTemp: {
          type: Type.NUMBER,
          description: 'Target AC temperature in Celsius (16 to 30)',
        },
        acMode: {
          type: Type.STRING,
          description: "AC mode: 'cool', 'eco', or 'fan'",
        },
        doorLocked: {
          type: Type.BOOLEAN,
          description: 'Lock (true) or unlock (false) the front door',
        },
        fanSpeed: {
          type: Type.NUMBER,
          description: 'Ceiling fan speed from 0 (off) to 3 (high)',
        },
      },
    },
  },
  {
    name: 'manage_timer',
    description:
      'Start, pause, resume, reset, or delete a countdown timer. Always convert hours/minutes/seconds into minutes and seconds.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'start', 'pause', 'resume', 'reset', or 'delete'",
        },
        label: {
          type: Type.STRING,
          description: "Label for the timer, e.g. 'Tea', 'Workout', 'Focus'",
        },
        minutes: {
          type: Type.NUMBER,
          description: 'Minutes for the timer (optional)',
        },
        seconds: {
          type: Type.NUMBER,
          description: 'Additional seconds for the timer (optional)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'manage_alarm',
    description: 'Create, enable, disable, or delete an alarm.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'add', 'enable', 'disable', or 'delete'",
        },
        time: {
          type: Type.STRING,
          description: "24-hour time format HH:MM, e.g. '07:30' or '18:00'",
        },
        label: {
          type: Type.STRING,
          description: 'Short label for the alarm',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'manage_task',
    description:
      'Add, complete, delete, or clear completed tasks and reminders in the user to-do list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'add', 'complete', 'delete', or 'clear_completed'",
        },
        title: {
          type: Type.STRING,
          description: 'Task or reminder description',
        },
        dueTime: {
          type: Type.STRING,
          description: 'Optional due time or date string, e.g. "6:00 PM" or "Tomorrow"',
        },
        priority: {
          type: Type.STRING,
          description: "Priority: 'normal' or 'high'",
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'manage_note',
    description: 'Create, pin, or delete a personal note.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'add', 'pin', or 'delete'",
        },
        title: {
          type: Type.STRING,
          description: 'Title of the note',
        },
        content: {
          type: Type.STRING,
          description: 'Body text of the note',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'control_ambient_audio',
    description:
      'Play or stop synthesized ambient soundscapes and focus audio inside the app.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'play' or 'stop'",
        },
        track: {
          type: Type.STRING,
          description:
            "Ambient soundscape track: 'rain', 'lofi', 'ocean', 'focus', or 'whitenoise'",
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'navigate_workspace',
    description:
      'Switch the active screen or workspace section in Stonic 17 when the user asks to open or view a section.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tab: {
          type: Type.STRING,
          description:
            "Target section: 'assistant', 'commands', 'smarthome', 'productivity', or 'tools'",
        },
      },
      required: ['tab'],
    },
  },
  {
    name: 'create_draft',
    description:
      'Generate a structured draft card for an email, WhatsApp/SMS message, summary, or translation so the user can review and copy it in one click.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: "Draft type: 'email', 'message', 'summary', or 'translation'",
        },
        recipient: {
          type: Type.STRING,
          description: 'Recipient name or target language if applicable',
        },
        subject: {
          type: Type.STRING,
          description: 'Subject or title',
        },
        body: {
          type: Type.STRING,
          description: 'Complete drafted text',
        },
      },
      required: ['type', 'body'],
    },
  },
  {
    name: 'calculate_or_convert',
    description:
      'Present a formatted calculation, percentage, EMI, GST, or unit conversion card when the user asks math or conversion questions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: {
          type: Type.STRING,
          description: 'The math expression or conversion query, e.g. "18% of 4500"',
        },
        result: {
          type: Type.STRING,
          description: 'The exact computed result, e.g. "810 (Total: 5,310)"',
        },
        explanation: {
          type: Type.STRING,
          description: 'Brief step-by-step note',
        },
      },
      required: ['expression', 'result'],
    },
  },
  {
    name: 'open_external_action',
    description:
      'Prepare a clickable Android / web quick-launch action card to call a phone number (tel:), send SMS (sms:), message on WhatsApp (https://wa.me/...), search YouTube, Google Maps, Google Web Search, or open a safe https:// URL.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionType: {
          type: Type.STRING,
          description:
            "Type: 'phone_call', 'send_sms', 'whatsapp', 'youtube_search', 'maps_search', 'search_web', or 'open_url'",
        },
        query: {
          type: Type.STRING,
          description: 'Search query, phone number, or target name',
        },
        url: {
          type: Type.STRING,
          description:
            'Valid https://, tel:, sms:, or mailto: URI (e.g., tel:+919876543210, sms:+919876543210?body=Hello, https://wa.me/..., https://www.youtube.com/results?search_query=...)',
        },
        label: {
          type: Type.STRING,
          description: 'Clean button label, e.g. "Call +91 98765 43210" or "Search YouTube"',
        },
      },
      required: ['actionType', 'query', 'url', 'label'],
    },
  },
  {
    name: 'manage_memory',
    description:
      'Save or forget long-term personal facts, preferences, contacts, or custom voice rules about the user so the AI brain remembers them across conversations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Action: 'save' or 'forget'",
        },
        fact: {
          type: Type.STRING,
          description: 'Concise fact or preference to remember or forget',
        },
        category: {
          type: Type.STRING,
          description: "Category: 'preference', 'person', 'routine', or 'general'",
        },
      },
      required: ['action', 'fact'],
    },
  },
  {
    name: 'clear_conversation',
    description: 'Clear the current conversation history when the user explicitly asks to clear or reset the chat.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: 'Must be true' },
      },
      required: ['confirm'],
    },
  },
];

function summarizeAction(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'set_device_setting': {
      const parts: string[] = [];
      if (args.theme !== undefined) parts.push(`Theme: ${args.theme}`);
      if (args.brightness !== undefined) parts.push(`Brightness: ${args.brightness}%`);
      if (args.volume !== undefined) parts.push(`Volume: ${args.volume}%`);
      if (args.muted !== undefined) parts.push(args.muted ? 'Audio muted' : 'Audio unmuted');
      if (args.wifi !== undefined) parts.push(`Wi-Fi ${args.wifi ? 'On' : 'Off'}`);
      if (args.bluetooth !== undefined) parts.push(`Bluetooth ${args.bluetooth ? 'On' : 'Off'}`);
      if (args.focusMode !== undefined) parts.push(`Focus Mode ${args.focusMode ? 'On' : 'Off'}`);
      if (args.flashlight !== undefined) parts.push(`Flashlight ${args.flashlight ? 'On' : 'Off'}`);
      if (args.airplaneMode !== undefined) parts.push(`Airplane Mode ${args.airplaneMode ? 'On' : 'Off'}`);
      return parts.join(' · ') || 'Updated device settings';
    }
    case 'control_smart_home': {
      const parts: string[] = [];
      if (args.lightsOn !== undefined) parts.push(`Lights ${args.lightsOn ? 'On' : 'Off'}`);
      if (args.lightBrightness !== undefined) parts.push(`Lights ${args.lightBrightness}%`);
      if (args.lightTemp !== undefined) parts.push(`Tone: ${args.lightTemp}`);
      if (args.acOn !== undefined) parts.push(`AC ${args.acOn ? 'On' : 'Off'}`);
      if (args.acTemp !== undefined) parts.push(`AC ${args.acTemp}°C`);
      if (args.acMode !== undefined) parts.push(`AC ${args.acMode}`);
      if (args.doorLocked !== undefined) parts.push(args.doorLocked ? 'Door locked' : 'Door unlocked');
      if (args.fanSpeed !== undefined) parts.push(`Fan speed ${args.fanSpeed}`);
      return parts.join(' · ') || 'Updated smart home';
    }
    case 'manage_timer':
      return `Timer (${args.action}): ${args.label || 'Timer'}${
        args.minutes || args.seconds
          ? ` (${args.minutes || 0}m ${args.seconds || 0}s)`
          : ''
      }`;
    case 'manage_alarm':
      return `Alarm (${args.action}): ${args.time || ''} ${args.label || ''}`.trim();
    case 'manage_task':
      return `Task (${args.action}): ${args.title || ''}`.trim();
    case 'manage_note':
      return `Note (${args.action}): ${args.title || ''}`.trim();
    case 'control_ambient_audio':
      return args.action === 'stop'
        ? 'Stopped ambient audio'
        : `Playing ${args.track || 'focus'} soundscape`;
    case 'navigate_workspace':
      return `Opened ${args.tab} workspace`;
    case 'create_draft':
      return `Created ${args.type} draft`;
    case 'calculate_or_convert':
      return `${args.expression} = ${args.result}`;
    case 'open_external_action':
      return `Prepared action: ${args.label}`;
    case 'manage_memory':
      return args.action === 'forget'
        ? `Forgot memory: ${args.fact}`
        : `Remembered: ${args.fact}`;
    case 'clear_conversation':
      return 'Cleared conversation';
    default:
      return name;
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'microphone=(self), camera=(), geolocation=()'
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use('/api', apiRateLimiter);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '17.0', platform: 'android-pwa' });
  });

  app.post('/api/assistant/command', async (req: Request, res: Response) => {
    try {
      const {
        message,
        history = [],
        stateSnapshot,
        language = 'auto',
        deepThinking = false,
      } = req.body as {
        message: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        stateSnapshot?: Record<string, unknown>;
        language?: string;
        deepThinking?: boolean;
      };

      if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }
      if (message.length > 4000) {
        res.status(400).json({ error: 'Command message exceeds maximum length of 4000 characters.' });
        return;
      }
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'assistant') &&
                typeof h.text === 'string'
            )
            .slice(-12)
            .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }))
        : [];

      const ai = getAIClient();

      const langDirective =
        language === 'hi-IN'
          ? 'Respond naturally in conversational Hindi/Hinglish (Devanagari or clean Hinglish matching the user).'
          : language === 'en-IN' || language === 'en-US'
            ? 'Respond clearly in natural English unless the user explicitly speaks Hindi.'
            : "Match the user's language seamlessly: if they speak Hindi or Hinglish (e.g., 'lights band karo', 'aaj ka mausam kaisa hai', 'humse baat karo'), reply warmly in natural Hinglish/Hindi; if they speak English, reply in English.";

      const systemInstruction = `You are Stonic 17, a warm, intelligent, human-like conversational AI voice assistant (similar in spirit to Siri, Folax, and Stonic AI, Version 17).
Your personality: Friendly, perceptive, helpful, crisp, and natural to listen to when spoken aloud.

Core Capabilities:
1. Natural Conversation & AI Brain: You are an intelligent companion who remembers user preferences, understands context, reasons deeply when needed, tells stories/jokes, gives practical advice, and chats naturally ("humse baat kar sake").
2. Long-Term Memory: Whenever the user tells you something worth remembering about themselves (their name, preferences, family/friends, routines, or "yaad rakhna..."), call \`manage_memory\` to save it permanently! Use remembered facts naturally in replies.
3. Full Command Control: Whenever the user asks to control device settings, smart home devices, timers, alarms, tasks/reminders, notes, ambient audio, drafts, calculations, workspace navigation, or Android phone/SMS/WhatsApp/YouTube/Maps actions, IMMEDIATELY invoke the corresponding tool(s)! Combine multiple tools in one turn for compound commands.
4. Real-Time Web Search: For current events, live weather, news, sports scores, or factual lookups, use Google Search grounding automatically.
5. Keep voice-friendly responses concise, warm, and natural to listen to aloud.

Language rule: ${langDirective}

Current live device, memory & workspace state:
${JSON.stringify(stateSnapshot || {}, null, 2)}
Current local server time: ${new Date().toISOString()}`;

      const contents: Content[] = [
        ...safeHistory.map((item) => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.text }],
        })),
        {
          role: 'user',
          parts: [{ text: message.trim() }],
        },
      ];

      const tools = [
        { googleSearch: {} },
        { functionDeclarations: ASSISTANT_TOOLS },
      ];

      const config = {
        systemInstruction,
        tools,
        toolConfig: { includeServerSideToolInvocations: true },
        thinkingConfig: {
          thinkingLevel: deepThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
        },
      };

      const response1 = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config,
      });

      const functionCalls = response1.functionCalls ?? [];
      const executedActions: Array<{
        name: string;
        summary: string;
        args: Record<string, unknown>;
      }> = [];

      let finalResponse = response1;

      if (functionCalls.length > 0 && response1.candidates?.[0]?.content) {
        const responseParts: Part[] = [];

        for (const call of functionCalls) {
          const args = { ...((call.args ?? {}) as Record<string, unknown>) };
          const callName = call.name ?? 'unknown_tool';

          if (callName === 'open_external_action') {
            const safeUrl = sanitizeActionUrl(args.url);
            if (!safeUrl) {
              continue; // Block unsafe schemes like javascript: or data:
            }
            args.url = safeUrl;
          }

          const summary = summarizeAction(callName, args);
          executedActions.push({
            name: callName,
            summary,
            args,
          });

          responseParts.push({
            functionResponse: {
              id: call.id,
              name: callName,
              response: {
                status: 'executed',
                summary,
                appliedArgs: args,
              },
            },
          });
        }

        const followUpContents: Content[] = [
          ...contents,
          response1.candidates[0].content,
          {
            role: 'user',
            parts: responseParts,
          },
        ];

        finalResponse = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: followUpContents,
          config,
        });
      }

      const rawChunks =
        finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ??
        response1.candidates?.[0]?.groundingMetadata?.groundingChunks ??
        [];

      const sources: Array<{ title: string; uri: string }> = [];
      const seenUris = new Set<string>();
      for (const chunk of rawChunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } }).web;
        const safeUri = sanitizeActionUrl(web?.uri);
        if (safeUri && !seenUris.has(safeUri)) {
          seenUris.add(safeUri);
          sources.push({
            title: web?.title || safeUri,
            uri: safeUri,
          });
        }
      }

      const replyText =
        finalResponse.text?.trim() ||
        (executedActions.length > 0
          ? `Done: ${executedActions.map((a) => a.summary).join(', ')}.`
          : 'I processed your request.');

      res.json({
        reply: replyText,
        actions: executedActions,
        sources,
      });
    } catch (error) {
      console.error('Assistant command error:', error);
      const errMsg =
        error instanceof Error ? error.message : 'Failed to process voice command.';
      res.status(500).json({ error: errMsg });
    }
  });

  app.post('/api/voice/speak', async (req: Request, res: Response) => {
    try {
      const {
        text,
        voiceName = 'Kore',
        style = 'Warm, natural, articulate personal AI assistant',
      } = req.body as {
        text: string;
        voiceName?: string;
        style?: string;
      };

      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Kore';

      // Trim extremely long replies for snappy TTS latency
      const cleanText = text
        .replace(/[*_`#>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);

      const ai = getAIClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: typeof style === 'string' ? style.slice(0, 140) : 'Warm personal assistant',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: safeVoice,
              },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'Voice synthesis returned no audio data.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (error) {
      console.error('TTS error:', error);
      const errMsg =
        error instanceof Error ? error.message : 'Failed to synthesize voice.';
      res.status(500).json({ error: errMsg });
    }
  });

  app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType = 'audio/webm', languageHint = 'auto' } =
        req.body as {
          audioBase64: string;
          mimeType?: string;
          languageHint?: string;
        };

      if (typeof audioBase64 !== 'string' || !audioBase64) {
        res.status(400).json({ error: 'Audio payload is required.' });
        return;
      }
      if (audioBase64.length > 8_000_000) {
        res.status(413).json({ error: 'Audio clip too large.' });
        return;
      }

      const normalizedMime = String(mimeType).split(';')[0].trim().toLowerCase();
      const safeMime = ALLOWED_AUDIO_MIMES.has(normalizedMime)
        ? normalizedMime
        : 'audio/webm';

      const ai = getAIClient();

      const prompt =
        languageHint === 'hi-IN'
          ? 'Transcribe this spoken audio accurately. The speaker may be speaking Hindi, Hinglish, or English. Return only the clean transcription text without extra commentary.'
          : 'Transcribe this spoken audio accurately in its original language (English, Hindi, or Hinglish). Return only the clean transcription text without extra commentary.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      });

      const transcript = response.text?.trim() || '';
      res.json({ transcript });
    } catch (error) {
      console.error('Transcribe error:', error);
      const errMsg =
        error instanceof Error ? error.message : 'Failed to transcribe audio.';
      res.status(500).json({ error: errMsg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stonic 17 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
