import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { ApiWorkspace } from '@/pages/workspace/ApiWorkspace';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { FormattersWorkspace } from '@/pages/formatters/FormattersWorkspace';
import { CodeFormatter } from '@/pages/formatters/CodeFormatter';
import { JsonDiff } from '@/pages/formatters/JsonDiff';
import { JsonToCsv } from '@/pages/formatters/JsonToCsv';
import { UuidGenerator } from '@/pages/formatters/UuidGenerator';
import { HashGenerator } from '@/pages/formatters/HashGenerator';
import { JwtDecoder } from '@/pages/formatters/JwtDecoder';
import { Base64Encoder } from '@/pages/formatters/Base64Encoder';
import { RegexTester } from '@/pages/formatters/RegexTester';
import { EpochConverter } from '@/pages/formatters/EpochConverter';
import { CronParser } from '@/pages/formatters/CronParser';
import { UrlParser } from '@/pages/formatters/UrlParser';
import { ColorConverter } from '@/pages/formatters/ColorConverter';
import { NotesWorkspace } from '@/pages/notes/NotesWorkspace';
import { SettingsWorkspace } from '@/pages/settings/SettingsWorkspace';
import { Navigate } from 'react-router-dom';

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
            element: <ApiWorkspace />,
          },
          {
            path: 'format',
            element: <FormattersWorkspace />,
            children: [
              { index: true, element: <Navigate to="code-formatter" replace /> },
              { path: 'code-formatter', element: <CodeFormatter /> },
              { path: 'json-diff', element: <JsonDiff /> },
              { path: 'json-to-csv', element: <JsonToCsv /> },
              { path: 'uuid-generator', element: <UuidGenerator /> },
              { path: 'hash-generator', element: <HashGenerator /> },
            ]
          },
          {
            path: 'notes',
            element: <NotesWorkspace />,
          },
          {
            path: 'settings',
            element: <SettingsWorkspace />,
          },
          {
            path: 'jwt',
            element: <JwtDecoder />,
          },
          {
            path: 'base64',
            element: <Base64Encoder />,
          },
          {
            path: 'regex',
            element: <RegexTester />,
          },
          {
            path: 'time',
            element: <EpochConverter />,
          },
          {
            path: 'cron',
            element: <CronParser />,
          },
          {
            path: 'url',
            element: <UrlParser />,
          },
          {
            path: 'color',
            element: <ColorConverter />,
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
