import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff, Loader2, Camera, RefreshCw } from 'lucide-react';

/**
 * QrScannerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow:
 *   1. Check secure-context & media API availability
 *   2. Call getUserMedia() to trigger the browser's native "Allow Camera?" prompt
 *   3. Release that test stream → hand off to Html5Qrcode (which re-opens camera)
 *   4. Auto-call onScanned(token) the instant a QR code is decoded
 *   5. Show specific error + retry button on any failure
 *
 * Props
 *   course           : { code, name }
 *   onScanned        : (token: string) => void – auto-fires on first decode
 *   onClose          : () => void              – cancel
 *   onManualFallback : () => void              – switch to manual entry
 */

const SCANNER_ID = 'html5qr-scanner-region';

const QrScannerModal = ({ course, onScanned, onClose, onManualFallback }) => {
  const scannerRef  = useRef(null);
  const firedRef    = useRef(false);
  const mountedRef  = useRef(true);

  // status: 'checking' | 'requesting' | 'starting' | 'ready' | 'error'
  const [status, setStatus] = useState('checking');
  const [errMsg, setErrMsg] = useState('');

  // ── Stop & clear the html5-qrcode instance ─────────────────────────────────
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch (_) { /* already stopped or never started */ }
    scannerRef.current = null;
  }, []);

  // ── Full start sequence ─────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;

    // Reset state before each attempt
    setStatus('checking');
    setErrMsg('');
    firedRef.current = false;
    await stopScanner();

    // ── Browser capability check ──────────────────────────────────────────────
    // (getUserMedia requires HTTPS — enforced by nginx. If somehow reached over
    //  plain HTTP the browser will still block it here with a clear message.)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrMsg(
        'Your browser does not support camera access. ' +
        'Please use Chrome, Firefox, or Safari. ' +
        'If you see a "Not Secure" warning, tap it and choose "Allow" or contact your admin.'
      );
      setStatus('error');
      return;
    }

    // ── 3. Explicitly request camera permission ────────────────────────────────
    //       This is the step that triggers the browser's native "Allow" dialog.
    setStatus('requesting');
    let testStream;
    try {
      testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (permErr) {
      if (!mountedRef.current) return;
      const name = permErr?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrMsg(
          '📷 Camera access was denied.\n' +
          'Tap the 🔒 lock icon in your address bar → Site settings → Allow Camera, then tap "Try Again".'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrMsg(
          'No camera was found on this device. ' +
          'Make sure a camera is connected and not disabled.'
        );
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrMsg(
          'The camera is already in use by another app or browser tab. ' +
          'Close it and tap "Try Again".'
        );
      } else if (name === 'OverconstrainedError') {
        // Retry without facingMode constraint (some desktop webcams don't support it)
        try {
          testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (_) {
          setErrMsg(`Camera error: ${permErr?.message || permErr?.name || 'Unknown'}`);
          setStatus('error');
          return;
        }
      } else {
        setErrMsg(`Camera error: ${permErr?.message || permErr?.name || 'Unknown error'}`);
        setStatus('error');
        return;
      }
    }

    // Permission granted — release the probe stream right away.
    // Html5Qrcode will open its own stream independently.
    if (testStream) {
      testStream.getTracks().forEach(t => t.stop());
    }

    if (!mountedRef.current) return;
    setStatus('starting');

    // ── 4. Ensure DOM element exists ──────────────────────────────────────────
    if (!document.getElementById(SCANNER_ID)) {
      setErrMsg('Scanner failed to initialise. Please close and try again.');
      setStatus('error');
      return;
    }

    // ── 5. Start Html5Qrcode ──────────────────────────────────────────────────
    try {
      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 240, height: 240 } },

        // SUCCESS → auto submit, no button needed
        (decodedText) => {
          if (firedRef.current || !mountedRef.current) return;
          firedRef.current = true;
          stopScanner().then(() => {
            if (mountedRef.current) onScanned(decodedText);
          });
        },

        // Per-frame decode errors are normal (blur, wrong angle) — suppress
        (_frameError) => {}
      );

      if (mountedRef.current) setStatus('ready');
    } catch (err) {
      if (!mountedRef.current) return;
      setErrMsg(
        `Could not start the QR scanner. ${err?.message || 'Please reload the page and try again.'}`
      );
      setStatus('error');
    }
  }, [onScanned, stopScanner]);

  // ── Mount / unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);   // run once per mount

  const handleCancel = () => stopScanner().then(onClose);

  const handleManual = () => stopScanner().then(onManualFallback);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/[0.92] flex flex-col items-center justify-center px-4">

      {/* ── Course label ── */}
      <p className="mb-5 text-white/60 text-xs uppercase tracking-widest font-medium text-center">
        {course?.code ? `${course.code} — ${course.name}` : 'Attendance Scanner'}
      </p>

      {/* ── Scanner frame ── */}
      <div className="relative">

        {/* html5-qrcode injects <video> + <canvas> here */}
        <div
          id={SCANNER_ID}
          className="rounded-2xl overflow-hidden bg-slate-900"
          style={{ width: 280, height: 280 }}
        />

        {/* Corner brackets */}
        {[
          'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
          'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
          'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
          'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 border-emerald-400 ${cls} pointer-events-none`}
            style={{ zIndex: 10 }}
          />
        ))}

        {/* Animated scan line — only when actively scanning */}
        {status === 'ready' && (
          <div
            className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
            style={{ animation: 'scanLine 2s linear infinite', zIndex: 10 }}
          />
        )}

        {/* Checking / Starting overlay */}
        {(status === 'checking' || status === 'starting') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl z-20">
            <Loader2 size={36} className="animate-spin text-emerald-400" />
          </div>
        )}

        {/* "Requesting permission" overlay — shown while the browser prompt is open */}
        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-2xl gap-3 px-4 z-20">
            <Camera size={36} className="text-emerald-400 animate-pulse" />
            <p className="text-white text-xs text-center leading-relaxed">
              Please <strong>Allow</strong> camera access<br />in the browser prompt above ↑
            </p>
          </div>
        )}
      </div>

      {/* ── Status text ── */}
      <div className="mt-6 text-center min-h-[3.5rem] max-w-xs w-full">
        {status === 'ready' && (
          <p className="text-emerald-300 text-sm animate-pulse">
            📷 Point at the QR code — attendance records automatically
          </p>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm whitespace-pre-line leading-relaxed">
              {errMsg}
            </p>
            <button
              onClick={startScanner}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95
                         text-emerald-300 text-sm border border-emerald-500/40
                         transition-all duration-150"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs">
        {/* Manual fallback — always available */}
        {onManualFallback && (
          <button
            onClick={handleManual}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                       rounded-xl bg-white/5 hover:bg-white/15 active:scale-95
                       text-white/70 hover:text-white text-sm border border-white/10
                       transition-all duration-150"
          >
            Enter token manually
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                     rounded-xl bg-white/10 hover:bg-white/20 active:scale-95
                     text-white text-sm font-medium border border-white/20
                     transition-all duration-150"
        >
          <CameraOff size={16} /> Cancel
        </button>
      </div>

      {/* Inline keyframe — scan line animation */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 8%;  opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QrScannerModal;
