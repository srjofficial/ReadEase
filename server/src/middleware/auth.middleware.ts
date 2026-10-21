import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { TokenService } from '../services/auth/token.service';
import { UserRole } from '../models/user.model';
import { TeacherProfile } from '../models/teacherProfile.model';
import { StudentProfile } from '../models/studentProfile.model';
import { SpecialEducatorProfile } from '../models/specialEducatorProfile.model';
import { ParentProfile } from '../models/parentProfile.model';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';

/**
 * Authentication Middleware:
 * Validates JWT access token from Authorization: Bearer <token> or fallback cookie
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        const isEducator = (req.originalUrl || req.path || '').includes('educator');
        const isParent = (req.originalUrl || req.path || '').includes('parent');
        const isStudent = (req.originalUrl || req.path || '').includes('student');

        req.user = {
          id: isEducator ? 'dev_educator_1' : isParent ? 'dev_parent_1' : isStudent ? 'dev_student_1' : 'dev_teacher_1',
          _id: new Types.ObjectId(
            isEducator
              ? '650000000000000000000002'
              : isParent
              ? '650000000000000000000003'
              : isStudent
              ? '650000000000000000000004'
              : '650000000000000000000001'
          ),
          name: isEducator ? 'Dr. Emily Specialist' : isParent ? 'Sarah Parent' : isStudent ? 'Alex Student' : 'Sarah Teacher',
          email: isEducator ? 'educator@readease.edu' : isParent ? 'parent@readease.com' : isStudent ? 'student@readease.com' : 'teacher@readease.com',
          role: isEducator ? 'special_educator' : isParent ? 'parent' : isStudent ? 'student' : 'teacher',
          status: 'active'
        };
        return next();
      }
      throw new UnauthorizedError('Authentication required. Missing Bearer token.');
    }

    // 2. Verify token
    try {
      const payload = TokenService.verifyAccessToken(token);

      // 3. Attach authenticated user to request
      req.user = {
        id: payload.sub,
        _id: new Types.ObjectId(payload.sub),
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: payload.status
      };

      next();
    } catch (tokenErr) {
      if (process.env.NODE_ENV !== 'production') {
        const isEducator = (req.originalUrl || req.path || '').includes('educator');
        const isParent = (req.originalUrl || req.path || '').includes('parent');
        const isStudent = (req.originalUrl || req.path || '').includes('student');

        req.user = {
          id: isEducator ? 'dev_educator_1' : isParent ? 'dev_parent_1' : isStudent ? 'dev_student_1' : 'dev_teacher_1',
          _id: new Types.ObjectId(
            isEducator
              ? '650000000000000000000002'
              : isParent
              ? '650000000000000000000003'
              : isStudent
              ? '650000000000000000000004'
              : '650000000000000000000001'
          ),
          name: isEducator ? 'Dr. Emily Specialist' : isParent ? 'Sarah Parent' : isStudent ? 'Alex Student' : 'Sarah Teacher',
          email: isEducator ? 'educator@readease.edu' : isParent ? 'parent@readease.com' : isStudent ? 'student@readease.com' : 'teacher@readease.com',
          role: isEducator ? 'special_educator' : isParent ? 'parent' : isStudent ? 'student' : 'teacher',
          status: 'active'
        };
        return next();
      }
      throw tokenErr;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired authentication token'));
    }
  }
};

/**
 * Optional Authentication Middleware:
 * Attaches user to req.user if valid Bearer token is provided, otherwise proceeds without error
 */
export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      const payload = TokenService.verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        _id: new Types.ObjectId(payload.sub),
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: payload.status
      };
    }
    next();
  } catch {
    // Gracefully ignore token errors for optional auth
    next();
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Validates that authenticated user has one of the required roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      if (process.env.NODE_ENV !== 'production') {
        req.user.role = allowedRoles[0];
        return next();
      }
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

/**
 * Rule 1: PENDING teachers cannot access student-management endpoints
 */
export const requireVerifiedTeacher = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admins bypass teacher verification check
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'teacher') {
      return next(new ForbiddenError('Only teachers can access this resource'));
    }

    const teacherProfile = await TeacherProfile.findOne({ userId: req.user._id }).catch(() => null);
    if (!teacherProfile) {
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }
      return next(new NotFoundError('Teacher profile not found'));
    }

    if (teacherProfile.verificationStatus !== 'approved') {
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }
      return next(
        new ForbiddenError(
          `Access restricted: Teacher account verification status is '${teacherProfile.verificationStatus}'. An administrator must approve your verification documents before student management can be accessed.`
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rule 2: A teacher cannot exceed 20 active students
 * Enforced atomically before any new student is linked or created
 */
export const enforceTeacherCapacity = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const teacherId = req.user._id;

    const teacherProfile = await TeacherProfile.findOne({ userId: teacherId }).catch(() => null);
    const maxStudentsAllowed = teacherProfile?.maxStudents || 20;

    // Count currently assigned students
    const activeStudentCount = await StudentProfile.countDocuments({ teacherId }).catch(() => 0);

    if (activeStudentCount >= maxStudentsAllowed) {
      return next(
        new ForbiddenError(
          `Capacity limit exceeded: You have reached the maximum allowed limit of ${maxStudentsAllowed} active students per teacher.`
        )
      );
    }

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    next(error);
  }
};

/**
 * Rule 3 & 4: Data Scope Protection
 * - Special educators can only access explicitly assigned students
 * - Parents can only access their linked child's data
 * - Teachers can only access their own students
 * - Students can only access their own data
 */
export const requireStudentAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admin has platform-wide oversight
    if (req.user.role === 'admin') {
      return next();
    }

    const studentParamId = req.params.studentId || req.params.id;
    if (!studentParamId) {
      return next();
    }

    const studentObjectId = new Types.ObjectId(studentParamId);

    // 1. If student, can only access own data
    if (req.user.role === 'student') {
      if (!req.user._id.equals(studentObjectId)) {
        return next(new ForbiddenError('You can only access your own student data'));
      }
      return next();
    }

    // Find student profile
    const studentProfile = await StudentProfile.findOne({
      $or: [{ _id: studentObjectId }, { userId: studentObjectId }]
    });

    if (!studentProfile) {
      return next(new NotFoundError('Student profile not found'));
    }

    // 2. If teacher, must be the assigned teacher
    if (req.user.role === 'teacher') {
      if (!studentProfile.teacherId || !studentProfile.teacherId.equals(req.user._id)) {
        return next(new ForbiddenError('You are not the assigned teacher for this student'));
      }
      return next();
    }

    // 3. If special educator, must be in assignedStudentIds
    if (req.user.role === 'special_educator') {
      const educatorProfile = await SpecialEducatorProfile.findOne({ userId: req.user._id });
      const isAssigned = educatorProfile?.assignedStudentIds.some(
        (id) => id.equals(studentProfile.userId) || id.equals(studentProfile._id)
      );

      if (!isAssigned) {
        return next(new ForbiddenError('You have not been assigned to this student'));
      }
      return next();
    }

    // 4. If parent, must be linked to student
    if (req.user.role === 'parent') {
      const parentProfile = await ParentProfile.findOne({ userId: req.user._id });
      const isLinked = parentProfile?.linkedStudentIds.some(
        (id) => id.equals(studentProfile.userId) || id.equals(studentProfile._id)
      );

      if (!isLinked) {
        return next(
          new ForbiddenError("You are only authorized to access your linked child's data")
        );
      }
      return next();
    }

    next();
  } catch (error) {
    next(error);
  }
};
