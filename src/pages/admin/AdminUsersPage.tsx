import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users, UserPlus, Shield, Briefcase, Mail, Lock, User,
  Loader2, X, CheckCircle2, AlertCircle, Eye, EyeOff,
  LayoutDashboard, CalendarCheck, FileText, BarChart3,
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
};

const AdminUsersPage: React.FC = () => {
  const { user, session, profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employee' | 'guard'>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, company_name, created_at')
      .in('role', ['employee', 'guard'])
      .order('created_at', { ascending: false });
    setMembers((data as TeamMember[]) || []);
    setLoading(false);
  }, []);

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
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: email.trim(), password, name: name.trim(), role },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        setFormError(data?.error || error?.message || 'Failed to create user');
      } else {
        setFormSuccess(`${role === 'guard' ? 'Security Guard' : 'Employee'} "${name}" created successfully!`);
        setName('');
        setEmail('');
        setPassword('');
        setRole('employee');
        fetchMembers();
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess('');
        }, 2000);
      }
    } catch (err) {
      setFormError('Unexpected error. Please try again.');
    }
    setSubmitting(false);
  };

  const employees = members.filter(m => m.role === 'employee');
  const guards = members.filter(m => m.role === 'guard');

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
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
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-foreground">Security Guards</h2>
            <span className="text-xs bg-orange-500/10 text-orange-600 font-semibold px-2 py-0.5 rounded-full">{guards.length}</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : guards.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No guards added yet</p>
              <button
                onClick={() => { setRole('guard'); setShowForm(true); }}
                className="mt-3 text-sm text-primary font-semibold"
              >
                + Add Security Guard
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {guards.map(m => <MemberCard key={m.id} member={m} />)}
            </div>
          )}
        </div>

        {/* Employees */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold text-foreground">Employees</h2>
            <span className="text-xs bg-blue-500/10 text-blue-600 font-semibold px-2 py-0.5 rounded-full">{employees.length}</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No employees added yet</p>
              <button
                onClick={() => { setRole('employee'); setShowForm(true); }}
                className="mt-3 text-sm text-primary font-semibold"
              >
                + Add Employee
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map(m => <MemberCard key={m.id} member={m} />)}
            </div>
          )}
        </div>
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

            {/* Role toggle */}
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
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
    </div>
  );
};

const MemberCard: React.FC<{ member: TeamMember }> = ({ member }) => {
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isGuard = member.role === 'guard';

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isGuard ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
        {initials || <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${isGuard ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
        {isGuard ? 'Guard' : 'Employee'}
      </span>
    </div>
  );
};

export default AdminUsersPage;
