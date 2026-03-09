import React, { useRef, useState } from 'react';
import { User, Camera, Upload, CheckCircle, AlertCircle, Home, CalendarCheck, FileText, Loader2, Mail, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="h-5 w-5" /> },
];

const EmployeeProfilePage: React.FC = () => {
  const { profile, orgType, refreshProfile, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const memberLabel = (orgType === 'school' || orgType === 'college') ? 'Student' : 'Employee';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB.', variant: 'destructive' });
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${profile.id}/avatar.${ext}`;

      // Upload to employee-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL — bucket is private, use signed URL via service
      // We store path and generate a signed URL each time
      const { data: signedData, error: signedError } = await supabase.storage
        .from('employee-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedError || !signedData?.signedUrl) throw signedError;

      // Update profile avatar_url with the path (we regenerate signed URL when needed)
      // Store the storage path so we can refresh the signed URL
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: signedData.signedUrl })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      await refreshProfile();
      toast({
        title: '✅ Photo Updated!',
        description: 'Your profile photo is now set as the AI verification reference image.',
      });
    } catch (err: any) {
      setPreview(null);
      toast({ title: 'Upload failed', description: err?.message || 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = preview || profile?.avatar_url;
  const hasPhoto = !!profile?.avatar_url;

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex flex-col items-center"
        style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="w-full flex items-center mb-3">
          <button onClick={() => navigate('/employee')} className="bg-white/20 rounded-lg p-2 active:scale-95 transition-all">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-white mb-5">My Profile</h1>

        {/* Avatar with upload overlay */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-white/70" />
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          {/* Camera button overlay */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4 text-primary" />
          </button>
        </div>

        <h2 className="text-lg font-bold text-white mt-3">{profile?.name}</h2>
        <p className="text-blue-200 text-sm">{memberLabel} · {(profile as any)?.company_name || 'GateVortx'}</p>

        {/* AI verification status badge */}
        <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          hasPhoto ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'
        }`}>
          {hasPhoto ? (
            <><CheckCircle className="h-3.5 w-3.5" /> AI Face Verification Ready</>
          ) : (
            <><AlertCircle className="h-3.5 w-3.5" /> Upload photo to enable AI verification</>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />

      <div className="px-5 py-5 space-y-4">
        {/* Upload CTA */}
        <div className={`rounded-2xl p-4 border-2 ${hasPhoto ? 'border-border bg-card' : 'border-dashed border-primary/40 bg-primary/5'}`}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {hasPhoto ? 'Update Verification Photo' : 'Set Your Verification Photo'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This photo is used by the AI to verify your identity during attendance check-in.
                {!hasPhoto && ' Without it, the guard cannot verify you.'}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Gallery
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Details</p>
          </div>
          {[
            { label: 'User ID', value: (profile as any)?.user_code || '—' },
            { label: 'Full Name', value: profile?.name },
            { label: 'Email', value: profile?.email },
            { label: 'Role', value: memberLabel },
            { label: 'Organisation', value: (profile as any)?.company_name || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium text-right max-w-[60%] truncate ${label === 'User ID' ? 'font-mono font-bold text-primary' : 'text-foreground'}`}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* AI Info Card */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">How AI Verification Works</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When the guard captures your photo during attendance, our AI compares it with your uploaded reference photo to confirm your identity. This prevents proxy attendance.
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full h-12 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border border-destructive/20"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default EmployeeProfilePage;
