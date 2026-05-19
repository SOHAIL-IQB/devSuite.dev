import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: 'api',
            element: <div className="p-8"><h2 className="text-2xl font-bold">API Workspace (Coming Soon)</h2></div>,
          },
          {
            path: 'format',
            element: <div className="p-8"><h2 className="text-2xl font-bold">Formatters (Coming Soon)</h2></div>,
          },
          {
            path: 'notes',
            element: <div className="p-8"><h2 className="text-2xl font-bold">Notes (Coming Soon)</h2></div>,
          },
          {
            path: 'settings',
            element: <div className="p-8"><h2 className="text-2xl font-bold">Settings (Coming Soon)</h2></div>,
          }
        ],
      }
    ]
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      }
    ]
  }
]);
