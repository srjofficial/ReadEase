import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Activity, Users, BookOpen, AlertCircle } from 'lucide-react';
import { Card, Badge } from '../../components/ui';

interface AnalyticsDay {
  _id: string;
  avgWpm: number;
  sessions: number;
  avgAccuracy: number;
}

import { getStoredToken } from '../../utils/auth';

const API_BASE = '/api/v1';

// Simple CSS bar chart — no external lib
function BarChart({ data }: { data: AnalyticsDay[] }) {
  if (!data.length)
    return <div className="text-center py-8 text-text-muted text-sm">No data for this period.</div>;
  const maxWpm = Math.max(...data.map((d) => d.avgWpm), 1);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d) => (
        <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-primary rounded-t-md transition-all duration-700 hover:bg-primary-container"
            style={{ height: `${Math.max(4, (d.avgWpm / maxWpm) * 100)}%` }}
          />
          <span className="text-[10px] text-text-muted hidden group-hover:block absolute -top-5 left-1/2 -translate-x-1/2 bg-surface-low px-1 rounded text-nowrap">
            {Math.round(d.avgWpm)} WPM
          </span>
          <span className="text-[10px] text-text-muted hidden sm:block">{d._id.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export const TeacherAnalyticsView: React.FC = () => {
  const [data, setData] = useState<{
    analytics: AnalyticsDay[];
    topStudents: Array<{ _id: string; avgWpm: number; sessions: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    const token = getStoredToken();
    fetch(`${API_BASE}/teacher/analytics?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.message || 'Failed to load analytics');
      })
      .catch(() => setError('Could not reach server'))
      .finally(() => setLoading(false));
  }, [days]);

  const totalSessions = data?.analytics.reduce((acc, d) => acc + d.sessions, 0) ?? 0;
  const overallAvgWpm = data?.analytics.length
    ? Math.round(data.analytics.reduce((acc, d) => acc + d.avgWpm, 0) / data.analytics.length)
    : 0;
  const overallAccuracy = data?.analytics.length
    ? Math.round(
        data.analytics.reduce((acc, d) => acc + (d.avgAccuracy || 0), 0) / data.analytics.length
      )
    : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-2">
            <BarChart2 size={28} className="text-primary" /> Reading Analytics
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Class fluency trends and cohort performance
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                days === d
                  ? 'bg-primary text-white border-primary shadow-soft'
                  : 'bg-surface-lowest text-text-secondary border-surface-border hover:bg-surface-low'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Sessions',
            value: loading ? '—' : String(totalSessions),
            icon: <Activity size={18} className="text-tertiary" />
          },
          {
            label: 'Avg. Class WPM',
            value: loading ? '—' : String(overallAvgWpm),
            icon: <TrendingUp size={18} className="text-primary" />
          },
          {
            label: 'Avg. Accuracy',
            value: loading ? '—' : `${overallAccuracy}%`,
            icon: <BookOpen size={18} className="text-secondary" />
          }
        ].map((s) => (
          <Card key={s.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-2 mb-1">
              {s.icon}
              <span className="text-xs font-semibold text-text-muted">{s.label}</span>
            </div>
            <p className="text-display-lg-mobile font-bold text-text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* WPM Bar Chart */}
      <Card variant="default" padding="lg">
        <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" /> Daily Average WPM
        </h2>
        {loading ? (
          <div className="h-32 bg-surface-low rounded-xl animate-pulse" />
        ) : (
          <BarChart data={data?.analytics ?? []} />
        )}
      </Card>

      {/* Top Students */}
      <Card variant="default" padding="lg">
        <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
          <Users size={20} className="text-primary" /> Top Performing Students
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-low rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.topStudents?.length ? (
          <div className="space-y-3">
            {data.topStudents.map((s, i) => (
              <div key={s._id} className="flex items-center gap-4 p-3 bg-surface-low rounded-xl">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-secondary text-primary-dark' : 'bg-surface-border text-text-muted'}`}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="w-full bg-surface-border rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (s.avgWpm / 200) * 100)}%` }}
                    />
                  </div>
                </div>
                <Badge variant="primary">{Math.round(s.avgWpm)} WPM</Badge>
                <span className="text-xs text-text-muted">{s.sessions} sessions</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm py-6 text-center">
            No session data for this period.
          </p>
        )}
      </Card>
    </div>
  );
};
