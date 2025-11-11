import React, { useState } from "react";
import { ChevronDown, User, Settings, LogOut, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function TopNav({ user }) {
  const [selectedOrg, setSelectedOrg] = useState("EntireCAFM Operations");

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-divider h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-lg font-bold text-white">EntireCAFM</span>
        </div>

        <div className="h-8 w-px bg-divider" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-body hover:text-white hover:bg-white/10">
              {selectedOrg}
              <ChevronDown className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel-strong border-divider">
            <DropdownMenuItem className="text-white" onClick={() => setSelectedOrg("EntireCAFM Operations")}>
              EntireCAFM Operations
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white" onClick={() => setSelectedOrg("Acme Facilities Ltd")}>
              Acme Facilities Ltd
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white" onClick={() => setSelectedOrg("BuildSafe UK")}>
              BuildSafe UK
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 text-body hover:text-white hover:bg-white/10">
              <div className="w-8 h-8 rounded-full accent-magenta flex items-center justify-center text-white font-bold text-sm">
                {user.full_name?.[0] || 'U'}
              </div>
              <span className="text-sm">User: {user.full_name?.split(' ')[0]}</span>
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel-strong border-divider w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white">{user.full_name}</p>
              <p className="text-xs text-body truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-divider" />
            <DropdownMenuItem className="text-white">
              <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white">
              <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-divider" />
            <DropdownMenuItem onClick={handleLogout} className="text-white">
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}