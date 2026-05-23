import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Code2, Braces, BookText, Activity, Lock, Hash, Regex, Server, Clock, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotesStore } from '@/store/notesStore';
import { api } from '@/lib/api';

const CARDS = [
  {
    title: 'API Workspace',
    description: 'Test, manage, and save your API requests like Postman.',
    icon: <Code2 className="w-8 h-8 text-blue-500" />,
    path: '/api'
  },
  {
    title: 'Code Formatter',
    description: 'Format JSON, XML, Markdown, and validate payloads.',
    icon: <Braces className="w-8 h-8 text-green-500" />,
    path: '/format'
  },
  {
    title: 'Developer Notes',
    description: 'Markdown-based note taking and snippet management.',
    icon: <BookText className="w-8 h-8 text-orange-500" />,
    path: '/notes'
  },
  {
    title: 'JWT Decoder',
    description: 'Decode and inspect JSON Web Tokens securely.',
    icon: <Lock className="w-8 h-8 text-purple-500" />,
    path: '/jwt'
  },
  {
    title: 'Base64 Encoder',
    description: 'Quickly encode and decode Base64 strings.',
    icon: <Hash className="w-8 h-8 text-rose-500" />,
    path: '/base64'
  },
  {
    title: 'Regex Tester',
    description: 'Test regular expressions against target strings.',
    icon: <Regex className="w-8 h-8 text-cyan-500" />,
    path: '/regex'
  },
  {
    title: 'Epoch Converter',
    description: 'Bi-directional Unix timestamp and date converter.',
    icon: <Clock className="w-8 h-8 text-teal-500" />,
    path: '/time'
  },
  {
    title: 'Cron Parser',
    description: 'Translate cron strings to plain English schedules.',
    icon: <CalendarClock className="w-8 h-8 text-indigo-500" />,
    path: '/cron'
  }
];

export function Home() {
  const { user } = useAuthStore();
  const { notes } = useNotesStore();
  const [apiCount, setApiCount] = useState(0);
  const [systemHealth, setSystemHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [env, setEnv] = useState('development');

  useEffect(() => {
    api.get('/workspaces/stats').then(res => {
      setApiCount(res.data.apiRequests || 0);
    }).catch(() => {});

    api.get('/health').then(res => {
      if (res.data.status === 'ok') {
        setSystemHealth('online');
        setEnv(res.data.environment || 'development');
      }
    }).catch(() => {
      setSystemHealth('offline');
    });
  }, []);

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Developer'}</h1>
        <p className="text-muted-foreground mt-2">
          Here's a quick overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <Code2 className="w-4 h-4 mr-2" /> Saved API Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{apiCount}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <BookText className="w-4 h-4 mr-2" /> Developer Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notes.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Local Formatters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">10</div>
            <p className="text-xs text-muted-foreground mt-1">Premium Utilities</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <Server className="w-4 h-4 mr-2" /> System Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold capitalize">{env}</div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-2.5 w-2.5">
                {systemHealth === 'online' && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </>
                )}
                {systemHealth === 'offline' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                )}
                {systemHealth === 'checking' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                )}
              </span>
              <p className="text-xs text-muted-foreground">
                {systemHealth === 'online' ? 'API & DB Connected' : systemHealth === 'checking' ? 'Checking connection...' : 'Disconnected'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card, i) => (
            <Link key={i} to={card.path}>
              <Card className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer h-full">
                <CardHeader>
                  <div className="mb-4">{card.icon}</div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
