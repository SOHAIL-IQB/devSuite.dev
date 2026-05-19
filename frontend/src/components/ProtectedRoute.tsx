import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export function ProtectedRoute() {
  const { isAuthenticated, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (err) {
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthenticated) {
      initAuth();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, navigate, setUser]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}
