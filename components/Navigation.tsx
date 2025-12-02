
import React from 'react';
import { Send, LayoutDashboard, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface NavigationProps {
  currentView: 'viewer' | 'admin' | 'notifications';
  setView: (view: 'viewer' | 'admin' | 'notifications') => void;
  notificationCount: number;
  role: UserRole;
  userEmail?: string;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, role, userEmail, onLogout }) => {
  const logoUrl = "https://logo-icons.com/cdn/shop/files/3809-logo-1739064201.739.svg?v=1739224665";

  return (
    <nav className="bg-owl-800 border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.hash = ''}>
             {/* Logo using Mask to colorize black SVG to Gold */}
             <div 
               className="w-10 h-10 bg-gold-500"
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
            <span className="text-xl font-serif font-bold text-gold-500 tracking-wider hidden sm:block">
              Что? Где? Когда?
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {role === 'VIEWER' && (
              <span className="text-sm text-gray-400 mr-2 hidden md:inline">
                {userEmail}
              </span>
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
