import {
  Wifi,
  Bluetooth,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Flashlight,
  Plane,
  BellOff,
  Lightbulb,
  Thermometer,
  Lock,
  Unlock,
  Music,
  Timer,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  AmbientTrack,
  DeviceState,
  SmartHomeState,
  TimerItem,
} from '../types/assistant';

interface ControlCenterPanelProps {
  device: DeviceState;
  onUpdateDevice: (patch: Partial<DeviceState>) => void;
  smartHome: SmartHomeState;
  onUpdateSmartHome: (patch: Partial<SmartHomeState>) => void;
  ambientTrack: AmbientTrack;
  onChangeAmbient: (track: AmbientTrack) => void;
  timers: TimerItem[];
  onToggleTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ControlCenterPanel({
  device,
  onUpdateDevice,
  smartHome,
  onUpdateSmartHome,
  ambientTrack,
  onChangeAmbient,
  timers,
  onToggleTimer,
  onResetTimer,
}: ControlCenterPanelProps) {
  const activeTimer = timers.find((t) => t.isRunning) || timers[0];

  const toggles = [
    {
      label: 'Wi-Fi',
      active: device.wifi,
      icon: Wifi,
      onClick: () => onUpdateDevice({ wifi: !device.wifi }),
    },
    {
      label: 'Bluetooth',
      active: device.bluetooth,
      icon: Bluetooth,
      onClick: () => onUpdateDevice({ bluetooth: !device.bluetooth }),
    },
    {
      label: 'Focus',
      active: device.focusMode,
      icon: BellOff,
      onClick: () => onUpdateDevice({ focusMode: !device.focusMode }),
    },
    {
      label: 'Torch',
      active: device.flashlight,
      icon: Flashlight,
      onClick: () => onUpdateDevice({ flashlight: !device.flashlight }),
    },
    {
      label: 'Airplane',
      active: device.airplaneMode,
      icon: Plane,
      onClick: () =>
        onUpdateDevice({
          airplaneMode: !device.airplaneMode,
          wifi: device.airplaneMode ? true : false,
        }),
    },
    {
      label: device.theme === 'dark' ? 'Dark' : 'Light',
      active: device.theme === 'dark',
      icon: device.theme === 'dark' ? Moon : Sun,
      onClick: () =>
        onUpdateDevice({ theme: device.theme === 'dark' ? 'light' : 'dark' }),
    },
  ];

  const tracks: Array<{ id: AmbientTrack; label: string }> = [
    { id: 'none', label: 'Off' },
    { id: 'rain', label: 'Rain' },
    { id: 'lofi', label: 'Lo-Fi' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'focus', label: 'Alpha' },
  ];

  return (
    <aside className="flex flex-col gap-5">
      {/* System Toggles & Sliders */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            System Control
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Live sync
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {toggles.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                  item.active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Brightness
              </span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {device.brightness}%
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={100}
              value={device.brightness}
              onChange={(e) => onUpdateDevice({ brightness: Number(e.target.value) })}
              aria-label="Screen brightness"
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <button
                type="button"
                onClick={() => onUpdateDevice({ muted: !device.muted })}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
              >
                {device.muted ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {device.muted ? 'Muted' : 'Volume'}
              </button>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {device.muted ? '0%' : `${device.volume}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={device.muted ? 0 : device.volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdateDevice({ volume: v, muted: v === 0 });
              }}
              aria-label="Audio volume"
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Smart Room Quick Status */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Room Environment
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Living Room
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between py-2.5 first:pt-0">
            <div className="flex items-center gap-2.5">
              <Lightbulb
                className={`w-4 h-4 ${
                  smartHome.lightsOn
                    ? 'text-amber-500'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              />
              <div>
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Studio Lights
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {smartHome.lightsOn
                    ? `${smartHome.lightBrightness}% · ${smartHome.lightTemp}`
                    : 'Off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSmartHome({ lightsOn: !smartHome.lightsOn })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                smartHome.lightsOn
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {smartHome.lightsOn ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <Thermometer
                className={`w-4 h-4 ${
                  smartHome.acOn
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              />
              <div>
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Climate AC
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {smartHome.acOn
                    ? `${smartHome.acTemp}°C · ${smartHome.acMode}`
                    : 'Standby'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSmartHome({ acOn: !smartHome.acOn })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                smartHome.acOn
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {smartHome.acOn ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2.5 last:pb-0">
            <div className="flex items-center gap-2.5">
              {smartHome.doorLocked ? (
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Main Door
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {smartHome.doorLocked ? 'Secured' : 'Unlocked'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSmartHome({ doorLocked: !smartHome.doorLocked })
              }
              className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {smartHome.doorLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>
      </section>

      {/* Active Timer & Ambient Audio */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-slate-500" /> Active Timer
            </h2>
            {activeTimer && (
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                {activeTimer.label}
              </span>
            )}
          </div>
          {activeTimer ? (
            <div className="flex items-center justify-between">
              <span
                className={`text-2xl font-semibold font-mono tabular-nums ${
                  activeTimer.completed
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatSeconds(activeTimer.remainingSeconds)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleTimer(activeTimer.id)}
                  aria-label={activeTimer.isRunning ? 'Pause timer' : 'Start timer'}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {activeTimer.isRunning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onResetTimer(activeTimer.id)}
                  aria-label="Reset timer"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Say &ldquo;Set a 5 minute timer&rdquo; to begin.
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-slate-500" /> Ambient Audio
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {ambientTrack === 'none' ? 'Silent' : ambientTrack}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => onChangeAmbient(track.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  ambientTrack === track.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {track.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
