import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Teacher from './pages/Teacher';
import CheckIn from './pages/CheckIn'; 
import './styles.css';

// Security Guard Component to lock down the teacher layout
function TeacherRouteGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    async function checkTeacherAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsTeacher(false);
          setLoading(false);
          return;
        }

        // Deep-check the roles table in your database
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.role === 'teacher') {
          setIsTeacher(true);
        } else {
          setIsTeacher(false);
        }
      } catch (err) {
        setIsTeacher(false);
      } finally {
        setLoading(false);
      }
    }
    checkTeacherAccess();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff', fontFamily: 'sans-serif' }}>
        <h3>Verifying Security Credentials...</h3>
      </div>
    );
  }

  // If they are NOT verified as a teacher, kick them back to the check-in view instantly
  if (!isTeacher) {
    return <Navigate to="/check-in" replace />;
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Auth / Login Page */}
        <Route path="/" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />

        {/* Locked Teacher Dashboard */}
        <Route 
          path="/teacher" 
          element={
            <TeacherRouteGuard>
              <Teacher />
            </TeacherRouteGuard>
          } 
        />

        {/* Student Check-In Route */}
        <Route path="/check-in" element={<CheckIn />} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
