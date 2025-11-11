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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};