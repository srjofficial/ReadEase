import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  FileCheck,
  Clock,
  Users,
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';

const SAMPLE_PASSAGES = [
  { id: '1', title: 'The Butterfly Effect', level: 'Grade 3', words: 180, language: 'English' },
  { id: '2', title: 'Seasons of Change', level: 'Grade 4', words: 220, language: 'English' },
  { id: '3', title: 'Water Cycle Story', level: 'Grade 3', words: 150, language: 'English' },
  { id: '4', title: 'ഒരു ദിനം (A Day)', level: 'Grade 4', words: 160, language: 'Malayalam' }
];

const MOCK_ASSIGNMENTS = [
  {
    id: 'a1',
    passage: 'The Butterfly Effect',
    assignedTo: 'Entire Class',
    dueDate: '2026-09-28',
    status: 'active',
    submissions: 12,
    total: 18
  },
  {
    id: 'a2',
    passage: 'Seasons of Change',
    assignedTo: 'Group A',
    dueDate: '2026-09-30',
    status: 'active',
    submissions: 5,
    total: 8
  },
  {
    id: 'a3',
    passage: 'Water Cycle Story',
    assignedTo: 'Entire Class',
    dueDate: '2026-09-20',
    status: 'completed',
    submissions: 18,
    total: 18
  }
];

export const TeacherAssignmentsView: React.FC = () => {
  const [showNew, setShowNew] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState('');
  const [assignTarget, setAssignTarget] = useState('class');
  const [dueDate, setDueDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowNew(false);
      setSubmitted(false);
      setSelectedPassage('');
      setDueDate('');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-2">
            <FileCheck size={28} className="text-primary" /> Reading Assignments
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Assign passages to your class and track submissions
          </p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus size={18} />}
          onClick={() => setShowNew(!showNew)}
        >
          New Assignment
        </Button>
      </div>

      {/* New Assignment Form */}
      {showNew && (
        <Card variant="highlight" padding="lg" className="border-2 border-primary/20">
          <h2 className="text-headline-sm font-bold text-text-primary mb-6 flex items-center gap-2">
            <Sparkles size={18} className="text-secondary" /> Create New Assignment
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-3">
                Select Passage
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_PASSAGES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPassage(p.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedPassage === p.id
                        ? 'border-primary bg-primary-50 shadow-soft'
                        : 'border-surface-border bg-surface-low hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-text-primary text-label-lg">{p.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {p.level} · {p.words} words · {p.language}
                        </p>
                      </div>
                      {selectedPassage === p.id && (
                        <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-2">
                  Assign To
                </label>
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-low border border-surface-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                >
                  <option value="class">Entire Class</option>
                  <option value="group-a">Group A</option>
                  <option value="group-b">Group B</option>
                  <option value="individual">Individual Student</option>
                </select>
              </div>
              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-surface-low border border-surface-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                iconLeft={submitted ? <Check size={16} /> : <FileCheck size={16} />}
                disabled={!selectedPassage || !dueDate || submitted}
              >
                {submitted ? 'Assignment Created!' : 'Create Assignment'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Existing Assignments */}
      <div className="space-y-4">
        <h2 className="text-headline-sm font-bold text-text-primary">
          Active & Recent Assignments
        </h2>
        {MOCK_ASSIGNMENTS.map((a) => {
          const pct = Math.round((a.submissions / a.total) * 100);
          return (
            <Card key={a.id} variant="default" padding="lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-50 w-fit">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-text-primary">{a.passage}</h3>
                    <Badge variant={a.status === 'completed' ? 'tertiary' : 'primary'} dot>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {a.assignedTo}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Due {a.dueDate}
                    </span>
                    <span>
                      {a.submissions}/{a.total} submitted
                    </span>
                  </div>
                  <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" iconRight={<ChevronRight size={14} />}>
                  Details
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
