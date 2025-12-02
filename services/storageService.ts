
import { Question, QuestionStatus, Notification, NotificationChannel, Game, QuestionTag, UserProfile, Announcement, Poll, PollVoteDetail } from "../types";
import { sendStatusEmail } from "./emailService";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CONFIG } from "../config";

// --- FILES & IMAGES ---

export const uploadImage = async (file: File): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const { data: userData } = await supabase!.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      console.error("User not authenticated");
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
    
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase!.storage
      .from('images')
      .upload(filePath, file, {
        upsert: true 
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase!.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error("Exception uploading image:", error);
    return null;
  }
};

// --- PROFILES ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    fullName: data.full_name || '',
    telegram: data.telegram || '',
    avatarUrl: data.avatar_url || '',
    expertStatus: data.expert_status || 'NOVICE',
    isExpert: data.is_expert || false,
    expertise: data.expertise || [],
    wasCaptain: data.was_captain || false
  };
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.telegram !== undefined) dbUpdates.telegram = updates.telegram;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.expertStatus !== undefined) dbUpdates.expert_status = updates.expertStatus;
  if (updates.isExpert !== undefined) dbUpdates.is_expert = updates.isExpert;
  if (updates.expertise !== undefined) dbUpdates.expertise = Array.isArray(updates.expertise) ? updates.expertise : [];
  if (updates.wasCaptain !== undefined) dbUpdates.was_captain = updates.wasCaptain;

  const { error, status } = await supabase!
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);

  if (error && status !== 204) {
    console.error('Error updating profile:', error);
    return false;
  }
  return true;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('profiles')
    .select('*');

  if (error) return [];

  return data.map((p: any) => ({
    id: p.id,
    fullName: p.full_name || 'Без имени',
    telegram: p.telegram || '',
    avatarUrl: p.avatar_url || '',
    expertStatus: p.expert_status || 'NOVICE',
    isExpert: p.is_expert || false,
    expertise: p.expertise || [],
    wasCaptain: p.was_captain || false
  }));
};

// --- GAMES ---

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
    date: Number(g.date),
    expertIds: g.expert_ids || []
  }));
};

export const saveGame = async (name: string): Promise<Game | null> => {
  if (!isSupabaseConfigured()) return null;

  const newGame = { name, date: Date.now(), expert_ids: [] };
  const { data, error } = await supabase!.from('games').insert([newGame]).select().single();

  if (error) return null;
  return { id: data.id, name: data.name, date: Number(data.date), expertIds: [] };
};

export const updateGameExperts = async (gameId: string, expertIds: string[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!
    .from('games')
    .update({ expert_ids: expertIds })
    .eq('id', gameId);
  return !error;
};

// --- QUESTIONS ---

export const getQuestions = async (): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .order('submission_date', { ascending: false });

  if (error) return [];

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
  authorAvatarUrl: q.author_avatar_url,
  questionText: q.question_text,
  answerText: q.answer_text,
  imageUrls: q.image_urls || [],
  answerImageUrls: q.answer_image_urls || [],
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

  let avatarUrl = questionData.authorAvatarUrl;
  if (questionData.userId) {
    const profile = await getUserProfile(questionData.userId);
    if (profile && profile.avatarUrl) avatarUrl = profile.avatarUrl;
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
    answer_image_urls: questionData.answerImageUrls,
    status: QuestionStatus.PENDING,
    submission_date: Date.now(),
    tags: [],
    is_answered_correctly: null
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
  await supabase!.from('questions').update(updates).eq('id', question.id);
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

// --- HIDDEN ITEMS ---

export const hideItem = async (userId: string, itemId: string, itemType: 'ANNOUNCEMENT' | 'POLL'): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from('hidden_items').insert([{
    user_id: userId,
    item_id: itemId,
    item_type: itemType
  }]);
  return !error;
};

export const getHiddenItemIds = async (userId: string): Promise<string[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase!.from('hidden_items').select('item_id').eq('user_id', userId);
  if (error || !data) return [];
  return data.map((d: any) => d.item_id);
}

// --- ANNOUNCEMENTS ---

export const createAnnouncement = async (title: string, message: string, imageUrl?: string, linkUrl?: string, linkText?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from('announcements').insert([{
    title, message, image_url: imageUrl, link_url: linkUrl, link_text: linkText, created_at: new Date().toISOString(), views: 0
  }]);
  return !error;
};

export const updateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.message) dbUpdates.message = updates.message;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.linkUrl !== undefined) dbUpdates.link_url = updates.linkUrl;
  if (updates.linkText !== undefined) dbUpdates.link_text = updates.linkText;
  const { error } = await supabase!.from('announcements').update(dbUpdates).eq('id', id);
  return !error;
};

export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from('announcements').delete().eq('id', id);
  if (error) {
    console.error("Delete Announcement Error:", error);
    return false;
  }
  return true;
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  if (!isSupabaseConfigured()) return [];
  
  const { data, error } = await supabase!
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) return [];
  
  // Return raw data spread, forcing image_url into the stream
  return (data || []).map((a: any) => ({
      ...a, // Spread all DB fields (including image_url)
      id: a.id,
      title: a.title,
      message: a.message,
      imageUrl: a.image_url || null, // Explicit fallback
      linkUrl: a.link_url,
      linkText: a.link_text,
      createdAt: new Date(a.created_at).getTime(),
      views: a.views || 0,
  }));
};

export const incrementAnnouncementViews = async (announcementIds: string[]) => {
  if (!isSupabaseConfigured() || announcementIds.length === 0) return;
  for (const id of announcementIds) {
    try {
      const { data } = await supabase!.from('announcements').select('views').eq('id', id).single();
      if (data) await supabase!.from('announcements').update({ views: (data.views || 0) + 1 }).eq('id', id);
    } catch (e) {}
  }
}

// --- POLLS ---

export const createPoll = async (question: string, options: string[], endsAt?: number, allowMultiple?: boolean): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from('polls').insert([{
    question, options, created_at: new Date().toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null, allow_multiple: allowMultiple || false
  }]);
  return !error;
};

export const updatePoll = async (id: string, updates: Partial<Poll>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const dbUpdates: any = {};
  if (updates.question) dbUpdates.question = updates.question;
  if (updates.options) dbUpdates.options = updates.options;
  if (updates.endsAt !== undefined) dbUpdates.ends_at = updates.endsAt ? new Date(updates.endsAt).toISOString() : null;
  if (updates.allowMultiple !== undefined) dbUpdates.allow_multiple = updates.allowMultiple;
  const { error } = await supabase!.from('polls').update(dbUpdates).eq('id', id);
  return !error;
};

export const deletePoll = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from('polls').delete().eq('id', id);
  if (error) {
    console.error("Delete Poll Error:", error);
    return false;
  }
  return true;
};

export const getActivePolls = async (userId?: string): Promise<Poll[]> => {
  if (!isSupabaseConfigured()) return [];
  
  const { data: polls, error } = await supabase!
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
    
  if (error || !polls) return [];
  
  const pollIds = polls.map((p: any) => p.id);
  const { data: votes } = await supabase!
    .from('poll_votes')
    .select('*')
    .in('poll_id', pollIds);
    
  return polls.map((p: any) => {
    const pVotes = votes?.filter((v: any) => v.poll_id === p.id) || [];
    const results: {[key: number]: number} = {};
    p.options?.forEach((_: any, idx: number) => results[idx] = 0);
    pVotes.forEach((v: any) => {
      if (typeof v.option_index === 'number') results[v.option_index] = (results[v.option_index] || 0) + 1;
    });
    const userVotes = userId ? pVotes.filter((v: any) => v.user_id === userId).map((v: any) => v.option_index) : [];
    
    return {
      id: p.id,
      question: p.question,
      options: p.options || [],
      isActive: p.is_active,
      createdAt: new Date(p.created_at).getTime(),
      endsAt: p.ends_at ? new Date(p.ends_at).getTime() : undefined,
      allowMultiple: p.allow_multiple || false,
      results,
      userVoteIndices: userVotes
    };
  });
};

export const votePoll = async (pollId: string, userId: string, optionIndex: number): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  
  const { data: poll } = await supabase!.from('polls').select('allow_multiple').eq('id', pollId).single();
  const allowMultiple = poll?.allow_multiple || false;

  const { data: existingVote } = await supabase!
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .eq('option_index', optionIndex)
    .maybeSingle();

  if (existingVote) {
    const { error } = await supabase!.from('poll_votes').delete().eq('id', existingVote.id);
    return !error;
  }

  if (!allowMultiple) {
    await supabase!.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', userId);
  }
  
  const { error } = await supabase!.from('poll_votes').insert([{
    poll_id: pollId, user_id: userId, option_index: optionIndex
  }]);
  
  return !error;
};

export const getPollVotesDetails = async (pollId: string): Promise<PollVoteDetail[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await supabase!
    .from('poll_votes')
    .select('option_index, user_id, profiles!poll_votes_user_id_fkey(full_name, avatar_url)')
    .eq('poll_id', pollId);
  if (!data) return [];
  return data.map((v: any) => ({
    userId: v.user_id,
    optionIndex: v.option_index,
    fullName: v.profiles?.full_name || 'Аноним',
    avatarUrl: v.profiles?.avatar_url || ''
  }));
};
