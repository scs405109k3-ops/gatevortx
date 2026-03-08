import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Eye, EyeOff, Loader2, Lock, UserPlus, Building2, ShieldCheck, Mail, User } from 'lucide-react';
import logo from '../assets/logo.png';

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        data: { name: name.trim(), role: 'admin', company_name: '' },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // After signup, go to company setup
    navigate('/admin/company-setup');
  };

  return (
    <div className="mobile-container bg-background flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6 bg-card border-b border-border">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
          <ShieldCheck className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">GateVortx</h1>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">Admin Registration</p>
      </div>

      {/* Info Banner */}
      <div className="mx-6 mt-5">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Admin / MD / CEO Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only admins register here. You'll add employees and guards from your dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pt-5 pb-8">
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
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
                placeholder="admin@company.com"
                autoComplete="email"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
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
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
            className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold">Sign In</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by GateVortx Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
