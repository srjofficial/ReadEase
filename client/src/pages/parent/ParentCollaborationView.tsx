import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Mail,
  Send,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  Clock
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../../components/ui';
import { getStoredToken } from '../../utils/auth';

interface CollaborationNote {
  id: string;
  from: string;
  role: string;
  date: string;
  subject: string;
  message: string;
  assignmentTitle?: string;
  status: string;
}

const INITIAL_NOTES: CollaborationNote[] = [
  {
    id: 'note_1',
    from: 'Sarah Teacher',
    role: '3rd Grade Classroom Teacher',
    date: '2026-10-19T15:20:00Z',
    subject: 'Oral Reading Fluency in Class',
    message:
      'Alex read "The Traveling Salesman Problem" passage in class with noticeable confidence! We used the reading ruler on line 4 which helped prevent line skipping. Keep up the 15-minute daily home reading sessions.',
    assignmentTitle: 'The Traveling Salesman Problem',
    status: 'unread'
  },
  {
    id: 'note_2',
    from: 'Dr. Emily Specialist',
    role: 'Dyslexia / Reading Specialist',
    date: '2026-10-18T16:00:00Z',
    subject: 'Diagnostic Screener Follow-up',
    message:
      'Alex demonstrated great response to the Bionic reading fixations during our diagnostic screening. We noticed hesitation on words with "b" and "d" reversals (like bold/bend). The visual anchor cards we provided should be practiced at home before bedtime reading.',
    assignmentTitle: 'Clinical Diagnostic Screener',
    status: 'read'
  },
  {
    id: 'note_3',
    from: 'David Parent',
    role: 'Parent',
    date: '2026-10-16T19:45:00Z',
    subject: 'Home Reading Log Update',
    message:
      'Alex finished Charlotte\'s Web chapter 3 last night! We practiced the syllable chunking and Alex loved listening to the audio guide first.',
    assignmentTitle: 'Home Reading Practice',
    status: 'read'
  }
];

export const ParentCollaborationView: React.FC = () => {
  const [notes, setNotes] = useState<CollaborationNote[]>(INITIAL_NOTES);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [recipient, setRecipient] = useState<'teacher' | 'specialist'>('teacher');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    fetch('/api/v1/parent/collaboration', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.notes) && d.data.notes.length > 0) {
          setNotes(d.data.notes);
        }
      })
      .catch((e) => console.warn('Could not fetch collaboration notes:', e));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/parent/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          recipient
        })
      });
      const data = await res.json().catch(() => null);

      const newNote: CollaborationNote = data?.data?.note || {
        id: `note_${Date.now()}`,
        from: 'David Parent',
        role: 'Parent',
        date: new Date().toISOString(),
        subject: subject.trim(),
        message: message.trim(),
        assignmentTitle: recipient === 'specialist' ? 'Specialist Check-in' : 'Classroom Reading Note',
        status: 'read'
      };

      setNotes((prev) => [newNote, ...prev]);
      setToastMessage('Note sent to ' + (recipient === 'specialist' ? 'Dr. Emily' : 'Sarah Teacher') + '!');
      setSubject('');
      setMessage('');
      setShowComposeModal(false);

      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-secondary text-white font-semibold rounded-2xl shadow-elevated animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-3">
            <HeartHandshake size={28} className="text-secondary" /> Teacher Collaboration
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Two-way updates, classroom feedback, and progress notes with Alex Student's educators.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Mail size={16} />}
          onClick={() => setShowComposeModal(true)}
        >
          Send Note to Teacher
        </Button>
      </div>

      {/* Educator Contacts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sarah Teacher */}
        <Card variant="default" padding="md" className="space-y-3 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary-50 text-secondary-dark flex items-center justify-center font-bold text-lg">
              S
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-body-md">Sarah Teacher</h3>
              <p className="text-xs text-text-muted">3rd Grade Classroom Teacher · Room 204</p>
              <p className="text-xs text-secondary font-mono mt-0.5">teacher@readease.com</p>
            </div>
          </div>
          <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>Primary Reading Teacher</span>
            <span className="font-semibold text-secondary">Active Collaborator</span>
          </div>
        </Card>

        {/* Dr. Emily Specialist */}
        <Card variant="default" padding="md" className="space-y-3 border-tertiary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-50 text-tertiary flex items-center justify-center font-bold text-lg">
              E
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-body-md">Dr. Emily Specialist</h3>
              <p className="text-xs text-text-muted">Special Education & Dyslexia Specialist</p>
              <p className="text-xs text-tertiary font-mono mt-0.5">educator@readease.edu</p>
            </div>
          </div>
          <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>IEP Accommodations Advisor</span>
            <span className="font-semibold text-tertiary">Active Screener</span>
          </div>
        </Card>
      </div>

      {/* Active School Reading Assignment Banner */}
      <Card variant="highlight" padding="md" className="border-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary-50 text-secondary-dark">
              Current School Assignment
            </span>
            <h4 className="font-bold text-text-primary text-body-md">
              The Traveling Salesman Problem (Grade 3)
            </h4>
            <p className="text-xs text-text-secondary">
              Assigned by Sarah Teacher · Due October 27, 2026 · Practice reading aloud with the Reading Ruler at home.
            </p>
          </div>
          <Badge variant="secondary">Active Practice</Badge>
        </div>
      </Card>

      {/* Messages & Notes Thread */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
            <MessageSquare size={20} className="text-secondary" /> Classroom Notes & Progress Updates
          </h2>
          <span className="text-xs text-text-muted">{notes.length} notes exchanged</span>
        </div>

        <div className="space-y-3">
          {notes.map((note) => {
            const isFromParent = note.from === 'David Parent';
            const isSpecialist = note.from.includes('Emily');
            return (
              <div
                key={note.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isFromParent
                    ? 'bg-surface-low border-surface-border ml-0 sm:ml-8'
                    : isSpecialist
                    ? 'bg-tertiary-50/20 border-tertiary/20'
                    : 'bg-secondary-50/20 border-secondary/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isFromParent
                          ? 'bg-surface-high text-text-primary'
                          : isSpecialist
                          ? 'bg-tertiary-50 text-tertiary'
                          : 'bg-secondary-50 text-secondary'
                      }`}
                    >
                      {note.from.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                        {note.from}
                        <span className="text-xs font-normal text-text-muted">({note.role})</span>
                      </h4>
                      <p className="text-xs font-semibold text-text-secondary">{note.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Clock size={13} />
                    <span>{new Date(note.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed pl-12">
                  {note.message}
                </p>

                {note.assignmentTitle && (
                  <div className="mt-2.5 ml-12 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-lowest text-[11px] text-text-muted border border-surface-border">
                    <BookOpen size={12} className="text-secondary" />
                    <span>Ref: {note.assignmentTitle}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-lowest rounded-3xl shadow-elevated border border-surface-border p-6 sm:p-8 max-w-lg w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary-50 text-secondary flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-headline-md font-bold text-text-primary">Send Note to Teacher</h3>
                  <p className="text-xs text-text-muted">Regarding: Alex Student (Grade 3)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-low"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              {/* Recipient Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">Recipient</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipient('teacher')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      recipient === 'teacher'
                        ? 'border-secondary bg-secondary-50/50 text-secondary ring-1 ring-secondary'
                        : 'border-surface-border bg-surface-low text-text-secondary'
                    }`}
                  >
                    Sarah Teacher
                    <span className="block text-[11px] text-text-muted font-normal">Classroom Educator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipient('specialist')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      recipient === 'specialist'
                        ? 'border-tertiary bg-tertiary-50/50 text-tertiary ring-1 ring-tertiary'
                        : 'border-surface-border bg-surface-low text-text-secondary'
                    }`}
                  >
                    Dr. Emily Specialist
                    <span className="block text-[11px] text-text-muted font-normal">Reading Specialist</span>
                  </button>
                </div>
              </div>

              {/* Subject */}
              <Input
                label="Subject"
                placeholder="e.g. Home reading observation or question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">Note Content</label>
                <textarea
                  rows={4}
                  placeholder="Share how Alex did with reading at home, any words they struggled with, or questions for class..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-low text-text-primary text-sm focus:ring-2 focus:ring-secondary focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  className="flex-1"
                  onClick={() => setShowComposeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  className="flex-1"
                  isLoading={isSending}
                  iconLeft={<Send size={16} />}
                >
                  Send Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
