import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import OnboardingWalkthrough from "../components/onboarding/OnboardingWalkthrough";
import SplashScreen from "../components/SplashScreen";
import { hasPagePermission, getUserRole, ROLES } from "../components/rbac/permissions";
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
  Megaphone,
  Navigation,
  MessageCircle,
  Shield,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationSections = [
  {
    title: "OPERATIONS",
    items: [
      { title: "Operations Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, page: "Dashboard" },
      { title: "Data Import Hub", url: createPageUrl("DataImport"), icon: Upload, page: "DataImport" },
      { title: "Map & Tracking", url: createPageUrl("MapTracking"), icon: Map, page: "MapTracking" },
      { title: "AI Helpdesk", url: createPageUrl("AIHelpdesk"), icon: Bot, page: "AIHelpdesk" },
      { title: "Jobs", url: createPageUrl("Jobs"), icon: Wrench, page: "Jobs" },
      { title: "Requests", url: createPageUrl("Requests"), icon: Inbox, page: "Requests" },
      { title: "Quotes", url: createPageUrl("Quotes"), icon: ClipboardList, page: "Quotes" },
      { title: "Schedule", url: createPageUrl("Scheduling"), icon: Calendar, page: "Scheduling" },
      { title: "PPM Planner", url: createPageUrl("PPMPlanner"), icon: Calendar, page: "PPMPlanner" },
      { title: "Assets", url: createPageUrl("Assets"), icon: Database, page: "Assets" },
      { title: "Sites", url: createPageUrl("Sites"), icon: MapPin, page: "Sites" },
      { title: "Clients", url: createPageUrl("Clients"), icon: Building2, page: "Clients" },
      { title: "Engineers", url: createPageUrl("Team"), icon: Users, page: "Team" },
      { title: "Contractors", url: createPageUrl("Team"), icon: UserCheck, page: "Team" },
      { title: "Invoices", url: createPageUrl("Invoices"), icon: DollarSign, page: "Invoices" },
      { title: "Documents", url: createPageUrl("Documents"), icon: FolderOpen, page: "Documents" },
      { title: "Reports", url: createPageUrl("Reports"), icon: BarChart3, page: "Reports" },
      { title: "Approvals", url: createPageUrl("Approvals"), icon: CheckSquare, page: "Approvals" },
      { title: "Compliance & ESG", url: createPageUrl("Compliance"), icon: Shield, page: "Compliance" },
    ]
  },
  {
    title: "AI OPERATIONS",
    items: [
      { title: "AI Director Dashboard", url: createPageUrl("AIDirector"), icon: TrendingUp, page: "AIDirector" },
      { title: "AI Accounts Dashboard", url: createPageUrl("AIAccounts"), icon: CreditCard, page: "AIAccounts" },
      { title: "AI Marketing Dashboard", url: createPageUrl("AIMarketing"), icon: Megaphone, page: "AIMarketing" },
      { title: "Executive Briefing", url: createPageUrl("ExecutiveBrief"), icon: FileText, page: "ExecutiveBrief" },
      { title: "AI Assistant", url: createPageUrl("AIAssistant"), icon: MessageCircle, page: "AIAssistant" },
      { title: "System Documentation", url: createPageUrl("SystemDocumentation"), icon: FolderOpen, page: "SystemDocumentation" },
    ]
  },
  {
    title: "TESTING & DEV",
    items: [
      { title: "Engineer Simulator", url: createPageUrl("EngineerSimulator"), icon: Navigation, page: "EngineerSimulator" },
      { title: "Test Redis Real-Time", url: createPageUrl("TestRedis"), icon: Bot, page: "TestRedis" },
      { title: "Mobile Field App", url: createPageUrl("EngineerMobile"), icon: Navigation, page: "EngineerMobile" },
    ]
  },
  {
    title: "ADMIN TOOLS",
    items: [
      { title: "Bulk Upload Wizard", url: createPageUrl("BulkDataWizard"), icon: Upload, page: "BulkDataWizard" },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      if (userData && !userData.onboarded) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await base44.auth.updateMe({
        onboarded: true,
        onboarded_date: new Date().toISOString()
      });
      setShowOnboarding(false);
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const userRole = getUserRole(user);

  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => hasPagePermission(userRole, item.page))
  })).filter(section => section.items.length > 0);

  return (
    <>
      <SplashScreen />
      
      {showOnboarding && (
        <OnboardingWalkthrough onComplete={handleCompleteOnboarding} />
      )}

      <div className="min-h-screen relative overflow-hidden bg-[#0D1117]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=Roboto+Mono:wght@400;500;600&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
          }
          
          code, pre, .font-mono {
            font-family: 'Roboto Mono', monospace;
          }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .glass-panel-strong {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sidebar-nav-item {
          position: relative;
          padding: 10px 16px;
          margin-bottom: 2px;
          border-radius: 8px;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .sidebar-nav-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .sidebar-nav-item.active {
          border-left-color: #E1467C;
          background: rgba(255, 255, 255, 0.06);
          font-weight: 600;
        }

        .section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(206, 212, 218, 0.5);
          margin-bottom: 8px;
          margin-top: 24px;
          padding-left: 16px;
        }
      `}</style>

      <div className="flex h-screen">
        <aside className="hidden lg:flex lg:flex-col lg:w-60 glass-panel border-r border-[rgba(255,255,255,0.08)] overflow-y-auto">
          <div className="p-6 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center magenta-glow">
                <Wrench className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">
                ENTIRE<span className="text-[#E41E65]">CAFM</span>
              </span>
            </div>
            {user && (
              <div className="mt-3 text-xs text-[#CED4DA]">
                {user.full_name}
                <div className="text-[10px] text-[#8B949E] uppercase">{userRole}</div>
              </div>
            )}
          </div>

          <nav className="flex-1 py-4">
            {filteredSections.map((section) => (
              <div key={section.title}>
                <div className="section-label">{section.title}</div>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={`sidebar-nav-item flex items-center gap-3 ${isActive ? 'active' : ''}`}
                    >
                      <item.icon className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                      <span className="text-sm text-[#CED4DA]">
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
            <Link
              to={createPageUrl("Settings")}
              className={`sidebar-nav-item flex items-center gap-3 ${location.pathname === createPageUrl("Settings") ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
              <span className="text-sm text-[#CED4DA]">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="sidebar-nav-item flex items-center gap-3 w-full text-left mt-2"
            >
              <LogOut className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
              <span className="text-sm text-[#CED4DA]">Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0D1117] border-b border-[rgba(255,255,255,0.08)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-white">
                ENTIRE<span className="text-[#E41E65]">CAFM</span>
              </span>
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

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 glass-panel-strong pt-20 overflow-y-auto">
            <nav className="p-6 space-y-2">
              {filteredSections.map((section) => (
                <div key={section.title}>
                  <div className="section-label">{section.title}</div>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`sidebar-nav-item flex items-center gap-3 ${isActive ? 'active' : ''}`}
                      >
                        <item.icon className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                        <span className="text-sm text-[#CED4DA]">
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <Link
                  to={createPageUrl("Settings")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-nav-item flex items-center gap-3 ${location.pathname === createPageUrl("Settings") ? 'active' : ''}`}
                >
                  <Settings className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                  <span className="text-sm text-[#CED4DA]">Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="sidebar-nav-item flex items-center gap-3 w-full text-left mt-2"
                >
                  <LogOut className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                  <span className="text-sm text-[#CED4DA]">Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto lg:pt-0 pt-20">
          {children}
        </main>
      </div>
      </div>
    </>
  );
}