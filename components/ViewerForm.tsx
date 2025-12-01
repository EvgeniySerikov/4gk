
import React, { useState } from 'react';
import { saveQuestion } from '../services/storageService';
import { Question, QuestionStatus } from '../types';
import { Send, Loader2 } from 'lucide-react';

export const ViewerForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: '',
    questionText: '',
    answerText: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Question Object directly without AI
      const newQuestion: Question = {
        id: crypto.randomUUID(),
        ...formData,
        status: QuestionStatus.PENDING,
        submissionDate: Date.now()
      };

      // Save (and send auto-email)
      await saveQuestion(newQuestion);
      
      setSuccess(true);
      setFormData({
        authorName: '',
        authorEmail: '',
        questionText: '',
        answerText: ''
      });
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error(error);
      alert('Ошибка при отправке. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-owl-800 rounded-xl shadow-2xl border border-white/5 mb-10">
      <h2 className="text-3xl font-serif text-center mb-6 text-white">Отправить вопрос в ЧГК Батуми</h2>
      
      {success ? (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-6 rounded-lg text-center animate-pulse">
          <h3 className="text-xl font-bold mb-2">Вопрос успешно отправлен!</h3>
          <p>Мы отправили подтверждение на ваш Email.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ваше Имя</label>
              <input
                required
                type="text"
                className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition"
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
                className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition"
                placeholder="ivan@example.com"
                value={formData.authorEmail}
                onChange={e => setFormData({...formData, authorEmail: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Текст вопроса</label>
            <textarea
              required
              rows={6}
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition"
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
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition"
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
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send size={20} />
                Отправить вопрос
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
