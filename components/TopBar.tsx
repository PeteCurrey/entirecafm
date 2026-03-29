'use client';

import { 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Layout
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-[220px] h-[56px] bg-[#0F172A] border-b border-[#334155] flex items-center justify-between px-6 z-40">
      {/* Left: Mobile Toggle (Future use) */}
      <div className="lg:hidden">
        <Button variant="ghost" size="icon" className="text-[#94A3B8] hover:text-white">
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Centre: Workspace Selector */}
      <div className="flex-1 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-white hover:bg-[#1E293B] px-4 font-inter font-medium text-[14px]"
            >
              EntireCAFM Operations
              <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1E293B] border-[#334155] text-white w-56">
            <DropdownMenuLabel className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuItem className="focus:bg-[#334155] focus:text-white cursor-pointer py-2">
              <Layout className="w-4 h-4 mr-2" />
              Main Operations
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-[#94A3B8] hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#E91E8C] rounded-full border-2 border-[#0F172A]" />
        </button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-[#E91E8C] flex items-center justify-center text-white text-[12px] font-bold Magenta-initials Magenta-box-shadow">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1E293B] border-[#334155] text-white w-56 mt-2" align="end">
            <DropdownMenuLabel className="font-inter">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-[#94A3B8] mt-1">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#334155]" />
            <DropdownMenuItem className="focus:bg-[#334155] focus:text-white cursor-pointer py-2.5">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#334155] focus:text-white cursor-pointer py-2.5" onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#334155]" />
            <DropdownMenuItem 
              className="text-[#EF4444] focus:bg-[rgba(239,68,68,0.1)] cursor-pointer py-2.5 font-medium"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
