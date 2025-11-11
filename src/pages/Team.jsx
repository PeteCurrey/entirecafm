import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Mail, Phone, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

export default function TeamPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const engineers = users.filter(u => u.engineer_details || u.role === 'user');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
            <p className="text-white/70">Manage engineers and staff</p>
          </div>
          <Button
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Total Team</span>
            <Users className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Engineers</span>
            <Wrench className="w-5 h-5 text-purple-300" />
          </div>
          <p className="text-2xl font-bold text-white">{engineers.length}</p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Admins</span>
            <Users className="w-5 h-5 text-green-300" />
          </div>
          <p className="text-2xl font-bold text-white">{admins.length}</p>
        </div>
      </div>

      {/* Engineers */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Engineers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {engineers.map((engineer) => (
            <div
              key={engineer.id}
              className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {engineer.full_name?.[0] || 'E'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1 truncate">
                    {engineer.full_name}
                  </h3>
                  {engineer.job_title && (
                    <p className="text-sm text-white/60">{engineer.job_title}</p>
                  )}
                  {engineer.engineer_details?.trade_specialty && (
                    <Badge className="mt-2 bg-blue-500/20 text-blue-200 border-blue-300/30 border text-xs">
                      {engineer.engineer_details.trade_specialty}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {engineer.email && (
                  <div className="flex items-center gap-2 text-white/70">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{engineer.email}</span>
                  </div>
                )}
                {engineer.phone && (
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="w-4 h-4" />
                    <span>{engineer.phone}</span>
                  </div>
                )}
              </div>

              {engineer.engineer_details?.is_available !== undefined && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Badge className={engineer.engineer_details.is_available 
                    ? 'bg-green-500/20 text-green-200 border-green-300/30 border'
                    : 'bg-gray-500/20 text-gray-200 border-gray-300/30 border'
                  }>
                    {engineer.engineer_details.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Administrators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="glass-effect rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {admin.full_name?.[0] || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1 truncate">
                      {admin.full_name}
                    </h3>
                    {admin.job_title && (
                      <p className="text-sm text-white/60">{admin.job_title}</p>
                    )}
                    <Badge className="mt-2 bg-green-500/20 text-green-200 border-green-300/30 border text-xs">
                      Admin
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {admin.email && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                  )}
                  {admin.phone && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Phone className="w-4 h-4" />
                      <span>{admin.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading team...</p>
        </div>
      )}
    </div>
  );
}