import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, Braces, BookText } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARDS = [
  {
    title: 'API Workspace',
    description: 'Test, manage, and save your API requests like Postman.',
    icon: <Code2 className="w-8 h-8 text-blue-500" />,
    path: '/api'
  },
  {
    title: 'Formatters & Validators',
    description: 'Format JSON, XML, Markdown, and validate payloads.',
    icon: <Braces className="w-8 h-8 text-green-500" />,
    path: '/format'
  },
  {
    title: 'Developer Notes',
    description: 'Markdown-based note taking and snippet management.',
    icon: <BookText className="w-8 h-8 text-orange-500" />,
    path: '/notes'
  }
];

export function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-2">
          Select a tool below to get started with your development workflow.
        </p>
      </div>

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
  );
}
