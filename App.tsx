
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './components/AdminDashboard';
import { Landing } from './components/Landing';
import { UserRole } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ViewerDashboard } from './components/ViewerDashboard';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('GUEST');
  const [view, setView] = useState<'viewer' | 'admin' | 'notifications'>('viewer');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check Hash for routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin' && role !== 'ADMIN') {
        // Just trigger re-render if needed, logic handled in render
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [role]);

  // Auth State Listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase!.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole('VIEWER'); // Default role after login
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole('VIEWER');
      } else if (role !== 'ADMIN') { // Don't kick admin out on page refresh if session logic differs
        setRole('GUEST');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAdminLogin = () => {
    setRole('ADMIN');
    setView('admin');
    window.location.hash = 'admin';
  };

  const handleLogout = async () => {
    if (role === 'VIEWER') {
      await supabase?.auth.signOut();
    }
    setRole('GUEST');
    setView('viewer');
    setUser(null);
    window.location.hash = '';
  };

  if (loading) return <div className="min-h-screen bg-owl-900" />;

  // 1. Landing Page (Guest)
  if (role === 'GUEST') {
    // Determine initial view based on hash
    const initialView = window.location.hash === '#admin' ? 'ADMIN' : (window.location.hash === '#cabinet' ? 'AUTH' : 'INTRO');
    
    return <Landing 
      initialView={initialView}
      onAdminLogin={handleAdminLogin} 
      onViewerLogin={() => { /* Handled by Auth */ }} 
    />;
  }

  return (
    <div className="min-h-screen pb-20 bg-pattern">
      <Navigation 
        currentView={view} 
        setView={setView} 
        notificationCount={0}
        role={role}
        userEmail={user?.email}
        onLogout={handleLogout}
      />
      
      <main>
        {role === 'VIEWER' && user && (
          <ViewerDashboard userId={user.id} userEmail={user.email} />
        )}
        
        {role === 'ADMIN' && <AdminDashboard />}
      </main>

      <footer className="fixed bottom-0 w-full py-4 text-center text-gray-600 text-sm bg-owl-900 border-t border-white/5 pointer-events-none">
        <p>© {new Date().getFullYear()} ЧГК Батуми.</p>
      </footer>
    </div>
  );
};

export default App;
