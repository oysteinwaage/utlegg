import { useEffect, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { ref, get } from 'firebase/database';
import { database } from './firebase/config';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import SharingPage from './pages/SharingPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile && !userProfile.roles?.includes('ADMIN')) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    get(ref(database, `userSharings/${currentUser.uid}`))
      .then(async (snap) => {
        if (!snap.exists()) {
          navigate('/overview', { replace: true });
          return;
        }

        const sharingIds = Object.keys(snap.val() as Record<string, unknown>);
        const sharingSnaps = await Promise.all(
          sharingIds.map((sid) => get(ref(database, `sharings/${sid}`))),
        );

        const active = sharingSnaps
          .filter((s) => s.exists() && (s.val() as { isActive: boolean }).isActive)
          .sort(
            (a, b) =>
              (b.val() as { createdAt: number }).createdAt -
              (a.val() as { createdAt: number }).createdAt,
          );

        if (active.length > 0) {
          navigate(`/sharing/${active[0].key}`, { replace: true });
        } else {
          navigate('/overview', { replace: true });
        }
      })
      .finally(() => setChecked(true));
  }, [currentUser, navigate]);

  if (!checked) {
    return (
      <Center h="100vh">
        <Loader color="violet" />
      </Center>
    );
  }

  return null;
}

export default function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <OverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sharing/:id"
        element={
          <ProtectedRoute>
            <SharingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
