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
  X,
  BarChart3,
  FolderOpen,
  Building2,
  Map,
  Bot,
  Inbox,
  CheckSquare,
  UserCheck,
  TrendingUp,
  CreditCard,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationSections = [
  {
    title: "OPERATIONS",
    items: [
      { title: "Operations Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, roles: ["admin", "user"] },
      { title: "Map & Tracking", url: createPageUrl("MapTracking"), icon: Map, roles: ["admin", "user"] },
      { title: "AI Helpdesk", url: createPageUrl("AIHelpdesk"), icon: Bot, roles: ["admin", "user"] },
      { title: "Jobs", url: createPageUrl("Jobs"), icon: Wrench, roles: ["admin", "user"] },
      { title: "Requests", url: createPageUrl("Requests"), icon: Inbox, roles: ["admin", "user"] },
      { title: "Quotes", url: createPageUrl("Quotes"), icon: ClipboardList, roles: ["admin", "user"] },
      { title: "Schedule", url: createPageUrl("Scheduling"), icon: Calendar, roles: ["admin", "user"] },
      { title: "PPM Planner", url: createPageUrl("PPMPlanner"), icon: Calendar, roles: ["admin", "user"] },
      { title: "Assets", url: createPageUrl("Assets"), icon: Database, roles: ["admin", "user"] },
      { title: "Sites", url: createPageUrl("Sites"), icon: MapPin, roles: ["admin", "user"] },
      { title: "Clients", url: createPageUrl("Sites"), icon: Building2, roles: ["admin", "user"] },
      { title: "Engineers", url: createPageUrl("Team"), icon: Users, roles: ["admin"] },
      { title: "Contractors", url: createPageUrl("Team"), icon: UserCheck, roles: ["admin"] },
      { title: "Invoices", url: createPageUrl("Invoices"), icon: DollarSign, roles: ["admin", "user"] },
      { title: "Documents", url: createPageUrl("Documents"), icon: FolderOpen, roles: ["admin", "user"] },
      { title: "Reports", url: createPageUrl("Reports"), icon: BarChart3, roles: ["admin"] },
      { title: "Approvals", url: createPageUrl("Approvals"), icon: CheckSquare, roles: ["admin"] },
    ]
  },
  {
    title: "AI OPERATIONS",
    items: [
      { title: "AI Director Dashboard", url: createPageUrl("AIDirector"), icon: TrendingUp, roles: ["admin"] },
      { title: "AI Accounts Dashboard", url: createPageUrl("AIAccounts"), icon: CreditCard, roles: ["admin"] },
      { title: "AI Marketing Dashboard", url: createPageUrl("AIMarketing"), icon: Megaphone, roles: ["admin"] },
    ]
  }
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

  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.roles || item.roles.includes(user?.role))
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0D1117]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .glass-panel-strong {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .text-body {
          color: #CED4DA;
        }

        .accent-magenta {
          background: #E1467C;
          color: white;
        }

        .accent-magenta:hover {
          background: #C93968;
        }

        .border-divider {
          border-color: rgba(255, 255, 255, 0.08);
        }

        .nav-hover {
          transition: all 0.2s ease;
        }

        .nav-hover:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(206, 212, 218, 0.5);
          margin-bottom: 8px;
          margin-top: 20px;
        }
      `}</style>

      <div className="flex h-screen">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 p-6 border-r border-divider overflow-y-auto bg-[#0D1117]">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">EntireCAFM</h1>
                <p className="text-xs text-body">Facilities Management</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.title}>
                {sectionIndex > 0 && <div className="section-label">{section.title}</div>}
                {section.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl nav-hover text-sm transition-all ${
                        isActive ? 'glass-panel-strong' : ''
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-body'}`} strokeWidth={1.5} />
                      <span className={`font-medium ${isActive ? 'text-white' : 'text-body'}`}>
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {user && (
            <div className="mt-6 pt-6 border-t border-divider">
              <div className="glass-panel rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full accent-magenta flex items-center justify-center text-white font-bold">
                    {user.full_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-body truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-body hover:text-white hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex-1 text-body hover:text-white hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-panel border-b border-divider p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" strokeWidth={1.5} />
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
          <div className="lg:hidden fixed inset-0 z-40 glass-panel-strong pt-20 overflow-y-auto">
            <nav className="p-6 space-y-2">
              {filteredSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sectionIndex > 0 && <div className="section-label">{section.title}</div>}
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl nav-hover ${
                          isActive ? 'glass-panel-strong' : ''
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-body'}`} strokeWidth={1.5} />
                        <span className={`font-medium ${isActive ? 'text-white' : 'text-body'}`}>
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
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