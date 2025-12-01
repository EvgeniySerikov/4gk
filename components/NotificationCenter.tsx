
import React, { useEffect, useState } from 'react';
import { getNotifications, getQuestions } from '../services/storageService';
import { Notification, Question, QuestionStatus } from '../types';
import { Mail, Clock, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (isSupabaseConfigured()) {
        setIsLoading(true);
        const [nData, qData] = await Promise.all([getNotifications(), getQuestions()]);
        setNotifications(nData);
        setMyQuestions(qData);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000); // Poll
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: QuestionStatus) => {
    switch (status) {
      case QuestionStatus.APPROVED: return 'bg-green-900 text-green-300';
      case QuestionStatus.REJECTED: return 'bg-red-900 text-red-300';
      case QuestionStatus.SELECTED: return 'bg-purple-900 text-purple-300';
      case QuestionStatus.PLAYED: return 'bg-gold-600 text-owl-900';
      case QuestionStatus.NOT_PLAYED: return 'bg-gray-700 text-gray-300';
      default: return 'bg-yellow-900 text-yellow-300';
    }
  };

  const getStatusText = (status: QuestionStatus) => {
    switch (status) {
      case QuestionStatus.PENDING: return 'На рассмотрении';
      case QuestionStatus.APPROVED: return 'Одобрен';
      case QuestionStatus.REJECTED: return 'Отклонен';
      case QuestionStatus.SELECTED: return 'Отобран на игру';
      case QuestionStatus.PLAYED: return 'Сыгран';
      case QuestionStatus.NOT_PLAYED: return 'Не выпал';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center mt-20 text-white"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column: My Questions Status */}
      <div className="md:col-span-1">
        <h3 className="text-xl font-serif font-bold text-white mb-4">Все вопросы</h3>
        <div className="space-y-3">
          {myQuestions.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет вопросов.</p>
          ) : (
            myQuestions.map(q => (
              <div key={q.id} className="bg-owl-800 p-3 rounded-lg border border-white/5">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-200 line-clamp-2 mb-2">{q.questionText}</span>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(q.status)}`}>
                  {getStatusText(q.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Simulated Inbox */}
      <div className="md:col-span-2">
        <h3 className="text-xl font-serif font-bold text-white mb-4">
          Лента событий
        </h3>
        
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-10 bg-owl-800 rounded-lg border border-white/5 text-gray-500">
              <Mail className="mx-auto mb-2 opacity-50" size={32} />
              <p>Нет событий</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="bg-white text-owl-900 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="p-1 bg-owl-800" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs uppercase tracking-wide font-bold">
                    <><Mail size={14} className="text-owl-800" /> System</>
                    <span className="ml-auto font-normal normal-case flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(n.date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-lg font-medium">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
