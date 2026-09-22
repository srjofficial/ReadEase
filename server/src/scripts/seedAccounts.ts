import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // fallback if custom DNS cannot be set
}

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import {
  User,
  StudentProfile,
  TeacherProfile,
  SpecialEducatorProfile,
  ParentProfile,
  ReadingSession
} from '../models';

async function seedAccounts() {
  console.log('🌱 Starting ReadEase 4-Role Account Seeder...\n');

  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DATABASE_NAME,
      serverSelectionTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS
    });
    console.log('✅ Connected to MongoDB successfully.');

    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // 1. Create or Update Student User
    console.log('👤 Creating/updating Student user...');
    let student = await User.findOne({ email: 'student@readease.com' });
    if (!student) {
      student = new User({
        name: 'Alex Student',
        email: 'student@readease.com',
        passwordHash,
        role: 'student',
        status: 'active',
        isEmailVerified: true
      });
      await student.save();
    } else {
      student.passwordHash = passwordHash;
      student.status = 'active';
      student.isEmailVerified = true;
      student.role = 'student';
      await student.save();
    }

    // 2. Create or Update Teacher User
    console.log('👤 Creating/updating Teacher user...');
    let teacher = await User.findOne({ email: 'teacher@readease.com' });
    if (!teacher) {
      teacher = new User({
        name: 'Sarah Teacher',
        email: 'teacher@readease.com',
        passwordHash,
        role: 'teacher',
        status: 'active',
        isEmailVerified: true
      });
      await teacher.save();
    } else {
      teacher.passwordHash = passwordHash;
      teacher.status = 'active';
      teacher.isEmailVerified = true;
      teacher.role = 'teacher';
      await teacher.save();
    }

    // 3. Create or Update Special Educator User
    console.log('👤 Creating/updating Special Educator user...');
    let educator = await User.findOne({ email: 'educator@readease.com' });
    if (!educator) {
      educator = new User({
        name: 'Dr. Emily Specialist',
        email: 'educator@readease.com',
        passwordHash,
        role: 'special_educator',
        status: 'active',
        isEmailVerified: true
      });
      await educator.save();
    } else {
      educator.passwordHash = passwordHash;
      educator.status = 'active';
      educator.isEmailVerified = true;
      educator.role = 'special_educator';
      await educator.save();
    }

    // 4. Create or Update Parent User
    console.log('👤 Creating/updating Parent user...');
    let parent = await User.findOne({ email: 'parent@readease.com' });
    if (!parent) {
      parent = new User({
        name: 'David Parent',
        email: 'parent@readease.com',
        passwordHash,
        role: 'parent',
        status: 'active',
        isEmailVerified: true
      });
      await parent.save();
    } else {
      parent.passwordHash = passwordHash;
      parent.status = 'active';
      parent.isEmailVerified = true;
      parent.role = 'parent';
      await parent.save();
    }

    // Profiles setup & inter-linking
    console.log('🔗 Configuring role profiles and linking relations...');

    // Student Profile
    await StudentProfile.findOneAndUpdate(
      { userId: student._id },
      {
        userId: student._id,
        teacherId: teacher._id,
        parentIds: [parent._id],
        specialEducatorIds: [educator._id],
        grade: '5th Grade',
        readingLevel: 'intermediate',
        preferredLanguage: 'en',
        totalSessionsCompleted: 5,
        totalReadingTimeMinutes: 45
      },
      { upsert: true, new: true }
    );

    // Teacher Profile
    await TeacherProfile.findOneAndUpdate(
      { userId: teacher._id },
      {
        userId: teacher._id,
        school: 'Springfield Elementary',
        qualification: 'M.Ed Special Education',
        experienceYears: 6,
        verificationStatus: 'approved',
        maxStudents: 20
      },
      { upsert: true, new: true }
    );

    // Special Educator Profile
    await SpecialEducatorProfile.findOneAndUpdate(
      { userId: educator._id },
      {
        userId: educator._id,
        qualification: 'Licensed SLP (Speech-Language Pathologist)',
        specialization: 'Dyslexia & Assistive Technology',
        assignedStudentIds: [student._id],
        status: 'active'
      },
      { upsert: true, new: true }
    );

    // Parent Profile
    await ParentProfile.findOneAndUpdate(
      { userId: parent._id },
      {
        userId: parent._id,
        linkedStudentIds: [student._id],
        relationship: 'father',
        contactPhone: '+1-555-0199'
      },
      { upsert: true, new: true }
    );

    // Sample Reading Session so dashboards show data immediately
    const existingSession = await ReadingSession.findOne({ studentId: student._id });
    if (!existingSession) {
      console.log('📊 Creating initial reading session for analytics...');
      await ReadingSession.create({
        studentId: student._id,
        teacherId: teacher._id,
        language: 'en',
        sessionType: 'practice',
        durationSeconds: 180,
        wordsRead: 240,
        readingSpeedWpm: 80,
        fixationDurationMs: 250,
        fixationCount: 190,
        regressionCount: 8,
        skippedWordsCount: 3,
        accuracyPercentage: 92,
        riskLevel: 'low',
        disclaimer: 'Screening aid only, not a clinical diagnosis'
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All 4 Accounts Successfully Created & Linked!');
    console.log('='.repeat(60));
    console.log('Common Password for all accounts: Password123!\n');
    console.log('1. Student:');
    console.log('   Email: student@readease.com');
    console.log('   Role:  student');
    console.log('   Route: /student/dashboard\n');
    console.log('2. Teacher:');
    console.log('   Email: teacher@readease.com');
    console.log('   Role:  teacher');
    console.log('   Route: /teacher/dashboard\n');
    console.log('3. Special Educator:');
    console.log('   Email: educator@readease.com');
    console.log('   Role:  special_educator');
    console.log('   Route: /educator/dashboard\n');
    console.log('4. Parent:');
    console.log('   Email: parent@readease.com');
    console.log('   Role:  parent');
    console.log('   Route: /parent/dashboard\n');
    console.log('='.repeat(60));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed accounts:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAccounts();
