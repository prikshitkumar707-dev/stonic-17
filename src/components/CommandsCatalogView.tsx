import { useState } from 'react';
import {
  MessageSquare,
  Sliders,
  Home,
  CheckSquare,
  Globe,
  FileText,
  Music,
  ArrowUpRight,
} from 'lucide-react';

interface CommandsCatalogViewProps {
  onRunCommand: (commandText: string) => void;
}

interface CommandCategory {
  id: string;
  title: string;
  description: string;
  icon: typeof MessageSquare;
  commands: Array<{ label: string; prompt: string; hint: string }>;
}

const CATEGORIES: CommandCategory[] = [
  {
    id: 'conversation',
    title: 'Friendly Talk & Hinglish Chat',
    description: 'Natural conversations in Hindi, Hinglish, or English',
    icon: MessageSquare,
    commands: [
      {
        label: 'Talk with me in Hinglish',
        prompt: 'Hey Stonic, aaj mera mood thoda off hai, humse thodi friendly baat karo aur ek accha joke sunao.',
        hint: 'Conversational',
      },
      {
        label: 'Morning motivation',
        prompt: 'Give me a short, energizing morning briefing and one practical focus tip for today.',
        hint: 'Daily Brief',
      },
      {
        label: 'Explain quantum computing simply',
        prompt: 'Explain quantum computing in simple everyday Hindi-English words like you are talking to a friend.',
        hint: 'Tutor',
      },
      {
        label: 'Practice English interview',
        prompt: 'Let us do a quick mock interview. Ask me one behavioral question and wait for my reply.',
        hint: 'Roleplay',
      },
    ],
  },
  {
    id: 'system',
    title: 'Device & System Control',
    description: 'Instant control over display, sound, focus, and connectivity',
    icon: Sliders,
    commands: [
      {
        label: 'Switch to Dark Mode',
        prompt: 'Dark mode on karo aur screen brightness 75% par set karo.',
        hint: 'Theme + Brightness',
      },
      {
        label: 'Switch to Light Mode',
        prompt: 'Switch to light mode and set screen brightness to 100%.',
        hint: 'Theme + Brightness',
      },
      {
        label: 'Enable Focus Mode',
        prompt: 'Turn on Focus mode, mute notifications audio, and play alpha focus soundscape.',
        hint: 'Deep Work',
      },
      {
        label: 'Flashlight On',
        prompt: 'Turn on the flashlight and set volume to 80%.',
        hint: 'Hardware Sim',
      },
    ],
  },
  {
    id: 'smarthome',
    title: 'Smart Home Automation',
    description: 'Control room lighting, AC thermostat, fan, and security locks',
    icon: Home,
    commands: [
      {
        label: 'Cozy Evening Scene',
        prompt: 'Living room lights warm tone par 35% dim karo, AC 24 degree eco mode par chalao, aur main door lock karo.',
        hint: 'Multi-action',
      },
      {
        label: 'Bright Work Scene',
        prompt: 'Turn on lights to 100% daylight, set AC to 22 degrees cool mode, and fan speed 2.',
        hint: 'Multi-action',
      },
      {
        label: 'Goodnight Routine',
        prompt: 'Goodnight! Turn off all room lights, lock the front door, set an alarm for 07:00 labeled Wake Up, and play rain sounds.',
        hint: 'Routine',
      },
      {
        label: 'Turn off AC & Lights',
        prompt: 'AC aur lights dono band kar do.',
        hint: 'Power Save',
      },
    ],
  },
  {
    id: 'productivity',
    title: 'Tasks, Notes, Timers & Alarms',
    description: 'Organize reminders, capture spoken notes, and run timers',
    icon: CheckSquare,
    commands: [
      {
        label: 'Start 5-Min Tea Timer',
        prompt: '5 minute ka timer lagao Tea ke naam se.',
        hint: 'Timer',
      },
      {
        label: 'Add High-Priority Reminder',
        prompt: 'Remind me to review the project proposal at 6:00 PM with high priority.',
        hint: 'Task',
      },
      {
        label: 'Save Quick Voice Note',
        prompt: 'Take a note titled Weekend Plan: Buy groceries, service the bike, and call Mom.',
        hint: 'Note',
      },
      {
        label: 'Set Morning Alarm',
        prompt: 'Subah 6:30 baje ka alarm set karo Gym ke liye.',
        hint: 'Alarm',
      },
    ],
  },
  {
    id: 'web',
    title: 'Android Intents & Live Web',
    description: 'Calls, SMS, WhatsApp, YouTube, Maps, and real-time search',
    icon: Globe,
    commands: [
      {
        label: 'Call a Number (Android Dialer)',
        prompt: 'Prepare a phone call action to +91 9876543210.',
        hint: 'Android Call',
      },
      {
        label: 'Send WhatsApp Message',
        prompt: 'Prepare a WhatsApp message to +91 9876543210 saying Hi, reaching in 10 minutes.',
        hint: 'WhatsApp',
      },
      {
        label: 'Latest Tech News',
        prompt: 'What are the biggest AI and technology news headlines today?',
        hint: 'Web Search',
      },
      {
        label: 'Delhi Weather Update',
        prompt: 'Aaj Delhi ka mausam kaisa hai aur temperature kitna hai?',
        hint: 'Weather',
      },
      {
        label: 'Search YouTube Music',
        prompt: 'YouTube par Arijit Singh lofi songs search karne ka action banao.',
        hint: 'Quick Launch',
      },
      {
        label: 'Find Nearby Coffee',
        prompt: 'Prepare a Google Maps search for top-rated cafes near Connaught Place New Delhi.',
        hint: 'Maps Action',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Drafting, Math & Audio',
    description: 'Compose emails/messages, calculate GST/percentages, play soundscapes',
    icon: FileText,
    commands: [
      {
        label: 'Draft Leave Email',
        prompt: 'Draft a polite email to my manager Rajesh requesting 1 day sick leave tomorrow.',
        hint: 'Email Draft',
      },
      {
        label: 'Translate to Hindi',
        prompt: 'Create a translation draft in natural Hindi for: Please share the final presentation slides before 4 PM.',
        hint: 'Translate',
      },
      {
        label: 'Calculate 18% GST',
        prompt: 'Calculate 18% GST on 14,500 rupees and tell me the final total.',
        hint: 'Calculator',
      },
      {
        label: 'Play Lo-Fi Music',
        prompt: 'Lo-Fi ambient music chalao aur volume 65% rakho.',
        hint: 'Audio',
      },
    ],
  },
];

export function CommandsCatalogView({ onRunCommand }: CommandsCatalogViewProps) {
  const [filter, setFilter] = useState<string>('all');

  const visible =
    filter === 'all'
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.id === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Voice Command Directory
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Speak any command naturally in English, Hindi, or Hinglish, or click a card to execute immediately.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === cat.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visible.map((category) => {
          const Icon = category.icon;
          return (
            <section
              key={category.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {category.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {category.description}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {category.commands.map((cmd) => (
                  <button
                    key={cmd.label}
                    type="button"
                    onClick={() => onRunCommand(cmd.prompt)}
                    className="w-full text-left py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <span className="truncate">{cmd.label}</span>
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500 shrink-0">
                          · {cmd.hint}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        &ldquo;{cmd.prompt}&rdquo;
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Music className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Compound Multi-Commands Supported
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Combine multiple actions in one sentence — e.g. &ldquo;Lights 40% karo, 10 min timer lagao, aur rain sound chalao.&rdquo;
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onRunCommand(
              'Lights 40% warm tone par set karo, 10 minute ka timer lagao Study ke liye, aur rain ambient sound chalao.'
            )
          }
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
        >
          Try Multi-Command
        </button>
      </section>
    </div>
  );
}
