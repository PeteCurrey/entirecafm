import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import EngineerApp from './pages/EngineerApp';
import Sites from './pages/Sites';
import Assets from './pages/Assets';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
import PPMPlanner from './pages/PPMPlanner';
import Team from './pages/Team';
import Scheduling from './pages/Scheduling';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import MapTracking from './pages/MapTracking';
import Requests from './pages/Requests';
import AIHelpdesk from './pages/AIHelpdesk';
import Approvals from './pages/Approvals';
import AIDirector from './pages/AIDirector';
import AIAccounts from './pages/AIAccounts';
import AIMarketing from './pages/AIMarketing';
import ClientPortal from './pages/ClientPortal';
import ClientJobs from './pages/ClientJobs';
import ClientJobDetail from './pages/ClientJobDetail';
import ClientQuotes from './pages/ClientQuotes';
import ClientInvoices from './pages/ClientInvoices';
import ClientRequestJob from './pages/ClientRequestJob';
import Clients from './pages/Clients';
import TestRedis from './pages/TestRedis';
import EngineerSimulator from './pages/EngineerSimulator';
import ExecutiveBrief from './pages/ExecutiveBrief';
import AIAssistant from './pages/AIAssistant';
import SystemDocumentation from './pages/SystemDocumentation';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Jobs": Jobs,
    "JobDetail": JobDetail,
    "EngineerApp": EngineerApp,
    "Sites": Sites,
    "Assets": Assets,
    "Quotes": Quotes,
    "Invoices": Invoices,
    "PPMPlanner": PPMPlanner,
    "Team": Team,
    "Scheduling": Scheduling,
    "Documents": Documents,
    "Reports": Reports,
    "MapTracking": MapTracking,
    "Requests": Requests,
    "AIHelpdesk": AIHelpdesk,
    "Approvals": Approvals,
    "AIDirector": AIDirector,
    "AIAccounts": AIAccounts,
    "AIMarketing": AIMarketing,
    "ClientPortal": ClientPortal,
    "ClientJobs": ClientJobs,
    "ClientJobDetail": ClientJobDetail,
    "ClientQuotes": ClientQuotes,
    "ClientInvoices": ClientInvoices,
    "ClientRequestJob": ClientRequestJob,
    "Clients": Clients,
    "TestRedis": TestRedis,
    "EngineerSimulator": EngineerSimulator,
    "ExecutiveBrief": ExecutiveBrief,
    "AIAssistant": AIAssistant,
    "SystemDocumentation": SystemDocumentation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};