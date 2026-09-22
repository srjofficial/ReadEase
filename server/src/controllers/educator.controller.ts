import { Request, Response, NextFunction } from 'express';
import { SpecialEducatorProfile } from '../models/specialEducatorProfile.model';
import { StudentProfile } from '../models/studentProfile.model';
import { ReadingSession } from '../models/readingSession.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class EducatorController {
  /**
   * GET /api/v1/educator/dashboard
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const profile = await SpecialEducatorProfile.findOne({ userId });

      const assignedCount = profile?.assignedStudentIds?.length ?? 0;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recentSessions = await ReadingSession.find({
        studentId: { $in: profile?.assignedStudentIds ?? [] },
        createdAt: { $gte: weekAgo }
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('studentId', 'name email');

      res.status(200).json({
        success: true,
        data: { assignedCount, profile, recentSessions },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/educator/students
   * Returns list of students explicitly assigned to this educator
   */
  static async getAssignedStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const profile = await SpecialEducatorProfile.findOne({ userId });

      if (!profile || !profile.assignedStudentIds?.length) {
        res
          .status(200)
          .json({ success: true, data: { students: [] }, timestamp: new Date().toISOString() });
        return;
      }

      const students = await StudentProfile.find({
        userId: { $in: profile.assignedStudentIds }
      }).populate('userId', 'name email createdAt');

      res.status(200).json({
        success: true,
        data: { students },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/educator/students/:studentId
   */
  static async getStudentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { studentId } = req.params;

      const educatorProfile = await SpecialEducatorProfile.findOne({ userId });
      const student = await StudentProfile.findById(studentId).populate('userId', 'name email');

      if (!student) throw new NotFoundError('Student not found');

      const isAssigned = educatorProfile?.assignedStudentIds?.some(
        (id) => id.equals(student.userId as any) || id.equals(student._id as any)
      );

      if (!isAssigned) throw new ForbiddenError('You are not assigned to this student');

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
}
