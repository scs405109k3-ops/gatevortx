import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Lock, Eye, EyeOff, Loader2, Clock, CheckCircle, XCircle, Shield, LogOut } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import BottomNav from '../../components/BottomNav';
import LogoutConfirmDialog from '../../components/LogoutConfirmDialog';
import { Home, ClipboardList, Users, UserCheck } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', path: '/guard', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/guard/attendance', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Add', path: '/guard/add-visitor', icon: <Users className="h-5 w-5" /> },
];

interface ShiftRecord {
  id: string;
  date: string;
  check_in: string | null;
  checked_out_at: string | null;
  status: string;
  visitor_count?: number;
}

const GuardProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Shift history
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [visitorStats, setVisitorStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    if (!profile) return;
    fetchShiftHistory();
    fetchVisitorStats();
  }, [profile]);

  const fetchShiftHistory = async () => {
    if (!profile) return;
    setShiftsLoading(true);
    try {
      // Get distinct dates guard worked (from attendance records they created)
      const { data: attData } = await supabase
        .from('attendance')
        .select('id, date, check_in, checked_out_at, status')
        .eq('guard_id', profile.id)
        .order('date', { ascending: false })
        .limit(30);

      if (attData) {
        // Group by date to get shift summaries
        const dateMap: Record<string, ShiftRecord> = {};
        attData.forEach((a: any) => {
          if (!dateMap[a.date]) {
            dateMap[a.date] = {
              id: a.id,
              date: a.date,
              check_in: a.check_in,
              checked_out_at: a.checked_out_at,
              status: 'worked',
              visitor_count: 0,
            };
          }
        });

        // Get visitor counts per day
        const dates = Object.keys(dateMap);
        if (dates.length > 0) {
          const { data: visData } = await supabase
            .from('visitors')
            .select('date')
            .eq('guard_id', profile.id)
            .in('date', dates);

          if (visData) {
            visData.forEach((v: any) => {
              if (dateMap[v.date]) {
                dateMap[v.date].visitor_count = (dateMap[v.date].visitor_count || 0) + 1;
              }
            });
          }
        }

        setShifts(Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date)));
      }
    } finally {
      setShiftsLoading(false);
    }
  };

  const fetchVisitorStats = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('visitors')
      .select('status')
      .eq('guard_id', profile.id);
    if (data) {
      const total = data.length;
      const approved = data.filter((v: any) => v.status === 'approved').length;
      const rejected = data.filter((v: any) => v.status === 'rejected').length;
      const pending = data.filter((v: any) => v.status === 'pending').length;
      setVisitorStats({ total, approved, rejected, pending });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Missing fields', description: 'Please fill in all password fields.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords mismatch', description: 'New password and confirmation do not match.', variant: 'destructive' });
      return;
    }

    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: '✅ Password Changed', description: 'Your password has been updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to change password.', variant: 'destructive' });
    } finally {
      setChangingPw(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-28">
      {/* Header */}
      <div className="flex items-center bg-card px-4 py-3.5 border-b border-border sticky top-0 z-10">
        <button onClick={() => navigate('/guard')} className="bg-primary/10 rounded-lg p-2 mr-3">
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">My Profile</h1>
          <p className="text-xs text-muted-foreground">Guard Account & Shift History</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-2">
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-2xl">{profile?.name?.charAt(0)?.toUpperCase() || 'G'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg truncate">{profile?.name}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
            {(profile as any)?.user_code && (
              <p className="text-xs font-mono font-bold text-primary mt-0.5">ID: {(profile as any).user_code}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Shield className="h-3 w-3" /> Security Guard
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Visitors', value: visitorStats.total, color: 'text-primary' },
            { label: 'Approved', value: visitorStats.approved, color: 'text-success' },
            { label: 'Rejected', value: visitorStats.rejected, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Change Password
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 px-4 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full h-11 px-4 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={changingPw}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
            >
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {changingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Shift History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Shift History
            </h2>
          </div>

          {shiftsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : shifts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No shifts recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift, idx) => (
                <div key={shift.id + idx} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{formatDate(shift.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      In: {formatTime(shift.check_in)}
                      {shift.checked_out_at && ` · Out: ${formatTime(shift.checked_out_at)}`}
                    </p>
                  </div>
                  {shift.visitor_count !== undefined && shift.visitor_count > 0 && (
                    <div className="bg-primary/10 rounded-lg px-2 py-1 text-center">
                      <p className="text-xs font-bold text-primary">{shift.visitor_count}</p>
                      <p className="text-[9px] text-muted-foreground">visitors</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default GuardProfilePage;
