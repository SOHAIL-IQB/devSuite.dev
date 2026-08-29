import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Monitor, Trash2, ShieldAlert, DownloadCloud, UploadCloud, Database } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { exportWorkspaceData, validateAndParseBackup } from '@/lib/workspace_sync.utils';

export function SettingsWorkspace() {
  const { user, setUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'account' | 'backup'>('profile');

  // Forms State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return <Navigate to="/login" />;

  const handleExportBackup = () => {
    try {
      const backupJson = exportWorkspaceData({
        collections: JSON.parse(localStorage.getItem('api_collections') || '[]'),
        environments: JSON.parse(localStorage.getItem('environments') || '[]'),
        notes: JSON.parse(localStorage.getItem('dev_notes') || '[]'),
      });

      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devsuite-backup-${new Date().toISOString().split('T')[0]}.devsuite.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Workspace backup exported successfully');
    } catch {
      toast.error('Failed to export workspace backup');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateAndParseBackup(content);

      if (!result.valid || !result.backup) {
        toast.error(result.error || 'Invalid backup file');
        return;
      }

      if (result.backup.data.collections) {
        localStorage.setItem('api_collections', JSON.stringify(result.backup.data.collections));
      }
      if (result.backup.data.environments) {
        localStorage.setItem('environments', JSON.stringify(result.backup.data.environments));
      }
      if (result.backup.data.notes) {
        localStorage.setItem('dev_notes', JSON.stringify(result.backup.data.notes));
      }

      toast.success('Workspace restored successfully from backup!');
    };
    reader.readAsText(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/auth/profile', { name, email });
      setUser(res.data.user);
      toast.success('Profile updated successfully');
    } catch (err: unknown) {
      let errorMsg = 'Failed to update profile';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { error?: string | { message: string }[] } } }).response?.data;
        if (Array.isArray(responseData?.error)) {
          errorMsg = responseData.error[0].message;
        } else if (typeof responseData?.error === 'string') {
          errorMsg = responseData.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      let errorMsg = 'Failed to update password';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { error?: string | { message: string }[] } } }).response?.data;
        if (Array.isArray(responseData?.error)) {
          errorMsg = responseData.error[0].message;
        } else if (typeof responseData?.error === 'string') {
          errorMsg = responseData.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete all your workspaces, APIs, and notes. This action cannot be undone.')) return;
    
    setIsSaving(true);
    try {
      await api.delete('/auth/account');
      toast.success('Account deleted');
      logout();
    } catch (err: unknown) {
      let errorMsg = 'Failed to delete account';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { error?: string } } }).response?.data;
        if (typeof responseData?.error === 'string') {
          errorMsg = responseData.error;
        }
      }
      toast.error(errorMsg);
      setIsSaving(false);
    }
  };

  type TabId = 'profile' | 'appearance' | 'account' | 'backup';

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor className="w-4 h-4 mr-2" /> },
    { id: 'account', label: 'Account Security', icon: <ShieldAlert className="w-4 h-4 mr-2" /> },
    { id: 'backup', label: 'Backup & Cloud Sync', icon: <Database className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="h-full flex bg-background">
      {/* SIDEBAR */}
      <div className="w-64 border-r bg-muted/10 p-4 shrink-0 flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 px-2">Settings</h2>
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            className={`w-full justify-start h-9 ${activeTab === tab.id ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </Button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-lg font-medium">Profile</h3>
                <p className="text-sm text-muted-foreground">Manage your public identity and contact information.</p>
              </div>
              <div className="h-px bg-border" />
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" disabled={isSaving}>Save Changes</Button>
              </form>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-lg font-medium">Appearance</h3>
                <p className="text-sm text-muted-foreground">Customize the look and feel of your workspace.</p>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="h-16 bg-white border rounded shadow-sm mb-2" />
                    <div className="text-sm font-medium text-center">Light</div>
                  </div>
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="h-16 bg-[#09090b] border border-gray-800 rounded shadow-sm mb-2" />
                    <div className="text-sm font-medium text-center">Dark</div>
                  </div>
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setTheme('system')}
                  >
                    <div className="h-16 bg-gradient-to-r from-white to-[#09090b] border rounded shadow-sm mb-2" />
                    <div className="text-sm font-medium text-center">System</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-lg font-medium">Workspace Backup & Cloud Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Export complete workspace snapshots (APIs, Environments, Notes, Mocks) and restore anytime.
                </p>
              </div>
              <div className="h-px bg-border" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/10 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 text-primary" /> Export Workspace Snapshot
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Downloads an encrypted <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded">.devsuite.json</code> file containing all your collections and local workspace data.
                    </p>
                  </div>
                  <Button onClick={handleExportBackup} className="h-8 text-xs">
                    <DownloadCloud className="w-3.5 h-3.5 mr-1" /> Export .devsuite.json
                  </Button>
                </div>

                <div className="p-4 border rounded-lg bg-muted/10 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-500" /> Restore from Snapshot
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Restore your workspace state from an existing <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded">.devsuite.json</code> backup file.
                    </p>
                  </div>
                  <label className="flex items-center justify-center h-8 text-xs border rounded bg-background hover:bg-muted/50 cursor-pointer font-medium transition-colors">
                    <UploadCloud className="w-3.5 h-3.5 mr-1" /> Select Backup File
                    <input type="file" accept=".json,.devsuite.json" onChange={handleImportBackup} className="sr-only" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Password</h3>
                  <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
                </div>
                <div className="h-px bg-border" />
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                  </div>
                  <Button type="submit" disabled={isSaving}>Update Password</Button>
                </form>
              </div>

              <div className="space-y-6 pt-4">
                <div>
                  <h3 className="text-lg font-medium text-red-500 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2" /> Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                <div className="h-px bg-red-500/20" />
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-red-500 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-500/80 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={isSaving}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
