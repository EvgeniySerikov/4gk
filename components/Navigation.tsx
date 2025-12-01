import React from 'react';
import { Send, LayoutDashboard, Bell, LogOut, User } from 'lucide-react';
import { UserRole } from '../types';

interface NavigationProps {
  currentView: 'viewer' | 'admin' | 'notifications';
  setView: (view: 'viewer' | 'admin' | 'notifications') => void;
  notificationCount: number;
  role: UserRole;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, notificationCount, role, onLogout }) => {
  return (
    <nav className="bg-owl-800 border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
               <span className="text-owl-900 font-serif font-bold text-xl">?</span>
            </div>
            <span className="text-xl font-serif font-bold text-gold-500 tracking-wider hidden sm:block">
              Что? Где? Когда?
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {role === 'VIEWER' && (
              <>
                <button 
                  onClick={() => setView('viewer')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${currentView === 'viewer' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Send size={18} />
                  <span className="hidden sm:inline">Отправить</span>
                </button>
                
                <button 
                  onClick={() => setView('notifications')}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${currentView === 'notifications' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Bell size={18} />
                  <span className="hidden sm:inline">Уведомления</span>
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {role === 'ADMIN' && (
              <button 
                onClick={() => setView('admin')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${currentView === 'admin' ? 'bg-gold-600/20 text-gold-500 border border-gold-500/30' : 'text-gray-400 hover:text-gold-500'}`}
              >
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">Кабинет</span>
              </button>
            )}

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            <button 
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-400 hover:text-red-400 transition-colors"
              title="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};