import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Eye, EyeOff, Loader2, Lock, ChevronDown, UserPlus, Building2 } from 'lucide-react';
import type { AppRole } from '../types/app';

const ROLES: { label: string; value: AppRole }[] = [
  { label: 'Employee', value: 'employee' },
  { label: 'Security Guard', value: 'guard' },
  { label: 'Admin (MD/CEO)', value: 'admin' },
];

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AppRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role, company_name: companyName.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const routes: Record<AppRole, string> = { admin: '/admin', guard: '/guard', employee: '/employee' };
    navigate(routes[role]);
  };

  return (
    <div className="mobile-container bg-card flex flex-col min-h-screen">
      {/* Logo area */}
      <div className="flex flex-col items-center pt-8 pb-4 px-6">
        <div className="bg-primary/10 p-3.5 rounded-full mb-4">
          <div className="bg-primary rounded-full p-2">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">GateFlow</h1>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">Create Your Account</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Sign Up</h2>
        <p className="text-sm text-muted-foreground mb-5">Fill in your details to get started</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Company / Organization</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Select User Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value as AppRole)}
                className="w-full h-12 px-4 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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

          {/* Confirm Password */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold">Sign In</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by GateFlow Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
