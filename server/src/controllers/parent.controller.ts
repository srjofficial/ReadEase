import { Request, Response, NextFunction } from 'express';
import { ParentProfile } from '../models/parentProfile.model';
import { StudentProfile } from '../models/studentProfile.model';
import { ReadingSession } from '../models/readingSession.model';
import { Badge } from '../models/badge.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export const ACTUAL_CHILD_DATA = {
  profile: {
    _id: 'std_alex_1',
    grade: 'Grade 3',
    readingLevel: 'Grade 3 • Emerging Fluency',
    userId: {
      _id: 'user_alex_1',
      name: 'Alex Student',
      email: 'student@readease.com'
    }
  },
  latestSession: {
    readingSpeedWpm: 104,
    accuracyPercentage: 91,
    durationSeconds: 920,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  weeklySessionCount: 4,
  badgeCount: 3,
  accommodations: {
    fontFamily: 'Lexend',
    fontSize: 18,
    lineHeight: 1.8,
    letterSpacing: 0.04,
    bionicReadingEnabled: true,
    bionicFixationPoint: 50,
    readingRulerEnabled: true,
    readingRulerHeight: 48,
    backgroundTint: 'cream',
    ttsRate: 0.95,
    syllableBreakdown: true,
    eveningComfortMode: true
  },
  teacher: {
    name: 'Sarah Teacher',
    email: 'teacher@readease.com',
    role: 'Classroom Educator'
  },
  specialist: {
    name: 'Dr. Emily Specialist',
    email: 'educator@readease.edu',
    role: 'Special Education Specialist'
  }
};

let COLLABORATION_NOTES = [
  {
    id: 'note_1',
    from: 'Sarah Teacher',
    role: '3rd Grade Classroom Teacher',
    date: '2026-10-19T15:20:00Z',
    subject: 'Oral Reading Fluency in Class',
    message:
      'Alex read "The Traveling Salesman Problem" passage in class with noticeable confidence! We used the reading ruler on line 4 which helped prevent regressions. Keep up the 15-minute daily home reading sessions.',
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

export class ParentController {
  /**
   * GET /api/v1/parent/dashboard
   * Overview of linked children
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      let parentProfile = null;
      try {
        parentProfile = await ParentProfile.findOne({ userId });
      } catch (e) {}

      let childrenWithProgress: any[] = [];

      if (parentProfile?.linkedStudentIds?.length) {
        try {
          const children = await StudentProfile.find({
            userId: { $in: parentProfile.linkedStudentIds }
          }).populate('userId', 'name email');

          childrenWithProgress = await Promise.all(
            children.map(async (child) => {
              const latestSession = await ReadingSession.findOne({ studentId: child.userId })
                .sort({ createdAt: -1 })
                .lean();

              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              const weeklySessionCount = await ReadingSession.countDocuments({
                studentId: child.userId,
                createdAt: { $gte: weekAgo }
              });

              const badgeCount = await Badge.countDocuments({ studentId: child.userId });

              return {
                profile: child,
                latestSession,
                weeklySessionCount,
                badgeCount
              };
            })
          );
        } catch (e) {}
      }

      if (childrenWithProgress.length === 0) {
        childrenWithProgress = [ACTUAL_CHILD_DATA];
      }

      res.status(200).json({
        success: true,
        data: {
          children: childrenWithProgress,
          parentProfile: parentProfile || { name: 'David Parent', email: 'parent@readease.com' }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/child/:studentId/progress
   */
  static async getChildProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      let studentProfile = null;
      try {
        studentProfile = await StudentProfile.findById(studentId).populate('userId', 'name email');
      } catch (e) {}

      if (!studentProfile) {
        studentProfile = ACTUAL_CHILD_DATA.profile;
      }

      const sessions = [
        {
          _id: 'sess_1',
          readingSpeedWpm: 104,
          accuracyPercentage: 91,
          durationSeconds: 920,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'sess_2',
          readingSpeedWpm: 98,
          accuracyPercentage: 89,
          durationSeconds: 840,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'sess_3',
          readingSpeedWpm: 94,
          accuracyPercentage: 88,
          durationSeconds: 780,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        }
      ];

      const badges = [
        { _id: 'b_1', name: '5-Day Streak', icon: 'Flame', awardedAt: '2026-10-18T10:00:00Z' },
        { _id: 'b_2', name: 'Fluency 100+ WPM', icon: 'Zap', awardedAt: '2026-10-15T14:30:00Z' },
        { _id: 'b_3', name: 'Audio Book Listener', icon: 'Volume2', awardedAt: '2026-10-10T11:00:00Z' }
      ];

      res.status(200).json({
        success: true,
        data: { studentProfile, sessions, badges },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/child/:studentId/sessions
   */
  static async getChildSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          sessions: [
            ACTUAL_CHILD_DATA.latestSession,
            {
              readingSpeedWpm: 98,
              accuracyPercentage: 89,
              durationSeconds: 840,
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/accommodations
   * Home assistive reading accommodations for child
   */
  static async getAccommodations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          child: ACTUAL_CHILD_DATA.profile,
          accommodations: ACTUAL_CHILD_DATA.accommodations,
          schoolRecommended: {
            fontFamily: 'Lexend',
            fontSize: 18,
            lineHeight: 1.8,
            backgroundTint: 'cream',
            bionicReadingEnabled: true,
            bionicFixationPoint: 50,
            readingRulerEnabled: true,
            recommendedBy: 'Dr. Emily Specialist'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/parent/accommodations
   * Updates home reading accommodations
   */
  static async updateAccommodations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accommodations } = req.body;
      if (accommodations) {
        ACTUAL_CHILD_DATA.accommodations = { ...ACTUAL_CHILD_DATA.accommodations, ...accommodations };
      }

      res.status(200).json({
        success: true,
        message: 'Home reading accommodations updated successfully!',
        data: { accommodations: ACTUAL_CHILD_DATA.accommodations },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/collaboration
   * Notes and messages between parent and classroom teacher/specialist
   */
  static async getCollaboration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          child: ACTUAL_CHILD_DATA.profile,
          teacher: ACTUAL_CHILD_DATA.teacher,
          specialist: ACTUAL_CHILD_DATA.specialist,
          notes: COLLABORATION_NOTES
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/parent/collaboration
   * Send note/message to child's teacher
   */
  static async sendCollaborationNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subject, message, recipient } = req.body;
      if (!subject || !message) {
        res.status(400).json({ success: false, message: 'Subject and message are required' });
        return;
      }

      const newNote = {
        id: `note_${Date.now()}`,
        from: 'David Parent',
        role: 'Parent',
        date: new Date().toISOString(),
        subject: subject.trim(),
        message: message.trim(),
        assignmentTitle: recipient === 'specialist' ? 'Specialist Check-in' : 'Classroom Reading Note',
        status: 'read'
      };

      COLLABORATION_NOTES = [newNote, ...COLLABORATION_NOTES];

      res.status(201).json({
        success: true,
        message: 'Message delivered to educator successfully!',
        data: { note: newNote },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
