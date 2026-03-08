import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { Building2, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

const CompanySetupPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { setError('Please enter your company name'); return; }
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_name: companyName.trim() })
      .eq('id', user!.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }

    await refreshProfile();
    navigate('/admin');
  };

  return (
    <div className="mobile-container bg-background flex flex-col min-h-screen md:items-center md:justify-center">
      {/* Header */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6 bg-card border-b border-border">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Company Setup</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Set up your company profile to get started
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 px-6 py-4 bg-card border-b border-border">
        {['Company Info', 'Add Users', 'Go Live'].map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Info card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Admin Account Created ✓</p>
              <p className="text-xs text-muted-foreground mt-0.5">Now set up your company so you can add employees and security guards.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Company / Organization Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Industry <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none"
            >
              <option value="">Select industry…</option>
              <option value="technology">Technology</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance & Banking</option>
              <option value="retail">Retail</option>
              <option value="education">Education</option>
              <option value="construction">Construction</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {loading ? 'Saving…' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompanySetupPage;
