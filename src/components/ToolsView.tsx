import { useState } from 'react';
import { Calculator, Copy, Check, FileText, ArrowRightLeft, Brain, Trash2 } from 'lucide-react';
import { DraftItem, MemoryItem } from '../types/assistant';

interface ToolsViewProps {
  drafts: DraftItem[];
  onDeleteDraft: (id: string) => void;
  memories: MemoryItem[];
  onDeleteMemory: (id: string) => void;
  onRunCommand: (prompt: string) => void;
}

export function ToolsView({
  drafts,
  onDeleteDraft,
  memories,
  onDeleteMemory,
  onRunCommand,
}: ToolsViewProps) {
  const [expr, setExpr] = useState('14500 * 1.18');
  const [calcOutput, setCalcOutput] = useState('17,110');
  const [convVal, setConvVal] = useState('10');
  const [convType, setConvType] = useState<'km_mi' | 'c_f' | 'kg_lb' | 'inr_usd'>('km_mi');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const evaluateMath = (input: string) => {
    try {
      const sanitized = input.replace(/[^0-9+\-*/().%\s]/g, '');
      if (!sanitized.trim()) {
        setCalcOutput('Invalid expression');
        return;
      }
      const fn = new Function(`return (${sanitized});`);
      const res = fn();
      if (typeof res === 'number' && Number.isFinite(res)) {
        setCalcOutput(res.toLocaleString(undefined, { maximumFractionDigits: 4 }));
      } else {
        setCalcOutput('Error');
      }
    } catch {
      setCalcOutput('Syntax error');
    }
  };

  const numVal = parseFloat(convVal) || 0;
  const convertedText = (() => {
    switch (convType) {
      case 'km_mi':
        return `${numVal} km = ${(numVal * 0.621371).toFixed(2)} miles`;
      case 'c_f':
        return `${numVal}°C = ${((numVal * 9) / 5 + 32).toFixed(1)}°F`;
      case 'kg_lb':
        return `${numVal} kg = ${(numVal * 2.20462).toFixed(2)} lbs`;
      case 'inr_usd':
        return `₹${numVal.toLocaleString()} ≈ $${(numVal / 84.5).toFixed(2)} USD`;
    }
  })();

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          AI Brain Memory, Drafts & Utilities
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Manage long-term AI memory facts, voice-generated drafts, and instant calculators.
        </p>
      </div>

      {/* Persistent AI Brain Memory */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              AI Brain Memory Bank
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tell Stonic 17 things to remember (e.g. &ldquo;Yaad rakhna mujhe 22°C AC pasand hai&rdquo;) and it recalls them automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onRunCommand(
                'Remember that my preferred evening AC temperature is 23 degrees eco mode and I like concise Hinglish replies.'
              )
            }
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Save Sample Memory
          </button>
        </div>

        {memories.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            No saved memories yet. Share your name, preferences, or routines in voice chat.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {mem.fact}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                    {mem.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  aria-label="Forget memory"
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quick Calculator */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Expression Calculator
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              evaluateMath(expr);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={expr}
              onChange={(e) => {
                setExpr(e.target.value);
                evaluateMath(e.target.value);
              }}
              placeholder="e.g. (4500 * 0.18) + 4500"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap"
            >
              Compute
            </button>
          </form>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Result</span>
            <span className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {calcOutput}
            </span>
          </div>
        </section>

        {/* Unit Converter */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Unit & Currency Converter
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={convVal}
              onChange={(e) => setConvVal(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <select
              value={convType}
              onChange={(e) =>
                setConvType(e.target.value as 'km_mi' | 'c_f' | 'kg_lb' | 'inr_usd')
              }
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="km_mi">Kilometers → Miles</option>
              <option value="c_f">Celsius → Fahrenheit</option>
              <option value="kg_lb">Kilograms → Pounds</option>
              <option value="inr_usd">INR (₹) → USD ($ est.)</option>
            </select>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <p className="text-base font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {convertedText}
            </p>
          </div>
        </section>
      </div>

      {/* Saved Voice Drafts */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              AI Drafts Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ask Stonic 17 to draft an email, WhatsApp reply, summary, or Hindi/English translation.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onRunCommand(
                'Draft a crisp follow-up WhatsApp message to my client thanking them for today’s demo and sharing next steps.'
              )
            }
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Generate Sample Draft
          </button>
        </div>

        {drafts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            No drafts yet. Try saying &ldquo;Draft an email to my team about Friday&apos;s launch&rdquo;.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {drafts.map((draft) => (
              <div key={draft.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {draft.type}
                    </span>
                    {draft.recipient ? ` · To: ${draft.recipient}` : ''}
                    {draft.subject ? ` · ${draft.subject}` : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(draft.id, draft.body)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      {copiedId === draft.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {draft.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
