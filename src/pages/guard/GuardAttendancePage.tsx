import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, Check, X, Clock, Trash2, LogOut, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import BottomNav from '../../components/BottomNav';
import { Home, ClipboardList, Users, UserCheck, User } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  check_in?: string;
  checked_out_at?: string;
  photo_url?: string;
}

const NAV_ITEMS = [
  { label: 'Home', path: '/guard', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/guard/attendance', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Add', path: '/guard/add-visitor', icon: <Users className="h-5 w-5" /> },
  { label: 'Profile', path: '/guard/profile', icon: <User className="h-5 w-5" /> },
];

const GuardAttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({});
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, File>>({});

  const today = new Date().toISOString().split('T')[0];
  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Cleanup yesterday's photos from storage on mount
  useEffect(() => {
    cleanupOldPhotos();
  }, []);

  const cleanupOldPhotos = async () => {
    try {
      const { data: files } = await supabase.storage.from('employee-photos').list('', { limit: 200 });
      if (!files) return;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const toDelete = files
        .filter(f => {
          const created = new Date(f.created_at || 0);
          return created < yesterday;
        })
        .map(f => f.name);
      if (toDelete.length > 0) {
        await supabase.storage.from('employee-photos').remove(toDelete);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!profile) return;
    fetchData();

    const channel = supabase
      .channel('guard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch employees in same company (non-admin, non-guard)
      const { data: emps } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('company_name', profile.company_name || '')
        .eq('is_active', true)
        .neq('role', 'admin')
        .neq('role', 'guard');

      setEmployees((emps as Employee[]) || []);

      if (emps && emps.length > 0) {
        const ids = emps.map((e: Employee) => e.id);
        const { data: att } = await supabase
          .from('attendance')
          .select('*')
          .in('employee_id', ids)
          .eq('date', today);

        const map: Record<string, AttendanceRecord> = {};
        (att || []).forEach((a: AttendanceRecord) => { map[a.employee_id] = a; });
        setAttendance(map);
      }
    } finally {
      setLoading(false);
    }
  };

  const openCamera = (employeeId: string) => {
    setCameraTarget(employeeId);
    setTimeout(() => cameraRef.current?.click(), 50);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cameraTarget) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Photo too large', description: 'Max 8MB', variant: 'destructive' });
      return;
    }
    setPendingPhotos(prev => ({ ...prev, [cameraTarget]: file }));
    setPhotoPreview(prev => ({ ...prev, [cameraTarget]: URL.createObjectURL(file) }));
    // Reset input so same file can be recaptured
    e.target.value = '';
    setCameraTarget(null);
  };

  const sendAttendanceNotification = async (employeeId: string, employeeName: string, status: 'present' | 'absent' | 'late') => {
    const statusEmoji = status === 'present' ? '✅' : status === 'late' ? '⏰' : '❌';
    const guardName = profile?.name || 'Guard';
    const message = `${statusEmoji} Your attendance for today has been marked as "${status}" by ${guardName}.`;

    // Insert in-app notification
    await supabase.from('notifications').insert({
      user_id: employeeId,
      message,
      type: 'attendance',
    });

    // Fire push notification via edge function (best-effort)
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          user_ids: [employeeId],
          title: `Attendance: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          body: message,
          data: { type: 'attendance', status },
        },
      });
    } catch (e) {
      console.warn('[Push] Could not send push notification:', e);
    }
  };

  const markAttendance = async (employee: Employee, status: 'present' | 'absent' | 'late') => {
    if (!profile) return;
    setSavingFor(employee.id);

    try {
      let photoUrl: string | undefined;

      if (status !== 'absent') {
        const photoFile = pendingPhotos[employee.id];
        if (!photoFile) {
          toast({ title: 'Photo required', description: 'Please capture a photo before marking present/late.', variant: 'destructive' });
          setSavingFor(null);
          return;
        }

        // Upload photo
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${today}/${employee.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('employee-photos')
          .upload(path, photoFile, { contentType: photoFile.type, upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from('employee-photos').getPublicUrl(path);
        photoUrl = publicUrl;
      }

      const existing = attendance[employee.id];
      const now = new Date().toISOString();

      if (existing) {
        await supabase.from('attendance').update({
          status,
          guard_id: profile.id,
          check_in: existing.check_in || (status !== 'absent' ? now : undefined),
          photo_url: photoUrl || existing.photo_url,
        } as any).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({
          employee_id: employee.id,
          guard_id: profile.id,
          date: today,
          status,
          check_in: status !== 'absent' ? now : undefined,
          photo_url: photoUrl,
        } as any);
      }

      // Send real-time notification to employee
      await sendAttendanceNotification(employee.id, employee.name, status);

      toast({ title: `✅ Marked ${status}`, description: `${employee.name} marked as ${status}` });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setSavingFor(null);
    }
  };

  const markCheckOut = async (record: AttendanceRecord, employeeName: string) => {
    if (!record) return;
    setSavingFor(record.employee_id);
    try {
      await supabase.from('attendance').update({
        checked_out_at: new Date().toISOString(),
      } as any).eq('id', record.id);

      // Notify employee of checkout
      const guardName = profile?.name || 'Guard';
      await supabase.from('notifications').insert({
        user_id: record.employee_id,
        message: `👋 Your checkout time has been recorded by ${guardName}.`,
        type: 'attendance',
      });

      toast({ title: '👋 Checked Out', description: `${employeeName} checked out.` });
      fetchData();
    } finally {
      setSavingFor(null);
    }
  };

  const removePhoto = (employeeId: string) => {
    setPendingPhotos(prev => { const n = { ...prev }; delete n[employeeId]; return n; });
    setPhotoPreview(prev => { const n = { ...prev }; delete n[employeeId]; return n; });
  };

  const getStatusColor = (status?: string) => {
    if (status === 'present') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'late') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'absent') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  const stats = {
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length,
    late: Object.values(attendance).filter(a => a.status === 'late').length,
    total: employees.length,
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/guard')} className="bg-white/20 rounded-lg p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Employee Attendance</h1>
            <p className="text-blue-200 text-xs mt-0.5">{dateDisplay}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'bg-white/20' },
            { label: 'Present', value: stats.present, color: 'bg-green-500/30' },
            { label: 'Late', value: stats.late, color: 'bg-amber-500/30' },
            { label: 'Absent', value: stats.absent, color: 'bg-red-500/30' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-blue-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Note about photo auto-delete */}
      <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">Employee photos are automatically deleted after end of day for privacy.</p>
      </div>

      {/* Hidden camera input — camera only, no gallery */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No employees found</p>
            <p className="text-xs text-muted-foreground mt-1">Employees will appear here once added by admin</p>
          </div>
        ) : (
          employees.map(emp => {
            const rec = attendance[emp.id];
            const preview = photoPreview[emp.id];
            const isSaving = savingFor === emp.id;
            const isMarked = !!rec;
            const isAbsent = rec?.status === 'absent';
            const isCheckedOut = !!rec?.checked_out_at;

            return (
              <div key={emp.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Employee info row */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {preview ? (
                      <img src={preview} alt={emp.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-base">{emp.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>
                  {rec && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(rec.status)}`}>
                      {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </span>
                  )}
                </div>

                {/* Check-in / check-out times */}
                {rec && (
                  <div className="flex gap-3 px-4 pb-3">
                    {rec.check_in && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        In: {new Date(rec.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {rec.checked_out_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LogOut className="h-3 w-3" />
                        Out: {new Date(rec.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}

                {/* Photo capture area — only if not absent */}
                {!isAbsent && (
                  <div className="px-4 pb-3">
                    {preview ? (
                      <div className="relative">
                        <img src={preview} alt="Captured" className="w-full h-32 rounded-xl object-cover border-2 border-primary/30" />
                        <button
                          onClick={() => removePhoto(emp.id)}
                          className="absolute top-2 right-2 h-7 w-7 bg-destructive rounded-full flex items-center justify-center shadow"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 rounded-lg px-2 py-0.5">
                          <p className="text-[10px] text-white">Photo captured ✓</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openCamera(emp.id)}
                        className="w-full h-16 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Camera className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {isMarked ? 'Retake Photo' : 'Capture Photo (Required)'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="border-t border-border px-4 py-3 flex gap-2">
                  {!isMarked ? (
                    <>
                      <button
                        onClick={() => markAttendance(emp, 'present')}
                        disabled={isSaving}
                        className="flex-1 h-10 rounded-xl bg-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Present
                      </button>
                      <button
                        onClick={() => markAttendance(emp, 'late')}
                        disabled={isSaving}
                        className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        Late
                      </button>
                      <button
                        onClick={() => markAttendance(emp, 'absent')}
                        disabled={isSaving}
                        className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Absent
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Update status */}
                      <button
                        onClick={() => markAttendance(emp, rec.status === 'present' ? 'late' : 'present')}
                        disabled={isSaving || isAbsent}
                        className="flex-1 h-10 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Update
                      </button>
                      {/* Check-out button */}
                      {!isAbsent && !isCheckedOut && (
                        <button
                          onClick={() => markCheckOut(rec, emp.name)}
                          disabled={isSaving}
                          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                          Check Out
                        </button>
                      )}
                      {isCheckedOut && (
                        <div className="flex-1 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground font-semibold">✓ Checked Out</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default GuardAttendancePage;
