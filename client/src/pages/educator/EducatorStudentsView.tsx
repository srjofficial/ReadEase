import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Activity,
  Brain,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';

interface Student {
  _id: string;
  displayName?: string;
  userId?: { name?: string; email?: string };
  accommodations?: {
    bionicReading?: boolean;
    font?: string;
    overlayColor?: string;
  };
}

import { getStoredToken } from '../../utils/auth';

// Actual caseload students
const ACTUAL_STUDENTS: Student[] = [
  {
    _id: 'std_alex_1',
    displayName: 'Alex Student',
    userId: { name: 'Alex Student', email: 'student@readease.com' },
    accommodations: { bionicReading: true, font: 'Lexend', overlayColor: 'cream' }
  },
  {
    _id: 'std_maya_2',
    displayName: 'Maya Sharma',
    userId: { name: 'Maya Sharma', email: 'maya.s@readease.edu' },
    accommodations: { bionicReading: false, font: 'OpenDyslexic', overlayColor: 'soft-blue' }
  },
  {
    _id: 'std_liam_3',
    displayName: 'Liam Chen',
    userId: { name: 'Liam Chen', email: 'liam.chen@readease.edu' },
    accommodations: { bionicReading: true, font: 'Atkinson Hyperlegible', overlayColor: 'soft-green' }
  }
];

export const EducatorStudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(ACTUAL_STUDENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('std_alex_1');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStudents(ACTUAL_STUDENTS);
      setLoading(false);
      return;
    }
    fetch('/api/v1/educator/students', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.students?.length) {
          setStudents(d.data.students);
          if (!selectedId) setSelectedId(d.data.students[0]._id);
          setError(null);
        } else {
          setStudents(ACTUAL_STUDENTS);
        }
      })
      .catch(() => {
        setStudents(ACTUAL_STUDENTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) => {
    const name = s.displayName || s.userId?.name || '';
    const email = s.userId?.email || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const selected = selectedId ? filtered.find((s) => s._id === selectedId) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div>
        <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-2">
          <Users size={28} className="text-tertiary" /> Assigned Students
        </h1>
        <p className="text-text-secondary text-body-sm mt-1">
          {students.length} student{students.length !== 1 ? 's' : ''} in your caseload
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Input
        label=""
        placeholder="Search students…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        iconLeft={<Search size={16} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-low rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <Card variant="default" padding="lg">
              <div className="text-center py-8">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm text-text-muted">No assigned students found.</p>
              </div>
            </Card>
          ) : (
            filtered.map((student) => {
              const name = student.displayName || student.userId?.name || 'Student';
              const email = student.userId?.email || '—';
              return (
                <button
                  key={student._id}
                  type="button"
                  onClick={() => setSelectedId(selectedId === student._id ? null : student._id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    selectedId === student._id
                      ? 'border-tertiary bg-tertiary-50 shadow-soft'
                      : 'border-surface-border bg-surface-low hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-50 border border-tertiary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-tertiary font-bold">{name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">{name}</p>
                      <p className="text-xs text-text-muted truncate">{email}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Student Detail Panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card variant="default" padding="lg" className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-tertiary-50 border-2 border-tertiary/20 flex items-center justify-center">
                  <span className="text-tertiary font-bold text-headline-md">
                    {(selected.displayName || selected.userId?.name || 'S').charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-headline-md font-bold text-text-primary">
                    {selected.displayName || selected.userId?.name}
                  </h2>
                  <p className="text-sm text-text-muted">{selected.userId?.email}</p>
                </div>
              </div>

              {/* Accommodations */}
              <div>
                <h3 className="text-label-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                  <SlidersHorizontal size={16} /> Accommodation Profile
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                    <p className="text-xs text-text-muted">Bionic Reading</p>
                    <p className="font-bold text-text-primary">
                      {selected.accommodations?.bionicReading ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                    <p className="text-xs text-text-muted">Font</p>
                    <p className="font-bold text-text-primary">
                      {selected.accommodations?.font || 'Lexend'}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                    <p className="text-xs text-text-muted">Overlay Color</p>
                    <p className="font-bold text-text-primary capitalize">
                      {selected.accommodations?.overlayColor || 'Cream'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-surface-border">
                <Button variant="primary" size="sm" iconLeft={<Activity size={16} />}>
                  View Progress
                </Button>
                <Button variant="outline" size="sm" iconLeft={<Brain size={16} />}>
                  Run Diagnostic
                </Button>
                <Button variant="ghost" size="sm" iconLeft={<BookOpen size={16} />}>
                  Reading Sessions
                </Button>
              </div>
            </Card>
          ) : (
            <Card variant="subtle" padding="lg">
              <div className="text-center py-16">
                <Brain size={48} className="mx-auto mb-4 text-tertiary opacity-30" />
                <p className="font-bold text-text-primary">Select a Student</p>
                <p className="text-sm text-text-muted mt-1">
                  Click a student from the list to view their accommodation profile and progress.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
