
import React, { useEffect, useState } from 'react';
import { getQuestions, updateQuestionStatus, getGames, saveGame, updateQuestionData, getAllUsers, updateUserProfile, updateGameExperts, createAnnouncement, updateAnnouncement, deleteAnnouncement, createPoll, updatePoll, deletePoll, getActivePolls, getPollVotesDetails, uploadImage, getAnnouncements } from '../services/storageService';
import { Question, QuestionStatus, Game, QuestionTag, UserProfile, ExpertStatus, Poll, Announcement, PollVoteDetail } from '../types';
import { Check, X, Folder, Box, Zap, Flame, Loader2, RefreshCw, Send as SendIcon, Plus, Eye, EyeOff, Users, User as UserIcon, MessageSquare, BarChart2, Paperclip, Activity, GraduationCap, ThumbsUp, ThumbsDown, Calendar, Crown, Trash2, Edit2, ImageIcon } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

const STATUS_MAP: Record<QuestionStatus, string> = {
  [QuestionStatus.PENDING]: 'На рассмотрении',
  [QuestionStatus.APPROVED]: 'Одобрен',
  [QuestionStatus.REJECTED]: 'Отклонен',
  [QuestionStatus.SELECTED]: 'Отобран на игру',
  [QuestionStatus.PLAYED]: 'Сыгран',
  [QuestionStatus.NOT_PLAYED]: 'Не выпал'
};

const TAG_MAP: Record<QuestionTag, string> = {
  'BLACK_BOX': 'Черный ящик',
  'BLITZ': 'Блиц',
  'SUPER_BLITZ': 'Суперблиц'
};

const EXPERT_STATUS_MAP: Record<ExpertStatus, string> = {
  'NOVICE': 'Новичок',
  'EXPERIENCED': 'Опытный',
  'MASTER': 'Магистр'
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'questions' | 'users' | 'communication'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showGameModal, setShowGameModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [managingGameId, setManagingGameId] = useState<string | null>(null);
  const [assigningGameQuestionId, setAssigningGameQuestionId] = useState<string | null>(null);

  const [newGameName, setNewGameName] = useState('');
  
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'ALL'>('ALL');
  const [gameFilter, setGameFilter] = useState<string | 'ALL'>('ALL');

  // Communication Forms
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceLink, setAnnounceLink] = useState('');
  const [announceLinkText, setAnnounceLinkText] = useState('Подробнее');
  const [announceImage, setAnnounceImage] = useState<File | null>(null);
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // Poll Forms
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Да', 'Нет']);
  const [pollEndsAt, setPollEndsAt] = useState(''); 
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [viewingPollId, setViewingPollId] = useState<string | null>(null);
  const [pollDetails, setPollDetails] = useState<PollVoteDetail[]>([]);

  // Edit States
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    
    const [qData, gData, uData, pData, aData] = await Promise.all([
      getQuestions(), 
      getGames(), 
      getAllUsers(), 
      getActivePolls(),
      getAnnouncements()
    ]);
    
    setQuestions(qData);
    setGames(gData);
    setUsers(uData);
    setPolls(pData);
    setAnnouncements(aData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return;
    const game = await saveGame(newGameName);
    if (game) {
      setGames(prev => [game, ...prev]);
      setNewGameName('');
    }
  };

  const handleStatusChange = async (id: string, status: QuestionStatus) => {
    let feedback = undefined;
    if (status === QuestionStatus.REJECTED) {
      const reason = prompt("Причина отказа:");
      if (reason) feedback = reason;
      else return;
    }
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status, feedback } : q));
    await updateQuestionStatus(id, status, feedback);
    loadData();
  };

  const handleSelectForGame = (questionId: string) => {
    setAssigningGameQuestionId(questionId);
  };

  const confirmAssignGame = async (gameId: string) => {
    if (!assigningGameQuestionId) return;
    const q = questions.find(x => x.id === assigningGameQuestionId);
    if (!q) return;

    // Update locally
    const updated = { ...q, status: QuestionStatus.SELECTED, gameId };
    setQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
    
    // Save
    await updateQuestionData(updated);
    await updateQuestionStatus(q.id, QuestionStatus.SELECTED);
    setAssigningGameQuestionId(null);
  };

  const handleToggleTaken = (q: Question) => {
    const newVal = !q.isAnsweredCorrectly;
    const updated = { ...q, isAnsweredCorrectly: newVal };
    setQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
    updateQuestionData(updated);
  };

  const toggleTag = (q: Question, tag: QuestionTag) => {
    const currentTags = q.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    const updated = { ...q, tags: newTags };
    setQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
    updateQuestionData(updated);
  };

  // User Management
  const handleUpdateUserStatus = async (user: UserProfile, status: ExpertStatus) => {
     if(selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, expertStatus: status });
     setUsers(prev => prev.map(u => u.id === user.id ? { ...u, expertStatus: status } : u));
     const success = await updateUserProfile(user.id, { expertStatus: status });
     if (!success) {
        console.error("Failed to update status");
     }
  };

  const handleToggleExpert = async (user: UserProfile) => {
     const newVal = !user.isExpert;
     if(selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, isExpert: newVal });
     setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isExpert: newVal } : u));
     const success = await updateUserProfile(user.id, { isExpert: newVal });
     if (!success) {
        console.error("Failed to toggle expert");
     }
  };

  const handleToggleCaptain = async (user: UserProfile) => {
     const newVal = !user.wasCaptain;
     if(selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, wasCaptain: newVal });
     setUsers(prev => prev.map(u => u.id === user.id ? { ...u, wasCaptain: newVal } : u));
     const success = await updateUserProfile(user.id, { wasCaptain: newVal });
  };

  const handleToggleGameExpert = async (gameId: string, userId: string) => {
     const game = games.find(g => g.id === gameId);
     if(!game) return;
     const currentExperts = game.expertIds || [];
     const newExperts = currentExperts.includes(userId) 
        ? currentExperts.filter(id => id !== userId)
        : [...currentExperts, userId];
     
     const success = await updateGameExperts(gameId, newExperts);
     if(success) {
       setGames(prev => prev.map(g => g.id === gameId ? { ...g, expertIds: newExperts } : g));
     }
  };

  // Communication
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceMsg) return;
    setSendingAnnounce(true);
    let imageUrl = undefined;
    if (announceImage) {
       const url = await uploadImage(announceImage);
       if (url) imageUrl = url;
    }
    const success = await createAnnouncement(announceTitle, announceMsg, imageUrl, announceLink, announceLinkText);
    if (success) {
      alert("Рассылка отправлена!");
      setAnnounceTitle('');
      setAnnounceMsg('');
      setAnnounceLink('');
      setAnnounceImage(null);
      loadData();
    }
    setSendingAnnounce(false);
  };

  const handleDeleteAnnouncement = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Удалить новость?")) {
      setIsLoading(true);
      const success = await deleteAnnouncement(id);
      if (success) {
         await loadData();
      } else {
         alert("Ошибка: не удалось удалить новость.");
      }
      setIsLoading(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    setSendingAnnounce(true);
    let imageUrl: string | undefined = editingAnnouncement.imageUrl;
    
    if (announceImage) {
        const url = await uploadImage(announceImage);
        if (url) imageUrl = url;
    }

    const success = await updateAnnouncement(editingAnnouncement.id, {
       title: announceTitle,
       message: announceMsg,
       imageUrl: imageUrl,
       linkUrl: announceLink,
       linkText: announceLinkText
    });

    if (success) {
       setEditingAnnouncement(null);
       setAnnounceTitle('');
       setAnnounceMsg('');
       setAnnounceLink('');
       setAnnounceImage(null);
       loadData();
    }
    setSendingAnnounce(false);
  };

  const startEditAnnouncement = (a: Announcement) => {
    setEditingAnnouncement(a);
    setAnnounceTitle(a.title);
    setAnnounceMsg(a.message);
    setAnnounceLink(a.linkUrl || '');
    setAnnounceLinkText(a.linkText || 'Подробнее');
    setAnnounceImage(null);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion || pollOptions.some(o => !o.trim())) return;
    setCreatingPoll(true);
    const endsAtTs = pollEndsAt ? new Date(pollEndsAt).getTime() : undefined;
    const success = await createPoll(pollQuestion, pollOptions, endsAtTs, pollAllowMultiple);
    if (success) {
      alert("Опрос создан!");
      setPollQuestion('');
      setPollOptions(['Да', 'Нет']);
      setPollEndsAt('');
      setPollAllowMultiple(false);
      loadData();
    }
    setCreatingPoll(false);
  };

  const handleDeletePoll = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Удалить этот опрос?")) {
      setIsLoading(true);
      const success = await deletePoll(id);
      if (success) {
        await loadData();
      } else {
        alert("Ошибка: не удалось удалить опрос.");
      }
      setIsLoading(false);
    }
  };

  const handleUpdatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoll) return;
    setCreatingPoll(true);
    const endsAtTs = pollEndsAt ? new Date(pollEndsAt).getTime() : undefined;
    const success = await updatePoll(editingPoll.id, {
       question: pollQuestion,
       options: pollOptions,
       endsAt: endsAtTs,
       allowMultiple: pollAllowMultiple
    });
    if (success) {
       setEditingPoll(null);
       setPollQuestion('');
       setPollOptions(['Да', 'Нет']);
       setPollEndsAt('');
       setPollAllowMultiple(false);
       loadData();
    }
    setCreatingPoll(false);
  };

  const startEditPoll = (p: Poll) => {
     setEditingPoll(p);
     setPollQuestion(p.question);
     setPollOptions(p.options);
     setPollEndsAt(p.endsAt ? new Date(p.endsAt).toISOString().split('T')[0] : '');
     setPollAllowMultiple(p.allowMultiple || false);
  };

  const handleViewPollDetails = async (pollId: string) => {
    setViewingPollId(pollId);
    const details = await getPollVotesDetails(pollId);
    setPollDetails(details);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesGame = gameFilter === 'ALL' ? true : gameFilter === 'NONE' ? !q.gameId : q.gameId === gameFilter;
    return matchesStatus && matchesGame;
  });

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-gold-500 flex items-center gap-3">
          Кабинет Ведущего
          {isLoading && <Loader2 className="animate-spin text-gray-500" size={20} />}
        </h2>
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <div className="flex bg-owl-900 p-1 rounded-lg border border-white/5 overflow-x-auto no-scrollbar">
             <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-md transition whitespace-nowrap text-sm font-medium ${activeTab === 'questions' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Вопросы</button>
             <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md transition whitespace-nowrap text-sm font-medium ${activeTab === 'users' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Пользователи</button>
             <button onClick={() => setActiveTab('communication')} className={`px-4 py-2 rounded-md transition whitespace-nowrap text-sm font-medium ${activeTab === 'communication' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Коммуникация</button>
          </div>
          <div className="flex gap-2 lg:ml-auto">
            <button onClick={loadData} className="bg-owl-800 border border-white/10 text-gray-400 px-4 py-2 rounded-lg hover:text-white transition flex-1 sm:flex-none justify-center">
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setShowGameModal(true)} className="flex items-center justify-center gap-2 bg-owl-800 border border-gold-500/30 text-gold-500 px-4 py-2 rounded-lg hover:bg-owl-900 transition whitespace-nowrap flex-1 sm:flex-none">
              <Folder size={18} /> Игры
            </button>
          </div>
        </div>
      </div>

      {/* MODALS: Assign Game */}
      {assigningGameQuestionId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
           <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Выберите игру для вопроса</h3>
              <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
                 {games.length === 0 && <p className="text-gray-500">Нет созданных игр</p>}
                 {games.map(g => (
                    <button 
                      key={g.id} 
                      onClick={() => confirmAssignGame(g.id)}
                      className="w-full text-left p-3 rounded-lg bg-owl-900 hover:bg-gold-600/20 hover:text-gold-500 border border-white/5 transition flex justify-between"
                    >
                       <span className="font-bold">{g.name}</span>
                       <span className="text-xs text-gray-500">{new Date(g.date).toLocaleDateString()}</span>
                    </button>
                 ))}
              </div>
              <button onClick={() => setAssigningGameQuestionId(null)} className="w-full py-2 bg-owl-900 text-gray-400 rounded hover:text-white">Отмена</button>
           </div>
        </div>
      )}

      {/* MODALS: Edit Announcement */}
      {editingAnnouncement && (
         <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
               <h3 className="text-xl font-bold text-white mb-4">Редактировать новость</h3>
               <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
                   <input className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white" placeholder="Заголовок" value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)} required />
                   <textarea className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white" rows={4} value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)} required />
                   <div className="flex flex-col sm:flex-row gap-2">
                      <input className="flex-1 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white" placeholder="Ссылка" value={announceLink} onChange={e => setAnnounceLink(e.target.value)} />
                      <input className="sm:w-1/3 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white" placeholder="Текст кнопки" value={announceLinkText} onChange={e => setAnnounceLinkText(e.target.value)} />
                   </div>
                   <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
                         <Paperclip size={16}/> {announceImage ? announceImage.name : "Изменить изображение"}
                         <input type="file" className="hidden" accept="image/*" onChange={e => setAnnounceImage(e.target.files?.[0] || null)} />
                      </label>
                   </div>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingAnnouncement(null)} className="flex-1 bg-owl-900 py-2 rounded text-gray-400">Отмена</button>
                      <button type="submit" disabled={sendingAnnounce} className="flex-1 bg-gold-600 py-2 rounded text-owl-900 font-bold">Сохранить</button>
                   </div>
               </form>
            </div>
         </div>
      )}

      {/* Game Management Modal */}
      {showGameModal && !managingGameId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Управление Играми</h3>
                <button onClick={() => setShowGameModal(false)}><X className="text-gray-400 hover:text-white" /></button>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 mb-6">
               <input className="flex-1 bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" placeholder="Название новой игры" value={newGameName} onChange={e => setNewGameName(e.target.value)} />
               <button onClick={handleCreateGame} className="px-4 py-3 bg-gold-600 text-owl-900 font-bold rounded-lg hover:bg-gold-500 flex items-center justify-center gap-2"><Plus size={20} /> Создать</button>
             </div>
             <div className="space-y-3">
               {games.map(g => (
                 <div key={g.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-owl-900/50 p-4 rounded-lg border border-white/5 hover:border-gold-500/30 gap-3">
                    <div onClick={() => { setGameFilter(g.id); setShowGameModal(false); setActiveTab('questions'); setStatusFilter('ALL'); }} className="cursor-pointer flex-1 w-full hover:opacity-80">
                      <div className="text-gold-500 font-bold text-lg">{g.name}</div>
                      <div className="text-gray-400 text-sm">{new Date(g.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setManagingGameId(g.id)} className="px-3 py-1 bg-purple-900/40 text-purple-200 text-xs rounded border border-purple-500/30 hover:bg-purple-900/60 whitespace-nowrap">
                          Команда ({g.expertIds?.length || 0})
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* COMMUNICATION TAB */}
      {activeTab === 'communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
           {/* CREATE ANNOUNCEMENT */}
           <div className="space-y-6">
             <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2"><MessageSquare size={20}/> Создать Рассылку</h3>
                <form onSubmit={handleSendAnnouncement} className="space-y-4">
                   <input className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white focus:border-gold-500 outline-none" placeholder="Заголовок новости" value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)} required />
                   <textarea className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white focus:border-gold-500 outline-none" rows={4} placeholder="Текст сообщения для всех пользователей..." value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)} required />
                   <div className="flex flex-col sm:flex-row gap-2">
                      <input className="flex-1 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white focus:border-gold-500 outline-none" placeholder="Ссылка (https://...)" value={announceLink} onChange={e => setAnnounceLink(e.target.value)} />
                      <input className="sm:w-1/3 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white focus:border-gold-500 outline-none" placeholder="Текст кнопки" value={announceLinkText} onChange={e => setAnnounceLinkText(e.target.value)} />
                   </div>
                   <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
                         <Paperclip size={16}/> {announceImage ? announceImage.name : "Прикрепить изображение"}
                         <input type="file" className="hidden" accept="image/*" onChange={e => setAnnounceImage(e.target.files?.[0] || null)} />
                      </label>
                      {announceImage && <button type="button" onClick={() => setAnnounceImage(null)} className="text-red-400 text-xs hover:underline">Удалить</button>}
                   </div>
                   <button type="submit" disabled={sendingAnnounce} className="w-full bg-gold-600 hover:bg-gold-500 text-owl-900 font-bold py-2 rounded flex justify-center items-center gap-2">
                      {sendingAnnounce ? <Loader2 className="animate-spin"/> : <SendIcon size={18}/>} Отправить всем
                   </button>
                </form>
             </div>
             {/* STATS */}
             <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">История новостей</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                   {announcements.map((a) => (
                      <div key={a.id} className="bg-owl-900/50 p-4 rounded border border-white/5 flex flex-col gap-2 relative">
                         <div className="flex justify-between items-start">
                             <div className="min-w-0 pr-2 flex gap-2">
                                 {a.imageUrl && (
                                    <div className="w-10 h-10 rounded bg-black/50 overflow-hidden flex-shrink-0">
                                       <img src={a.imageUrl} alt="" className="w-full h-full object-cover"/>
                                    </div>
                                 )}
                                 <div>
                                    <div className="text-sm text-white font-medium line-clamp-1">{a.title}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1 text-gold-500"><Activity size={10}/> {a.views || 0}</span>
                                    </div>
                                 </div>
                             </div>
                         </div>
                         <div className="flex gap-2 justify-end border-t border-white/5 pt-2 mt-1">
                            <button 
                              type="button"
                              onClick={() => startEditAnnouncement(a)} 
                              className="px-3 py-1 bg-blue-900/30 text-blue-300 text-xs rounded hover:bg-blue-900/50 flex items-center gap-1"
                            >
                              <Edit2 size={12}/> Ред.
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAnnouncement(e, a.id)} 
                              className="px-3 py-1 bg-red-900/30 text-red-300 text-xs rounded hover:bg-red-900/50 flex items-center gap-1 cursor-pointer z-10"
                            >
                              <Trash2 size={12}/> Удалить
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           </div>
           
           {/* POLLS */}
           <div className="space-y-6">
              <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
                 <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2"><BarChart2 size={20}/> Создать Опрос</h3>
                 <form onSubmit={handleCreatePoll} className="space-y-4">
                    <input className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white focus:border-gold-500 outline-none" placeholder="Вопрос" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} required />
                    <div className="space-y-2">
                       {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                             <input className="flex-1 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white focus:border-gold-500 outline-none" placeholder={`Вариант ${idx+1}`} value={opt} onChange={e => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                             }} required />
                             {pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X size={16}/></button>}
                          </div>
                       ))}
                       <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-gold-500 hover:underline">+ Добавить вариант</button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <input type="checkbox" id="pollMultiple" checked={pollAllowMultiple} onChange={e => setPollAllowMultiple(e.target.checked)} className="rounded border-gray-600 bg-owl-900 text-gold-500 focus:ring-gold-500" />
                       <label htmlFor="pollMultiple" className="text-sm text-gray-300">Разрешить выбор нескольких вариантов</label>
                    </div>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Окончание опроса (необязательно)</label>
                       <input type="date" className="w-full bg-owl-900 border border-white/10 rounded p-2 text-white text-sm focus:border-gold-500 outline-none" value={pollEndsAt} onChange={e => setPollEndsAt(e.target.value)} />
                    </div>
                    <button type="submit" disabled={creatingPoll} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded flex justify-center items-center gap-2">
                       {creatingPoll ? <Loader2 className="animate-spin"/> : <Plus size={18}/>} Запустить опрос
                    </button>
                 </form>
              </div>

              <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
                 <h3 className="text-lg font-bold text-white mb-4">Активные опросы</h3>
                 <div className="space-y-4">
                    {polls.map(poll => {
                       const totalVotes = (Object.values(poll.results || {}) as number[]).reduce((a, b) => a + b, 0);
                       const isExpired = poll.endsAt && Date.now() > poll.endsAt;
                       return (
                          <div key={poll.id} className="bg-owl-900/50 p-4 rounded border border-white/5 relative z-0">
                             {isExpired && <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-900/50 text-red-400 text-[10px] uppercase font-bold rounded border border-red-500/20">Окончен</span>}
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-white font-medium text-sm pr-16">{poll.question}</span>
                             </div>
                             <div className="space-y-1 mt-2 mb-3">
                               {poll.options.map((opt, idx) => {
                                  const votes = poll.results?.[idx] || 0;
                                  const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                  return (
                                     <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                                        <div className="w-16 truncate text-right">{opt}</div>
                                        <div className="flex-1 h-1.5 bg-owl-900 rounded-full overflow-hidden border border-white/5">
                                           <div className="h-full bg-gold-500 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <div className="w-6 text-right">{votes}</div>
                                     </div>
                                  )
                               })}
                             </div>
                             <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                <button onClick={() => handleViewPollDetails(poll.id)} className="text-xs bg-gold-600/20 text-gold-500 px-2 py-1 rounded hover:bg-gold-600/30 whitespace-nowrap">Детали</button>
                                <div className="flex gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => startEditPoll(poll)} 
                                      className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded hover:bg-blue-900/50 flex items-center gap-1"
                                    >
                                      <Edit2 size={12}/>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeletePoll(e, poll.id)} 
                                      className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded hover:bg-red-900/50 flex items-center gap-1 cursor-pointer z-10"
                                    >
                                      <Trash2 size={12}/>
                                    </button>
                                </div>
                             </div>
                          </div>
                       )
                    })}
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {/* Users Tab and Questions Tab (Full content restoration) */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
           {users.map(user => (
             <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-owl-800 p-6 rounded-xl border border-white/10 shadow-lg flex flex-col items-center text-center cursor-pointer hover:border-gold-500/50 transition group">
                <div className="w-24 h-24 rounded-full bg-owl-900 border-2 border-gold-500/30 mb-4 overflow-hidden group-hover:scale-105 transition flex-shrink-0">
                   {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-6 text-gray-600"/>}
                </div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-gold-500 transition line-clamp-1">{user.fullName || 'Без имени'}</h3>
                <div className="mt-auto pt-4 flex gap-2 flex-wrap justify-center">
                   {user.isExpert && <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500/30">Знаток</span>}
                   {user.wasCaptain && <span className="text-xs bg-gold-900 text-gold-200 px-2 py-1 rounded border border-gold-500/30"><Crown size={10} className="inline mr-1"/>Кэп</span>}
                   <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600">{EXPERT_STATUS_MAP[user.expertStatus]}</span>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'questions' && (
        <>
          <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-owl-900/50 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
              <button onClick={() => setStatusFilter(QuestionStatus.PENDING)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.PENDING ? 'bg-yellow-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Новые</button>
              <button onClick={() => setStatusFilter(QuestionStatus.APPROVED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.APPROVED ? 'bg-green-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Одобренные</button>
              <button onClick={() => setStatusFilter(QuestionStatus.SELECTED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.SELECTED ? 'bg-purple-600 text-white' : 'bg-owl-800 text-gray-400'}`}>На игру</button>
            </div>
            <div className="lg:ml-auto flex items-center gap-2">
              <span className="text-gray-500 text-sm hidden sm:inline">Игра:</span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                 <button onClick={() => setGameFilter('ALL')} className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${gameFilter === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
                 <button onClick={() => setGameFilter('NONE')} className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${gameFilter === 'NONE' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Без игры</button>
                 {games.map(g => (
                    <button key={g.id} onClick={() => setGameFilter(g.id)} className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${gameFilter === g.id ? 'bg-gold-600 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>{g.name}</button>
                 ))}
              </div>
            </div>
          </div>
          <div className="grid gap-6">
            {filteredQuestions.map(q => (
                <div key={q.id} className="bg-owl-800 rounded-xl border border-white/10 overflow-hidden shadow-lg hover:border-gold-500/30">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                      <div className="flex gap-4">
                         <div className="w-12 h-12 rounded-full bg-owl-900 border border-white/10 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition" onClick={() => { const u = users.find(u => u.id === q.userId); if(u) setSelectedUser(u); }}>
                            {q.authorAvatarUrl ? <img src={q.authorAvatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{q.authorName[0]}</div>}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1">{q.questionText}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="font-medium text-gold-500 cursor-pointer hover:underline" onClick={() => { const u = users.find(u => u.id === q.userId); if(u) setSelectedUser(u); }}>{q.authorName}</span>
                              {q.telegram && <a href={`https://t.me/${q.telegram}`} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline"><SendIcon size={12}/> {q.telegram}</a>}
                            </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 w-full md:w-auto min-w-[150px]">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase self-start md:self-end ${q.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>{STATUS_MAP[q.status]}</span>
                         {q.gameId && <div className="text-gold-500 text-sm font-bold cursor-pointer hover:underline" onClick={() => setGameFilter(q.gameId!)}>📺 {games.find(g => g.id === q.gameId)?.name}</div>}
                      </div>
                    </div>
                    {q.imageUrls && q.imageUrls.length > 0 && (
                      <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                        {q.imageUrls.map((url, i) => (
                           <div key={i} className="relative group w-32 h-32 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                             <img src={url} className="w-full h-full object-cover" />
                             <a href={url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Eye size={20}/></a>
                           </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-owl-900/50 p-4 rounded-lg mb-4 border border-white/5 relative">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-gold-500">Ответ:</p>
                        <button onClick={() => setRevealedAnswers(p => ({...p, [q.id]: !p[q.id]}))} className="text-gray-500 hover:text-white">{revealedAnswers[q.id] ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                      </div>
                      <div className={`text-gray-300 transition-all mb-2 ${revealedAnswers[q.id] ? '' : 'blur-md select-none'}`}>{q.answerText}</div>
                      {q.answerImageUrls && q.answerImageUrls.length > 0 && (
                        <div className={`flex gap-3 overflow-x-auto pb-2 transition-all ${revealedAnswers[q.id] ? '' : 'blur-md pointer-events-none'}`}>
                           {q.answerImageUrls.map((url, i) => (
                             <div key={i} className="w-24 h-24 rounded overflow-hidden border border-white/10 flex-shrink-0"><img src={url} className="w-full h-full object-cover" /></div>
                           ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 items-center">
                      {(q.status === QuestionStatus.APPROVED || q.status === QuestionStatus.SELECTED) && (
                        <div className="flex gap-1 mr-4 border-r border-white/10 pr-4">
                           <button onClick={() => toggleTag(q, 'BLACK_BOX')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('BLACK_BOX') ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}><Box size={14}/> <span className="hidden sm:inline">ЧЯ</span></button>
                           <button onClick={() => toggleTag(q, 'BLITZ')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('BLITZ') ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-yellow-500'}`}><Zap size={14}/> <span className="hidden sm:inline">Блиц</span></button>
                           <button onClick={() => toggleTag(q, 'SUPER_BLITZ')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('SUPER_BLITZ') ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-red-500'}`}><Flame size={14}/> <span className="hidden sm:inline">СБ</span></button>
                        </div>
                      )}
                      {q.status === QuestionStatus.PENDING && (
                        <>
                          <button onClick={() => handleStatusChange(q.id, QuestionStatus.APPROVED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm"><Check size={14}/> Одобрить</button>
                          <button onClick={() => handleStatusChange(q.id, QuestionStatus.REJECTED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"><X size={14}/> Отклонить</button>
                        </>
                      )}
                      {q.status === QuestionStatus.APPROVED && (
                        <button onClick={() => handleSelectForGame(q.id)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-sm">Отобрать на игру</button>
                      )}
                      {(q.status === QuestionStatus.SELECTED || q.status === QuestionStatus.PLAYED) && (
                         <div className="ml-auto flex items-center gap-2">
                            {q.status === QuestionStatus.SELECTED && <button onClick={() => handleStatusChange(q.id, QuestionStatus.PLAYED)} className="bg-gold-600 text-owl-900 px-3 py-1.5 rounded text-sm font-bold">Сыграть</button>}
                            {q.status === QuestionStatus.PLAYED && (
                               <div className="flex items-center bg-owl-900 rounded-lg p-1 border border-white/10">
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${q.isAnsweredCorrectly ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}><ThumbsUp size={12} /> Знатоки</button>
                                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${q.isAnsweredCorrectly === false ? 'bg-gold-500 text-owl-900' : 'text-gray-500 hover:text-white'}`}><ThumbsDown size={12} /> Зрители</button>
                               </div>
                            )}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
