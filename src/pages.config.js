import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import EngineerApp from './pages/EngineerApp';
import Sites from './pages/Sites';
import Assets from './pages/Assets';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};