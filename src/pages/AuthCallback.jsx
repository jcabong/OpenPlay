import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-ink-400">Email confirmed! Redirecting...</p>
      </div>
    </div>
  );
}
