import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle, Trash2, Loader2, Building2, ArrowLeft,
  ShieldAlert, CheckCircle2, Clock,
} from 'lucide-react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { LayoutDashboard, Users, UserCheck, FileText, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Team', path: '/admin/users', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const AdminSettingsPage: React.FC = () => {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle');

  const companyName = profile?.company_name || '';
  const isConfirmed = confirmText.trim() === companyName;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('delete-organisation', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || 'Failed to delete organisation');
      setDeleting(false);
      return;
    }

    setStep('done');
    // Sign out and redirect after short delay
    setTimeout(async () => {
      await signOut();
      navigate('/login');
    }, 2500);
  };

  if (step === 'done') {
    return (
      <div className="mobile-container bg-background flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-10 w-10 text-primary" />
      </div>
        <h2 className="text-xl font-bold text-foreground">Organisation Deleted</h2>
        <p className="text-sm text-muted-foreground mt-2">
          All data has been permanently removed. Redirecting to login…
        </p>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar
        title="Settings"
        subtitle={companyName || 'Admin'}
        action={
          <button
            onClick={() => navigate('/admin')}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        }
      />

      <div className="px-5 py-5 space-y-4">
        {/* Company info card */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">{companyName}</p>
            <p className="text-xs text-muted-foreground capitalize">{(profile as any)?.org_type || 'office'} organisation</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-2xl border-2 border-destructive/30 overflow-hidden">
          <div className="bg-destructive/5 px-4 py-3 flex items-center gap-2 border-b border-destructive/20">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-bold text-destructive">Danger Zone</h2>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Delete Organisation</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes <span className="font-semibold text-foreground">{companyName}</span> and all associated data — employees, guards, attendance, visitors, leaves, and emails. <span className="text-destructive font-semibold">This cannot be undone.</span>
                </p>
              </div>
            </div>

            {step === 'idle' && (
              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete Organisation
              </button>
            )}

            {step === 'confirm' && (
              <div className="space-y-3">
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-destructive mb-1">
                    Type your organisation name to confirm:
                  </p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 mb-2 select-all">
                    {companyName}
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder={`Type "${companyName}" to confirm`}
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('idle'); setConfirmText(''); setError(''); }}
                    className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-semibold text-sm active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!isConfirmed || deleting}
                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminSettingsPage;
