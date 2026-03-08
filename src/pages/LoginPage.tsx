import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, LogIn, Lock, Mail, ChevronDown } from 'lucide-react';

const ROLES = [
  { label: 'Employee', value: 'employee' },
  { label: 'Security Guard', value: 'guard' },
  { label: 'Admin (MD/CEO)', value: 'admin' },
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) {
      setError('Invalid email or password. Please try again.');
    }
  };

  React.useEffect(() => {
    if (profile?.role) {
      const routes: Record<string, string> = { admin: '/admin', guard: '/guard', employee: '/employee' };
      navigate(routes[profile.role] || '/login');
    }
  }, [profile, navigate]);

  return (
    <div className="mobile-container bg-card flex flex-col min-h-screen">
      {/* Logo area */}
      <div className="flex flex-col items-center pt-10 pb-4 px-6">
        <div className="bg-primary/10 p-3.5 rounded-full mb-4">
          <div className="bg-primary rounded-full p-2">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">GateFlow</h1>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">Smart Office Management</p>
      </div>

      {/* Hero banner */}
      <div className="mx-6 mb-6">
        <div className="relative h-28 w-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-end">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)' }}
          />
          <div className="p-4">
            <p className="text-white font-bold text-base tracking-wide">Secure Access Terminal</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Welcome Back</h2>
        <p className="text-sm text-muted-foreground mb-5">Sign in to manage your workplace flow</p>

        <form onSubmit={handleLogin} className="space-y-4">
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
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Email or Username</label>
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
            disabled={loading}
            className="w-full h-13 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{' '}
          <Link to="/signup" className="text-primary font-bold">Create Account</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by GateFlow Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
