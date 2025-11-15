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
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationSections = [
  {
    title: "OPERATIONS",
    items: [
      { title: "Operations Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, page: "Dashboard" },
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

      <div className="min-h-screen relative overflow-hidden bg-[var(--ent-bg)]">
        <div className="flex h-screen">
          <aside className="hidden lg:flex lg:flex-col lg:w-60 ent-card border-r border-[var(--ent-border)] overflow-y-auto">
            <div className="p-6 border-b border-[var(--ent-border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center" style={{ boxShadow: 'var(--ent-glow-mag)' }}>
                  <Wrench className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-bold text-[var(--ent-text)] tracking-wide">
                  ENTIRE<span className="text-[#E41E65]">CAFM</span>
                </span>
              </div>
              {user && (
                <div className="mt-3 text-xs text-[var(--ent-muted)]">
                  {user.full_name}
                  <div className="text-[10px] uppercase">{userRole}</div>
                </div>
              )}
            </div>

            <nav className="flex-1 py-4">
              {filteredSections.map((section) => (
                <div key={section.title}>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ent-muted)] opacity-50 mb-2 mt-6 px-4">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-1 rounded-xl transition-all ${
                          isActive 
                            ? 'bg-[var(--ent-panel)] border-l-2 border-[#E41E65] text-[var(--ent-text)] font-medium' 
                            : 'text-[var(--ent-muted)] hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                      >
                        <item.icon className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--ent-bg)] border-b border-[var(--ent-border)] p-4">
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
            <div className="lg:hidden fixed inset-0 z-40 ent-card pt-20 overflow-y-auto">
              <nav className="p-6 space-y-2">
                {filteredSections.map((section) => (
                  <div key={section.title}>
                    <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ent-muted)] opacity-50 mb-2 mt-6">
                      {section.title}
                    </div>
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                            isActive 
                              ? 'bg-[var(--ent-panel)] border-l-2 border-[#E41E65] text-[var(--ent-text)] font-medium' 
                              : 'text-[var(--ent-muted)] hover:bg-[rgba(255,255,255,0.03)]'
                          }`}
                        >
                          <item.icon className="w-4 h-4" strokeWidth={1.5} />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
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