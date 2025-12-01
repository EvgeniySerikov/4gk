
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
}

export type QuestionTag = 'BLACK_BOX' | 'BLITZ' | 'SUPER_BLITZ';

export interface Question {
  id: string;
  authorName: string;
  authorEmail: string;
  questionText: string;
  answerText: string;
  mediaUrl?: string; 
  status: QuestionStatus;
  submissionDate: number;
  feedback?: string;
  gameId?: string; // ID игры, к которой привязан вопрос
  tags?: QuestionTag[];
}

export interface Notification {
  id: string;
  questionId: string;
  channel: NotificationChannel;
  message: string;
  date: number;
  read: boolean;
}

export interface AppSettings {
  emailJsServiceId: string;
  emailJsTemplateId: string;
  emailJsPublicKey: string;
}

export type UserRole = 'GUEST' | 'VIEWER' | 'ADMIN';
