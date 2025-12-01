
import React, { useEffect, useState } from 'react';
import { getQuestions, updateQuestionStatus, subscribeToStorage, saveSettings, getSettings, getGames, saveGame, updateQuestionData } from '../services/storageService';
import { Question, QuestionStatus, Game, QuestionTag } from '../types';
import { Check, X, Settings, Save, Mail, AlertTriangle, Copy, ExternalLink, Key, Plus, Folder, Calendar, Box, Zap, Flame } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'ALL'>('ALL');
  const [gameFilter, setGameFilter] = useState<string | 'ALL'>('ALL'); // Game ID
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  
  // Settings Inputs
  const [serviceId, setServiceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    const load = () => {
      setQuestions(getQuestions());
      setGames(getGames());
      const settings = getSettings();
      setServiceId(settings.emailJsServiceId);
      setTemplateId(settings.emailJsTemplateId);
      setPublicKey(settings.emailJsPublicKey);
    };
    load();
    return subscribeToStorage(load);
  }, []);

  const handleCreateGame = () => {
    if (!newGameName.trim()) return;
    const game = saveGame(newGameName);
    setGames(prev => [game, ...prev]);
    setNewGameName('');
    setShowGameModal(false);
  };

  const handleSaveSettings = () => {
    saveSettings({ 
      emailJsServiceId: serviceId,
      emailJsTemplateId: templateId,
      emailJsPublicKey: publicKey
    });
    setShowSettings(false);
    alert('Настройки EmailJS сохранены.');
  };

  const handleStatusChange = async (id: string, status: QuestionStatus) => {
    let feedback = undefined;
    if (status === QuestionStatus.REJECTED) {
      const reason = prompt("Причина отказа (будет отправлена в письме):");
      if (reason) feedback = reason;
      else return; // Cancel if no reason given
    }
    await updateQuestionStatus(id, status, feedback);
  };

  const handleAssignGame = (q: Question, gameId: string) => {
    const updated = { ...q, gameId: gameId === 'NONE' ? undefined : gameId };
    updateQuestionData(updated);
  };

  const toggleTag = (q: Question, tag: QuestionTag) => {
    const currentTags = q.tags || [];
    let newTags: QuestionTag[];
    
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter(t => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    
    updateQuestionData({ ...q, tags: newTags });
  };

  // Filter Logic
  const filteredQuestions = questions.filter(q => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesGame = gameFilter === 'ALL' ? true : gameFilter === 'NONE' ? !q.gameId : q.gameId === gameFilter;
    return matchesStatus && matchesGame;
  });

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-serif font-bold text-gold-500">Кабинет Ведущего</h2>
        <div className="flex gap-3">
          <button 
             onClick={() => setShowGameModal(true)}
             className="flex items-center gap-2 bg-owl-800 border border-gold-500/30 text-gold-500 px-4 py-2 rounded-lg hover:bg-owl-900 transition"
          >
            <Folder size={18} /> Игры
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition ${showSettings ? 'bg-gold-600 text-owl-900 border-gold-500' : 'bg-owl-800 border-white/10 text-gray-400 hover:text-gold-500'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Game Creation Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-owl-800 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-4">Создать новую игру</h3>
             <input 
               autoFocus
               type="text"
               className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white mb-4 focus:border-gold-500 outline-none"
               placeholder="Например: Весенняя серия, Игра 1"
               value={newGameName}
               onChange={e => setNewGameName(e.target.value)}
             />
             <div className="flex justify-end gap-3">
               <button onClick={() => setShowGameModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Отмена</button>
               <button onClick={handleCreateGame} className="px-4 py-2 bg-gold-600 text-owl-900 font-bold rounded hover:bg-gold-500">Создать</button>
             </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-owl-800 border border-gold-500/30 p-6 rounded-xl mb-8 shadow-2xl animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Mail size={18} className="text-gold-500" />
            Настройка EmailJS
          </h3>
          <div className="bg-red-900/20 border border-red-500/40 p-4 rounded-lg mb-6 text-sm text-red-100">
             <p>Обязательно добавьте <code>{'{{to_email}}'}</code> в поле "To Email" и <code>{'{{from_name}}'}</code> в поле "From Name" в настройках шаблона на сайте EmailJS.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <input type="text" placeholder="Service ID" className="bg-owl-900 border border-white/10 rounded p-2 text-white" value={serviceId} onChange={e => setServiceId(e.target.value)} />
             <input type="text" placeholder="Template ID" className="bg-owl-900 border border-white/10 rounded p-2 text-white" value={templateId} onChange={e => setTemplateId(e.target.value)} />
             <input type="password" placeholder="Public Key" className="bg-owl-900 border border-white/10 rounded p-2 text-white" value={publicKey} onChange={e => setPublicKey(e.target.value)} />
          </div>
          <button onClick={handleSaveSettings} className="w-full bg-gold-600 text-owl-900 py-3 rounded-lg font-bold hover:bg-gold-500 flex items-center justify-center gap-2">
            <Save size={20} /> Сохранить ключи
          </button>
        </div>
      )}

      {/* --- FILTERS --- */}
      <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-owl-900/50 p-4 rounded-xl border border-white/5">
        
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
           <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === 'ALL' ? 'bg-white text-owl-900' : 'bg-owl-800 text-gray-400 hover:text-white'}`}>Все</button>
           <button onClick={() => setStatusFilter(QuestionStatus.PENDING)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.PENDING ? 'bg-yellow-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Новые</button>
           <button onClick={() => setStatusFilter(QuestionStatus.APPROVED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.APPROVED ? 'bg-green-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Одобренные</button>
           <button onClick={() => setStatusFilter(QuestionStatus.SELECTED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.SELECTED ? 'bg-purple-600 text-white' : 'bg-owl-800 text-gray-400'}`}>На игру</button>
           <button onClick={() => setStatusFilter(QuestionStatus.PLAYED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.PLAYED ? 'bg-gold-600 text-owl-900' : 'bg-owl-800 text-gray-400'}`}>Сыгранные</button>
           <button onClick={() => setStatusFilter(QuestionStatus.NOT_PLAYED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.NOT_PLAYED ? 'bg-gray-600 text-white' : 'bg-owl-800 text-gray-400'}`}>Не выпали</button>
           <button onClick={() => setStatusFilter(QuestionStatus.REJECTED)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${statusFilter === QuestionStatus.REJECTED ? 'bg-red-900 text-red-200' : 'bg-owl-800 text-gray-400'}`}>Отказ</button>
        </div>

        {/* Game Filter */}
        <div className="xl:ml-auto flex items-center gap-2">
          <span className="text-gray-500 text-sm">Фильтр по игре:</span>
          <select 
            value={gameFilter} 
            onChange={e => setGameFilter(e.target.value)}
            className="bg-owl-800 border border-white/10 rounded-md text-sm text-white px-3 py-1.5 outline-none focus:border-gold-500"
          >
            <option value="ALL">Все игры</option>
            <option value="NONE">Без игры</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- QUESTIONS LIST --- */}
      <div className="grid gap-6">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-xl">
            Вопросов с выбранными параметрами не найдено.
          </div>
        ) : (
          filteredQuestions.map(q => (
            <div key={q.id} className="bg-owl-800 rounded-xl border border-white/10 overflow-hidden shadow-lg transition hover:border-gold-500/30">
              <div className="p-6">
                
                {/* Header info */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        q.status === QuestionStatus.PENDING ? 'bg-yellow-900 text-yellow-200' :
                        q.status === QuestionStatus.APPROVED ? 'bg-green-900 text-green-200' :
                        q.status === QuestionStatus.SELECTED ? 'bg-purple-900 text-purple-200' :
                        q.status === QuestionStatus.PLAYED ? 'bg-gold-500 text-owl-900' :
                        q.status === QuestionStatus.NOT_PLAYED ? 'bg-gray-700 text-gray-300' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {q.status === QuestionStatus.PENDING ? 'Ожидает' : 
                         q.status === QuestionStatus.APPROVED ? 'Одобрен' : 
                         q.status === QuestionStatus.SELECTED ? 'Отобран на игру' : 
                         q.status === QuestionStatus.PLAYED ? 'Сыгран' : 
                         q.status === QuestionStatus.NOT_PLAYED ? 'Не выпал' : 'Отклонен'}
                      </span>
                      
                      {q.tags?.includes('BLACK_BOX') && <span className="px-2 py-0.5 rounded bg-black text-white text-xs border border-white/20">ЧЕРНЫЙ ЯЩИК</span>}
                      {q.tags?.includes('BLITZ') && <span className="px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-500 text-xs border border-yellow-500/20">БЛИЦ</span>}
                      {q.tags?.includes('SUPER_BLITZ') && <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-500 text-xs border border-red-500/20">СУПЕРБЛИЦ</span>}
                    </div>

                    <h3 className="text-xl font-bold text-white">{q.questionText}</h3>
                    <div className="text-sm text-gray-400 mt-2">
                      👤 {q.authorName} &lt;{q.authorEmail}&gt;
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                     <span className="text-xs text-gray-500">{new Date(q.submissionDate).toLocaleDateString('ru-RU')}</span>
                     {/* Game Selector */}
                     {q.status !== QuestionStatus.PENDING && q.status !== QuestionStatus.REJECTED && (
                       <select 
                         className="bg-owl-900 text-xs text-gold-500 border border-gold-500/30 rounded px-2 py-1 outline-none"
                         value={q.gameId || 'NONE'}
                         onChange={(e) => handleAssignGame(q, e.target.value)}
                       >
                         <option value="NONE">-- Без игры --</option>
                         {games.map(g => (
                           <option key={g.id} value={g.id}>{g.name}</option>
                         ))}
                       </select>
                     )}
                  </div>
                </div>

                <div className="bg-owl-900/50 p-4 rounded-lg mb-4 border border-white/5">
                  <p className="text-sm font-bold text-gold-500 mb-1">Ответ:</p>
                  <p className="text-gray-300">{q.answerText}</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 items-center">
                  
                  {/* Tags Controls (Only for Approved/Selected) */}
                  {(q.status === QuestionStatus.APPROVED || q.status === QuestionStatus.SELECTED) && (
                    <div className="flex gap-1 mr-4 border-r border-white/10 pr-4">
                       <button onClick={() => toggleTag(q, 'BLACK_BOX')} className={`p-1.5 rounded transition ${q.tags?.includes('BLACK_BOX') ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`} title="Черный ящик"><Box size={16}/></button>
                       <button onClick={() => toggleTag(q, 'BLITZ')} className={`p-1.5 rounded transition ${q.tags?.includes('BLITZ') ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-yellow-500'}`} title="Блиц"><Zap size={16}/></button>
                       <button onClick={() => toggleTag(q, 'SUPER_BLITZ')} className={`p-1.5 rounded transition ${q.tags?.includes('SUPER_BLITZ') ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-red-500'}`} title="Суперблиц"><Flame size={16}/></button>
                    </div>
                  )}

                  {/* Flow Buttons */}
                  {q.status === QuestionStatus.PENDING && (
                    <>
                      <button onClick={() => handleStatusChange(q.id, QuestionStatus.APPROVED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30 text-sm">
                        <Check size={14} /> Одобрить
                      </button>
                      <button onClick={() => handleStatusChange(q.id, QuestionStatus.REJECTED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 text-sm">
                        <X size={14} /> Отклонить
                      </button>
                    </>
                  )}

                  {q.status === QuestionStatus.APPROVED && (
                    <button onClick={() => handleStatusChange(q.id, QuestionStatus.SELECTED)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-600/30 text-sm">
                      Отобрать на игру
                    </button>
                  )}

                  {(q.status === QuestionStatus.SELECTED || q.status === QuestionStatus.NOT_PLAYED) && (
                    <>
                       <button onClick={() => handleStatusChange(q.id, QuestionStatus.PLAYED)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-gold-600/20 text-gold-500 hover:bg-gold-600/30 border border-gold-600/30 text-sm font-bold">
                        Вопрос Сыграл
                      </button>
                      <button onClick={() => handleStatusChange(q.id, QuestionStatus.NOT_PLAYED)} className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 border border-gray-600/30 text-sm">
                        Не выпал
                      </button>
                    </>
                  )}
                  
                  {/* Revert option for Played questions if mistake made */}
                  {q.status === QuestionStatus.PLAYED && (
                     <button onClick={() => handleStatusChange(q.id, QuestionStatus.SELECTED)} className="ml-auto text-xs text-gray-500 hover:text-white underline">
                        Вернуть в игру
                      </button>
                  )}

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
