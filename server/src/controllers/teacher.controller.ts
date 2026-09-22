import { Request, Response, NextFunction } from 'express';
import { StudentProfile } from '../models/studentProfile.model';
import { TeacherProfile } from '../models/teacherProfile.model';
import { ReadingSession } from '../models/readingSession.model';
import { User } from '../models/user.model';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export class TeacherController {
  /**
   * GET /api/v1/teacher/dashboard
   * Returns aggregated class stats for the authenticated teacher
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;

      const teacherProfile = await TeacherProfile.findOne({ userId: teacherId });
      const maxStudents = teacherProfile?.maxStudents ?? 20;

      const [studentCount, recentSessions] = await Promise.all([
        StudentProfile.countDocuments({ teacherId }),
        ReadingSession.find({ teacherId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('studentId', 'name email')
      ]);

      // Aggregate average WPM and session count for this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyStats = await ReadingSession.aggregate([
        { $match: { teacherId, createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: null,
            avgWpm: { $avg: '$readingSpeedWpm' },
            totalSessions: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          studentCount,
          maxStudents,
          capacityPercent: Math.round((studentCount / maxStudents) * 100),
          teacherProfile,
          weeklyStats: weeklyStats[0] ?? { avgWpm: 0, totalSessions: 0 },
          recentSessions
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/teacher/students
   * Paginated class roster with latest reading metrics
   */
  static async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;

      const [students, total] = await Promise.all([
        StudentProfile.find({ teacherId })
          .populate('userId', 'name email createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        StudentProfile.countDocuments({ teacherId })
      ]);

      res.status(200).json({
        success: true,
        data: { students, total, page, limit, totalPages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/teacher/students/:studentId
   * Single student full profile (teacher-scoped)
   */
  static async getStudentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;
      const { studentId } = req.params;

      const student = await StudentProfile.findOne({ _id: studentId, teacherId }).populate(
        'userId',
        'name email createdAt'
      );

      if (!student) {
        throw new NotFoundError('Student not found or not assigned to you');
      }

      const sessions = await ReadingSession.find({ studentId: student.userId })
        .sort({ startedAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: { student, sessions },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/teacher/students
   * Add a student by email to the teacher's roster (capacity enforced by middleware)
   */
  static async addStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        res.status(400).json({ success: false, message: 'Student email address is required' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(404).json({
          success: false,
          message: `No account found with email "${normalizedEmail}". The student must register on ReadEase first.`
        });
        return;
      }

      if (user.role !== 'student') {
        res.status(400).json({
          success: false,
          message: `The account "${normalizedEmail}" is registered as a ${user.role}, not a student.`
        });
        return;
      }

      // Check if student profile already exists (every student should have one)
      let profile = await StudentProfile.findOne({ userId: user._id });

      if (profile) {
        if (profile.teacherId && profile.teacherId.toString() === teacherId.toString()) {
          res
            .status(409)
            .json({ success: false, message: 'This student is already in your class roster.' });
          return;
        }

        // Assign/link to this teacher
        profile.teacherId = teacherId;
        if (req.body.grade && req.body.grade.trim()) {
          profile.grade = req.body.grade.trim();
        } else if (!profile.grade) {
          profile.grade = 'Standard';
        }
        await profile.save();
      } else {
        // Create new profile with required fields
        profile = await StudentProfile.create({
          userId: user._id,
          teacherId,
          grade: (req.body.grade && req.body.grade.trim()) || 'Standard',
          preferredLanguage: 'en',
          readingLevel: req.body.readingLevel || 'beginner'
        });
      }

      await profile.populate('userId', 'name email createdAt');

      res.status(201).json({
        success: true,
        message: `${user.name} was successfully added to your class roster!`,
        data: { profile },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/teacher/analytics
   * Aggregated reading analytics for teacher's class
   */
  static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await ReadingSession.aggregate([
        { $match: { teacherId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            avgWpm: { $avg: '$readingSpeedWpm' },
            sessions: { $sum: 1 },
            avgAccuracy: { $avg: '$accuracyPercentage' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const topStudents = await ReadingSession.aggregate([
        { $match: { teacherId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$studentId',
            avgWpm: { $avg: '$readingSpeedWpm' },
            sessions: { $sum: 1 }
          }
        },
        { $sort: { avgWpm: -1 } },
        { $limit: 5 }
      ]);

      res.status(200).json({
        success: true,
        data: { analytics, topStudents, days },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/teacher/students/:studentId
   * Remove student from teacher's roster
   */
  static async removeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!._id;
      const { studentId } = req.params;

      // Unlink student from this teacher (preserves the student profile and learning history)
      const updated = await StudentProfile.findOneAndUpdate(
        { _id: studentId, teacherId },
        { $unset: { teacherId: 1 } },
        { returnDocument: 'after' }
      );
      if (!updated) {
        throw new NotFoundError('Student not found in your roster');
      }

      res.status(200).json({
        success: true,
        message: 'Student removed from your class roster.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
