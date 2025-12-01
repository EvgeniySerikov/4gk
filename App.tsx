
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { ViewerForm } from './components/ViewerForm';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationCenter } from './components/NotificationCenter';
import { Landing } from './components/Landing';
import { getNotifications } from './services/storageService';
import { UserRole } from './types';
import { isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('GUEST');
  const [view, setView] = useState<'viewer' | 'admin' | 'notifications'>('viewer');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      if (isSupabaseConfigured()) {
        const notifs = await getNotifications();
        setNotificationCount(notifs.length);
      }
    };
    updateCount();
    // Poll for updates every 60s
    const i = setInterval(updateCount, 60000);
    return () => clearInterval(i);
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
      </main>

      <footer className="fixed bottom-0 w-full py-4 text-center text-gray-600 text-sm bg-owl-900 border-t border-white/5 pointer-events-none">
        <p>© {new Date().getFullYear()} ЧГК Батуми.</p>
      </footer>
    </div>
  );
};

export default App;
