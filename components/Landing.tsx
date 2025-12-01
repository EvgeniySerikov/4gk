
import React, { useState } from 'react';
import { UserRole } from '../types';
import { User, Lock, ArrowRight } from 'lucide-react';

interface LandingProps {
  onLogin: (role: UserRole) => void;
}

export const Landing: React.FC<LandingProps> = ({ onLogin }) => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'editor' || password === 'admin') {
      onLogin('ADMIN');
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Intro Text */}
        <div className="text-center md:text-left space-y-6">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
               <span className="text-owl-900 font-serif font-bold text-4xl">?</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight">
            ЧГК <br/>
            <span className="text-gold-500">Батуми</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Официальный портал приема вопросов от телезрителей. Отправьте свой вопрос, и, возможно, именно он сыграет в ближайшей серии игр.
          </p>
        </div>

        {/* Login Cards */}
        <div className="space-y-4">
          
          {/* Viewer Card */}
          {!showAdminLogin && (
            <div className="bg-owl-800 border border-white/10 p-8 rounded-2xl shadow-2xl hover:border-gold-500/30 transition group cursor-pointer" onClick={() => onLogin('VIEWER')}>
              <div className="flex justify-between items-center mb-4">
                <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                  <User size={24} />
                </div>
                <ArrowRight className="text-gray-600 group-hover:text-white transition" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Я — Телезритель</h2>
              <p className="text-gray-400">Отправить вопрос или проверить статус.</p>
            </div>
          )}

          {/* Admin Card */}
          {!showAdminLogin ? (
            <div 
              className="bg-owl-800 border border-white/5 p-6 rounded-2xl cursor-pointer hover:bg-owl-900 transition flex items-center gap-4 group"
              onClick={() => setShowAdminLogin(true)}
            >
              <Lock size={20} className="text-gray-500 group-hover:text-gold-500 transition" />
              <span className="text-gray-400 font-medium group-hover:text-white transition">Вход для Ведущего</span>
            </div>
          ) : (
            <form onSubmit={handleAdminAuth} className="bg-owl-800 border border-gold-500/30 p-8 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-white mb-4">Доступ для Ведущего</h3>
              <input 
                autoFocus
                type="password"
                placeholder="Пароль (admin)"
                className={`w-full bg-owl-900 border ${error ? 'border-red-500' : 'border-white/10'} rounded-lg p-3 text-white mb-4 focus:outline-none focus:border-gold-500 transition`}
                value={password}
                onChange={e => {setError(false); setPassword(e.target.value)}}
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gold-600 hover:bg-gold-500 text-owl-900 font-bold py-3 rounded-lg transition">
                  Войти
                </button>
                <button 
                  type="button" 
                  onClick={() => {setShowAdminLogin(false); setError(false); setPassword('')}}
                  className="px-4 py-3 text-gray-400 hover:text-white transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
