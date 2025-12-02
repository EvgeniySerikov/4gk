
export enum QuestionStatus {
  PENDING = 'PENDING',        // Ожидает рассмотрения
  APPROVED = 'APPROVED',      // Одобрен (в базе)
  REJECTED = 'REJECTED',      // Отклонен
  SELECTED = 'SELECTED',      // Отобран на игру (бывший ON_AIR)
  PLAYED = 'PLAYED',          // Сыгран
  NOT_PLAYED = 'NOT_PLAYED'   // Не выпал
}

export enum NotificationChannel {
  EMAIL = 'EMAIL'
}

export interface Game {
  id: string;
  name: string;
  date: number;
  expertIds?: string[]; // IDs of users selected as experts for this game
}

export type QuestionTag = 'BLACK_BOX' | 'BLITZ' | 'SUPER_BLITZ';
export type ExpertStatus = 'NOVICE' | 'EXPERIENCED' | 'MASTER';

export interface UserProfile {
  id: string;
  email?: string;
  fullName: string;
  telegram: string;
  avatarUrl: string;
  expertStatus: ExpertStatus;
  isExpert: boolean;
}

export interface Question {
  id: string;
  userId?: string; // ID зарегистрированного пользователя
  authorName: string;
  authorEmail: string;
  telegram?: string; // Логин телеграм
  authorAvatarUrl?: string; // Аватарка автора на момент загрузки
  
  questionText: string;
  answerText: string;
  imageUrls?: string[]; // Ссылки на прикрепленные фото
  
  status: QuestionStatus;
  submissionDate: number;
  feedback?: string;
  
  gameId?: string; // ID игры, к которой привязан вопрос
  tags?: QuestionTag[];
  
  isAnsweredCorrectly?: boolean; // Взят знатоками (true) или нет (false)
}

export interface Notification {
  id: string;
  questionId: string;
  channel: NotificationChannel;
  message: string;
  date: number;
  read: boolean;
}

// --- NEW TYPES FOR COMMUNICATION ---

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  createdAt: number;
  views: number;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  isActive: boolean;
  createdAt: number;
  userVoteIndex?: number; // Index of option user voted for (frontend only)
  results?: { [key: number]: number }; // Count of votes per index (frontend only)
}

export interface PollVoteDetail {
  userId: string;
  fullName: string;
  avatarUrl: string;
  optionIndex: number;
}

export interface AppSettings {
  emailJsServiceId: string;
  emailJsTemplateId: string;
  emailJsPublicKey: string;
}

export interface User {
  id: string;
  email: string;
}

export type UserRole = 'GUEST' | 'VIEWER' | 'ADMIN';
