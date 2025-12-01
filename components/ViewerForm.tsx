
import React, { useState, useEffect } from 'react';
import { saveQuestion } from '../services/storageService';
import { Send, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface ViewerFormProps {
  userId?: string;
  userEmail?: string;
  onSuccess?: () => void;
}

export const ViewerForm: React.FC<ViewerFormProps> = ({ userId, userEmail, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: userEmail || '',
    telegram: '',
    questionText: '',
    answerText: ''
  });

  // Sync email if it loads later
  useEffect(() => {
    if (userEmail) {
      setFormData(prev => ({ ...prev, authorEmail: userEmail }));
    }
  }, [userEmail]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-owl-800 rounded-xl border border-red-500/30 text-center">
        <h3 className="text-xl text-white mb-2">Техническое обслуживание</h3>
        <p className="text-gray-400">Система приема вопросов временно недоступна.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await saveQuestion({
        ...formData,
        userId: userId
      });
      
      if (result) {
        setSuccess(true);
        setFormData({
          authorName: '',
          authorEmail: userEmail || '',
          telegram: '',
          questionText: '',
          answerText: ''
        });
        if (onSuccess) setTimeout(onSuccess, 2000);
        else setTimeout(() => setSuccess(false), 8000);
      } else {
        alert("Ошибка связи с сервером. Попробуйте позже.");
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка при отправке. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-owl-800 rounded-xl shadow-2xl border border-white/5 p-6 md:p-8">
      <h2 className="text-2xl font-serif text-white mb-6">Отправить вопрос</h2>
      
      {success ? (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-6 rounded-lg text-center animate-pulse">
          <h3 className="text-xl font-bold mb-2">Вопрос успешно отправлен!</h3>
          <p>Вы можете следить за его статусом в разделе "История".</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ваше Имя</label>
              <input
                required
                type="text"
                className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition"
                placeholder="Иван Иванов"
                value={formData.authorName}
                onChange={e => setFormData({...formData, authorName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                required
                type="email"
                disabled={!!userEmail} // Disable if logged in
                className={`w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white outline-none transition ${userEmail ? 'opacity-50 cursor-not-allowed' : 'focus:border-gold-500'}`}
                placeholder="ivan@example.com"
                value={formData.authorEmail}
                onChange={e => setFormData({...formData, authorEmail: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Telegram (логин)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">@</span>
              <input
                type="text"
                className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 pl-8 text-white focus:border-gold-500 outline-none transition"
                placeholder="username"
                value={formData.telegram}
                onChange={e => setFormData({...formData, telegram: e.target.value.replace('@', '')})}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Необязательно, но поможет нам быстрее связаться с вами.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Текст вопроса</label>
            <textarea
              required
              rows={6}
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition"
              placeholder="В черном ящике находится..."
              value={formData.questionText}
              onChange={e => setFormData({...formData, questionText: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Правильный ответ (и источник)</label>
            <textarea
              required
              rows={3}
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition"
              placeholder="Ответ..."
              value={formData.answerText}
              onChange={e => setFormData({...formData, answerText: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-600 hover:bg-gold-500 text-owl-900 font-bold py-4 rounded-lg shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            Отправить вопрос
          </button>
        </form>
      )}
    </div>
  );
};
