import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  FileText,
  DollarSign,
  Database,
  Users,
  MapPin,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, roles: ["admin", "user"] },
  { title: "Jobs", url: createPageUrl("Jobs"), icon: Wrench, roles: ["admin", "user"] },
  { title: "PPM Schedule", url: createPageUrl("PPMSchedule"), icon: Calendar, roles: ["admin", "user"] },
  { title: "Quotes", url: createPageUrl("Quotes"), icon: ClipboardList, roles: ["admin", "user"] },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: DollarSign, roles: ["admin", "user"] },
  { title: "Assets", url: createPageUrl("Assets"), icon: Database, roles: ["admin", "user"] },
  { title: "Sites", url: createPageUrl("Sites"), icon: MapPin, roles: ["admin", "user"] },
  { title: "Team", url: createPageUrl("Team"), icon: Users, roles: ["admin"] },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const filteredNav = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.08);
          --glass-border: rgba(255, 255, 255, 0.18);
          --glass-shadow: rgba(0, 0, 0, 0.1);
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        
        .glass-effect-strong {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        }

        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          background-size: 200% 200%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .glass-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-hover:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
        }
      `}</style>

      {/* Gradient Background */}
      <div className="fixed inset-0 gradient-bg -z-10" />

      {/* Floating orbs for depth */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl -z-10 animate-pulse" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="flex h-screen">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 p-6 glass-effect border-r border-white/20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl glass-effect-strong flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">EntireCAFM</h1>
                <p className="text-xs text-white/70">Facilities Management</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl glass-hover ${
                    isActive ? 'glass-effect-strong' : ''
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="glass-effect-strong rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {user.full_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-white/60 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex-1 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glass-effect-strong flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">EntireCAFM</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 glass-effect-strong pt-20">
            <nav className="p-6 space-y-2">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl glass-hover ${
                      isActive ? 'glass-effect-strong' : ''
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    <span className={`font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto lg:pt-0 pt-20">
          {children}
        </main>
      </div>
    </div>
  );
}