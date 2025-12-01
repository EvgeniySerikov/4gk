
import { Question, QuestionStatus, Notification, NotificationChannel, Game, QuestionTag } from "../types";
import { sendStatusEmail } from "./emailService";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CONFIG } from "../config";

// --- GAMES MANAGEMENT ---

export const getGames = async (): Promise<Game[]> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured.");
    return [];
  }
  
  const { data, error } = await supabase!
    .from('games')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error);
    return [];
  }
  
  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    date: Number(g.date)
  }));
};

export const saveGame = async (name: string): Promise<Game | null> => {
  if (!isSupabaseConfigured()) return null;

  const newGame = {
    name,
    date: Date.now()
  };

  const { data, error } = await supabase!
    .from('games')
    .insert([newGame])
    .select()
    .single();

  if (error) {
    console.error('Error creating game:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    date: Number(data.date)
  };
};

// --- QUESTIONS MANAGEMENT ---

export const getQuestions = async (): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .order('submission_date', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    userId: q.user_id,
    authorName: q.author_name,
    authorEmail: q.author_email,
    telegram: q.telegram,
    questionText: q.question_text,
    answerText: q.answer_text,
    status: q.status,
    submissionDate: Number(q.submission_date),
    feedback: q.feedback,
    gameId: q.game_id,
    tags: q.tags || []
  }));
};

export const getMyQuestions = async (userId: string): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .eq('user_id', userId)
    .order('submission_date', { ascending: false });

  if (error) {
    console.error('Error fetching my questions:', error);
    return [];
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    userId: q.user_id,
    authorName: q.author_name,
    authorEmail: q.author_email,
    telegram: q.telegram,
    questionText: q.question_text,
    answerText: q.answer_text,
    status: q.status,
    submissionDate: Number(q.submission_date),
    feedback: q.feedback,
    gameId: q.game_id,
    tags: q.tags || []
  }));
};

export const saveQuestion = async (questionData: Omit<Question, 'id' | 'status' | 'submissionDate'>): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    alert("Ошибка: База данных не подключена. Проверьте config.ts");
    return false;
  }

  const dbQuestion = {
    user_id: questionData.userId,
    author_name: questionData.authorName,
    author_email: questionData.authorEmail,
    telegram: questionData.telegram,
    question_text: questionData.questionText,
    answer_text: questionData.answerText,
    status: QuestionStatus.PENDING,
    submission_date: Date.now(),
    tags: []
  };

  const { error } = await supabase!
    .from('questions')
    .insert([dbQuestion]);

  if (error) {
    console.error('Error saving question:', error);
    return false;
  }

  // Send IMMEDIATE confirmation email
  await sendStatusEmail(
    CONFIG, // Use imported config
    questionData.authorEmail,
    questionData.authorName,
    "Ваш вопрос получен и ОЖИДАЕТ рассмотрения.",
    "Спасибо за участие! Мы свяжемся с вами, если вопрос будет отобран."
  );

  return true;
};

export const updateQuestionData = async (question: Question): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  const updates = {
    game_id: question.gameId,
    tags: question.tags
  };

  const { error } = await supabase!
    .from('questions')
    .update(updates)
    .eq('id', question.id);

  if (error) console.error('Error updating question data:', error);
};

export const updateQuestionStatus = async (id: string, status: QuestionStatus, feedback?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  // 1. Get current data for email
  const { data: currentQ, error: fetchError } = await supabase!
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentQ) return false;

  // 2. Update DB
  const { error } = await supabase!
    .from('questions')
    .update({ status, feedback })
    .eq('id', id);

  if (error) {
    console.error('Error updating status:', error);
    return false;
  }

  // 3. Send Email
  let statusRussian = "";
  switch(status) {
    case QuestionStatus.PENDING: statusRussian = "Ваш вопрос получен и ОЖИДАЕТ рассмотрения."; break;
    case QuestionStatus.APPROVED: statusRussian = "Ваш вопрос ОДОБРЕН и ожидает отбора на игру."; break;
    case QuestionStatus.REJECTED: statusRussian = "К сожалению, ваш вопрос ОТКЛОНЕН."; break;
    case QuestionStatus.SELECTED: statusRussian = "ПОЗДРАВЛЯЕМ! Ваш вопрос отобран для ближайшей игры."; break;
    case QuestionStatus.PLAYED: statusRussian = "Ваш вопрос сыграл в сегодняшней игре! Спасибо за отличный вопрос."; break;
    case QuestionStatus.NOT_PLAYED: statusRussian = "Вопрос был на столе, но не выпал. Он остается в базе редакционной группы."; break;
    default: statusRussian = `Статус изменен на: ${status}`;
  }

  await sendStatusEmail(
    CONFIG,
    currentQ.author_email,
    currentQ.author_name,
    statusRussian,
    feedback
  );

  return true;
};

// --- NOTIFICATIONS ---
export const getNotifications = async (): Promise<Notification[]> => {
  // In a real app with Auth, we would filter this by user_id on the server.
  // Here we just return empty for Guest/Admin and rely on components to fetch what they need.
  return [];
};
