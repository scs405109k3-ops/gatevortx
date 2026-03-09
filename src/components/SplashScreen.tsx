import React from 'react';
import splashLogo from '../assets/splash-logo.png';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[hsl(230,60%,12%)]">
      {/* Animated logo */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute h-52 w-52 rounded-full border border-primary/20 animate-[ping_2s_ease-in-out_infinite]" />
        {/* Vortex rings */}
        <div className="absolute h-44 w-44 rounded-full border-2 border-primary/30 animate-[vortex-spin_3s_linear_infinite]" />
        <div className="absolute h-36 w-36 rounded-full border-2 border-purple-400/40 animate-[vortex-spin_2.2s_linear_infinite_reverse]" />
        <div className="absolute h-28 w-28 rounded-full border-t-2 border-r-2 border-cyan-400/50 animate-[vortex-spin_1.5s_linear_infinite]" />

        {/* Uploaded splash logo */}
        <img
          src={splashLogo}
          alt="GateVortx"
          className="relative h-20 w-20 rounded-2xl object-contain animate-scale-in z-10 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
          style={{ animation: 'scale-in 0.6s ease-out forwards, float 3s ease-in-out 0.6s infinite' }}
        />
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-white animate-fade-in">
        GateVortx
      </h1>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary/70 animate-fade-in">
        Smart Office Management
      </p>

      {/* Loading dots */}
      <div className="mt-8 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-primary/60"
            style={{
              animation: `vortex-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
