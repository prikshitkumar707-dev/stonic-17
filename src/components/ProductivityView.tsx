import { useState } from 'react';
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Pin,
  Timer,
  AlarmClock,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  AlarmItem,
  NoteItem,
  TaskItem,
  TimerItem,
} from '../types/assistant';

interface ProductivityViewProps {
  tasks: TaskItem[];
  onAddTask: (title: string, dueTime?: string, priority?: 'normal' | 'high') => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  notes: NoteItem[];
  onAddNote: (title: string, content: string) => void;
  onTogglePinNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  timers: TimerItem[];
  onAddTimer: (label: string, minutes: number) => void;
  onToggleTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
  onDeleteTimer: (id: string) => void;
  alarms: AlarmItem[];
  onAddAlarm: (time: string, label: string) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ProductivityView({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  notes,
  onAddNote,
  onTogglePinNote,
  onDeleteNote,
  timers,
  onAddTimer,
  onToggleTimer,
  onResetTimer,
  onDeleteTimer,
  alarms,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
}: ProductivityViewProps) {
  const [newTask, setNewTask] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [timerLabel, setTimerLabel] = useState('Focus Session');
  const [timerMins, setTimerMins] = useState(5);
  const [alarmTime, setAlarmTime] = useState('07:30');
  const [alarmLabel, setAlarmLabel] = useState('Morning Alarm');

  const sortedNotes = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Tasks, Notes, Timers & Alarms
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Manage everything manually here or by speaking commands to Stonic 17.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tasks & Reminders */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Tasks & Reminders
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {tasks.filter((t) => !t.completed).length} pending
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTask.trim()) return;
              onAddTask(newTask.trim());
              setNewTask('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a reminder or task..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No tasks yet. Say &ldquo;Remind me to call Aman at 5 PM&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      {(task.dueTime || task.priority === 'high') && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {task.dueTime ? `Due ${task.dueTime}` : ''}
                          {task.dueTime && task.priority === 'high' ? ' · ' : ''}
                          {task.priority === 'high' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              High priority
                            </span>
                          ) : null}
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    aria-label="Delete task"
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Voice Notes */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Voice Notes
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {notes.length} saved
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNoteTitle.trim() && !newNoteBody.trim()) return;
              onAddNote(
                newNoteTitle.trim() || 'Quick Note',
                newNoteBody.trim() || newNoteTitle.trim()
              );
              setNewNoteTitle('');
              setNewNoteBody('');
            }}
            className="space-y-2"
          >
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                placeholder="Write note details..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>

          {sortedNotes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No notes yet. Say &ldquo;Take a note about tomorrow&apos;s meeting&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedNotes.map((note) => (
                <div key={note.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {note.title}
                      </h3>
                      {note.pinned && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePinNote(note.id)}
                      aria-label="Pin note"
                      className={`p-1.5 ${
                        note.pinned
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      aria-label="Delete note"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timers */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Countdown Timers
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (timerMins <= 0) return;
              onAddTimer(timerLabel.trim() || 'Timer', timerMins);
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={timerLabel}
              onChange={(e) => setTimerLabel(e.target.value)}
              placeholder="Label"
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              min={1}
              max={180}
              value={timerMins}
              onChange={(e) => setTimerMins(Number(e.target.value))}
              aria-label="Minutes"
              className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              Start Timer
            </button>
          </form>

          {timers.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No active timers.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {timers.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t.label}
                    </p>
                    <p
                      className={`text-xl font-semibold font-mono tabular-nums ${
                        t.completed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatTime(t.remainingSeconds)}
                      {t.completed ? ' · Done' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleTimer(t.id)}
                      aria-label={t.isRunning ? 'Pause' : 'Resume'}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      {t.isRunning ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetTimer(t.id)}
                      aria-label="Reset"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTimer(t.id)}
                      aria-label="Delete"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Alarms */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlarmClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Alarms
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!alarmTime) return;
              onAddAlarm(alarmTime, alarmLabel.trim() || 'Alarm');
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={alarmLabel}
              onChange={(e) => setAlarmLabel(e.target.value)}
              placeholder="Alarm label"
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              Add Alarm
            </button>
          </form>

          {alarms.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No alarms set. Say &ldquo;Set an alarm for 6:30 AM&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {alarm.time}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {alarm.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleAlarm(alarm.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        alarm.enabled
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {alarm.enabled ? 'Enabled' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAlarm(alarm.id)}
                      aria-label="Delete alarm"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
