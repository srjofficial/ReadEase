import { UserRole, UserStatus } from '../models/user.model';
import { Types } from 'mongoose';

export interface AuthUserPayload {
  id: string;
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
