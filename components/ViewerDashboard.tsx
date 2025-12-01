
import React, { useEffect, useState } from 'react';
import { ViewerForm } from './ViewerForm';
import { getMyQuestions, getGames } from '../services/storageService';
import { Question, Game, QuestionStatus } from '../types';
import { User, List, Send, RefreshCw } from 'lucide-react';

interface ViewerDashboardProps {
  userId: string;
  userEmail: string;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ userId, userEmail }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('history');
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    const [questionsData, gamesData] = await Promise.all([
      getMyQuestions(userId),
      getGames()
    ]);
    setMyQuestions(questionsData);
    setGames(gamesData);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const getGameName = (gameId?: string) => {
    if (!gameId) return null;
    return games.find(g => g.id === gameId)?.name || "Неизвестная игра";
  };

  const getStatusBadge = (status: QuestionStatus) => {
    const styles = {
      [QuestionStatus.PENDING]: 'bg-yellow-900 text-yellow-200 border-yellow-700',
      [QuestionStatus.APPROVED]: 'bg-green-900 text-green-200 border-green-700',
      [QuestionStatus.REJECTED]: 'bg-red-900 text-red-200 border-red-700',
      [QuestionStatus.SELECTED]: 'bg-purple-900 text-purple-200 border-purple-700',
      [QuestionStatus.PLAYED]: 'bg-gold-500 text-owl-900 border-gold-600',
      [QuestionStatus.NOT_PLAYED]: 'bg-gray-700 text-gray-300 border-gray-600',
    };
    
    const labels = {
      [QuestionStatus.PENDING]: 'На рассмотрении',
      [QuestionStatus.APPROVED]: 'Одобрен',
      [QuestionStatus.REJECTED]: 'Отклонен',
      [QuestionStatus.SELECTED]: 'Отобран на игру',
      [QuestionStatus.PLAYED]: 'Сыгран',
      [QuestionStatus.NOT_PLAYED]: 'Не выпал',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4">
      {/* Header */}
      <div className="bg-owl-800 rounded-xl p-6 border border-white/10 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Личный кабинет</h2>
            <p className="text-gray-400 text-sm">{userEmail}</p>
          </div>
        </div>
        
        <div className="flex bg-owl-900 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <List size={16} /> История
          </button>
          <button 
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'send' ? 'bg-gold-600 text-owl-900' : 'text-gray-400 hover:text-white'}`}
          >
            <Send size={16} /> Новый вопрос
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'send' ? (
        <ViewerForm userId={userId} userEmail={userEmail} onSuccess={() => setActiveTab('history')} />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-serif text-white">Мои вопросы</h3>
            <button onClick={loadHistory} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {myQuestions.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-xl text-gray-500">
              Вы еще не отправляли вопросов.
            </div>
          ) : (
            myQuestions.map(q => (
              <div key={q.id} className="bg-owl-800 border border-white/10 rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                      {getStatusBadge(q.status)}
                      {q.gameId && (
                        <div className="mt-2 text-gold-500 text-sm font-medium flex items-center gap-1">
                           📺 {getGameName(q.gameId)}
                        </div>
                      )}
                   </div>
                   <span className="text-xs text-gray-500">{new Date(q.submissionDate).toLocaleDateString()}</span>
                </div>
                
                <h4 className="text-lg font-medium text-white mb-2">{q.questionText}</h4>
                
                <div className="bg-owl-900/50 p-3 rounded text-sm text-gray-400 mt-3 border border-white/5">
                   <span className="text-gray-500 block text-xs mb-1">Ответ:</span>
                   {q.answerText}
                </div>

                {q.feedback && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded text-red-200 text-sm">
                    <strong>Комментарий редактора:</strong> {q.feedback}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
