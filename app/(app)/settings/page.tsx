'use client';

import { useState } from 'react';
import {
  Building2,
  Users,
  Bell,
  Zap,
  Shield,
  Database,
  Mail,
  Smartphone,
  Globe,
  Key,
  Save,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System', icon: Database },
];

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-white font-semibold text-base font-inter">{title}</h2>
        {description && (
          <p className="text-[#94A3B8] text-sm mt-1">{description}</p>
        )}
      </div>
      <div className="border-t border-[#334155]" />
      {children}
    </div>
  );
}

function FormField({
  label,
  id,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  label: string;
  id: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[#94A3B8] text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C] transition-colors placeholder:text-[#475569]"
      />
    </div>
  );
}

function Toggle({ label, description, defaultChecked = false }: { label: string; description?: string; defaultChecked?: boolean }) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-[#94A3B8] text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? 'bg-[#E91E8C]' : 'bg-[#334155]'}`}
        style={{ height: '22px', width: '40px' }}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-[18px]' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    onSave();
    setTimeout(() => setSaved(false), 2500);
  };
  return (
    <button
      onClick={handleSave}
      className="flex items-center gap-2 bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
    >
      {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saved ? 'Saved!' : 'Save Changes'}
    </button>
  );
}

function IntegrationCard({
  name,
  description,
  status,
  icon: Icon,
}: {
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0D1829] border border-[#334155] rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#94A3B8]" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">{name}</p>
          <p className="text-[#94A3B8] text-xs">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-[#334155] text-[#94A3B8]'
          }`}
        >
          {status === 'connected' ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {status === 'connected' ? 'Connected' : 'Not Connected'}
        </span>
        <button className="text-xs text-[#E91E8C] hover:text-white border border-[#E91E8C] hover:bg-[#E91E8C] px-3 py-1 rounded-lg transition-colors">
          {status === 'connected' ? 'Configure' : 'Connect'}
        </button>
      </div>
    </div>
  );
}

// ── TAB PANELS ──────────────────────────────────────────────────────────────

function CompanyTab() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Company Information" description="This information appears on invoices, quotes, and documents.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name" id="company-name" defaultValue="EntireCAFM Ltd" />
          <FormField label="Company Registration No." id="company-reg" defaultValue="12345678" />
          <FormField label="VAT Number" id="vat-number" defaultValue="GB123456789" />
          <FormField label="Email Address" id="company-email" type="email" defaultValue="hello@entirecafm.com" />
          <FormField label="Phone Number" id="company-phone" defaultValue="+44 20 1234 5678" />
          <FormField label="Website" id="company-website" defaultValue="https://entirecafm.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company-address" className="text-[#94A3B8] text-sm font-medium">Registered Address</label>
          <textarea
            id="company-address"
            rows={3}
            defaultValue="123 Business Park, London, EC1A 1BB, United Kingdom"
            className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C] transition-colors resize-none"
          />
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>

      <SectionCard title="Branding & Defaults" description="Set regional formats and invoice defaults.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">Default Currency</label>
            <select className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C]">
              <option>GBP (£)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">Default Tax Rate (%)</label>
            <input type="number" defaultValue="20" className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">Date Format</label>
            <select className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C]">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">Default SLA (hours)</label>
            <input type="number" defaultValue="24" className="bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C]" />
          </div>
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>
    </div>
  );
}

function UsersTab() {
  const [showInvite, setShowInvite] = useState(false);

  const mockUsers = [
    { name: 'Peter Currey', email: 'pete@entirefm.com', role: 'ADMIN', status: 'Active' },
    { name: 'Sarah Mitchell', email: 'sarah@entirecafm.com', role: 'OPERATIONS_MANAGER', status: 'Active' },
    { name: 'James Turner', email: 'james@entirecafm.com', role: 'ENGINEER', status: 'Active' },
    { name: 'Lisa Chen', email: 'lisa@entirecafm.com', role: 'ENGINEER', status: 'Inactive' },
  ];

  const roleColour: Record<string, string> = {
    ADMIN: 'bg-[#E91E8C]/10 text-[#E91E8C]',
    OPERATIONS_MANAGER: 'bg-blue-500/10 text-blue-400',
    ENGINEER: 'bg-amber-500/10 text-amber-400',
    CLIENT: 'bg-emerald-500/10 text-emerald-400',
    CONTRACTOR: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Platform Users" description="Manage who has access to EntireCAFM and their permissions.">
        <div className="flex justify-end">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>

        {showInvite && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#0D1829] rounded-lg border border-[#334155]">
            <FormField label="Full Name" id="invite-name" placeholder="John Smith" />
            <FormField label="Email Address" id="invite-email" type="email" placeholder="john@company.com" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[#94A3B8] text-sm font-medium">Role</label>
              <select className="bg-[#1E293B] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C]">
                <option>ENGINEER</option>
                <option>OPERATIONS_MANAGER</option>
                <option>CLIENT</option>
                <option>CONTRACTOR</option>
                <option>ADMIN</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button onClick={() => setShowInvite(false)} className="text-sm text-[#94A3B8] hover:text-white px-4 py-2 rounded-lg border border-[#334155] hover:border-white transition-colors">
                Cancel
              </button>
              <button className="flex items-center gap-2 bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                <Mail className="w-4 h-4" /> Send Invite
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {mockUsers.map((u) => (
            <div key={u.email} className="flex items-center justify-between p-3 bg-[#0D1829] border border-[#334155] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E91E8C] flex items-center justify-center text-white text-xs font-bold">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{u.name}</p>
                  <p className="text-[#94A3B8] text-xs">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${roleColour[u.role] || 'bg-[#334155] text-[#94A3B8]'}`}>
                  {u.role.replace('_', ' ')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#334155] text-[#94A3B8]'}`}>
                  {u.status}
                </span>
                <button className="text-[#94A3B8] hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Email Notifications" description="Configure which events trigger email alerts.">
        <div className="flex flex-col gap-4">
          <Toggle label="New Job Created" description="Send an email when a new job is raised." defaultChecked />
          <Toggle label="SLA Breach Warning" description="Alert 2 hours before an SLA deadline." defaultChecked />
          <Toggle label="Job Completed" description="Notify the client when a job is marked complete." defaultChecked />
          <Toggle label="Invoice Overdue" description="Remind clients of overdue invoices." defaultChecked />
          <Toggle label="New Quote Request" description="Alert ops managers when a quote is requested." />
          <Toggle label="Engineer Check-In" description="Notify when an engineer arrives on site." />
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>

      <SectionCard title="In-App Notifications" description="Control real-time in-app alerts.">
        <div className="flex flex-col gap-4">
          <Toggle label="Critical Priority Jobs" defaultChecked />
          <Toggle label="Approval Requests" defaultChecked />
          <Toggle label="New Client Messages" defaultChecked />
          <Toggle label="System Alerts" defaultChecked />
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Connected Services" description="Manage third-party integrations and API connections.">
        <div className="flex flex-col gap-3">
          <IntegrationCard name="Resend (Email)" description="Transactional email delivery" status="connected" icon={Mail} />
          <IntegrationCard name="Supabase" description="Authentication & database" status="connected" icon={Database} />
          <IntegrationCard name="Anthropic Claude" description="AI assistant & insights engine" status="connected" icon={Zap} />
          <IntegrationCard name="Xero" description="Accounting & financial sync" status="disconnected" icon={Globe} />
          <IntegrationCard name="SMS Gateway" description="SMS notifications for engineers" status="disconnected" icon={Smartphone} />
        </div>
      </SectionCard>

      <SectionCard title="API Access" description="Manage API keys for external integrations.">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 bg-[#0D1829] border border-[#334155] rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-[#94A3B8]" />
              <div>
                <p className="text-white text-sm font-medium">Production API Key</p>
                <p className="text-[#94A3B8] text-xs font-mono">ecfm_live_••••••••••••••••3f8a</p>
              </div>
            </div>
            <button className="text-xs text-[#E91E8C] hover:text-white border border-[#E91E8C] hover:bg-[#E91E8C] px-3 py-1 rounded-lg transition-colors">
              Regenerate
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#334155] text-white font-semibold px-4 py-2 rounded-lg text-sm border border-[#334155] transition-colors">
            <Plus className="w-4 h-4" /> Create New Key
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Change Password" description="Update the password for your admin account.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="w-full bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C] transition-colors pr-10"
              />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#94A3B8] text-sm font-medium">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="w-full bg-[#0D1829] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C] transition-colors pr-10"
              />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>

      <SectionCard title="Session & Access" description="Control login security settings.">
        <div className="flex flex-col gap-4">
          <Toggle label="Require email confirmation on sign-up" defaultChecked />
          <Toggle label="Auto sign-out after 8 hours of inactivity" defaultChecked />
          <Toggle label="Restrict login to whitelisted IP addresses" />
          <Toggle label="Two-factor authentication (2FA)" />
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>
    </div>
  );
}

function SystemTab() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="System Behaviour" description="Control platform-wide system defaults.">
        <div className="flex flex-col gap-4">
          <Toggle label="Enable AI features across all modules" defaultChecked />
          <Toggle label="Show developer tools in the sidebar" />
          <Toggle label="Enable real-time engineer location tracking" defaultChecked />
          <Toggle label="Enable client self-service portal" defaultChecked />
          <Toggle label="Maintenance mode (locks all logins except ADMIN)" />
        </div>
        <div className="flex justify-end">
          <SaveBar onSave={() => {}} />
        </div>
      </SectionCard>

      <SectionCard title="Data & Storage" description="Manage data retention and export options.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#0D1829] border border-[#334155] rounded-lg">
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Record Retention</p>
            <p className="text-white font-bold text-lg">7 Years</p>
            <p className="text-[#94A3B8] text-xs mt-1">Compliant with UK FM standards</p>
          </div>
          <div className="p-4 bg-[#0D1829] border border-[#334155] rounded-lg">
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Data Region</p>
            <p className="text-white font-bold text-lg">EU-West (Ireland)</p>
            <p className="text-[#94A3B8] text-xs mt-1">GDPR compliant storage</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button className="text-sm text-[#94A3B8] hover:text-white px-4 py-2 rounded-lg border border-[#334155] hover:border-white transition-colors">
            Export All Data
          </button>
          <button className="text-sm text-red-400 hover:text-white border border-red-400/30 hover:bg-red-500 hover:border-red-500 px-4 py-2 rounded-lg transition-colors">
            Purge Test Data
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  const panels: Record<string, React.ReactNode> = {
    company: <CompanyTab />,
    users: <UsersTab />,
    notifications: <NotificationsTab />,
    integrations: <IntegrationsTab />,
    security: <SecurityTab />,
    system: <SystemTab />,
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-inter tracking-tight">Settings</h1>
        <p className="text-[#94A3B8] text-sm mt-1">Manage your platform configuration, users, and integrations.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <aside className="w-[200px] flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                  activeTab === id
                    ? 'bg-[#E91E8C]/10 text-[#E91E8C]'
                    : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {activeTab === id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{panels[activeTab]}</div>
      </div>
    </div>
  );
}
