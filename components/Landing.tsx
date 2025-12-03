
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { CONFIG } from '../config';
import { User, Lock, ArrowRight, Users } from 'lucide-react';
import { Auth } from './Auth';

interface LandingProps {
  initialView?: 'INTRO' | 'ADMIN' | 'AUTH';
  onAdminLogin: () => void;
  onViewerLogin: () => void;
}

export const Landing: React.FC<LandingProps> = ({ initialView = 'INTRO', onAdminLogin }) => {
  const [viewState, setViewState] = useState<'INTRO' | 'ADMIN' | 'AUTH'>(initialView);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  const logoUrl = "https://logo-icons.com/cdn/shop/files/3809-logo-1739064201.739.svg?v=1739224665";

  useEffect(() => {
    setViewState(initialView);
  }, [initialView]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CONFIG.adminPassword) {
      onAdminLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Intro Text */}
        <div className="text-center md:text-left space-y-6">
          <div className="flex justify-center md:justify-start">
             {/* Logo using Mask to colorize black SVG to Gold */}
             <div 
               className="w-32 h-32 bg-gold-500"
               style={{
                 maskImage: `url(${logoUrl})`,
                 maskSize: 'contain',
                 maskRepeat: 'no-repeat',
                 maskPosition: 'center',
                 WebkitMaskImage: `url(${logoUrl})`,
                 WebkitMaskSize: 'contain',
                 WebkitMaskRepeat: 'no-repeat',
                 WebkitMaskPosition: 'center'
               }}
             />
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight">
            ЧГК <br/>
            <span className="text-gold-500">Батуми</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Официальный портал интеллектуального клуба. Участвуйте в жизни сообщества, отправляйте вопросы и играйте за столом.
          </p>
        </div>

        {/* Dynamic Right Side */}
        <div className="space-y-4">
          
          {viewState === 'INTRO' && (
            <>
              <div 
                className="bg-owl-800 border border-white/10 p-8 rounded-2xl shadow-2xl hover:border-gold-500/30 transition group cursor-pointer" 
                onClick={() => { setViewState('AUTH'); window.location.hash = 'cabinet'; }}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                    <Users size={24} />
                  </div>
                  <ArrowRight className="text-gray-600 group-hover:text-white transition" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">Отправить вопрос<br/>или стать знатоком</h2>
                <p className="text-gray-400">Вход в личный кабинет члена клуба.</p>
              </div>

              <div 
                className="bg-owl-800 border border-white/5 p-6 rounded-2xl cursor-pointer hover:bg-owl-900 transition flex items-center gap-4 group"
                onClick={() => { setViewState('ADMIN'); window.location.hash = 'admin'; }}
              >
                <Lock size={20} className="text-gray-500 group-hover:text-gold-500 transition" />
                <span className="text-gray-400 font-medium group-hover:text-white transition">Вход для Ведущего</span>
              </div>
            </>
          )}

          {viewState === 'ADMIN' && (
            <form onSubmit={handleAdminAuth} className="bg-owl-800 border border-gold-500/30 p-8 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-white mb-4">Доступ для Ведущего</h3>
              <input
                autoFocus
                type="password"
                placeholder="Пароль"
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
                  onClick={() => {setViewState('INTRO'); setError(false); setPassword(''); window.location.hash = ''; }}
                  className="px-4 py-3 text-gray-400 hover:text-white transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {viewState === 'AUTH' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
               <Auth />
               <button 
                  onClick={() => { setViewState('INTRO'); window.location.hash = ''; }}
                  className="w-full text-center mt-4 text-gray-500 hover:text-white text-sm"
               >
                 Вернуться назад
               </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
