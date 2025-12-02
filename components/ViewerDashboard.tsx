
import React, { useEffect, useState } from 'react';
import { ViewerForm } from './ViewerForm';
import { getMyQuestions, getGames, getUserProfile, updateUserProfile, uploadImage, getAnnouncements, getActivePolls, votePoll, incrementAnnouncementViews, hideItem, getHiddenItemIds } from '../services/storageService';
import { Question, Game, QuestionStatus, UserProfile, ExpertStatus, Announcement, Poll } from '../types';
import { User, List, Send, RefreshCw, Trophy, Edit2, Check, Camera, Filter, Loader2, Star, Sparkles, Newspaper, ExternalLink, Archive, EyeOff, Plus, X, CheckSquare, Circle } from 'lucide-react';

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
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  
  const [showArchive, setShowArchive] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editExpertise, setEditExpertise] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'PLAYED' | 'TAKEN'>('ALL');

  const loadData = async () => {
    setLoading(true);
    const [pData, qData, gData, aData, pollsData, hData] = await Promise.all([
      getUserProfile(userId),
      getMyQuestions(userId),
      getGames(),
      getAnnouncements(),
      getActivePolls(userId),
      getHiddenItemIds(userId)
    ]);
    
    const userProfile = pData || {
      id: userId,
      fullName: '',
      telegram: '',
      avatarUrl: '',
      expertStatus: 'NOVICE',
      isExpert: false,
      expertise: []
    };
    
    setProfile(userProfile);
    setMyQuestions(qData);
    setGames(gData);
    setAnnouncements(aData);
    setPolls(pollsData);
    setHiddenItemIds(hData);
    setEditName(userProfile.fullName);
    setEditTelegram(userProfile.telegram);
    setEditExpertise(userProfile.expertise || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'club' && announcements.length > 0) {
      const visibleIds = announcements.filter(a => !hiddenItemIds.includes(a.id)).map(a => a.id);
      if (visibleIds.length > 0) incrementAnnouncementViews(visibleIds);
    }
  }, [activeTab, announcements.length]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setProfileMessage(null);
    const success = await updateUserProfile(userId, { fullName: editName, telegram: editTelegram, expertise: editExpertise });
    if (success) {
      setProfile({ ...profile, fullName: editName, telegram: editTelegram, expertise: editExpertise });
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

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!editExpertise.includes(newTag.trim())) {
         setEditExpertise([...editExpertise, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditExpertise(editExpertise.filter(t => t !== tag));
  };

  const handleVote = async (pollId: string, idx: number) => {
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) return;
    const currentPoll = polls[pollIndex];
    let newIndices = [...(currentPoll.userVoteIndices || [])];
    let newResults = { ...(currentPoll.results || {}) };
    const isSelected = newIndices.includes(idx);
    if (isSelected) {
      newIndices = newIndices.filter(i => i !== idx);
      newResults[idx] = Math.max(0, (newResults[idx] || 1) - 1);
    } else {
      if (!currentPoll.allowMultiple) {
        newIndices.forEach(oldIdx => {
           newResults[oldIdx] = Math.max(0, (newResults[oldIdx] || 1) - 1);
        });
        newIndices = [idx];
      } else {
        newIndices.push(idx);
      }
      newResults[idx] = (newResults[idx] || 0) + 1;
    }
    const updatedPolls = [...polls];
    updatedPolls[pollIndex] = { ...currentPoll, userVoteIndices: newIndices, results: newResults };
    setPolls(updatedPolls);
    await votePoll(pollId, userId, idx);
  };

  const handleHideItem = async (itemId: string, type: 'ANNOUNCEMENT' | 'POLL') => {
    setHiddenItemIds(prev => [...prev, itemId]);
    await hideItem(userId, itemId, type);
  };

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
  const displayedAnnouncements = announcements.filter(a => showArchive ? hiddenItemIds.includes(a.id) : !hiddenItemIds.includes(a.id));
  const displayedPolls = polls.filter(p => showArchive ? hiddenItemIds.includes(p.id) : !hiddenItemIds.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto mt-6 px-4 pb-20">
      {activeInvitations.length > 0 && (
         <div className="mb-6 space-y-2 animate-in fade-in slide-in-from-top-4">
            {activeInvitations.map(g => (
               <div key={g.id} className="bg-gradient-to-r from-purple-900/80 to-owl-900 p-4 rounded-xl border border-purple-500/50 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="bg-purple-500/20 p-2 rounded-full"><Sparkles className="text-purple-300 animate-pulse" size={20} /></div>
                     <div><h4 className="font-bold text-white text-lg">Вы в составе знатоков!</h4><p className="text-purple-200 text-sm">Вы отобраны для участия в игре: <strong>{g.name}</strong> ({new Date(g.date).toLocaleDateString()})</p></div>
                  </div>
               </div>
            ))}
         </div>
      )}

      <div className="flex justify-center mb-6 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="bg-owl-800 p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-xl whitespace-nowrap min-w-max">
           <button onClick={() => setActiveTab('club')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'club' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}><Newspaper size={18} /> Жизнь клуба</button>
           <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}><User size={18} /> Профиль</button>
           <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}><List size={18} /> Мои вопросы <span className="bg-owl-900/30 px-1.5 rounded-full text-xs hidden sm:inline">{totalQuestions}</span></button>
           <button onClick={() => setActiveTab('send')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'send' ? 'bg-gold-500 text-owl-900 shadow' : 'text-gray-400 hover:text-white'}`}><Send size={18} /> Отправить</button>
        </div>
      </div>

      {activeTab === 'club' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
           <div className="md:col-span-3 flex justify-end">
              <button onClick={() => setShowArchive(!showArchive)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition ${showArchive ? 'bg-gray-700 text-white border-gray-600' : 'text-gray-400 border-white/5 hover:text-white'}`}><Archive size={16}/> {showArchive ? 'Назад к актуальному' : 'Архив / Скрытое'}</button>
           </div>
           <div className="md:col-span-2 space-y-6">
              <h3 className="text-xl font-bold text-white mb-2 font-serif flex items-center gap-2"><Newspaper size={20}/> Новости</h3>
              {displayedAnnouncements.length === 0 ? <p className="text-gray-500 bg-owl-800 p-4 rounded-lg">Новостей нет.</p> : (
                 displayedAnnouncements.map(a => (
                      <div key={a.id} className="bg-owl-800 rounded-xl border border-white/10 overflow-hidden shadow-lg group">
                         {/* CRITICAL FIX: Use the guaranteed imageUrl field from the service */}
                         {a.imageUrl && (
                            <div className="h-56 w-full bg-owl-900 relative">
                               <img src={a.imageUrl} className="w-full h-full object-cover" alt="News" />
                            </div>
                         )}
                         <div className="p-6 relative">
                            {!showArchive && <button onClick={() => handleHideItem(a.id, 'ANNOUNCEMENT')} className="absolute top-4 right-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition" title="Скрыть"><EyeOff size={18}/></button>}
                            <h4 className="text-2xl font-bold text-white mb-2 pr-6">{a.title}</h4>
                            <p className="text-gray-300 whitespace-pre-wrap mb-4 leading-relaxed">{a.message}</p>
                            {a.linkUrl && <a href={a.linkUrl} target="_blank" className="inline-flex items-center gap-2 bg-gold-600 text-owl-900 font-bold px-4 py-2 rounded hover:bg-gold-500 transition">{a.linkText || 'Подробнее'} <ExternalLink size={16}/></a>}
                            <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500 flex justify-between"><span>{new Date(a.createdAt).toLocaleDateString()}</span><span>Просмотров: {a.views || 0}</span></div>
                         </div>
                      </div>
                    ))
              )}
           </div>
           <div>
              <h3 className="text-xl font-bold text-white mb-4 font-serif flex items-center gap-2"><List size={20}/> Опросы</h3>
              <div className="space-y-4">
                 {displayedPolls.map(poll => {
                    const totalVotes = (Object.values(poll.results || {}) as number[]).reduce((a, b) => a + b, 0);
                    const isExpired = poll.endsAt ? Date.now() > poll.endsAt : false;
                    return (
                       <div key={poll.id} className="bg-owl-800 rounded-xl border border-white/10 p-5 shadow-lg relative group">
                          {!showArchive && <button onClick={() => handleHideItem(poll.id, 'POLL')} className="absolute top-2 right-2 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition" title="Скрыть"><EyeOff size={14}/></button>}
                          <div className="flex justify-between items-start mb-4 pr-6"><h4 className="font-bold text-white">{poll.question}</h4></div>
                          {isExpired && <div className="bg-red-900/30 text-red-300 text-xs font-bold px-2 py-1 rounded border border-red-500/20 mb-3 inline-block">Голосование завершено</div>}
                          {poll.allowMultiple && <div className="text-[10px] text-gray-400 mb-2 italic">Можно выбрать несколько вариантов</div>}
                          <div className="space-y-2">
                             {poll.options.map((opt, idx) => {
                                const votes = poll.results?.[idx] || 0;
                                const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                const isSelected = poll.userVoteIndices ? poll.userVoteIndices.includes(idx) : false;
                                return (
                                   <button key={idx} disabled={isExpired} onClick={() => handleVote(poll.id, idx)} className={`w-full relative overflow-hidden rounded-lg border p-2 transition text-left ${isSelected ? 'border-gold-500 bg-gold-500/10' : 'border-white/10 bg-owl-900 hover:bg-owl-900/80'} ${isExpired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                      <div className="absolute inset-0 bg-white/5 origin-left transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                      <div className="relative flex justify-between items-center z-10">
                                         <span className={`text-sm flex items-center gap-2 ${isSelected ? 'text-gold-500 font-bold' : 'text-gray-300'}`}>
                                            {poll.allowMultiple ? (isSelected ? <CheckSquare size={14}/> : <div className="w-3.5 h-3.5 border border-gray-500 rounded-sm"/>) : (isSelected ? <div className="w-3.5 h-3.5 bg-gold-500 rounded-full"/> : <Circle size={14} className="text-gray-500"/>)}{opt}
                                         </span>
                                         {(poll.userVoteIndices?.length || isExpired) ? <span className="text-xs font-bold text-gray-500">{percent}%</span> : null}
                                      </div>
                                   </button>
                                )
                             })}
                          </div>
                          <div className="mt-3 text-xs text-gray-500 text-right">{totalVotes} голосов</div>
                       </div>
                    )
                 })}
                 {displayedPolls.length === 0 && <div className="text-gray-500 text-sm p-4 bg-owl-800 rounded border border-white/5">Нет опросов</div>}
              </div>
           </div>
         </div>
      )}
      {/* Profile and History Tabs (kept identical) */}
      {activeTab === 'profile' && profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="md:col-span-1 bg-owl-800 rounded-xl border border-white/10 p-6 flex flex-col items-center text-center shadow-lg relative h-fit">
             {profileMessage && <div className="absolute top-2 left-2 right-2 bg-green-500/90 text-white text-xs py-1 rounded shadow animate-in fade-in slide-in-from-top-1 z-10">{profileMessage}</div>}
             <div className="relative group mb-4 mt-2">
                <div className="w-32 h-32 rounded-full border-4 border-gold-500/30 overflow-hidden bg-owl-900 flex items-center justify-center">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={48} className="text-gold-500/50" />}
                </div>
                <label className="absolute bottom-0 right-0 bg-gold-500 text-owl-900 p-2 rounded-full cursor-pointer hover:bg-white transition shadow-lg">{uploadingAvatar ? <RefreshCw className="animate-spin" size={16} /> : <Camera size={16} />}<input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></label>
             </div>
             {isEditingProfile ? (
               <div className="w-full space-y-3">
                 <input className="w-full bg-owl-900 border border-white/20 rounded p-2 text-white text-center" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ваше имя" />
                 <div className="relative"><span className="absolute left-3 top-2 text-gray-500">@</span><input className="w-full bg-owl-900 border border-white/20 rounded p-2 pl-7 text-white" value={editTelegram} onChange={e => setEditTelegram(e.target.value)} placeholder="Telegram" /></div>
                 <div className="text-left">
                    <label className="text-xs text-gray-400 block mb-1">Сферы знаний</label>
                    <div className="flex flex-wrap gap-1 mb-2">{editExpertise.map((tag, i) => (<span key={i} className="px-2 py-0.5 bg-owl-900 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1">{tag} <button onClick={() => handleRemoveTag(tag)}><X size={10} className="hover:text-red-400"/></button></span>))}</div>
                    <div className="flex gap-1"><input className="flex-1 bg-owl-900 border border-white/20 rounded p-2 text-white text-xs" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={handleAddTag} placeholder="Спорт, История (Enter)" /><button onClick={() => {if(newTag) handleAddTag({key:'Enter', preventDefault:()=>{}} as any)}} className="bg-white/10 px-2 rounded hover:bg-white/20"><Plus size={16}/></button></div>
                 </div>
                 <button disabled={savingProfile} onClick={handleSaveProfile} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-medium flex items-center justify-center gap-2 mt-4">{savingProfile ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} Сохранить</button>
               </div>
             ) : (
               <>
                 <h2 className="text-2xl font-bold text-white mb-1">{profile.fullName || 'Аноним'}</h2>
                 <p className="text-gray-400 mb-4 text-sm break-all">{userEmail}</p>
                 {profile.telegram && <a href={`https://t.me/${profile.telegram}`} target="_blank" className="text-blue-400 hover:underline text-sm mb-4">@{profile.telegram}</a>}
                 <div className="flex gap-2 flex-wrap justify-center mb-4">
                    {profile.isExpert && <span className="px-3 py-1 bg-purple-900/50 text-purple-200 border border-purple-500/30 rounded-full text-xs font-bold">🎓 Знаток клуба</span>}
                    <span className="px-3 py-1 bg-gold-900/20 text-gold-500 border border-gold-500/30 rounded-full text-xs font-bold">{EXPERT_STATUS_MAP[profile.expertStatus]}</span>
                 </div>
                 {profile.expertise && profile.expertise.length > 0 && (<div className="flex flex-wrap gap-1 justify-center mb-4">{profile.expertise.map((tag, i) => (<span key={i} className="px-2 py-1 bg-owl-900 border border-white/10 rounded-full text-[10px] text-gray-400">{tag}</span>))}</div>)}
                 <button onClick={() => setIsEditingProfile(true)} className="mt-auto flex items-center gap-2 text-sm text-gray-500 hover:text-white transition"><Edit2 size={14}/> Редактировать</button>
               </>
             )}
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('ALL'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Всего отправлено</div><div className="text-4xl font-bold text-white">{totalQuestions}</div>
            </div>
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10">
              <div className="text-gray-400 text-sm mb-1">Одобрено редакцией</div><div className="text-4xl font-bold text-green-400">{approvedQuestions}</div>
            </div>
            <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('PLAYED'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Сыграно в эфире</div><div className="text-4xl font-bold text-gold-500">{playedQuestions}</div>
            </div>
             <div className="bg-owl-800 p-6 rounded-xl border border-white/10 hover:border-gold-500/30 transition cursor-pointer" onClick={() => {setFilterType('TAKEN'); setActiveTab('history')}}>
              <div className="text-gray-400 text-sm mb-1">Взято знатоками</div><div className="text-4xl font-bold text-red-400">{takenQuestions} <span className="text-lg text-gray-600 font-normal">/ {notTakenQuestions} (Вы)</span></div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'send' && profile && (
        <div className="animate-in fade-in slide-in-from-bottom-4"><ViewerForm userProfile={profile} userEmail={userEmail} onSuccess={() => setActiveTab('history')} /></div>
      )}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
             <Filter size={16} className="text-gray-500 flex-shrink-0" />
             <button onClick={() => setFilterType('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
             <button onClick={() => setFilterType('PLAYED')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'PLAYED' ? 'bg-gold-500 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Сыгранные</button>
             <button onClick={() => setFilterType('TAKEN')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'TAKEN' ? 'bg-red-500 text-white' : 'bg-owl-800 text-gray-400'}`}>Взятые</button>
           </div>
           {filteredQuestions.length === 0 ? (<div className="text-center py-20 text-gray-500">Вопросов не найдено.</div>) : (filteredQuestions.map(q => (
               <div key={q.id} className="bg-owl-800 border border-white/10 rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                     <div className="space-y-2">{getStatusBadge(q)}{q.gameId && <div className="text-gold-500 text-sm font-medium">📺 {getGameName(q.gameId)}</div>}</div>
                     <span className="text-xs text-gray-500">{new Date(q.submissionDate).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">{q.questionText}</h4>
                  {q.imageUrls && q.imageUrls.length > 0 && (<div className="flex gap-2 my-3 overflow-x-auto">{q.imageUrls.map((url, i) => (<img key={i} src={url} className="w-16 h-16 object-cover rounded border border-white/20 flex-shrink-0" alt="attachment" />))}</div>)}
                  <div className="bg-owl-900/50 p-3 rounded text-sm text-gray-400 mt-3 border border-white/5"><span className="text-gray-500 block text-xs mb-1">Ответ:</span>{q.answerText}</div>
                  {q.feedback && <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded text-red-200 text-sm"><strong>Комментарий:</strong> {q.feedback}</div>}
               </div>
             ))
           )}
        </div>
      )}
    </div>
  );
};
