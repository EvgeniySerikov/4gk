
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, User, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!supabase) {
      setError("Ошибка конфигурации базы данных");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            // Для локальных тестов и превью лучше явно указывать куда возвращаться
            emailRedirectTo: window.location.origin 
          }
        });
        if (error) throw error;
        setSuccessMsg("Мы отправили письмо с ссылкой для входа на вашу почту.");
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg && !isLogin) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-owl-800 rounded-xl shadow-2xl border border-white/10 text-center animate-in fade-in zoom-in">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-serif text-white mb-4">Почти готово!</h2>
        <div className="text-gray-300 mb-6 space-y-4 text-sm">
          <p className="text-base font-medium text-white">{successMsg}</p>
          <div className="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded text-yellow-200 flex gap-2 text-left">
            <AlertCircle className="shrink-0" size={18} />
            <span>Если письма нет во "Входящих", обязательно проверьте папку <strong>"Спам"</strong> или "Промоакции".</span>
          </div>
          <p>После подтверждения почты вернитесь сюда и войдите в аккаунт.</p>
        </div>
        <button 
          onClick={() => { setIsLogin(true); setSuccessMsg(null); }}
          className="text-gold-500 hover:text-white transition underline"
        >
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-owl-800 rounded-xl shadow-2xl border border-white/10">
      <h2 className="text-2xl font-serif text-white text-center mb-6">
        {isLogin ? 'Вход в Кабинет' : 'Регистрация'}
      </h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Пароль</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full bg-owl-900 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold-600 hover:bg-gold-500 text-owl-900 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : (isLogin ? <User size={20}/> : <UserPlus size={20}/>)}
          {isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(null); }}
          className="text-gold-500 text-sm hover:underline"
        >
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
};
