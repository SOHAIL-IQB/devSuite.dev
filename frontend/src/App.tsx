import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { CommandPalette } from '@/components/CommandPalette';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <CommandPalette />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
