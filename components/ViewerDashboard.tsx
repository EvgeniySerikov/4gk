
import React, { useEffect, useState } from 'react';
import { ViewerForm } from './ViewerForm';
import { getMyQuestions, getGames, getUserProfile, updateUserProfile, uploadImage, getAnnouncements, getActivePolls, votePoll, incrementAnnouncementViews } from '../services/storageService';
import { Question, Game, QuestionStatus, UserProfile, ExpertStatus, Announcement, Poll } from '../types';
import { User, List, Send, RefreshCw, Trophy, Edit2, Check, Camera, Filter, Loader2, Star, Sparkles, Newspaper, ExternalLink } from 'lucide-react';

interface ViewerDashboardProps {
  userId: string;
  userEmail: string;
}

const EXPERT_STATUS_MAP: Record<ExpertStatus, string> = {
  'NOVICE': 'Новичок',
  'EXPERIENCED': 'Опытный',
  'MASTER': 'Магистр'
};

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ userId, userEmail }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'send' | 'history' | 'club'>('club');
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string|null>(null);

  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'PLAYED' | 'TAKEN'>('ALL');

  const loadData = async () => {
    setLoading(true);
    const [pData, qData, gData, aData, pollsData] = await Promise.all([
      getUserProfile(userId),
      getMyQuestions(userId),
      getGames(),
      getAnnouncements(),
      getActivePolls(userId)
    ]);
    
    // Auto-create local profile object if missing from DB, wait for save to persist
    const userProfile = pData || {
      id: userId,
      fullName: '',
      telegram: '',
      avatarUrl: '',
      expertStatus: 'NOVICE',
      isExpert: false
    };
    
    setProfile(userProfile);
    setMyQuestions(qData);
    setGames(gData);
    setAnnouncements(aData);
    setPolls(pollsData);
    setEditName(userProfile.fullName);
    setEditTelegram(userProfile.telegram);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Track views when entering club tab
  useEffect(() => {
    if (activeTab === 'club' && announcements.length > 0) {
      // Increment views for all announcements on screen (simplified)
      // Ideally we check if user has seen it before, but for simple stats this works
      const ids = announcements.map(a => a.id);
      incrementAnnouncementViews(ids);
    }
  }, [activeTab, announcements.length]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setProfileMessage(null);
    const success = await updateUserProfile(userId, { fullName: editName, telegram: editTelegram });
    if (success) {
      setProfile({ ...profile, fullName: editName, telegram: editTelegram });
      setIsEditingProfile(false);
      setProfileMessage("Профиль успешно сохранен!");
      setTimeout(() => setProfileMessage(null), 3000);
    } else {
      setProfileMessage("Ошибка сохранения. Попробуйте еще раз.");
    }
    setSavingProfile(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploadingAvatar(true);
    const url = await uploadImage(e.target.files[0]);
    if (url) {
       await updateUserProfile(userId, { avatarUrl: url });
       setProfile({ ...profile, avatarUrl: url });
       setProfileMessage("Фото обновлено!");
       setTimeout(() => setProfileMessage(null), 3000);
    } else {
       alert("Ошибка загрузки фото");
    }
    setUploadingAvatar(false);
  };

  const handleVote = async (pollId: string, idx: number) => {
    const success = await votePoll(pollId, userId, idx);
    if(success) {
       const updatedPolls = await getActivePolls(userId);
       setPolls(updatedPolls);
    }
  };

  // Stats
  const totalQuestions = myQuestions.length;
  const approvedQuestions = myQuestions.filter(q => q.status === QuestionStatus.APPROVED || q.status === QuestionStatus.SELECTED || q.status === QuestionStatus.PLAYED).length;
  const playedQuestions = myQuestions.filter(q => q.status === QuestionStatus.PLAYED).length;
  const takenQuestions = myQuestions.filter(q => q.status === QuestionStatus.PLAYED && q.isAnsweredCorrectly).length;
  const notTakenQuestions = myQuestions.filter(q => q.status === QuestionStatus.PLAYED && q.isAnsweredCorrectly === false).length;

  const filteredQuestions = myQuestions.filter(q => {
    if (filterType === 'PLAYED') return q.status === QuestionStatus.PLAYED;
    if (filterType === 'TAKEN') return q.status === QuestionStatus.PLAYED && q.isAnsweredCorrectly;
    return true;
  });

  const getGameName = (gameId?: string) => games.find(g => g.id === gameId)?.name || "Неизвестная игра";

  const getStatusBadge = (q: Question) => {
    if (q.status === QuestionStatus.PLAYED) {
      if (q.isAnsweredCorrectly === true) return <span className="px-2 py-1 rounded bg-red-900 text-red-200 border border-red-500 text-xs font-bold uppercase">Взят знатоками 1:0</span>;
      if (q.isAnsweredCorrectly === false) return <span className="px-2 py-1 rounded bg-gold-600 text-owl-900 border border-gold-400 text-xs font-bold uppercase">Победа зрителя 0:1</span>;
      return <span className="px-2 py-1 rounded bg-gray-600 text-white border border-gray-500 text-xs font-bold uppercase">Сыгран</span>;
    }
     const labels: any = {
      [QuestionStatus.PENDING]: 'На рассмотрении',
      [QuestionStatus.APPROVED]: 'Одобрен',
      [QuestionStatus.REJECTED]: 'Отклонен',
      [QuestionStatus.SELECTED]: 'Отобран на игру',
      [QuestionStatus.NOT_PLAYED]: 'Не выпал',
    };
    return <span className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs font-bold uppercase">{labels[q.status] || q.status}</span>;
  };
  
  const activeInvitations = games.filter(g => g.expertIds?.includes(userId));

  return (
    <div className="max-w-5xl mx-auto mt-6 px-4 pb-20">
      
      {/* Game Invitations Notification */}
      {activeInvitations.length > 0 && (
         <div className="mb-6 space-y-2 animate-in fade-in slide-in-from-top-4">
            {activeInvitations.map(g => (
               <div key={g.id} className="bg-gradient-to-r from-purple-900/80 to-owl-900 p-4 rounded-xl border border-purple-500/50 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="bg-purple-500/20 p-2 rounded-full">
                        <Sparkles className="text-purple-300 animate-pulse" size={20} />
                     </div>
                     <div>
                        <h4 className="font-bold text-white text-lg">Вы в составе знатоков!</h4>
                        <p className="text-purple-200 text-sm">Вы отобраны для участия в игре: <strong>{g.name}</strong> ({new Date(g.date).toLocaleDateString()})</p>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Navigation Tabs (Mobile optimized scroll) */}
      <div className="flex justify-center mb-6 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="bg-owl-800 p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-xl whitespace-nowrap min-w-max">
           <button onClick={() => setActiveTab('club')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'club' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <Newspaper size={18} /> Жизнь клуба
           </button>
           <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <User size={18} /> Профиль
           </button>
           <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <List size={18} /> Мои вопросы <span className="bg-owl-900/30 px-1.5 rounded-full text-xs hidden sm:inline">{totalQuestions}</span>
           </button>
           <button onClick={() => setActiveTab('send')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'send' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <Send size={18} /> Отправить
           </button>
        </div>
      </div>

      {activeTab === 'club' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
           {/* NEWS FEED */}
           <div className="md:col-span-2 space-y-6">
              <h3 className="text-xl font-bold text-white mb-2 font-serif flex items-center gap-2"><Newspaper size={20}/> Новости</h3>
              {announcements.length === 0 ? <p className="text-gray-500 bg-owl-800 p-4 rounded-lg">Пока новостей нет.</p> : (
                 announcements.map(a => (
                    <div key={a.id} className="bg-owl-800 rounded-xl border border-white/10 overflow-hidden shadow-lg">
                       {a.imageUrl && <div className="h-48 w-full bg-owl-900"><img src={a.imageUrl} className="w-full h-full object-cover"/></div>}
                       <div className="p-6">
                          <h4 className="text-2xl font-bold text-white mb-2">{a.title}</h4>
                          <p className="text-gray-300 whitespace-pre-wrap mb-4 leading-relaxed">{a.message}</p>
                          {a.linkUrl && (
                             <a href={a.linkUrl} target="_blank" className="inline-flex items-center gap-2 bg-gold-600 text-owl-900 font-bold px-4 py-2 rounded hover:bg-gold-500 transition">
                                {a.linkText || 'Подробнее'} <ExternalLink size={16}/>
                             </a>
                          )}
                          <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500 flex justify-between">
                            <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                            <span>Просмотров: {a.views || 0}</span>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>

           {/* POLLS SIDEBAR */}
           <div>
              <h3 className="text-xl font-bold text-white mb-4 font-serif flex items-center gap-2"><List size={20}/> Опросы</h3>
              <div className="space-y-4">
                 {polls.map(poll => {
                    const totalVotes = (Object.values(poll.results || {}) as number[]).reduce((a, b) => a + b, 0);
                    return (
                       <div key={poll.id} className="bg-owl-800 rounded-xl border border-white/10 p-5 shadow-lg">
                          <h4 className="font-bold text-white mb-4">{poll.question}</h4>
                          <div className="space-y-2">
                             {poll.options.map((opt, idx) => {
                                const votes = poll.results?.[idx] || 0;
                                const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                const isSelected = poll.userVoteIndex === idx;
                                
                                return (
                                   <button 
                                     key={idx} 
                                     disabled={poll.userVoteIndex !== undefined}
                                     onClick={() => handleVote(poll.id, idx)}
                                     className={`w-full relative overflow-hidden rounded-lg border p-2 transition text-left ${isSelected ? 'border-gold-500 bg-gold-500/10' : 'border-white/10 bg-owl-900 hover:bg-owl-900/80'}`}
                                   >
                                      <div className="absolute inset-0 bg-white/5 origin-left transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                      <div className="relative flex justify-between items-center z-10">
                                         <span className={`text-sm ${isSelected ? 'text-gold-500 font-bold' : 'text-gray-300'}`}>{opt}</span>
                                         {poll.userVoteIndex !== undefined && <span className="text-xs font-bold text-gray-500">{percent}%</span>}
                                      </div>
                                   </button>
                                )
                             })}
                          </div>
                          <div className="mt-3 text-xs text-gray-500 text-right">{totalVotes} голосов</div>
                       </div>
                    )
                 })}
                 {polls.length === 0 && <div className="text-gray-500 text-sm p-4 bg-owl-800 rounded border border-white/5">Нет активных опросов</div>}
              </div>
           </div>
         </div>
      )}

      {activeTab === 'profile' && profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-owl-800 rounded-xl border border-white/10 p-6 flex flex-col items-center text-center shadow-lg relative h-fit">
             {profileMessage && (
               <div className="absolute top-2 left-2 right-2 bg-green-500/90 text-white text-xs py-1 rounded shadow animate-in fade-in slide-in-from-top-1 z-10">
                 {profileMessage}
               </div>
             )}
             
             <div className="relative group mb-4 mt-2">
                <div className="w-32 h-32 rounded-full border-4 border-gold-500/30 overflow-hidden bg-owl-900 flex items-center justify-center">
                  {profile.avatarUrl 
                    ? <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <User size={48} className="text-gold-500/50" />
                  }
                </div>
                <label className="absolute bottom-0 right-0 bg-gold-500 text-owl-900 p-2 rounded-full cursor-pointer hover:bg-white transition shadow-lg">
                  {uploadingAvatar ? <RefreshCw className="animate-spin" size={16} /> : <Camera size={16} />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
             </div>

             {isEditingProfile ? (
               <div className="w-full space-y-3">
                 <input className="w-full bg-owl-900 border border-white/20 rounded p-2 text-white text-center" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ваше имя" />
                 <div className="relative">
                   <span className="absolute left-3 top-2 text-gray-500">@</span>
                   <input className="w-full bg-owl-900 border border-white/20 rounded p-2 pl-7 text-white" value={editTelegram} onChange={e => setEditTelegram(e.target.value)} placeholder="Telegram" />
                 </div>
                 <button disabled={savingProfile} onClick={handleSaveProfile} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-medium flex items-center justify-center gap-2">
                   {savingProfile ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} 
                   Сохранить
                 </button>
               </div>
             ) : (
               <>
                 <h2 className="text-2xl font-bold text-white mb-1">{profile.fullName || 'Аноним'}</h2>
                 <p className="text-gray-400 mb-4 text-sm break-all">{userEmail}</p>
                 {profile.telegram && <a href={`https://t.me/${profile.telegram}`} target="_blank" className="text-blue-400 hover:underline text-sm mb-4">@{profile.telegram}</a>}
                 
                 <div className="flex gap-2 flex-wrap justify-center">
                    {profile.isExpert && <span className="px-3 py-1 bg-purple-900/50 text-purple-200 border border-purple-500/30 rounded-full text-xs font-bold">🎓 Знаток клуба</span>}
                    <span className="px-3 py-1 bg-gold-900/20 text-gold-500 border border-gold-500/30 rounded-full text-xs font-bold">{EXPERT_STATUS_MAP[profile.expertStatus]}</span>
                 </div>

                 <button onClick={() => setIsEditingProfile(true)} className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition"><Edit2 size={14}/> Редактировать</button>
               </>
             )}
          </div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('ALL'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Всего отправлено</div>
              <div className="text-4xl font-bold text-white">{totalQuestions}</div>
            </div>
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10">
              <div className="text-gray-400 text-sm mb-1">Одобрено редакцией</div>
              <div className="text-4xl font-bold text-green-400">{approvedQuestions}</div>
            </div>
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('PLAYED'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Сыграно в эфире</div>
              <div className="text-4xl font-bold text-gold-500">{playedQuestions}</div>
            </div>
             <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('TAKEN'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Взято знатоками</div>
              <div className="text-4xl font-bold text-red-400">{takenQuestions} <span className="text-lg text-gray-600 font-normal">/ {notTakenQuestions} (Вы)</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'send' && profile && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <ViewerForm userProfile={profile} userEmail={userEmail} onSuccess={() => setActiveTab('history')} />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           {/* History Filter Bar */}
           <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
             <Filter size={16} className="text-gray-500 flex-shrink-0" />
             <button onClick={() => setFilterType('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
             <button onClick={() => setFilterType('PLAYED')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'PLAYED' ? 'bg-gold-500 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Сыгранные</button>
             <button onClick={() => setFilterType('TAKEN')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'TAKEN' ? 'bg-red-500 text-white' : 'bg-owl-800 text-gray-400'}`}>Взятые</button>
           </div>

           {filteredQuestions.length === 0 ? (
             <div className="text-center py-20 text-gray-500">Вопросов не найдено.</div>
           ) : (
             filteredQuestions.map(q => (
               <div key={q.id} className="bg-owl-800 border border-white/10 rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                     <div className="space-y-2">
                        {getStatusBadge(q)}
                        {q.gameId && <div className="text-gold-500 text-sm font-medium">📺 {getGameName(q.gameId)}</div>}
                     </div>
                     <span className="text-xs text-gray-500">{new Date(q.submissionDate).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">{q.questionText}</h4>
                  
                  {/* Images */}
                  {q.imageUrls && q.imageUrls.length > 0 && (
                    <div className="flex gap-2 my-3 overflow-x-auto">
                      {q.imageUrls.map((url, i) => (
                        <img key={i} src={url} className="w-16 h-16 object-cover rounded border border-white/20 flex-shrink-0" alt="attachment" />
                      ))}
                    </div>
                  )}

                  <div className="bg-owl-900/50 p-3 rounded text-sm text-gray-400 mt-3 border border-white/5">
                     <span className="text-gray-500 block text-xs mb-1">Ответ:</span>
                     {q.answerText}
                  </div>
                  {q.feedback && <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded text-red-200 text-sm"><strong>Комментарий:</strong> {q.feedback}</div>}
               </div>
             ))
           )}
        </div>
      )}
    </div>
  );
};
