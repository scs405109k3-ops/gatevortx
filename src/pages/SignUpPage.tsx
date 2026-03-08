import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Eye, EyeOff, Loader2, Lock, UserPlus, Building2, ShieldCheck, Mail, User, GraduationCap, BookOpen } from 'lucide-react';
import logo from '../assets/logo.png';

type OrgType = 'office' | 'school' | 'college';

const ORG_TYPES: { value: OrgType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'office', label: 'Office', icon: <Building2 className="h-5 w-5" />, desc: 'Corporate / Business' },
  { value: 'school', label: 'School', icon: <BookOpen className="h-5 w-5" />, desc: 'K-12 Education' },
  { value: 'college', label: 'College', icon: <GraduationCap className="h-5 w-5" />, desc: 'University / Institute' },
];

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgType, setOrgType] = useState<OrgType | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!orgType) { setError('Please select your organization type'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role: 'admin', company_name: '', org_type: orgType },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate('/admin/company-setup');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center md:py-10">
    <div className="auth-container bg-background flex flex-col min-h-screen md:min-h-0 md:rounded-3xl md:shadow-2xl md:border md:border-border md:overflow-hidden">
      {/* Header */}
      <div
        className="flex flex-col items-center pt-10 pb-6 px-6"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <img src={logo} alt="GateVortx Logo" className="h-20 w-20 object-contain rounded-2xl" />
        <h1 className="text-2xl font-bold tracking-tight text-white">GateVortx</h1>
        <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-widest mt-1">Admin Registration</p>
      </div>

      {/* Info Banner */}
      <div className="mx-6 mt-5">
        <div
          className="rounded-2xl p-4 flex gap-3"
          style={{ background: 'hsl(var(--primary)/0.08)', border: '1px solid hsl(var(--primary)/0.25)' }}
        >
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

          {/* Organization Type */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Organization Type <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ORG_TYPES.map(org => (
                <button
                  key={org.value}
                  type="button"
                  onClick={() => setOrgType(org.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    orgType === org.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {org.icon}
                  <span className="text-xs font-bold">{org.label}</span>
                  <span className="text-[10px] leading-tight text-center opacity-70">{org.desc}</span>
                </button>
              ))}
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
    </div>
  );
};

export default SignUpPage;
