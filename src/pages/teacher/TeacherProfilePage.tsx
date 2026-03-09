import React, { useRef, useState } from 'react';
import { User, Camera, Upload, CheckCircle, AlertCircle, Home, CalendarCheck, FileText, Loader2, LogOut, GraduationCap } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import LogoutConfirmDialog from '../../components/LogoutConfirmDialog';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/teacher/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/teacher/profile', icon: <User className="h-5 w-5" /> },
];

const TeacherProfilePage: React.FC = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('employee-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedError || !signedData?.signedUrl) throw signedError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: signedData.signedUrl })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      await refreshProfile();
      toast({ title: '✅ Photo Updated!', description: 'Your profile photo is set for AI verification.' });
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
      <div className="px-5 pt-12 pb-6 flex flex-col items-center"
        style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <h1 className="text-xl font-bold text-white mb-5">Teacher Profile</h1>
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
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4 text-primary" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-white mt-3">{profile?.name}</h2>
        <p className="text-blue-200 text-sm">Teacher · {(profile as any)?.company_name || 'GateVortx'}</p>
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

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />

      <div className="px-5 py-5 space-y-4">
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
                Used for AI identity verification during attendance.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => cameraInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-all disabled:opacity-50">
                  <Camera className="h-3.5 w-3.5" /> Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold active:scale-95 transition-all disabled:opacity-50">
                  <Upload className="h-3.5 w-3.5" /> Gallery
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Details</p>
          </div>
          {[
            { label: 'User ID', value: (profile as any)?.user_code || '—' },
            { label: 'Full Name', value: profile?.name },
            { label: 'Email', value: profile?.email },
            { label: 'Role', value: 'Teacher' },
            { label: 'Institution', value: (profile as any)?.company_name || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium text-right max-w-[60%] truncate ${label === 'User ID' ? 'font-mono font-bold text-primary' : 'text-foreground'}`}>{value || '—'}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full h-12 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border border-destructive/20"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      <BottomNav items={NAV_ITEMS} />

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onConfirm={signOut}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </div>
  );
};

export default TeacherProfilePage;
