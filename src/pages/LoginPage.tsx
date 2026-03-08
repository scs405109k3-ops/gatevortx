import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Eye, EyeOff, Loader2, LogIn, Lock, Mail, Building2, ChevronDown, ShieldCheck, UserPlus, Users, ChevronUp } from 'lucide-react';
import logo from '../assets/logo.png';

type CompanyEntry = { name: string; orgType: string | null };
type CompanyUser = { name: string; email: string; role: string };

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('employee');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Derive the org type of the currently selected company
  const selectedOrgType = companies.find(c => c.name === selectedCompany)?.orgType ?? null;
  const isAcademic = selectedOrgType === 'school' || selectedOrgType === 'college';

  // Dynamic roles based on org type of selected company
  const ROLES = [
    { label: isAcademic ? 'Student' : 'Employee', value: 'employee' },
    ...(isAcademic ? [{ label: 'Teacher', value: 'teacher' }] : []),
    { label: 'Security Guard', value: 'guard' },
    { label: isAcademic ? 'Admin (Principal/MD)' : 'Admin (MD/CEO)', value: 'admin' },
  ];

  // Fetch all registered companies from admin profiles (with org_type)
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      const { data } = await supabase
        .from('profiles')
        .select('company_name, org_type')
        .eq('role', 'admin')
        .not('company_name', 'is', null)
        .neq('company_name', '');

      const seen = new Set<string>();
      const entries: CompanyEntry[] = [];
      for (const row of (data || []) as any[]) {
        if (row.company_name && !seen.has(row.company_name)) {
          seen.add(row.company_name);
          entries.push({ name: row.company_name, orgType: row.org_type || 'office' });
        }
      }
      setCompanies(entries);
      if (entries.length === 1) setSelectedCompany(entries[0].name);
      setLoadingCompanies(false);
    };
    fetchCompanies();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole !== 'admin' && !selectedCompany) {
      setError('Please select your company');
      return;
    }
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setLoading(false);
      setError('Invalid email or password. Please try again.');
      return;
    }

    // After sign-in, fetch the fresh profile to validate company + role + active status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setError('Authentication failed.'); return; }

    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('role, company_name, is_active')
      .eq('id', user.id)
      .single();

    setLoading(false);

    if (!freshProfile) { setError('Account not found. Please contact your admin.'); await signOut(); return; }

    if (freshProfile.is_active === false) {
      setError('Your account has been deactivated. Please contact your admin.');
      await signOut();
      return;
    }

    // Role mismatch — use dynamic label for error message
    if (freshProfile.role !== selectedRole) {
      const orgType = user.user_metadata?.org_type;
      const isAcademicOrg = orgType === 'school' || orgType === 'college';
      const roleLabel =
        freshProfile.role === 'employee' && isAcademicOrg ? 'Student' :
        freshProfile.role === 'employee' ? 'Employee' :
        freshProfile.role === 'teacher' ? 'Teacher' :
        freshProfile.role === 'guard' ? 'Security Guard' : 'Admin';
      setError(`This account is registered as "${roleLabel}". Please select the correct role.`);
      await signOut();
      return;
    }

    // Company mismatch for non-admins
    if (selectedRole !== 'admin') {
      if (!freshProfile.company_name || freshProfile.company_name !== selectedCompany) {
        setError(`You do not belong to "${selectedCompany}". Please select the correct company.`);
        await signOut();
        return;
      }
    }

    // All good — redirect
    const routes: Record<string, string> = { admin: '/admin', guard: '/guard', employee: '/employee', teacher: '/teacher' };
    navigate(routes[freshProfile.role] || '/login');
  };

  // If already logged in, redirect
  useEffect(() => {
    if (profile?.role) {
      const routes: Record<string, string> = { admin: '/admin', guard: '/guard', employee: '/employee', teacher: '/teacher' };
      navigate(routes[profile.role] || '/login');
    }
  }, [profile, navigate]);

  // Fetch registered users when company changes
  useEffect(() => {
    setCompanyUsers([]);
    setShowUsers(false);
    if (!selectedCompany) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data } = await supabase.rpc('get_company_users', { _company_name: selectedCompany });
      setCompanyUsers((data as CompanyUser[]) || []);
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [selectedCompany]);

  const isAdminRole = selectedRole === 'admin';

  const getRoleLabel = (role: string) => {
    if (role === 'employee') return isAcademic ? 'Student' : 'Employee';
    if (role === 'teacher') return 'Teacher';
    if (role === 'guard') return 'Guard';
    return role;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center md:py-10">
    <div className="auth-container bg-card flex flex-col min-h-screen md:min-h-0 md:rounded-3xl md:shadow-2xl md:border md:border-border md:overflow-hidden">
      {/* Logo area */}
      <div
        className="flex flex-col items-center pt-10 pb-6 px-6"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <img src={logo} alt="GateVortx Logo" className="h-20 w-20 object-contain rounded-2xl" />
        <h1 className="text-2xl font-bold tracking-tight text-white">GateVortx</h1>
        <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-widest mt-1">Smart Office Management</p>
      </div>

      {/* Hero banner */}
      <div className="mx-6 mt-5 mb-4">
        <div
          className="relative h-24 w-full rounded-2xl overflow-hidden flex items-center px-5 gap-4"
          style={{ background: 'var(--gradient-hero)' }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.07) 20px, rgba(255,255,255,0.07) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.07) 20px, rgba(255,255,255,0.07) 21px)' }}
          />
          <ShieldCheck className="h-9 w-9 text-cyan-300 flex-shrink-0 drop-shadow" />
          <div>
            <p className="text-white font-bold text-base tracking-wide">Secure Access Terminal</p>
            {selectedCompany && !isAdminRole && (
              <p className="text-primary-foreground/70 text-xs mt-0.5 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedCompany}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Welcome Back</h2>
        <p className="text-sm text-muted-foreground mb-5">Sign in to manage your workplace flow</p>

        <form onSubmit={handleLogin} className="space-y-4">

          {/* Company selector — hidden for admin */}
          {!isAdminRole && (
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Select Company / Institution <span className="text-destructive">*</span>
              </label>
              {loadingCompanies ? (
                <div className="w-full h-12 rounded-xl border border-border bg-muted animate-pulse" />
              ) : companies.length === 0 ? (
                <div className="w-full h-12 rounded-xl border border-dashed border-border bg-muted/50 flex items-center px-4 gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No companies registered yet</span>
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={selectedCompany}
                    onChange={e => setSelectedCompany(e.target.value)}
                    className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none"
                  >
                    <option value="">Select your company / institution…</option>
                    {companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Select User Role</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full h-12 px-4 pr-10 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {isAcademic && selectedCompany && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                🎓 Academic institution — "Employee" is shown as "Student"
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-foreground">Password</label>
              <button type="button" className="text-sm font-semibold text-primary">Forgot?</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isAdminRole && !selectedCompany && companies.length > 0)}
            className="w-full h-13 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Register CTA */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {isAcademic ? 'New Institution?' : 'New Company / Institution?'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {isAcademic
                ? 'Register as Admin (Principal/MD) to create your institution workspace and manage students & teachers.'
                : 'Register as Admin (MD/CEO) to create your workspace and add team members.'}
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary"
            >
              <UserPlus className="h-4 w-4" />
              {isAcademic ? 'Register as Principal/Admin' : 'Register as Admin'}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by GateVortx Cloud Infrastructure
        </p>
      </div>
    </div>
    </div>
  );
};

export default LoginPage;
