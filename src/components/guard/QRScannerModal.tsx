import React, { useEffect, useRef, useState } from 'react';
import { X, QrCode, ScanLine, Loader2, Check } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { toast } from '../../hooks/use-toast';
import jsQR from 'jsqr';

interface ScanResult {
  success: boolean;
  action?: 'checkin' | 'checkout';
  employee_name?: string;
  status?: string;
  time?: string;
  error?: string;
}

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ open, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

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

  const startScanner = async () => {
    setLastScanResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(scanFrame);
      }
    } catch {
      toast({ title: 'Camera Error', description: 'Could not access camera.', variant: 'destructive' });
      setScanning(false);
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
        onSuccess?.();
      } else {
        setLastScanResult({ success: false, error: data?.error || 'Unknown error' });
        toast({ title: '❌ Invalid QR', description: data?.error || 'Could not process QR code.', variant: 'destructive' });
      }
    } catch (err: any) {
      setLastScanResult({ success: false, error: err?.message || 'Scan failed' });
    } finally {
      setScanProcessing(false);
    }
  };

  // Auto-start scanner when modal opens
  useEffect(() => {
    if (open) {
      setLastScanResult(null);
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { stopScanner(); onClose(); }}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ScanLine className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Quick QR Scan</p>
              <p className="text-[10px] text-muted-foreground">Point at employee's daily QR code</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scanning && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold animate-pulse">
                LIVE
              </span>
            )}
            <button
              onClick={() => { stopScanner(); onClose(); }}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Last scan result */}
          {lastScanResult && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 ${
              lastScanResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {lastScanResult.success ? (
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                  <X className="h-4 w-4 text-destructive-foreground" />
                </div>
              )}
              <div className="flex-1">
          {lastScanResult.success ? (
                <>
                  <p className="text-sm font-bold" style={{ color: 'hsl(142,76%,25%)' }}>
                    {lastScanResult.action === 'checkin' ? '✅ Checked In' : '👋 Checked Out'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(142,60%,30%)' }}>
                    <span className="font-semibold">{lastScanResult.employee_name}</span>
                    {lastScanResult.status ? ` — ${lastScanResult.status}` : ''}
                    {lastScanResult.time
                      ? ` at ${new Date(lastScanResult.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-destructive">Scan Failed</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{lastScanResult.error}</p>
                </>
              )}
              </div>
            </div>
          )}

          {/* Camera view */}
          {scanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-2xl bg-black aspect-square object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Corner guides */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-52 w-52 relative">
                  <div className="absolute top-0 left-0 h-8 w-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                  <div className="absolute top-0 right-0 h-8 w-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary -translate-y-1/2 animate-pulse rounded-full shadow-lg shadow-primary/50" />
                </div>
              </div>
              {scanProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                    <p className="text-white text-sm font-bold">Processing…</p>
                  </div>
                </div>
              )}
              <button
                onClick={stopScanner}
                className="mt-3 w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <X className="h-4 w-4" /> Stop Camera
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
            >
              <QrCode className="h-6 w-6" />
              Scan Again
            </button>
          )}
        </div>

        {/* Safe area padding */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default QRScannerModal;
