import { Outlet } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - form */}
      <div className="flex flex-col justify-center p-8 lg:p-16">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Outlet />
        </div>
      </div>
      
      {/* Right side - hero */}
      <div className="hidden lg:flex flex-col bg-muted/20 border-l items-center justify-center p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <Terminal className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DevWorkspace</h1>
        </div>
        <p className="text-muted-foreground max-w-[400px] text-center text-lg">
          The ultimate suite of developer tools in one unified workspace.
        </p>
      </div>
    </div>
  );
}
