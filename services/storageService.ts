
import { Question, QuestionStatus, Notification, NotificationChannel, AppSettings, Game, QuestionTag } from "../types";
import { sendStatusEmail } from "./emailService";

const QUESTIONS_KEY = 'chgk_questions';
const NOTIFICATIONS_KEY = 'chgk_notifications';
const SETTINGS_KEY = 'chgk_settings';
const GAMES_KEY = 'chgk_games';

// --- GAMES MANAGEMENT ---
export const getGames = (): Game[] => {
  const data = localStorage.getItem(GAMES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveGame = (name: string): Game => {
  const games = getGames();
  const newGame: Game = {
    id: crypto.randomUUID(),
    name,
    date: Date.now()
  };
  games.unshift(newGame);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  return newGame;
};

// --- QUESTIONS MANAGEMENT ---
export const getQuestions = (): Question[] => {
  const data = localStorage.getItem(QUESTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveQuestion = async (question: Question): Promise<void> => {
  const questions = getQuestions();
  questions.unshift(question); // Add to top
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));

  // Create internal notification
  createNotification(question);

  // Send IMMEDIATE confirmation email
  const settings = getSettings();
  if (settings.emailJsServiceId) {
    await sendStatusEmail(
      settings,
      question.authorEmail,
      question.authorName,
      "Ваш вопрос получен и ОЖИДАЕТ рассмотрения редакционной группой.",
      "Спасибо за участие! Мы свяжемся с вами, если вопрос будет отобран."
    );
  }
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { 
    emailJsServiceId: 'service_vn8ooat', 
    emailJsTemplateId: 'template_7ihm8gw', 
    emailJsPublicKey: 'Hlphj7vYF3TsTzIDC' 
  };
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const updateQuestionData = (question: Question): void => {
  const questions = getQuestions();
  const index = questions.findIndex(q => q.id === question.id);
  if (index !== -1) {
    questions[index] = question;
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
    window.dispatchEvent(new Event('storage-update'));
  }
}

export const updateQuestionStatus = async (id: string, status: QuestionStatus, feedback?: string): Promise<Question | null> => {
  const questions = getQuestions();
  const index = questions.findIndex(q => q.id === id);
  if (index === -1) return null;

  questions[index].status = status;
  if (feedback) questions[index].feedback = feedback;
  
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  
  // 1. Create Internal Notification (in-app)
  createNotification(questions[index]);

  // 2. Send AUTOMATIC Email via EmailJS
  const settings = getSettings();
  if (settings.emailJsServiceId) {
    
    // Updated Status Texts per Request
    let statusRussian = "";
    switch(status) {
      case QuestionStatus.PENDING:
        statusRussian = "Ваш вопрос получен и ОЖИДАЕТ рассмотрения.";
        break;
      case QuestionStatus.APPROVED: 
        statusRussian = "Ваш вопрос ОДОБРЕН и ожидает отбора на игру."; 
        break;
      case QuestionStatus.REJECTED: 
        statusRussian = "К сожалению, ваш вопрос ОТКЛОНЕН."; 
        break;
      case QuestionStatus.SELECTED: 
        statusRussian = "ПОЗДРАВЛЯЕМ! Ваш вопрос отобран для ближайшей игры."; 
        break;
      case QuestionStatus.PLAYED:
        statusRussian = "Ваш вопрос сыграл в сегодняшней игре! Спасибо за отличный вопрос.";
        break;
      case QuestionStatus.NOT_PLAYED:
        statusRussian = "Вопрос был на столе, но не выпал. Он остается в базе редакционной группы.";
        break;
      default: 
        statusRussian = `Статус изменен на: ${status}`;
    }

    await sendStatusEmail(
      settings,
      questions[index].authorEmail,
      questions[index].authorName,
      statusRussian,
      feedback
    );
  }
  
  return questions[index];
};

export const getNotifications = (): Notification[] => {
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  return data ? JSON.parse(data) : [];
};

const createNotification = (question: Question): Notification => {
  const notifications = getNotifications();
  
  let message = "";
  switch(question.status) {
    case QuestionStatus.PENDING:
      message = `📨 Вопрос отправлен: "${question.questionText.substring(0, 30)}..."`;
      break;
    case QuestionStatus.APPROVED:
      message = `✅ Вопрос ОДОБРЕН и добавлен в базу кандидатов.`;
      break;
    case QuestionStatus.REJECTED:
      message = `❌ Вопрос отклонен. ${question.feedback ? `(${question.feedback})` : ''}`;
      break;
    case QuestionStatus.SELECTED:
      message = `📺 ПОЗДРАВЛЯЕМ! Вопрос отобран на игру!`;
      break;
    case QuestionStatus.PLAYED:
      message = `🦉 Вопрос СЫГРАН!`;
      break;
    case QuestionStatus.NOT_PLAYED:
      message = `🎲 Вопрос не выпал и вернулся в базу.`;
      break;
    default:
      message = `Статус обновлен: ${question.status}`;
  }

  const newNotification: Notification = {
    id: Date.now().toString(),
    questionId: question.id,
    channel: NotificationChannel.EMAIL,
    message,
    date: Date.now(),
    read: false
  };

  notifications.unshift(newNotification);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  
  window.dispatchEvent(new Event('storage-update'));
  return newNotification;
};

export const subscribeToStorage = (callback: () => void) => {
  window.addEventListener('storage-update', callback);
  return () => window.removeEventListener('storage-update', callback);
};
