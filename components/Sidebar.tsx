'use client';

import { 
  LayoutDashboard, 
  Wrench, 
  MapPin, 
  HeadphonesIcon, 
  InboxIcon, 
  FileText, 
  Calendar, 
  ClipboardList, 
  Package, 
  Building2, 
  Users, 
  HardHat, 
  UserCog, 
  Receipt, 
  FolderOpen, 
  BarChart3, 
  CheckCircle, 
  ShieldCheck,
  Brain,
  TrendingUp,
  Megaphone,
  FileBarChart,
  Bot,
  BookOpen,
  Smartphone,
  Play,
  Wifi,
  Database,
  Settings,
  LogOut,
  Upload
} from 'lucide-react';
import { NavItem } from './NavItem';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();
  const role = user.role;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isAdmin = role === 'ADMIN';
  const isOpsOrAdmin = role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
  const isAIOpsAllowed = !['ENGINEER', 'CONTRACTOR'].includes(role);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#111827] border-r border-[#334155] flex flex-col z-50">
      {/* Top Section */}
      <div className="p-5 border-b border-[#334155]">
        <h1 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-1">
          <span className="text-[#E91E8C]">ENTIRE</span>
          <span className="text-white">CAFM</span>
        </h1>
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-white text-[13px] font-semibold font-inter line-clamp-1">
            {user.name}
          </p>
          <div className="flex">
            <span className="bg-[#E91E8C] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Areas */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#1E293B]">
        
        {/* OPERATIONS SECTION */}
        <div className="py-2">
          <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] px-4 py-2 mt-2">
            OPERATIONS
          </h3>
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Operations Dashboard" />
          <NavItem href="/import" icon={Upload} label="Data Import Hub" />
          <NavItem href="/map" icon={MapPin} label="Map & Tracking" />
          <NavItem href="/helpdesk" icon={HeadphonesIcon} label="AI Helpdesk" />
          <NavItem href="/jobs" icon={Wrench} label="Jobs" />
          <NavItem href="/requests" icon={InboxIcon} label="Requests" />
          <NavItem href="/quotes" icon={FileText} label="Quotes" />
          <NavItem href="/schedule" icon={Calendar} label="Schedule" />
          <NavItem href="/ppm" icon={ClipboardList} label="PPM Planner" />
          <NavItem href="/assets" icon={Package} label="Assets" />
          <NavItem href="/sites" icon={Building2} label="Sites" />
          <NavItem href="/clients" icon={Users} label="Clients" />
          <NavItem href="/engineers" icon={HardHat} label="Engineers" />
          <NavItem href="/contractors" icon={UserCog} label="Contractors" />
          <NavItem href="/invoices" icon={Receipt} label="Invoices" />
          <NavItem href="/documents" icon={FolderOpen} label="Documents" />
          <NavItem href="/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/approvals" icon={CheckCircle} label="Approvals" />
          <NavItem href="/compliance" icon={ShieldCheck} label="Compliance & ESG" />
        </div>

        {/* AI OPERATIONS SECTION */}
        {isAIOpsAllowed && (
          <div className="py-2">
            <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] px-4 py-2 mt-2">
              AI OPERATIONS
            </h3>
            <NavItem href="/ai/director" icon={Brain} label="AI Director Dashboard" />
            <NavItem href="/ai/accounts" icon={TrendingUp} label="AI Accounts Dashboard" />
            <NavItem href="/ai/marketing" icon={Megaphone} label="AI Marketing Dashboard" />
            <NavItem href="/ai/briefing" icon={FileBarChart} label="Executive Briefing" />
            <NavItem href="/ai/assistant" icon={Bot} label="AI Assistant" />
            <NavItem href="/docs" icon={BookOpen} label="System Documentation" />
          </div>
        )}

        {/* MOBILE APPS SECTION */}
        <div className="py-2">
          <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] px-4 py-2 mt-2">
            MOBILE APPS
          </h3>
          <NavItem href="/mobile" icon={Smartphone} label="Engineer Mobile App" />
        </div>

        {/* TESTING & DEV SECTION */}
        {isAdmin && (
          <div className="py-2">
            <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] px-4 py-2 mt-2">
              TESTING & DEV
            </h3>
            <NavItem href="/simulator" icon={Play} label="Engineer Simulator" />
            <NavItem href="/realtime-test" icon={Wifi} label="Real-Time Test" />
          </div>
        )}

        {/* ADMIN TOOLS SECTION */}
        {isAdmin && (
          <div className="py-4 mt-2 border-t border-[#334155]">
            <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] px-4 py-2">
              ADMIN TOOLS
            </h3>
            <NavItem href="/import/bulk" icon={Database} label="Bulk Upload Wizard" />
            <NavItem href="/settings" icon={Settings} label="Settings" />
            <button
              onClick={handleSignOut}
              className="group w-full flex items-center gap-3 px-4 py-2.5 text-[#94A3B8] hover:bg-[#1E293B] hover:text-white transition-all duration-200"
            >
              <LogOut className="w-4 h-4 transition-colors group-hover:text-white" />
              <span className="text-[13px] font-medium transition-colors font-inter group-hover:text-white">
                Sign Out
              </span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
