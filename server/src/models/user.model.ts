import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'student' | 'teacher' | 'special_educator' | 'parent' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  refreshTokenHash?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Exclude from normal queries for security
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['student', 'teacher', 'special_educator', 'parent', 'admin'],
        message: '{VALUE} is not a valid ReadEase user role'
      },
      default: 'student'
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'pending', 'suspended', 'inactive'],
        message: '{VALUE} is not a valid account status'
      },
      default: 'active'
    },
    profileImage: {
      type: String,
      trim: true
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    passwordResetTokenHash: {
      type: String,
      select: false
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Static method to hash password with cost factor 12
userSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const saltRounds = 12; // MNC security standard: bcrypt cost factor 12
  return bcrypt.hash(password, saltRounds);
};

// Instance method to compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User: IUserModel = model<IUser, IUserModel>('User', userSchema);
