import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, X, Clock, LogOut, Loader2, QrCode, ScanLine, UserCheck, Home, ClipboardList, Users, User } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import BottomNav from '../../components/BottomNav';
import jsQR from 'jsqr';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  check_in?: string;
  checked_out_at?: string;
}

interface ScanResult {
  success: boolean;
  action?: 'checkin' | 'checkout';
  employee_name?: string;
  status?: string;
  time?: string;
  error?: string;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (!profile) return;
    fetchData();
    const channel = supabase
      .channel('guard-att-qr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: emps } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('company_name', profile.company_name || '')
        .eq('is_active', true)
        .neq('role', 'admin')
        .neq('role', 'guard');
      setEmployees((emps || []) as any[]);

      if (emps && emps.length > 0) {
        const ids = emps.map((e: any) => e.id);
        const { data: att } = await supabase
          .from('attendance')
          .select('*')
          .in('employee_id', ids)
          .eq('date', today);
        setAttendance((att || []) as AttendanceRecord[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setLastScanResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      toast({ title: 'Camera Error', description: 'Could not access camera for QR scanning.', variant: 'destructive' });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

    if (code && code.data && !scanProcessing) {
      handleQRDetected(code.data);
    } else {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleQRDetected = async (qrData: string) => {
    if (scanProcessing) return;
    setScanProcessing(true);
    stopScanner();

    try {
      const { data, error } = await supabase.functions.invoke('scan-qr-token', {
        body: { qr_data: qrData },
      });

      if (error) {
        setLastScanResult({ success: false, error: error.message || 'Scan failed' });
        toast({ title: '❌ Scan Failed', description: error.message, variant: 'destructive' });
      } else if (data?.success) {
        setLastScanResult(data as ScanResult);
        const action = data.action === 'checkin' ? 'checked in' : 'checked out';
        const statusLabel = data.status ? ` (${data.status})` : '';
        toast({
          title: data.action === 'checkin' ? '✅ Checked In!' : '👋 Checked Out!',
          description: `${data.employee_name} ${action}${statusLabel}`,
        });
        fetchData();
      } else {
        setLastScanResult({ success: false, error: data?.error || 'Unknown error' });
        toast({ title: '❌ Invalid QR', description: data?.error || 'Could not process this QR code.', variant: 'destructive' });
      }
    } catch (err: any) {
      setLastScanResult({ success: false, error: err?.message || 'Scan failed' });
    } finally {
      setScanProcessing(false);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    total: employees.length,
  };

  const getStatusColor = (status?: string) => {
    if (status === 'present') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'late') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'absent') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getAttendanceForEmployee = (empId: string) => attendance.find(a => a.employee_id === empId);

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/guard')} className="bg-white/20 rounded-lg p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">QR Attendance</h1>
            <p className="text-blue-200 text-xs mt-0.5">{dateDisplay}</p>
          </div>
        </div>
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

      <div className="px-5 py-4 space-y-4">
        {/* QR Scanner Panel */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <p className="font-bold text-sm text-foreground">Scan Employee QR</p>
            </div>
            {scanning && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold animate-pulse">
                LIVE
              </span>
            )}
          </div>

          <div className="p-4">
            {scanning ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-xl bg-black aspect-square object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 relative">
                    <div className="absolute top-0 left-0 h-8 w-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 h-8 w-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/80 -translate-y-1/2 animate-pulse" />
                  </div>
                </div>
                {scanProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                      <p className="text-white text-sm font-semibold">Processing…</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={stopScanner}
                  className="mt-3 w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <X className="h-4 w-4" /> Stop Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Last scan result */}
                {lastScanResult && (
                  <div className={`rounded-xl p-3 flex items-start gap-3 ${lastScanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {lastScanResult.success ? (
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      {lastScanResult.success ? (
                        <>
                          <p className="text-sm font-bold text-green-800">
                            {lastScanResult.action === 'checkin' ? '✅ Checked In' : '👋 Checked Out'}
                          </p>
                          <p className="text-xs text-green-700">
                            {lastScanResult.employee_name}
                            {lastScanResult.status ? ` — ${lastScanResult.status}` : ''}
                            {lastScanResult.time ? ` at ${new Date(lastScanResult.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-red-800">Scan Failed</p>
                          <p className="text-xs text-red-700">{lastScanResult.error}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={startScanner}
                  className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                >
                  <QrCode className="h-6 w-6" />
                  Scan QR Code
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Point the camera at the employee's daily QR code
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Attendance List */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Today's Attendance</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10">
              <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No employees found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => {
                const rec = getAttendanceForEmployee(emp.id);
                return (
                  <div key={emp.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{emp.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {rec?.check_in && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(rec.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {rec?.checked_out_at && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <LogOut className="h-2.5 w-2.5" />
                            {new Date(rec.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${rec ? getStatusColor(rec.status) : 'bg-muted text-muted-foreground border-border'}`}>
                      {rec ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1) : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default GuardAttendancePage;
