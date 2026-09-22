import React, { useState } from 'react';
import { BookOpen, Plus, Clock, Check, X, Calendar } from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';

interface LogEntry {
  id: string;
  date: string;
  title: string;
  minutes: number;
  pages: number;
  notes: string;
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: '1',
    date: '2026-09-21',
    title: "Charlotte's Web",
    minutes: 25,
    pages: 8,
    notes: 'Read aloud together — great fluency!'
  },
  {
    id: '2',
    date: '2026-09-20',
    title: 'National Geographic Kids',
    minutes: 15,
    pages: 4,
    notes: 'Loved the animal facts section.'
  },
  { id: '3', date: '2026-09-18', title: 'Harry Potter Ch. 5', minutes: 30, pages: 10, notes: '' }
];

export const ParentReadingLogView: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    minutes: '',
    pages: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const totalMinutes = logs.reduce((a, l) => a + l.minutes, 0);
  const totalPages = logs.reduce((a, l) => a + l.pages, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate save
    setLogs((prev) => [
      {
        id: String(Date.now()),
        date: form.date,
        title: form.title,
        minutes: parseInt(form.minutes) || 0,
        pages: parseInt(form.pages) || 0,
        notes: form.notes
      },
      ...prev
    ]);
    setForm({
      date: new Date().toISOString().split('T')[0],
      title: '',
      minutes: '',
      pages: '',
      notes: ''
    });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={28} className="text-secondary" /> Home Reading Log
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            {totalMinutes} min · {totalPages} pages logged this month
          </p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus size={18} />}
          onClick={() => setShowForm(!showForm)}
        >
          Log Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Minutes',
            value: String(totalMinutes),
            icon: <Clock size={16} className="text-primary" />
          },
          {
            label: 'Pages Read',
            value: String(totalPages),
            icon: <BookOpen size={16} className="text-secondary" />
          },
          {
            label: 'Sessions',
            value: String(logs.length),
            icon: <Calendar size={16} className="text-tertiary" />
          }
        ].map((s) => (
          <Card key={s.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-1.5 mb-1">
              {s.icon}
              <span className="text-xs text-text-muted">{s.label}</span>
            </div>
            <p className="text-display-lg-mobile font-bold text-text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <Card variant="highlight" padding="lg" className="border-2 border-secondary/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-sm font-bold text-text-primary">Log a Reading Session</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 rounded-xl hover:bg-surface-low transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-sm font-semibold text-text-primary mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-label-sm font-semibold text-text-primary mb-1">
                  Book / Material Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Charlotte's Web"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-label-sm font-semibold text-text-primary mb-1">
                  Minutes Read
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="25"
                  value={form.minutes}
                  onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-label-sm font-semibold text-text-primary mb-1">
                  Pages Read
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="8"
                  value={form.pages}
                  onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-label-sm font-semibold text-text-primary mb-1">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="How did it go? Any observations?"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={saving}
                iconLeft={<Check size={16} />}
              >
                Save Entry
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Log List */}
      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id} variant="default" padding="sm">
            <div className="flex items-start gap-4 p-1">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold text-text-primary">{log.title}</p>
                  <span className="text-xs text-text-muted">{log.date}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{log.minutes} min</Badge>
                  {log.pages > 0 && <Badge variant="tertiary">{log.pages} pages</Badge>}
                </div>
                {log.notes && (
                  <p className="text-xs text-text-muted mt-1.5 italic">"{log.notes}"</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
