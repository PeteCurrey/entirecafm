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
    <div className="h-14 px-6 flex items-center justify-between bg-[#0D1117] border-b border-[rgba(255,255,255,0.08)]">
      {/* Center - Organization Selector */}
      <div className="flex-1 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="border-[rgba(255,255,255,0.08)] bg-transparent text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)] rounded-lg px-4"
            >
              {selectedOrg}
              <ChevronDown className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0D1117] border-[rgba(255,255,255,0.08)]">
            <DropdownMenuItem 
              className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white" 
              onClick={() => setSelectedOrg("EntireCAFM Operations")}
            >
              EntireCAFM Operations
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white" 
              onClick={() => setSelectedOrg("Acme Facilities Ltd")}
            >
              Acme Facilities Ltd
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white" 
              onClick={() => setSelectedOrg("BuildSafe UK")}
            >
              BuildSafe UK
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right - User Profile */}
      {user && (
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-[#E1467C] flex items-center justify-center text-white font-semibold text-sm">
                  {user.full_name?.[0] || 'U'}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0D1117] border-[rgba(255,255,255,0.08)] w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-white">{user.full_name}</p>
                <p className="text-xs text-[#CED4DA] truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
              <DropdownMenuItem className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white">
                <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white">
                <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
              <DropdownMenuItem onClick={handleLogout} className="text-[#CED4DA] focus:bg-[rgba(255,255,255,0.08)] focus:text-white">
                <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}