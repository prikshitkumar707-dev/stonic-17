import {
  Lightbulb,
  Thermometer,
  Lock,
  Unlock,
  Fan,
  Music,
  Minus,
  Plus,
} from 'lucide-react';
import { AmbientTrack, SmartHomeState } from '../types/assistant';

interface SmartHomeViewProps {
  smartHome: SmartHomeState;
  onUpdateSmartHome: (patch: Partial<SmartHomeState>) => void;
  ambientTrack: AmbientTrack;
  onChangeAmbient: (track: AmbientTrack) => void;
  onRunCommand: (prompt: string) => void;
}

export function SmartHomeView({
  smartHome,
  onUpdateSmartHome,
  ambientTrack,
  onChangeAmbient,
  onRunCommand,
}: SmartHomeViewProps) {
  const lightTemps: Array<{ id: SmartHomeState['lightTemp']; label: string }> = [
    { id: 'warm', label: 'Warm 2700K' },
    { id: 'daylight', label: 'Daylight 4500K' },
    { id: 'cool', label: 'Cool 6500K' },
  ];

  const acModes: Array<{ id: SmartHomeState['acMode']; label: string }> = [
    { id: 'cool', label: 'Cool' },
    { id: 'eco', label: 'Eco' },
    { id: 'fan', label: 'Fan Only' },
  ];

  const ambientTracks: Array<{ id: AmbientTrack; label: string; detail: string }> = [
    { id: 'none', label: 'Silent', detail: 'Audio off' },
    { id: 'rain', label: 'Monsoon Rain', detail: 'Soft filtered rainfall' },
    { id: 'lofi', label: 'Lo-Fi Chords', detail: 'Warm electric piano pulse' },
    { id: 'ocean', label: 'Ocean Surf', detail: 'Slow tidal wave swell' },
    { id: 'focus', label: 'Alpha Focus', detail: 'Harmonic concentration tone' },
    { id: 'whitenoise', label: 'White Noise', detail: 'Steady acoustic mask' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Smart Home & Room Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Every slider and toggle below syncs live with Stonic 17 voice commands.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onRunCommand(
                'Activate Focus Scene: set lights to 80% daylight, AC to 23 degrees eco mode, and play alpha focus audio.'
              )
            }
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Focus Scene
          </button>
          <button
            type="button"
            onClick={() =>
              onRunCommand(
                'Activate Movie Night: dim lights to 20% warm, lock the front door, and turn AC to 22 degrees.'
              )
            }
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Movie Scene
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lighting Control */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  smartHome.lightsOn
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Studio Lighting
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {smartHome.lightsOn
                    ? `${smartHome.lightBrightness}% · ${smartHome.lightTemp}`
                    : 'Powered off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSmartHome({ lightsOn: !smartHome.lightsOn })}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                smartHome.lightsOn
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {smartHome.lightsOn ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-600 dark:text-slate-400">Dimmer Level</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {smartHome.lightBrightness}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={smartHome.lightBrightness}
              onChange={(e) =>
                onUpdateSmartHome({
                  lightBrightness: Number(e.target.value),
                  lightsOn: true,
                })
              }
              aria-label="Light brightness"
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Color Temperature
            </p>
            <div className="grid grid-cols-3 gap-2">
              {lightTemps.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onUpdateSmartHome({ lightTemp: t.id, lightsOn: true })}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                    smartHome.lightTemp === t.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Climate & Thermostat */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  smartHome.acOn
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Climate Thermostat
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {smartHome.acOn ? `Active · ${smartHome.acMode} mode` : 'Standby'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSmartHome({ acOn: !smartHome.acOn })}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                smartHome.acOn
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {smartHome.acOn ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                onUpdateSmartHome({
                  acTemp: Math.max(16, smartHome.acTemp - 1),
                  acOn: true,
                })
              }
              aria-label="Decrease temperature"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-3xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {smartHome.acTemp}°C
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Setpoint
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSmartHome({
                  acTemp: Math.min(30, smartHome.acTemp + 1),
                  acOn: true,
                })
              }
              aria-label="Increase temperature"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {acModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onUpdateSmartHome({ acMode: m.id, acOn: true })}
                className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                  smartHome.acMode === m.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        {/* Security & Fan */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Security & Airflow
          </h2>

          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {smartHome.doorLocked ? (
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Unlock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Front Smart Lock
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {smartHome.doorLocked ? 'Deadbolt engaged' : 'Door unlocked'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSmartHome({ doorLocked: !smartHome.doorLocked })
              }
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                smartHome.doorLocked
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {smartHome.doorLocked ? 'Locked' : 'Unlocked'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Fan className="w-4 h-4 text-slate-500" /> Ceiling Fan Speed
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Level {smartHome.fanSpeed}/3
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onUpdateSmartHome({ fanSpeed: spd })}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    smartHome.fanSpeed === spd
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {spd === 0 ? 'Off' : `Speed ${spd}`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Ambient Audio Synthesizer */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Music className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Ambient Sound Studio
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time synthesized soundscapes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ambientTracks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeAmbient(t.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  ambientTrack === t.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <p className="text-xs font-semibold">{t.label}</p>
                <p
                  className={`text-xs mt-0.5 ${
                    ambientTrack === t.id
                      ? 'text-blue-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t.detail}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
