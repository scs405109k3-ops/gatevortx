import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, Send, Loader2, Phone, Search, Lock } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';

const PERSONS_TO_MEET = ['CEO / MD', 'Department Manager', 'HR Manager', 'Finance Manager', 'IT Manager', 'Other'];
const PURPOSES = ['Business Meeting', 'Job Interview', 'Delivery', 'Personal Visit', 'Vendor Meeting', 'Maintenance', 'Other'];

const AddVisitorPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    visitor_name: '',
    phone: '',
    company: '',
    purpose: '',
    person_to_meet: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  const now = new Date();
  const entryDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const entryTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Photo too large', description: 'Max 5MB', variant: 'destructive' }); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.visitor_name.trim()) e.visitor_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^\d{10,15}$/.test(form.phone.replace(/[\s\-\(\)\+]/g, ''))) e.phone = 'Invalid phone number';
    if (!form.company.trim()) e.company = 'Required';
    if (!form.purpose) e.purpose = 'Required';
    if (!form.person_to_meet) e.person_to_meet = 'Required';
    if (!agreed) e.agreed = 'Please agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      let photoUrl: string | undefined;

      if (photo) {
        const ext = photo.name.split('.').pop();
        const path = `visitor-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('visitor-photos')
          .upload(path, photo, { contentType: photo.type });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('visitor-photos').getPublicUrl(path);
          photoUrl = publicUrl;
        }
      }

      const nowDate = new Date();
      const { data: visitor, error } = await supabase.from('visitors').insert({
        visitor_name: form.visitor_name.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        purpose: form.purpose,
        person_to_meet: form.person_to_meet,
        photo_url: photoUrl,
        status: 'pending',
        guard_id: profile!.id,
        date: nowDate.toISOString().split('T')[0],
      }).select().single();

      if (error) throw error;

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && visitor) {
        await Promise.all(admins.map(admin =>
          supabase.from('notifications').insert({
            user_id: admin.id,
            message: `New visitor: ${form.visitor_name} from ${form.company} wants to meet ${form.person_to_meet}`,
            type: 'visitor_request',
            read: false,
          })
        ));
      }

      toast({ title: '✅ Request Submitted', description: 'Visitor request sent to admin for approval.' });
      navigate('/guard');
    } catch {
      toast({ title: 'Error', description: 'Failed to submit visitor request. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center bg-card px-4 py-3.5 border-b border-border sticky top-0 z-10">
        <button
          onClick={() => navigate('/guard')}
          className="bg-primary/10 rounded-lg p-2 mr-3"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Visitor Entry Form</h1>
          <p className="text-xs text-muted-foreground">GateVortx Security Management</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-2">
          <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Entry Date / Time cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entry Date</p>
            <p className="text-sm font-bold text-primary flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {entryDate}
            </p>
          </div>
          <div className="bg-card rounded-2xl p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entry Time</p>
            <p className="text-sm font-bold text-primary flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {entryTime}
            </p>
          </div>
        </div>

        {/* Photo Capture */}
        <div>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Visitor" className="w-full h-44 rounded-2xl object-cover border-2 border-primary" />
              <button
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 h-7 w-7 bg-destructive rounded-full text-white text-sm flex items-center justify-center shadow"
              >×</button>
            </div>
          ) : (
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-border bg-primary/5 flex flex-col items-center justify-center gap-3"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Capture Visitor Photo</p>
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground mt-2 italic">Required for identification purposes</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        </div>

        {/* Visitor Details Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground">Visitor Details</h2>
          </div>

          <div className="space-y-4">
            {/* Visitor Name */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Visitor Name</label>
              <input
                type="text"
                value={form.visitor_name}
                onChange={e => handleChange('visitor_name', e.target.value)}
                placeholder="Enter full name"
                className={`w-full h-12 px-4 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.visitor_name ? 'border-destructive' : 'border-border'}`}
              />
              {errors.visitor_name && <p className="text-xs text-destructive mt-1">{errors.visitor_name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.phone ? 'border-destructive' : 'border-border'}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Company Name</label>
              <input
                type="text"
                value={form.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="e.g. Acme Corp"
                className={`w-full h-12 px-4 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.company ? 'border-destructive' : 'border-border'}`}
              />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>

            {/* Purpose */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Purpose of Visit</label>
              <div className="relative">
                <select
                  value={form.purpose}
                  onChange={e => handleChange('purpose', e.target.value)}
                  className={`w-full h-12 px-4 pr-10 rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none ${errors.purpose ? 'border-destructive' : 'border-border'} ${!form.purpose ? 'text-muted-foreground' : ''}`}
                >
                  <option value="">Select purpose</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {errors.purpose && <p className="text-xs text-destructive mt-1">{errors.purpose}</p>}
            </div>

            {/* Person to Meet */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Person to Meet</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={form.person_to_meet}
                  onChange={e => handleChange('person_to_meet', e.target.value)}
                  className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none ${errors.person_to_meet ? 'border-destructive' : 'border-border'} ${!form.person_to_meet ? 'text-muted-foreground' : ''}`}
                >
                  <option value="">Search staff...</option>
                  {PERSONS_TO_MEET.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {errors.person_to_meet && <p className="text-xs text-destructive mt-1">{errors.person_to_meet}</p>}
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${errors.agreed ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}
          onClick={() => { setAgreed(!agreed); if (errors.agreed) setErrors(prev => { const e = { ...prev }; delete e.agreed; return e; }); }}
        >
          <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${agreed ? 'bg-primary border-primary' : 'border-border'}`}>
            {agreed && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-snug cursor-pointer">
            I confirm that the information provided is accurate and I agree to follow the facility's safety and security protocols during this visit.
          </p>
        </div>
        {errors.agreed && <p className="text-xs text-destructive -mt-3">{errors.agreed}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all text-base shadow-lg shadow-primary/30"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {loading ? 'Submitting...' : 'Submit Entry Request'}
        </button>

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by GateVortx Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default AddVisitorPage;
