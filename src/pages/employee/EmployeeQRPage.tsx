import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, RefreshCw, Home, CalendarCheck, FileText, User, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import { toast } from '../../hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="h-5 w-5" /> },
];

const EmployeeQRPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const generateQR = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr-token');
      if (error) throw error;
      if (data?.qr_data) {
        setQrData(data.qr_data);
        setGeneratedAt(new Date());
      } else {
        throw new Error(data?.error || 'Failed to generate QR code');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Could not generate QR code', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/employee')} className="bg-white/20 rounded-lg p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">My Attendance QR</h1>
            <p className="text-blue-200 text-xs mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col items-center gap-6">
        {/* Instructions */}
        <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Show this to the guard</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This QR code is unique to you and valid for today only. The guard scans it to record your attendance.
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="w-full max-w-xs">
          <div className="bg-card border-2 border-border rounded-3xl p-6 flex flex-col items-center gap-4 shadow-lg">
            {loading ? (
              <div className="h-56 w-56 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            ) : qrData ? (
              <>
                <div className="p-3 bg-white rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.user_code && `#${profile.user_code} · `}{profile?.company_name}</p>
                  {generatedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Generated at {generatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="h-56 w-56 flex flex-col items-center justify-center gap-3">
                <QrCode className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground text-center">QR code could not be generated</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily renewal notice */}
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700 text-center font-medium">
            🔄 This QR code expires at midnight and renews daily for security
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={generateQR}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate QR
        </button>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default EmployeeQRPage;
