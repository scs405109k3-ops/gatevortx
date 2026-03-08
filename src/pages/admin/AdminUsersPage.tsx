import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users, UserPlus, Shield, Briefcase, Mail, Lock, User,
  Loader2, X, CheckCircle2, AlertCircle, Eye, EyeOff,
  LayoutDashboard, CalendarCheck, FileText, BarChart3,
  UserX, UserCheck, Trash2, MoreVertical,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'guard';
  company_name: string | null;
  created_at: string;
  is_active: boolean;
};

const AdminUsersPage: React.FC = () => {
  const { session, profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionMember, setActionMember] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employee' | 'guard'>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Auto-generate email from name + company
  const generateEmail = (fullName: string) => {
    if (!profile?.company_name) return '';
    const namePart = fullName.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const companyPart = profile.company_name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    return namePart && companyPart ? `${namePart}@${companyPart}.com` : '';
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!emailManuallyEdited) {
      setEmail(generateEmail(val));
    }
  };

  const fetchMembers = useCallback(async () => {
    if (!profile?.company_name) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, company_name, created_at, is_active')
      .in('role', ['employee', 'guard'])
      .eq('company_name', profile.company_name)
      .order('created_at', { ascending: false });
    setMembers((data as TeamMember[]) || []);
    setLoading(false);
  }, [profile?.company_name]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!name.trim() || !email.trim() || !password) {
      setFormError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    // Optimistic UI: add member immediately to list
    const optimisticMember: TeamMember = {
      id: `optimistic-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      company_name: profile?.company_name || null,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    setMembers(prev => [optimisticMember, ...prev]);
    setShowForm(false);
    setName('');
    setEmail('');
    setEmailManuallyEdited(false);
    setPassword('');
    setRole('employee');

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: optimisticMember.email, password, name: optimisticMember.name, role },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        // Rollback optimistic update
        setMembers(prev => prev.filter(m => m.id !== optimisticMember.id));
        setShowForm(true);
        setName(optimisticMember.name);
        setEmail(optimisticMember.email);
        setFormError(data?.error || error?.message || 'Failed to create user');
      } else {
        // Replace optimistic entry with real data
        fetchMembers();
      }
    } catch {
      setMembers(prev => prev.filter(m => m.id !== optimisticMember.id));
      setShowForm(true);
      setFormError('Unexpected error. Please try again.');
    }
    setSubmitting(false);
  };

  const handleMemberAction = async (action: 'deactivate' | 'reactivate' | 'delete') => {
    if (!actionMember) return;
    setActionLoading(true);
    setActionResult('');
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action, userId: actionMember.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) {
        setActionResult('Error: ' + (data?.error || error?.message));
      } else {
        setActionResult(
          action === 'delete' ? 'User removed successfully.' :
          action === 'deactivate' ? 'User deactivated. They can no longer log in.' :
          'User reactivated. They can now log in.'
        );
        fetchMembers();
        if (action === 'delete') {
          setTimeout(() => { setActionMember(null); setActionResult(''); }, 1500);
        }
      }
    } catch {
      setActionResult('Unexpected error. Please try again.');
    }
    setActionLoading(false);
  };

  const employees = members.filter(m => m.role === 'employee');
  const guards = members.filter(m => m.role === 'guard');

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar
        title="Team Members"
        subtitle={profile?.company_name || 'My Company'}
        action={
          <button
            onClick={() => { setShowForm(true); setFormError(''); setFormSuccess(''); }}
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        }
      />

      <div className="px-5 py-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
              <Briefcase className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{employees.length}</p>
            <p className="text-xs text-muted-foreground">Employees</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{guards.length}</p>
            <p className="text-xs text-muted-foreground">Security Guards</p>
          </div>
        </div>

        {/* Guards */}
        <MemberSection
          title="Security Guards"
          icon={<Shield className="h-4 w-4 text-orange-500" />}
          badgeClass="bg-orange-500/10 text-orange-600"
          members={guards}
          loading={loading}
          emptyIcon={<Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />}
          emptyLabel="No guards added yet"
          onAdd={() => { setRole('guard'); setShowForm(true); }}
          onManage={setActionMember}
        />

        {/* Employees */}
        <MemberSection
          title="Employees"
          icon={<Briefcase className="h-4 w-4 text-blue-500" />}
          badgeClass="bg-blue-500/10 text-blue-600"
          members={employees}
          loading={loading}
          emptyIcon={<Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />}
          emptyLabel="No employees added yet"
          onAdd={() => { setRole('employee'); setShowForm(true); }}
          onManage={setActionMember}
        />
      </div>

      <BottomNav items={NAV_ITEMS} />

      {/* Add User Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowForm(false)}>
          <div
            className="w-full bg-card rounded-t-3xl p-6 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">Add Team Member</h3>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {(['employee', 'guard'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${role === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {r === 'guard' ? <Shield className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  {r === 'guard' ? 'Security Guard' : 'Employee'}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <input
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block flex items-center gap-1.5">
                  Email Address
                  {!emailManuallyEdited && email && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Auto-generated</span>
                  )}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailManuallyEdited(true); }}
                    placeholder="name@company.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {submitting ? 'Creating Account…' : `Add ${role === 'guard' ? 'Security Guard' : 'Employee'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Member Sheet */}
      {actionMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => { setActionMember(null); setActionResult(''); }}>
          <div
            className="w-full bg-card rounded-t-3xl p-6 pb-10 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Manage Member</h3>
              <button onClick={() => { setActionMember(null); setActionResult(''); }} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Member Info */}
            <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${actionMember.role === 'guard' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                {actionMember.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{actionMember.name}</p>
                <p className="text-xs text-muted-foreground truncate">{actionMember.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionMember.role === 'guard' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                    {actionMember.role === 'guard' ? 'Guard' : 'Employee'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionMember.is_active ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                    {actionMember.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </div>
              </div>
            </div>

            {actionResult && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${actionResult.startsWith('Error') ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-green-500/10 border border-green-500/20 text-green-600'}`}>
                {actionResult.startsWith('Error') ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                {actionResult}
              </div>
            )}

            <div className="space-y-3">
              {actionMember.is_active ? (
                <button
                  onClick={() => handleMemberAction('deactivate')}
                  disabled={actionLoading}
                  className="w-full py-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                  Deactivate Account
                </button>
              ) : (
                <button
                  onClick={() => handleMemberAction('reactivate')}
                  disabled={actionLoading}
                  className="w-full py-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Reactivate Account
                </button>
              )}

              <button
                onClick={() => handleMemberAction('delete')}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove from Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MemberSectionProps {
  title: string;
  icon: React.ReactNode;
  badgeClass: string;
  members: TeamMember[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyLabel: string;
  onAdd: () => void;
  onManage: (m: TeamMember) => void;
}

const MemberSection: React.FC<MemberSectionProps> = ({
  title, icon, badgeClass, members, loading, emptyIcon, emptyLabel, onAdd, onManage,
}) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{members.length}</span>
    </div>
    {loading ? (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
      </div>
    ) : members.length === 0 ? (
      <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
        {emptyIcon}
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        <button onClick={onAdd} className="mt-3 text-sm text-primary font-semibold">
          + Add Now
        </button>
      </div>
    ) : (
      <div className="space-y-2">
        {members.map(m => <MemberCard key={m.id} member={m} onManage={onManage} />)}
      </div>
    )}
  </div>
);

const MemberCard: React.FC<{ member: TeamMember; onManage: (m: TeamMember) => void }> = ({ member, onManage }) => {
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isGuard = member.role === 'guard';

  return (
    <div className={`bg-card rounded-2xl p-4 border shadow-sm flex items-center gap-3 ${!member.is_active ? 'opacity-60 border-destructive/20' : 'border-border'}`}>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isGuard ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
        {initials || <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground text-sm truncate">{member.name}</p>
          {!member.is_active && (
            <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full flex-shrink-0">INACTIVE</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isGuard ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
          {isGuard ? 'Guard' : 'Employee'}
        </span>
        <button
          onClick={() => onManage(member)}
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default AdminUsersPage;
