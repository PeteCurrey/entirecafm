'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export function NavItem({ href, icon: Icon, label, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-all duration-200",
        isActive 
          ? "border-left-3 border-[#E91E8C] bg-[rgba(233,30,140,0.08)] text-[#E91E8C]" 
          : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
      )}
      style={isActive ? { borderLeft: '3px solid #E91E8C' } : {}}
    >
      <Icon 
        className={cn(
          "w-4 h-4 transition-colors",
          isActive ? "text-[#E91E8C]" : "text-[#94A3B8] group-hover:text-white"
        )} 
      />
      <span className={cn(
        "text-[13px] font-medium transition-colors font-inter",
        isActive ? "text-[#E91E8C]" : "text-[#94A3B8] group-hover:text-white"
      )}>
        {label}
      </span>
    </Link>
  );
}
