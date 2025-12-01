
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { ViewerForm } from './components/ViewerForm';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationCenter } from './components/NotificationCenter';
import { Landing } from './components/Landing';
import { getNotifications, subscribeToStorage } from './services/storageService';
import { UserRole } from './types';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('GUEST');
  const [view, setView] = useState<'viewer' | 'admin' | 'notifications'>('viewer');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setNotificationCount(getNotifications().length);
    };
    updateCount();
    return subscribeToStorage(updateCount);
  }, []);

  const handleLogin = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'ADMIN') {
      setView('admin');
    } else {
      setView('viewer');
    }
  };

  const handleLogout = () => {
    setRole('GUEST');
    setView('viewer');
  };

  if (role === 'GUEST') {
    return <Landing onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-20 bg-pattern">
      <Navigation 
        currentView={view} 
        setView={setView} 
        notificationCount={notificationCount}
        role={role}
        onLogout={handleLogout}
      />
      
      <main>
        {role === 'VIEWER' && view === 'viewer' && <ViewerForm />}
        {role === 'VIEWER' && view === 'notifications' && <NotificationCenter />}
        
        {role === 'ADMIN' && view === 'admin' && <AdminDashboard />}
        
        {/* Redirects/Fallbacks if needed */}
        {role === 'ADMIN' && view !== 'admin' && <div className="text-center text-gray-500 mt-20">Выберите раздел в меню</div>}
      </main>

      <footer className="fixed bottom-0 w-full py-4 text-center text-gray-600 text-sm bg-owl-900 border-t border-white/5 pointer-events-none">
        <p>© {new Date().getFullYear()} ЧГК Батуми.</p>
      </footer>
    </div>
  );
};

export default App;
