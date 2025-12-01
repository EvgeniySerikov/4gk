
import React, { useEffect, useState } from 'react';
import { getQuestions, updateQuestionStatus, getGames, saveGame, updateQuestionData, getAllUsers } from '../services/storageService';
import { Question, QuestionStatus, Game, QuestionTag, UserProfile } from '../types';
import { Check, X, Folder, Box, Zap, Flame, Loader2, RefreshCw, Send as SendIcon, Plus, Eye, EyeOff, Users, Image as ImageIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'questions' | 'users'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showGameModal, setShowGameModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'ALL'>('ALL');
  const [gameFilter, setGameFilter] = useState<string | 'ALL'>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const [qData, gData, uData] = await Promise.all([getQuestions(), getGames(), getAllUsers()]);
    setQuestions(qData);
    setGames(gData);
    setUsers(uData);
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

  const filteredQuestions = questions.filter(q => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesGame = gameFilter === 'ALL' ? true : gameFilter === 'NONE' ? !q.gameId : q.gameId === gameFilter;
    return matchesStatus && matchesGame;
  });

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
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md transition ${activeTab === 'users' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}>Телезрители</button>
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

      {/* Game Management Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Список Игр</h3>
                <button onClick={() => setShowGameModal(false)}><X className="text-gray-400 hover:text-white" /></button>
             </div>
             <div className="flex gap-2 mb-6">
               <input className="flex-1 bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" placeholder="Название новой игры" value={newGameName} onChange={e => setNewGameName(e.target.value)} />
               <button onClick={handleCreateGame} className="px-4 bg-gold-600 text-owl-900 font-bold rounded-lg hover:bg-gold-500 flex items-center gap-2"><Plus size={20} /> Создать</button>
             </div>
             <div className="space-y-2">
               {games.map(g => (
                 <div key={g.id} className="flex justify-between items-center bg-owl-900/50 p-4 rounded-lg border border-white/5 cursor-pointer hover:border-gold-500/30" onClick={() => { setGameFilter(g.id); setShowGameModal(false); }}>
                    <div><div className="text-gold-500 font-bold text-lg">{g.name}</div></div>
                    <div className="text-gray-400 text-sm">{new Date(g.date).toLocaleDateString()}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
           {users.map(user => (
             <div key={user.id} className="bg-owl-800 p-6 rounded-xl border border-white/10 shadow-lg flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-owl-900 border-2 border-gold-500/30 mb-4 overflow-hidden">
                   {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-6 text-gray-600"/>}
                </div>
                <h3 className="text-xl font-bold text-white">{user.fullName || 'Без имени'}</h3>
                {user.telegram && <a href={`https://t.me/${user.telegram}`} target="_blank" className="text-blue-400 hover:underline text-sm mb-2">@{user.telegram}</a>}
                <div className="mt-auto pt-4 flex gap-2">
                   {user.isExpert && <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded">Знаток</span>}
                   <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{user.expertStatus}</span>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-owl-900/50 p-4 rounded-xl border border-white/5">
            <div className="flex flex-wrap gap-2">
              {/* Status Buttons ... (Same as before but compact) */}
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
                         <div className="w-12 h-12 rounded-full bg-owl-900 border border-white/10 overflow-hidden flex-shrink-0">
                            {q.authorAvatarUrl ? <img src={q.authorAvatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{q.authorName[0]}</div>}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1">{q.questionText}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="font-medium text-gold-500">{q.authorName}</span>
                              {q.telegram && <a href={`https://t.me/${q.telegram}`} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline"><SendIcon size={12}/> {q.telegram}</a>}
                              <span className="text-xs text-gray-600">{q.authorEmail}</span>
                            </div>
                         </div>
                      </div>

                      {/* Game Selector */}
                      <div className="flex flex-col items-end gap-2 min-w-[150px]">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>{q.status}</span>
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
                           <button onClick={() => toggleTag(q, 'BLACK_BOX')} className={`p-1.5 rounded ${q.tags?.includes('BLACK_BOX') ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}><Box size={16}/></button>
                           <button onClick={() => toggleTag(q, 'BLITZ')} className={`p-1.5 rounded ${q.tags?.includes('BLITZ') ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-yellow-500'}`}><Zap size={16}/></button>
                           <button onClick={() => toggleTag(q, 'SUPER_BLITZ')} className={`p-1.5 rounded ${q.tags?.includes('SUPER_BLITZ') ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-red-500'}`}><Flame size={16}/></button>
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
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition ${q.isAnsweredCorrectly ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                    {q.isAnsweredCorrectly ? 'Взят знатоками (1:0)' : 'Взят'}
                                  </button>
                                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => handleToggleTaken(q)} className={`px-3 py-1 rounded text-xs font-bold transition ${q.isAnsweredCorrectly === false ? 'bg-gold-500 text-owl-900' : 'text-gray-500 hover:text-white'}`}>
                                    {q.isAnsweredCorrectly === false ? 'Не взят (0:1)' : 'Не взят'}
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
