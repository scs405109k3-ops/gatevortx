import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Crown, Eye, EyeOff, Loader2 } from 'lucide-react';

const ROLES = [
  { label: 'Security Guard', value: 'guard', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { label: 'Employee', value: 'employee', icon: User, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  { label: 'Admin (MD/CEO)', value: 'admin', icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      return;
    }
  };

  React.useEffect(() => {
    if (profile?.role) {
      const routes: Record<string, string> = { admin: '/admin', guard: '/guard', employee: '/employee' };
      navigate(routes[profile.role] || '/login');
    }
  }, [profile, navigate]);

  return (
    <div className="mobile-container bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-6 pt-14 pb-10 text-center" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">GateFlow</h1>
        <p className="text-blue-100 text-sm mt-1">Smart Office Management</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all mt-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Role Info Cards */}
        <div className="mt-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Role Access</p>
          <div className="space-y-2">
            {ROLES.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.value} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${r.bg}`}>
                  <Icon className={`h-4 w-4 ${r.color}`} />
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          GateFlow v1.0 · Secure Office Management
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
