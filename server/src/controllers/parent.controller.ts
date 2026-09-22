import { Request, Response, NextFunction } from 'express';
import { ParentProfile } from '../models/parentProfile.model';
import { StudentProfile } from '../models/studentProfile.model';
import { ReadingSession } from '../models/readingSession.model';
import { Badge } from '../models/badge.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class ParentController {
  /**
   * GET /api/v1/parent/dashboard
   * Overview of all linked children
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const parentProfile = await ParentProfile.findOne({ userId });

      if (!parentProfile || !parentProfile.linkedStudentIds?.length) {
        res.status(200).json({
          success: true,
          data: { children: [], parentProfile },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const children = await StudentProfile.find({
        userId: { $in: parentProfile.linkedStudentIds }
      }).populate('userId', 'name email');

      // Get latest session for each child
      const childrenWithProgress = await Promise.all(
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

      res.status(200).json({
        success: true,
        data: { children: childrenWithProgress, parentProfile },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/child/:studentId/progress
   * Full progress data for a linked child
   */
  static async getChildProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { studentId } = req.params;

      const parentProfile = await ParentProfile.findOne({ userId });
      const studentProfile = await StudentProfile.findById(studentId).populate(
        'userId',
        'name email'
      );

      if (!studentProfile) throw new NotFoundError('Student not found');

      const isLinked = parentProfile?.linkedStudentIds?.some(
        (id) => id.equals(studentProfile.userId as any) || id.equals(studentProfile._id as any)
      );
      if (!isLinked) throw new ForbiddenError('This child is not linked to your account');

      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [sessions, badges, dailyStats] = await Promise.all([
        ReadingSession.find({ studentId: studentProfile.userId, createdAt: { $gte: since } })
          .sort({ createdAt: -1 })
          .limit(20),
        Badge.find({ studentId: studentProfile.userId }).sort({ awardedAt: -1 }),
        ReadingSession.aggregate([
          { $match: { studentId: studentProfile.userId, createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              avgWpm: { $avg: '$readingSpeedWpm' },
              minutes: { $sum: { $divide: ['$durationSeconds', 60] } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      res.status(200).json({
        success: true,
        data: { studentProfile, sessions, badges, dailyStats },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/parent/child/:studentId/sessions
   * Paginated session history for a linked child
   */
  static async getChildSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { studentId } = req.params;

      const parentProfile = await ParentProfile.findOne({ userId });
      const studentProfile = await StudentProfile.findById(studentId);

      if (!studentProfile) throw new NotFoundError('Student not found');

      const isLinked = parentProfile?.linkedStudentIds?.some(
        (id) => id.equals(studentProfile.userId as any) || id.equals(studentProfile._id as any)
      );
      if (!isLinked) throw new ForbiddenError('This child is not linked to your account');

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        ReadingSession.find({ studentId: studentProfile.userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        ReadingSession.countDocuments({ studentId: studentProfile.userId })
      ]);

      res.status(200).json({
        success: true,
        data: { sessions, total, page, limit, totalPages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
