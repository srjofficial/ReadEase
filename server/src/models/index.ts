/**
 * ReadEase Data Model Registry & Schema Exports
 * Complete Mongoose persistence layer according to ReadEase Build Plan (Section 10)
 */

export * from './user.model';
export * from './teacherProfile.model';
export * from './studentProfile.model';
export * from './specialEducatorProfile.model';
export * from './parentProfile.model';
export * from './readingSession.model';
export * from './aiInsight.model';
export * from './passage.model';
export * from './badge.model';
export * from './notification.model';
export * from './chatConversation.model';
export * from './knowledgeDocument.model';
export * from './knowledgeChunk.model';

import { User } from './user.model';
import { TeacherProfile } from './teacherProfile.model';
import { StudentProfile } from './studentProfile.model';
import { SpecialEducatorProfile } from './specialEducatorProfile.model';
import { ParentProfile } from './parentProfile.model';
import { ReadingSession } from './readingSession.model';
import { AiInsight } from './aiInsight.model';
import { Passage } from './passage.model';
import { Badge } from './badge.model';
import { Notification } from './notification.model';
import { ChatConversation } from './chatConversation.model';
import { KnowledgeDocument } from './knowledgeDocument.model';
import { KnowledgeChunk } from './knowledgeChunk.model';

export const models = {
  User,
  TeacherProfile,
  StudentProfile,
  SpecialEducatorProfile,
  ParentProfile,
  ReadingSession,
  AiInsight,
  Passage,
  Badge,
  Notification,
  ChatConversation,
  KnowledgeDocument,
  KnowledgeChunk
};

export default models;
