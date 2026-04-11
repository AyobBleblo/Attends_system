import { CameraOff } from 'lucide-react';

/**
 * ScanRing — full-screen QR scan overlay with animated pulsing ring,
 *             crosshair corners, and a sweeping scan line.
 * Props:
 *   videoRef   : React ref for the <video> element
 *   onStop     : () => void — called when user stops camera
 *   label?     : string — optional prompt text (default: "Point at QR code")
 */
const ScanRing = ({ videoRef, onStop, label = "Point your camera at the QR code" }) => (
  <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
    {/* Camera feed */}
    <div className="relative w-full max-w-sm mx-4 aspect-square rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Dark overlay with cut-out via shadow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative w-56 h-56"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
        >
          {/* Animated pulsing ring */}
          <div className="scan-ring absolute inset-0 animate-ping-slow opacity-40" />
          <div className="scan-ring absolute inset-0" />

          {/* Crosshair corners */}
          {[
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-7 h-7 ${cls} border-emerald-400`} />
          ))}

          {/* Sweeping scan line */}
          <div
            className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line"
            style={{ top: '10%' }}
          />
        </div>
      </div>
    </div>

    {/* Label */}
    <p className="mt-6 text-white/80 text-sm text-center px-8">{label}</p>

    {/* Stop button */}
    <button
      onClick={onStop}
      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20
                 text-white text-sm font-medium border border-white/20 transition-all duration-150"
    >
      <CameraOff size={16} /> Stop Camera
    </button>
  </div>
);

export default ScanRing;
