
import { Question, QuestionStatus, Notification, NotificationChannel, Game, QuestionTag, UserProfile } from "../types";
import { sendStatusEmail } from "./emailService";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CONFIG } from "../config";

// --- FILES & IMAGES ---

export const uploadImage = async (file: File): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase!.storage
    .from('images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return null;
  }

  const { data } = supabase!.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
};

// --- PROFILES ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // If profile doesn't exist yet, return null (it might be created via trigger later or manually)
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name || '',
    telegram: data.telegram || '',
    avatarUrl: data.avatar_url || '',
    expertStatus: data.expert_status || 'NOVICE',
    isExpert: data.is_expert || false
  };
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const dbUpdates = {
    full_name: updates.fullName,
    telegram: updates.telegram,
    avatar_url: updates.avatarUrl,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase!
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  return true;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured()) return [];

  // Join with auth.users is tricky via client, so we fetch profiles and maybe map emails if possible via admin API. 
  // For standard client, we just get profiles.
  const { data, error } = await supabase!
    .from('profiles')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    fullName: p.full_name || 'Без имени',
    telegram: p.telegram || '',
    avatarUrl: p.avatar_url || '',
    expertStatus: p.expert_status || 'NOVICE',
    isExpert: p.is_expert || false
  }));
};

// --- GAMES MANAGEMENT ---

export const getGames = async (): Promise<Game[]> => {
  if (!isSupabaseConfigured()) return [];
  
  const { data, error } = await supabase!
    .from('games')
    .select('*')
    .order('date', { ascending: false });

  if (error) return [];
  
  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    date: Number(g.date)
  }));
};

export const saveGame = async (name: string): Promise<Game | null> => {
  if (!isSupabaseConfigured()) return null;

  const newGame = { name, date: Date.now() };
  const { data, error } = await supabase!.from('games').insert([newGame]).select().single();

  if (error) return null;
  return { id: data.id, name: data.name, date: Number(data.date) };
};

// --- QUESTIONS MANAGEMENT ---

export const getQuestions = async (): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .order('submission_date', { ascending: false });

  if (error) return [];

  // Fetch profiles to get current avatars if needed, or rely on what was saved
  // For now, simple mapping
  return (data || []).map((q: any) => mapDbQuestionToApp(q));
};

export const getMyQuestions = async (userId: string): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .eq('user_id', userId)
    .order('submission_date', { ascending: false });

  if (error) return [];

  return (data || []).map((q: any) => mapDbQuestionToApp(q));
};

const mapDbQuestionToApp = (q: any): Question => ({
  id: q.id,
  userId: q.user_id,
  authorName: q.author_name,
  authorEmail: q.author_email,
  telegram: q.telegram,
  authorAvatarUrl: q.author_avatar_url, // We will save snapshot of avatar
  questionText: q.question_text,
  answerText: q.answer_text,
  imageUrls: q.image_urls || [],
  status: q.status,
  submissionDate: Number(q.submission_date),
  feedback: q.feedback,
  gameId: q.game_id,
  tags: q.tags || [],
  isAnsweredCorrectly: q.is_answered_correctly
});

export const saveQuestion = async (questionData: Omit<Question, 'id' | 'status' | 'submissionDate'>): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    alert("Ошибка: База данных не подключена.");
    return false;
  }

  // Get author avatar URL if profile exists
  let avatarUrl = questionData.authorAvatarUrl;
  if (!avatarUrl && questionData.userId) {
    const profile = await getUserProfile(questionData.userId);
    if (profile) avatarUrl = profile.avatarUrl;
  }

  const dbQuestion = {
    user_id: questionData.userId,
    author_name: questionData.authorName,
    author_email: questionData.authorEmail,
    telegram: questionData.telegram,
    author_avatar_url: avatarUrl,
    question_text: questionData.questionText,
    answer_text: questionData.answerText,
    image_urls: questionData.imageUrls,
    status: QuestionStatus.PENDING,
    submission_date: Date.now(),
    tags: []
  };

  const { error } = await supabase!.from('questions').insert([dbQuestion]);

  if (error) {
    console.error('Error saving question:', error);
    return false;
  }

  await sendStatusEmail(
    CONFIG,
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
    tags: question.tags,
    is_answered_correctly: question.isAnsweredCorrectly
  };

  const { error } = await supabase!
    .from('questions')
    .update(updates)
    .eq('id', question.id);

  if (error) console.error('Error updating question data:', error);
};

export const updateQuestionStatus = async (id: string, status: QuestionStatus, feedback?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: currentQ } = await supabase!.from('questions').select('*').eq('id', id).single();
  if (!currentQ) return false;

  const { error } = await supabase!.from('questions').update({ status, feedback }).eq('id', id);

  if (error) return false;

  let statusRussian = "";
  switch(status) {
    case QuestionStatus.PENDING: statusRussian = "Ваш вопрос получен и ОЖИДАЕТ рассмотрения."; break;
    case QuestionStatus.APPROVED: statusRussian = "Ваш вопрос ОДОБРЕН и ожидает отбора на игру."; break;
    case QuestionStatus.REJECTED: statusRussian = "К сожалению, ваш вопрос ОТКЛОНЕН."; break;
    case QuestionStatus.SELECTED: statusRussian = "ПОЗДРАВЛЯЕМ! Ваш вопрос отобран для ближайшей игры."; break;
    case QuestionStatus.PLAYED: statusRussian = "Ваш вопрос сыграл в сегодняшней игре! Спасибо за отличный вопрос."; break;
    case QuestionStatus.NOT_PLAYED: statusRussian = "Вопрос был на столе, но не выпал. Он остается в базе редакционной группы."; break;
  }

  await sendStatusEmail(CONFIG, currentQ.author_email, currentQ.author_name, statusRussian, feedback);
  return true;
};

export const getNotifications = async (): Promise<Notification[]> => {
  return [];
};
