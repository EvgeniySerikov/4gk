
import React, { useEffect, useState } from 'react';
import { ViewerForm } from './ViewerForm';
import { getMyQuestions, getGames, getUserProfile, updateUserProfile, uploadImage } from '../services/storageService';
import { Question, Game, QuestionStatus, UserProfile } from '../types';
import { User, List, Send, RefreshCw, Trophy, Edit2, Check, Camera, Filter } from 'lucide-react';

interface ViewerDashboardProps {
  userId: string;
  userEmail: string;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ userId, userEmail }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'send' | 'history'>('profile');
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'PLAYED' | 'TAKEN'>('ALL');

  const loadData = async () => {
    setLoading(true);
    const [pData, qData, gData] = await Promise.all([
      getUserProfile(userId),
      getMyQuestions(userId),
      getGames()
    ]);
    
    // Auto-create local profile if missing
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
    setEditName(userProfile.fullName);
    setEditTelegram(userProfile.telegram);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    await updateUserProfile(userId, { fullName: editName, telegram: editTelegram });
    setProfile({ ...profile, fullName: editName, telegram: editTelegram });
    setIsEditingProfile(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploadingAvatar(true);
    const url = await uploadImage(e.target.files[0]);
    if (url) {
       await updateUserProfile(userId, { avatarUrl: url });
       setProfile({ ...profile, avatarUrl: url });
    }
    setUploadingAvatar(false);
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
    // ... return other status badges same as before ...
     const labels: any = {
      [QuestionStatus.PENDING]: 'На рассмотрении',
      [QuestionStatus.APPROVED]: 'Одобрен',
      [QuestionStatus.REJECTED]: 'Отклонен',
      [QuestionStatus.SELECTED]: 'Отобран на игру',
      [QuestionStatus.NOT_PLAYED]: 'Не выпал',
    };
    return <span className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs font-bold uppercase">{labels[q.status] || q.status}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto mt-6 px-4 pb-20">
      
      {/* Navigation Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-owl-800 p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-xl">
           <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <User size={18} /> Профиль
           </button>
           <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <List size={18} /> Мои вопросы <span className="bg-owl-900/30 px-1.5 rounded-full text-xs">{totalQuestions}</span>
           </button>
           <button onClick={() => setActiveTab('send')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'send' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}>
             <Send size={18} /> Отправить
           </button>
        </div>
      </div>

      {activeTab === 'profile' && profile && (
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-owl-800 rounded-xl border border-white/10 p-6 flex flex-col items-center text-center shadow-lg">
             <div className="relative group mb-4">
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
                 <button onClick={handleSaveProfile} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-medium flex items-center justify-center gap-2"><Check size={16}/> Сохранить</button>
               </div>
             ) : (
               <>
                 <h2 className="text-2xl font-bold text-white mb-1">{profile.fullName || 'Аноним'}</h2>
                 <p className="text-gray-400 mb-4">{userEmail}</p>
                 {profile.telegram && <a href={`https://t.me/${profile.telegram}`} target="_blank" className="text-blue-400 hover:underline text-sm mb-4">@{profile.telegram}</a>}
                 
                 <div className="flex gap-2">
                    {profile.isExpert && <span className="px-3 py-1 bg-purple-900/50 text-purple-200 border border-purple-500/30 rounded-full text-xs font-bold">🎓 Знаток клуба</span>}
                    <span className="px-3 py-1 bg-gold-900/20 text-gold-500 border border-gold-500/30 rounded-full text-xs font-bold">{profile.expertStatus}</span>
                 </div>

                 <button onClick={() => setIsEditingProfile(true)} className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition"><Edit2 size={14}/> Редактировать</button>
               </>
             )}
          </div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
        <ViewerForm userProfile={profile} userEmail={userEmail} onSuccess={() => setActiveTab('history')} />
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           {/* History Filter Bar */}
           <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
             <Filter size={16} className="text-gray-500" />
             <button onClick={() => setFilterType('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${filterType === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
             <button onClick={() => setFilterType('PLAYED')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${filterType === 'PLAYED' ? 'bg-gold-500 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Сыгранные</button>
             <button onClick={() => setFilterType('TAKEN')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${filterType === 'TAKEN' ? 'bg-red-500 text-white' : 'bg-owl-800 text-gray-400'}`}>Взятые</button>
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
                    <div className="flex gap-2 my-3">
                      {q.imageUrls.map((url, i) => (
                        <img key={i} src={url} className="w-16 h-16 object-cover rounded border border-white/20" alt="attachment" />
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
