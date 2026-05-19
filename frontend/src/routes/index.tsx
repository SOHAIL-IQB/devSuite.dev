import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Home } from '@/pages/Home';

export const router = createBrowserRouter([
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
  },
]);
