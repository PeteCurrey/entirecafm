'use client';

import { useState, useEffect } from 'react';
import { Home, List, MapPin, FileText, User, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/mobile', icon: Home, label: 'Home' },
  { href: '/mobile/jobs', icon: List, label: 'Jobs' },
  { href: '/mobile/map', icon: MapPin, label: 'Map' },
  { href: '/mobile/documents', icon: FileText, label: 'Docs' },
  { href: '/mobile/profile', icon: User, label: 'Profile' },
];

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState(0);

  useEffect(() => {
    const check = () => setOffline(!navigator.onLine);
    const checkQueue = () => {
      try {
        const q = JSON.parse(localStorage.getItem('cafm_offline_queue') || '[]');
        setQueue(q.length);
      } catch { setQueue(0); }
    };
    window.addEventListener('online', () => { setOffline(false); syncQueue(); });
    window.addEventListener('offline', () => setOffline(true));
    setInterval(checkQueue, 2000);
    check(); checkQueue();
    return () => { window.removeEventListener('online', () => {}); window.removeEventListener('offline', () => {}); };
  }, []);

  const syncQueue = async () => {
    try {
      const q = JSON.parse(localStorage.getItem('cafm_offline_queue') || '[]');
      for (const action of q) {
        await fetch(action.url, { method: action.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.body) });
      }
      localStorage.setItem('cafm_offline_queue', '[]');
    } catch {}
  };

  if (!offline && queue === 0) return null;

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-[9999] text-xs font-bold text-center py-2 text-white",
      offline ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]'
    )}>
      {offline ? (
        <span className="flex items-center justify-center gap-2"><WifiOff className="w-3 h-3" /> You&apos;re offline – some features may not be available</span>
      ) : (
        <span className="flex items-center justify-center gap-2"><Wifi className="w-3 h-3" /> Back online – syncing {queue} pending actions...</span>
      )}
    </div>
  );
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white font-inter">
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-20 pt-safe">
        {children}
      </main>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111827] border-t border-[#334155] safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/mobile' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={cn("flex flex-col items-center justify-center gap-1 transition-colors",
                active ? 'text-[#E91E8C]' : 'text-[#475569] hover:text-[#94A3B8]'
              )}>
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
