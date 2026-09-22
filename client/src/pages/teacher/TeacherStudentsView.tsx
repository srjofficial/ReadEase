import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  X,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../../components/ui';

interface Student {
  _id: string;
  displayName?: string;
  grade?: string;
  userId?: { name?: string; email?: string; createdAt?: string };
}

import { getStoredToken } from '../../utils/auth';

const API_BASE = '/api/v1';

function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = () => {
    setLoading(true);
    const token = getStoredToken();
    fetch(`${API_BASE}/teacher/students`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.data.students || []);
        else setError(d.message || 'Failed to load');
      })
      .catch(() => setError('Could not reach server'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStudents, []);
  return { students, loading, error, refresh: fetchStudents };
}

export const TeacherStudentsView: React.FC = () => {
  const { students, loading, error, refresh } = useStudents();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addGrade, setAddGrade] = useState('Standard');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Custom remove student modal state
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (studentToRemove && !isRemoving) setStudentToRemove(null);
        if (showAddModal && !addLoading) setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studentToRemove, isRemoving, showAddModal, addLoading]);

  const filtered = students.filter((s) => {
    const name = s.displayName || s.userId?.name || '';
    const email = s.userId?.email || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleAddStudent = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/teacher/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: addEmail.trim(), grade: addGrade })
      });
      const data = await res.json();
      if (data.success) {
        setAddSuccess(data.message || 'Student added successfully!');
        setAddEmail('');
        refresh();
        setTimeout(() => {
          setShowAddModal(false);
          setAddSuccess('');
        }, 1200);
      } else {
        const errorMsg = data.message || data.error?.message || 'Failed to add student';
        setAddError(errorMsg);
      }
    } catch {
      setAddError('Network error. Try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const confirmRemoveStudent = async () => {
    if (!studentToRemove) return;
    setIsRemoving(true);
    setRemoveError('');
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/teacher/students/${studentToRemove.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        refresh();
        setStudentToRemove(null);
      } else {
        setRemoveError(data?.message || data?.error?.message || 'Failed to remove student');
      }
    } catch {
      setRemoveError('Network connection error. Try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-2">
            <Users size={28} className="text-primary" /> Class Roster
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Student
        </Button>
      </div>

      {/* Search */}
      <Input
        label=""
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        iconLeft={<Search size={16} />}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Student List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface-low rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="default" padding="lg">
          <div className="text-center py-12">
            <Users size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
            <p className="font-bold text-text-primary text-headline-sm">
              {search ? 'No students match your search' : 'No students yet'}
            </p>
            <p className="text-text-secondary text-sm mt-1">
              {search
                ? 'Try a different search term'
                : 'Add students by their email address to get started.'}
            </p>
            {!search && (
              <Button
                variant="primary"
                className="mt-4"
                iconLeft={<Plus size={16} />}
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Student
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const name = student.displayName || student.userId?.name || 'Student';
            const email = student.userId?.email || '—';
            const joined = student.userId?.createdAt
              ? new Date(student.userId.createdAt).toLocaleDateString()
              : '—';
            return (
              <Card key={student._id} variant="default" padding="sm">
                <div className="flex items-center gap-4 p-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-headline-sm">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary text-label-lg truncate">{name}</p>
                    <p className="text-xs text-text-muted truncate">{email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="secondary">
                      {student.grade ? `Grade ${student.grade}` : 'No Grade'}
                    </Badge>
                    <span className="text-xs text-text-muted">Joined {joined}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<TrendingUp size={14} />}
                      onClick={() => {}}
                    >
                      <span className="hidden sm:inline">Progress</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveError('');
                        setStudentToRemove({
                          id: student._id,
                          name: name
                        });
                      }}
                      className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title={`Remove ${name} from roster`}
                      aria-label={`Remove ${name} from roster`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modern Add Student Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !addLoading) {
              setShowAddModal(false);
              setAddError('');
              setAddSuccess('');
            }
          }}
        >
          <div className="bg-surface-lowest rounded-3xl shadow-elevated border border-surface-border p-6 sm:p-8 max-w-md w-full space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-headline-md font-bold text-text-primary">Add Student</h2>
                  <p className="text-xs text-text-muted">Enroll student into your active roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddError('');
                  setAddSuccess('');
                  setAddEmail('');
                }}
                disabled={addLoading}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-low transition-colors"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-body-sm text-text-secondary leading-relaxed">
              Enter the student's registered ReadEase email address. They will be immediately
              connected to your dashboard for assignments and progress tracking.
            </p>

            {/* Email Input */}
            <div className="space-y-4">
              <Input
                label="Student Email Address"
                type="email"
                placeholder="e.g. student@school.edu"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                autoFocus
              />

              {/* Grade Selector */}
              <div className="space-y-1.5">
                <label className="text-label-md font-semibold text-text-primary flex items-center gap-1.5">
                  <GraduationCap size={16} className="text-secondary" /> Grade Level
                </label>
                <select
                  value={addGrade}
                  onChange={(e) => setAddGrade(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-low text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="Standard">Standard / General</option>
                  <option value="1st Grade">1st Grade</option>
                  <option value="2nd Grade">2nd Grade</option>
                  <option value="3rd Grade">3rd Grade</option>
                  <option value="4th Grade">4th Grade</option>
                  <option value="5th Grade">5th Grade</option>
                  <option value="6th Grade">6th Grade</option>
                  <option value="7th Grade">7th Grade</option>
                  <option value="8th Grade">8th Grade</option>
                  <option value="High School">High School</option>
                </select>
              </div>
            </div>

            {/* Alert / Feedback */}
            {addError && (
              <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="font-medium">{addError}</p>
              </div>
            )}

            {addSuccess && (
              <div className="flex items-center gap-3 p-3.5 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-sm">
                <ShieldCheck size={18} className="flex-shrink-0" />
                <p className="font-semibold">{addSuccess}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setShowAddModal(false);
                  setAddError('');
                  setAddSuccess('');
                }}
                disabled={addLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddStudent}
                isLoading={addLoading}
                iconLeft={<UserCheck size={18} />}
                className="flex-1"
              >
                Add to Roster
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Custom Remove Student Confirmation Modal */}
      {studentToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRemoving) {
              setStudentToRemove(null);
              setRemoveError('');
            }
          }}
        >
          <div className="bg-surface-lowest rounded-3xl shadow-elevated border border-surface-border p-6 sm:p-8 max-w-md w-full space-y-6 animate-in zoom-in-95 duration-200">
            {/* Warning Icon & Heading */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-headline-md font-bold text-text-primary">
                  Remove from Roster?
                </h2>
                <p className="text-body-sm text-text-secondary">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-text-primary">{studentToRemove.name}</span> from
                  your class roster?
                </p>
              </div>
            </div>

            {/* Safety notice */}
            <div className="p-4 rounded-2xl bg-surface-low border border-surface-border text-xs text-text-muted space-y-1">
              <p className="font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-secondary" /> Account Preserved
              </p>
              <p className="leading-relaxed">
                The student's personal account, saved accessibility settings, and reading streak
                will remain safe and untouched.
              </p>
            </div>

            {removeError && (
              <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
                <AlertCircle size={15} /> {removeError}
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setStudentToRemove(null);
                  setRemoveError('');
                }}
                disabled={isRemoving}
                className="flex-1"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={confirmRemoveStudent}
                disabled={isRemoving}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRemoving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Remove Student
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
