import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ChevronLeft, Send, Loader2, User, Building2, Phone, Target, UserCheck } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';

const PERSONS_TO_MEET = ['CEO / MD', 'Department Manager', 'HR Manager', 'Finance Manager', 'IT Manager', 'Other'];
const PURPOSES = ['Business Meeting', 'Job Interview', 'Delivery', 'Personal Visit', 'Vendor Meeting', 'Other'];

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
    else if (!/^\d{10,15}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Invalid phone number';
    if (!form.company.trim()) e.company = 'Required';
    if (!form.purpose) e.purpose = 'Required';
    if (!form.person_to_meet) e.person_to_meet = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      let photoUrl: string | undefined;

      // Upload photo if selected
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

      const now = new Date();
      const { data: visitor, error } = await supabase.from('visitors').insert({
        visitor_name: form.visitor_name.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        purpose: form.purpose,
        person_to_meet: form.person_to_meet,
        photo_url: photoUrl,
        status: 'pending',
        guard_id: profile!.id,
        date: now.toISOString().split('T')[0],
      }).select().single();

      if (error) throw error;

      // Notify admin
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && visitor) {
        const notifPromises = admins.map(admin =>
          supabase.from('notifications').insert({
            user_id: admin.id,
            message: `New visitor: ${form.visitor_name} from ${form.company} wants to meet ${form.person_to_meet}`,
            type: 'visitor_request',
            read: false,
          })
        );
        await Promise.all(notifPromises);
      }

      toast({ title: '✅ Request Submitted', description: 'Visitor request sent to admin for approval.' });
      navigate('/guard');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit visitor request. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-6">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/guard')} className="p-2 bg-white/10 rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Add Visitor</h1>
            <p className="text-blue-200 text-xs">Fill in visitor details</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Photo Capture */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-sm font-semibold text-foreground mb-3">Visitor Photo</p>
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="Visitor" className="h-24 w-24 rounded-xl object-cover border-2 border-primary" />
              <button
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute -top-2 -right-2 h-6 w-6 bg-destructive rounded-full text-white text-xs flex items-center justify-center"
              >×</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Camera</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload</span>
              </button>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        </div>

        {/* Form Fields */}
        {[
          { key: 'visitor_name', label: 'Visitor Name', icon: User, placeholder: 'Full name', type: 'text' },
          { key: 'phone', label: 'Phone Number', icon: Phone, placeholder: '10-15 digit number', type: 'tel' },
          { key: 'company', label: 'Company / Organization', icon: Building2, placeholder: 'Company name', type: 'text' },
        ].map(field => {
          const Icon = field.icon;
          return (
            <div key={field.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{field.label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors[field.key] ? 'border-destructive' : 'border-border'}`}
                />
              </div>
              {errors[field.key] && <p className="text-xs text-destructive mt-1">{errors[field.key]}</p>}
            </div>
          );
        })}

        {/* Purpose */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            <Target className="inline h-4 w-4 mr-1" />Purpose of Visit
          </label>
          <select
            value={form.purpose}
            onChange={e => handleChange('purpose', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.purpose ? 'border-destructive' : 'border-border'}`}
          >
            <option value="">Select purpose</option>
            {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.purpose && <p className="text-xs text-destructive mt-1">{errors.purpose}</p>}
        </div>

        {/* Person to meet */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            <UserCheck className="inline h-4 w-4 mr-1" />Person to Meet
          </label>
          <select
            value={form.person_to_meet}
            onChange={e => handleChange('person_to_meet', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.person_to_meet ? 'border-destructive' : 'border-border'}`}
          >
            <option value="">Select person</option>
            {PERSONS_TO_MEET.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.person_to_meet && <p className="text-xs text-destructive mt-1">{errors.person_to_meet}</p>}
        </div>

        {/* Timestamp */}
        <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
          <div className="h-2 w-2 bg-success rounded-full animate-pulse-dot" />
          <p className="text-xs text-muted-foreground">
            Auto timestamp: <span className="font-medium text-foreground">{new Date().toLocaleString()}</span>
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all text-base"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
};

export default AddVisitorPage;
