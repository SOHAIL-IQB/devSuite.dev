import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Code2, Braces, BookText, Activity, Lock, Hash } from 'lucide-react';
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
  }
];

export function Home() {
  const { user } = useAuthStore();
  const { notes } = useNotesStore();
  const [apiCount, setApiCount] = useState(0);

  useEffect(() => {
    api.get('/workspaces/stats').then(res => {
      setApiCount(res.data.apiRequests || 0);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Developer'}</h1>
        <p className="text-muted-foreground mt-2">
          Here's a quick overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="text-3xl font-bold">9</div>
            <p className="text-xs text-muted-foreground mt-1">Supported Languages</p>
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
