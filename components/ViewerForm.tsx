
import React, { useState } from 'react';
import { saveQuestion, uploadImage } from '../services/storageService';
import { Send, Loader2, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface ViewerFormProps {
  userProfile: UserProfile;
  userEmail: string;
  onSuccess?: () => void;
}

export const ViewerForm: React.FC<ViewerFormProps> = ({ userProfile, userEmail, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    // Explicitly cast to File[] via Array.from to avoid TS iteration errors
    const files = Array.from(e.target.files) as File[];
    
    const newImages: string[] = [];

    for (const file of files) {
      try {
        const url = await uploadImage(file);
        if (url) {
          newImages.push(url);
        } else {
          // If one fails, we just alert but continue others
          alert(`Не удалось загрузить файл: ${file.name}`);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setAttachedImages(prev => [...prev, ...newImages]);
    setUploading(false);
    
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await saveQuestion({
        userId: userProfile.id,
        authorName: userProfile.fullName || 'Аноним',
        authorEmail: userEmail,
        telegram: userProfile.telegram,
        authorAvatarUrl: userProfile.avatarUrl,
        questionText: questionText,
        answerText: answerText,
        imageUrls: attachedImages
      });
      
      if (result) {
        setSuccess(true);
        setQuestionText('');
        setAnswerText('');
        setAttachedImages([]);
        if (onSuccess) setTimeout(onSuccess, 2000);
        else setTimeout(() => setSuccess(false), 8000);
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка при отправке.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-owl-800 rounded-xl shadow-2xl border border-white/5 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-serif text-white mb-6">Новый вопрос</h2>
      
      {success ? (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-6 rounded-lg text-center animate-pulse">
          <h3 className="text-xl font-bold mb-2">Вопрос успешно отправлен!</h3>
          <p>Редакторы уже получили уведомление.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-owl-900/50 p-4 rounded-lg border border-white/5 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-gold-600 flex items-center justify-center text-owl-900 font-bold overflow-hidden border border-gold-500/50">
                {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover"/> : (userProfile.fullName?.[0] || 'U')}
             </div>
             <div>
               <div className="text-sm text-gray-400">Отправитель:</div>
               <div className="font-bold text-white">{userProfile.fullName || 'Без имени'}</div>
               <div className="text-xs text-gray-500">{userEmail}</div>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Текст вопроса</label>
            <textarea
              required
              rows={5}
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition"
              placeholder="В черном ящике находится..."
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
            />
          </div>

          {/* Image Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Изображения (для фото-вопросов)</label>
            
            <div className="flex flex-wrap gap-3 mb-3">
              {attachedImages.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/20 group">
                  <img src={url} alt="Attached" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-0 right-0 bg-red-600 text-white p-0.5 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 hover:border-gold-500 flex flex-col items-center justify-center cursor-pointer transition text-gray-500 hover:text-gold-500">
                 {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                 <span className="text-[10px] mt-1">Добавить</span>
                 <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Можно прикрепить несколько фото.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Правильный ответ (и источник)</label>
            <textarea
              required
              rows={2}
              className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition"
              placeholder="Ответ..."
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
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
