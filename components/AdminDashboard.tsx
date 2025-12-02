
import React, { useEffect, useState } from 'react';
import { getQuestions, updateQuestionStatus, getGames, saveGame, updateQuestionData, getAllUsers, updateUserProfile, updateGameExperts, createAnnouncement, createPoll, getActivePolls, getPollVotesDetails, uploadImage } from '../services/storageService';
import { Question, QuestionStatus, Game, QuestionTag, UserProfile, ExpertStatus, Poll, PollVoteDetail } from '../types';
import { Check, X, Folder, Box, Zap, Flame, Loader2, RefreshCw, Send as SendIcon, Plus, Eye, EyeOff, Users, Image as ImageIcon, ThumbsUp, ThumbsDown, GraduationCap, Star, User, MessageSquare, BarChart2, Paperclip } from 'lucide-react';
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
  'MASTER': 'Магистр',
  'LEGEND': 'Легенда'
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'questions' | 'users' | 'communication'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showGameModal, setShowGameModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [managingGameId, setManagingGameId] = useState<string | null>(null);

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

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Да', 'Нет']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [viewingPollId, setViewingPollId] = useState<string | null>(null);
  const [pollDetails, setPollDetails] = useState<PollVoteDetail[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const [qData, gData, uData, pData] = await Promise.all([getQuestions(), getGames(), getAllUsers(), getActivePolls()]);
    setQuestions(qData);
    setGames(gData);
    setUsers(uData);
    setPolls(pData);
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

  const handleAssignGame = (q: Question, gameId: string) => {
    const updated = { ...q, gameId: gameId === 'NONE' ? undefined : gameId };
    setQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
    updateQuestionData(updated);
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
     const success = await updateUserProfile(user.id, { expertStatus: status });
     if(success) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, expertStatus: status } : u));
     if(selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, expertStatus: status });
  };

  const handleToggleExpert = async (user: UserProfile) => {
     const newVal = !user.isExpert;
     const success = await updateUserProfile(user.id, { isExpert: newVal });
     if(success) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isExpert: newVal } : u));
     if(selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, isExpert: newVal });
  };

  // Team Management
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
    }
    setSendingAnnounce(false);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion || pollOptions.some(o => !o.trim())) return;
    setCreatingPoll(true);
    const success = await createPoll(pollQuestion, pollOptions);
    if (success) {
      alert("Опрос создан!");
      setPollQuestion('');
      setPollOptions(['Да', 'Нет']);
      const pData = await getActivePolls();
      setPolls(pData);
    }
    setCreatingPoll(false);
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

  const getUserQuestions = (userId: string) => questions.filter(q => q.userId === userId);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-serif font-bold text-gold-500 flex items-center gap-3">
          Кабинет Ведущего
          {isLoading && <Loader2 className="animate-spin text-gray-500" size={20} />}
        </h2>
        
        <div className="flex bg-owl-900 p-1 rounded-lg border border-white/5">
           <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-md transition ${activeTab === 'questions' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Вопросы</button>
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md transition ${activeTab === 'users' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Пользователи</button>
           <button onClick={() => setActiveTab('communication')} className={`px-4 py-2 rounded-md transition ${activeTab === 'communication' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Коммуникация</button>
        </div>

        <div className="flex gap-3">
          <button onClick={loadData} className="bg-owl-800 border border-white/10 text-gray-400 px-4 py-2 rounded-lg hover:text-white transition">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowGameModal(true)} className="flex items-center gap-2 bg-owl-800 border border-gold-500/30 text-gold-500 px-4 py-2 rounded-lg hover:bg-owl-900 transition">
            <Folder size={18} /> Игры
          </button>
        </div>
      </div>

      {/* MODALS */}
      {showGameModal && !managingGameId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Управление Играми</h3>
                <button onClick={() => setShowGameModal(false)}><X className="text-gray-400 hover:text-white" /></button>
             </div>
             <div className="flex gap-2 mb-6">
               <input className="flex-1 bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" placeholder="Название новой игры" value={newGameName} onChange={e => setNewGameName(e.target.value)} />
               <button onClick={handleCreateGame} className="px-4 bg-gold-600 text-owl-900 font-bold rounded-lg hover:bg-gold-500 flex items-center gap-2"><Plus size={20} /> Создать</button>
             </div>
             <div className="space-y-3">
               {games.map(g => (
                 <div key={g.id} className="flex justify-between items-center bg-owl-900/50 p-4 rounded-lg border border-white/5 hover:border-gold-500/30">
                    <div onClick={() => { setGameFilter(g.id); setShowGameModal(false); }} className="cursor-pointer flex-1">
                      <div className="text-gold-500 font-bold text-lg">{g.name}</div>
                      <div className="text-gray-400 text-sm">{new Date(g.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setManagingGameId(g.id)} className="px-3 py-1 bg-purple-900/40 text-purple-200 text-xs rounded border border-purple-500/30 hover:bg-purple-900/60">
                          Команда ({g.expertIds?.length || 0})
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* MANAGE TEAM MODAL */}
      {managingGameId && (
         <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-white">Состав Знатоков: {games.find(g => g.id === managingGameId)?.name}</h3>
                  <button onClick={() => setManagingGameId(null)}><X className="text-gray-400 hover:text-white" /></button>
               </div>
               
               <div className="overflow-y-auto pr-2 space-y-2">
                 {users.map(user => {
                    const isSelected = games.find(g => g.id === managingGameId)?.expertIds?.includes(user.id);
                    return (
                      <div key={user.id} className={`flex justify-between items-center p-3 rounded-lg border ${isSelected ? 'bg-gold-900/20 border-gold-500/50' : 'bg-owl-900/30 border-white/5'} hover:bg-owl-900 transition`}>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-owl-800 overflow-hidden">
                              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{user.fullName[0]}</div>}
                            </div>
                            <div>
                               <div className="text-white font-bold">{user.fullName || 'Без имени'}</div>
                               <div className="text-xs text-gray-400 flex gap-2">
                                  <span>{EXPERT_STATUS_MAP[user.expertStatus]}</span>
                                  {user.isExpert && <span className="text-purple-400">Знаток</span>}
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleToggleGameExpert(managingGameId!, user.id)}
                           className={`px-3 py-1.5 rounded text-sm font-bold transition ${isSelected ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                         >
                           {isSelected ? 'Убрать' : 'Добавить'}
                         </button>
                      </div>
                    );
                 })}
               </div>
            </div>
         </div>
      )}

      {/* POLL DETAILS MODAL */}
      {viewingPollId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-3xl w-full shadow-2xl max-h-[80vh] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Детали голосования</h3>
                <button onClick={() => setViewingPollId(null)}><X className="text-gray-400 hover:text-white" /></button>
             </div>
             
             <div className="overflow-y-auto">
               {polls.find(p => p.id === viewingPollId)?.options.map((opt, idx) => {
                 const votes = pollDetails.filter(d => d.optionIndex === idx);
                 return (
                   <div key={idx} className="mb-6">
                     <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-1">
                        <span className="text-gold-500 font-bold">{opt}</span>
                        <span className="text-gray-400 text-sm">{votes.length} голосов</span>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {votes.map((v, i) => (
                         <div key={i} className="flex items-center gap-2 bg-owl-900/30 p-2 rounded">
                            <div className="w-6 h-6 rounded-full bg-owl-800 overflow-hidden flex-shrink-0">
                               {v.avatarUrl && <img src={v.avatarUrl} className="w-full h-full object-cover"/>}
                            </div>
                            <span className="text-sm text-gray-300">{v.fullName}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto grid md:grid-cols-3 gap-6">
             {/* User Details Left */}
             <div className="md:col-span-1 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full border-4 border-gold-500/30 overflow-hidden bg-owl-900 mb-4">
                   {selectedUser.avatarUrl 
                     ? <img src={selectedUser.avatarUrl} className="w-full h-full object-cover" />
                     : <User className="w-full h-full p-8 text-gray-600" />
                   }
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.fullName || 'Без имени'}</h2>
                <div className="text-gray-400 mb-6">{selectedUser.email}</div>
                {selectedUser.telegram && (
                  <a href={`https://t.me/${selectedUser.telegram}`} target="_blank" className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full text-sm hover:bg-blue-600/30 flex items-center gap-2 mb-6">
                    <SendIcon size={14} /> @{selectedUser.telegram}
                  </a>
                )}
                
                <div className="w-full bg-owl-900/50 p-4 rounded-lg border border-white/5 text-left space-y-4">
                   <div>
                     <label className="text-xs text-gray-500 block mb-1">Роль в клубе</label>
                     <button onClick={() => handleToggleExpert(selectedUser)} className={`w-full py-2 rounded text-sm font-bold transition ${selectedUser.isExpert ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                        {selectedUser.isExpert ? '🎓 Знаток' : '👤 Телезритель'}
                     </button>
                   </div>
                   <div>
                     <label className="text-xs text-gray-500 block mb-1">Статус (Ранг)</label>
                     <div className="flex flex-col gap-1">
                        {(['NOVICE', 'MASTER', 'LEGEND'] as ExpertStatus[]).map(status => (
                           <button 
                             key={status}
                             onClick={() => handleUpdateUserStatus(selectedUser, status)}
                             className={`px-2 py-1.5 text-xs rounded text-left ${selectedUser.expertStatus === status ? 'bg-gold-600 text-owl-900 font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                           >
                             {EXPERT_STATUS_MAP[status]}
                           </button>
                        ))}
                     </div>
                   </div>
                </div>
             </div>
             
             {/* User History Right */}
             <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">История вопросов</h3>
                  <button onClick={() => setSelectedUser(null)}><X className="text-gray-400 hover:text-white" /></button>
                </div>
                <div className="space-y-3">
                   {getUserQuestions(selectedUser.id).length === 0 ? (
                     <p className="text-gray-500 text-center py-10">Нет вопросов</p>
                   ) : (
                     getUserQuestions(selectedUser.id).map(q => (
                       <div key={q.id} className="bg-owl-900/50 border border-white/5 rounded p-3 flex justify-between items-start">
                          <div>
                            <div className="text-white text-sm font-medium line-clamp-1">{q.questionText}</div>
                            <div className="text-xs text-gray-500">{new Date(q.submissionDate).toLocaleDateString()}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                             q.status === 'APPROVED' ? 'bg-green-900 text-green-300' :
                             q.status === 'REJECTED' ? 'bg-red-900 text-red-300' :
                             q.status === 'SELECTED' ? 'bg-purple-900 text-purple-300' :
                             'bg-gray-700 text-gray-300'
                          }`}>
                            {STATUS_MAP[q.status]}
                          </span>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COMMUNICATION */}
      {activeTab === 'communication' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
           
           {/* CREATE ANNOUNCEMENT */}
           <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2"><MessageSquare size={20}/> Создать Рассылку</h3>
              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                 <input className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white focus:border-gold-500 outline-none" placeholder="Заголовок новости" value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)} required />
                 <textarea className="w-full bg-owl-900 border border-white/10 rounded p-3 text-white focus:border-gold-500 outline-none" rows={4} placeholder="Текст сообщения для всех пользователей..." value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)} required />
                 
                 <div className="flex gap-2">
                    <input className="flex-1 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white focus:border-gold-500 outline-none" placeholder="Ссылка (https://...)" value={announceLink} onChange={e => setAnnounceLink(e.target.value)} />
                    <input className="w-1/3 bg-owl-900 border border-white/10 rounded p-2 text-sm text-white focus:border-gold-500 outline-none" placeholder="Текст кнопки" value={announceLinkText} onChange={e => setAnnounceLinkText(e.target.value)} />
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

           {/* POLLS MANAGEMENT */}
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
                    <button type="submit" disabled={creatingPoll} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded flex justify-center items-center gap-2">
                       {creatingPoll ? <Loader2 className="animate-spin"/> : <Plus size={18}/>} Запустить опрос
                    </button>
                 </form>
              </div>

              {/* ACTIVE POLLS LIST */}
              <div className="bg-owl-800 rounded-xl border border-white/10 p-6">
                 <h3 className="text-lg font-bold text-white mb-4">Активные опросы</h3>
                 <div className="space-y-3">
                    {polls.map(poll => (
                       <div key={poll.id} className="bg-owl-900/50 p-4 rounded border border-white/5 flex justify-between items-center">
                          <span className="text-white font-medium">{poll.question}</span>
                          <button onClick={() => handleViewPollDetails(poll.id)} className="text-xs bg-gold-600/20 text-gold-500 px-3 py-1 rounded hover:bg-gold-600/30">Результаты</button>
                       </div>
                    ))}
                    {polls.length === 0 && <p className="text-gray-500 text-sm">Нет активных опросов</p>}
                 </div>
              </div>
           </div>

        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
           {users.map(user => (
             <div 
               key={user.id} 
               onClick={() => setSelectedUser(user)}
               className="bg-owl-800 p-6 rounded-xl border border-white/10 shadow-lg flex flex-col items-center text-center cursor-pointer hover:border-gold-500/50 transition group"
             >
                <div className="w-24 h-24 rounded-full bg-owl-900 border-2 border-gold-500/30 mb-4 overflow-hidden group-hover:scale-105 transition">
                   {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-6 text-gray-600"/>}
                </div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-gold-500 transition">{user.fullName || 'Без имени'}</h3>
                {user.telegram && <div className="text-blue-400 text-sm mb-2">@{user.telegram}</div>}
                
                <div className="mt-auto pt-4 flex gap-2">
                   {user.isExpert && <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500/30">Знаток</span>}
                   <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600">{EXPERT_STATUS_MAP[user.expertStatus]}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">Вопросов: {getUserQuestions(user.id).length}</div>
             </div>
           ))}
        </div>
      )}

      {/* TAB CONTENT: QUESTIONS */}
      {activeTab === 'questions' && (
        <>
          {/* Filters */}
          <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-owl-900/50 p-4 rounded-xl border border-white/5">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Все</button>
              <button onClick={() => setStatusFilter(QuestionStatus.PENDING)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.PENDING ? 'bg-yellow-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Новые</button>
              <button onClick={() => setStatusFilter(QuestionStatus.APPROVED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.APPROVED ? 'bg-green-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Одобренные</button>
              <button onClick={() => setStatusFilter(QuestionStatus.SELECTED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.SELECTED ? 'bg-purple-600 text-white' : 'bg-owl-800 text-gray-400'}`}>На игру</button>
              <button onClick={() => setStatusFilter(QuestionStatus.PLAYED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.PLAYED ? 'bg-gold-600 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Сыгранные</button>
            </div>
            <div className="xl:ml-auto flex items-center gap-2">
              <span className="text-gray-500 text-sm">Игра:</span>
              <select value={gameFilter} onChange={e => setGameFilter(e.target.value)} className="bg-owl-800 border border-white/10 rounded-md text-sm text-white px-3 py-1.5 outline-none focus:border-gold-500">
                <option value="ALL">Все игры</option>
                <option value="NONE">Без игры</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-6">
            {filteredQuestions.map(q => (
                <div key={q.id} className="bg-owl-800 rounded-xl border border-white/10 overflow-hidden shadow-lg hover:border-gold-500/30">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                      
                      {/* Author Info */}
                      <div className="flex gap-4">
                         <div className="w-12 h-12 rounded-full bg-owl-900 border border-white/10 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition" onClick={() => {
                            const u = users.find(u => u.id === q.userId);
                            if(u) setSelectedUser(u);
                         }}>
                            {q.authorAvatarUrl ? <img src={q.authorAvatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{q.authorName[0]}</div>}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1">{q.questionText}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="font-medium text-gold-500 cursor-pointer hover:underline" onClick={() => {
                                 const u = users.find(u => u.id === q.userId);
                                 if(u) setSelectedUser(u);
                              }}>{q.authorName}</span>
                              {q.telegram && <a href={`https://t.me/${q.telegram}`} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline"><SendIcon size={12}/> {q.telegram}</a>}
                              <span className="text-xs text-gray-600">{q.authorEmail}</span>
                            </div>
                         </div>
                      </div>

                      {/* Game Selector */}
                      <div className="flex flex-col items-end gap-2 min-w-[150px]">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>{STATUS_MAP[q.status]}</span>
                         {q.status !== QuestionStatus.PENDING && (
                           <select className="bg-owl-900 text-xs text-gold-500 border border-gold-500/30 rounded px-2 py-1 outline-none w-full" value={q.gameId || 'NONE'} onChange={(e) => handleAssignGame(q, e.target.value)}>
                             <option value="NONE">-- Без игры --</option>
                             {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                           </select>
                         )}
                      </div>
                    </div>

                    {/* Images */}
                    {q.imageUrls && q.imageUrls.length > 0 && (
                      <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                        {q.imageUrls.map((url, i) => (
                           <div key={i} className="relative group w-32 h-32 rounded-lg overflow-hidden border border-white/20">
                             <img src={url} className="w-full h-full object-cover" />
                             <a href={url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Eye size={20}/></a>
                           </div>
                        ))}
                      </div>
                    )}

                    {/* Answer Area */}
                    <div className="bg-owl-900/50 p-4 rounded-lg mb-4 border border-white/5 relative">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-gold-500">Ответ:</p>
                        <button onClick={() => setRevealedAnswers(p => ({...p, [q.id]: !p[q.id]}))} className="text-gray-500 hover:text-white">
                          {revealedAnswers[q.id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                      <div className={`text-gray-300 transition-all ${revealedAnswers[q.id] ? '' : 'blur-md select-none'}`}>{q.answerText}</div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 items-center">
                      {(q.status === QuestionStatus.APPROVED || q.status === QuestionStatus.SELECTED) && (
                        <div className="flex gap-1 mr-4 border-r border-white/10 pr-4">
                           <button onClick={() => toggleTag(q, 'BLACK_BOX')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('BLACK_BOX') ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}><Box size={14}/> {TAG_MAP['BLACK_BOX']}</button>
                           <button onClick={() => toggleTag(q, 'BLITZ')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('BLITZ') ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-yellow-500'}`}><Zap size={14}/> {TAG_MAP['BLITZ']}</button>
                           <button onClick={() => toggleTag(q, 'SUPER_BLITZ')} className={`p-1.5 rounded flex items-center gap-1 text-xs font-bold ${q.tags?.includes('SUPER_BLITZ') ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-red-500'}`}><Flame size={14}/> {TAG_MAP['SUPER_BLITZ']}</button>
                        </div>
                      )}

                      {q.status === QuestionStatus.PENDING && (
                        <>
                          <button onClick={() => handleStatusChange(q.id, QuestionStatus.APPROVED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm"><Check size={14}/> Одобрить</button>
                          <button onClick={() => handleStatusChange(q.id, QuestionStatus.REJECTED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"><X size={14}/> Отклонить</button>
                        </>
                      )}

                      {q.status === QuestionStatus.APPROVED && (
                        <button onClick={() => handleStatusChange(q.id, QuestionStatus.SELECTED)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-sm">Отобрать на игру</button>
                      )}

                      {(q.status === QuestionStatus.SELECTED || q.status === QuestionStatus.PLAYED) && (
                         <div className="ml-auto flex items-center gap-2">
                            {q.status === QuestionStatus.SELECTED && (
                               <button onClick={() => handleStatusChange(q.id, QuestionStatus.PLAYED)} className="bg-gold-600 text-owl-900 px-3 py-1.5 rounded text-sm font-bold">Сыграть</button>
                            )}
                            
                            {q.status === QuestionStatus.PLAYED && (
                               <div className="flex items-center bg-owl-900 rounded-lg p-1 border border-white/10">
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${q.isAnsweredCorrectly ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                    <ThumbsUp size={12} /> Знатоки (1:0)
                                  </button>
                                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${q.isAnsweredCorrectly === false ? 'bg-gold-500 text-owl-900' : 'text-gray-500 hover:text-white'}`}>
                                    <ThumbsDown size={12} /> Зрители (0:1)
                                  </button>
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
