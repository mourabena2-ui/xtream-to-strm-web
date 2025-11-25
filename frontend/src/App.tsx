import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Activity, Tv, Radio, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

// Pages
import Dashboard from './pages/Dashboard';
import Administration from './pages/Administration';
import Logs from './pages/Logs';

// XtreamTV Pages
import XTVSubscriptions from './pages/xtreamtv/XTVSubscriptions';
import XTVSelection from './pages/xtreamtv/XTVSelection';
import XTVScheduling from './pages/xtreamtv/XTVScheduling';

// M3U Pages
import M3USources from './pages/m3u/M3USources';
import M3USelection from './pages/m3u/M3USelection';
import M3UScheduling from './pages/m3u/M3UScheduling';

function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [xtreamExpanded, setXtreamExpanded] = useState(true);
    const [m3uExpanded, setM3uExpanded] = useState(true);

    const isXtreamActive = location.pathname.startsWith('/xtreamtv');
    const isM3UActive = location.pathname.startsWith('/m3u');

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card p-4 flex flex-col">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-primary">Xtream2STRM</h1>
                </div>

                <nav className="space-y-1 flex-1">
                    {/* Dashboard */}
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === '/' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>

                    {/* XtreamTV Group */}
                    <div>
                        <button
                            onClick={() => setXtreamExpanded(!xtreamExpanded)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors ${isXtreamActive ? 'bg-accent/50 text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Tv size={20} />
                                <span>XtreamTV</span>
                            </div>
                            {xtreamExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {xtreamExpanded && (
                            <div className="ml-6 mt-1 space-y-1">
                                <Link
                                    to="/xtreamtv/subscriptions"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/xtreamtv/subscriptions' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Subscriptions</span>
                                </Link>
                                <Link
                                    to="/xtreamtv/selection"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/xtreamtv/selection' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Bouquet Selection</span>
                                </Link>
                                <Link
                                    to="/xtreamtv/scheduling"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/xtreamtv/scheduling' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Scheduling</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* M3U Group */}
                    <div>
                        <button
                            onClick={() => setM3uExpanded(!m3uExpanded)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors ${isM3UActive ? 'bg-accent/50 text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Radio size={20} />
                                <span>M3U</span>
                            </div>
                            {m3uExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {m3uExpanded && (
                            <div className="ml-6 mt-1 space-y-1">
                                <Link
                                    to="/m3u/sources"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/m3u/sources' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Sources</span>
                                </Link>
                                <Link
                                    to="/m3u/selection"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/m3u/selection' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Group Selection</span>
                                </Link>
                                <Link
                                    to="/m3u/scheduling"
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === '/m3u/scheduling' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <span>Scheduling</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Administration */}
                    <Link
                        to="/admin"
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === '/admin' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                    >
                        <Settings size={20} />
                        <span>Administration</span>
                    </Link>

                    {/* Logs */}
                    <Link
                        to="/logs"
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === '/logs' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                    >
                        <FileText size={20} />
                        <span>Logs</span>
                    </Link>
                </nav>

                <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
                        <Activity size={16} />
                        <span>v1.1.0</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Layout><Dashboard /></Layout>} />

                {/* XtreamTV */}
                <Route path="/xtreamtv/subscriptions" element={<Layout><XTVSubscriptions /></Layout>} />
                <Route path="/xtreamtv/selection" element={<Layout><XTVSelection /></Layout>} />
                <Route path="/xtreamtv/scheduling" element={<Layout><XTVScheduling /></Layout>} />

                {/* M3U */}
                <Route path="/m3u/sources" element={<Layout><M3USources /></Layout>} />
                <Route path="/m3u/selection" element={<Layout><M3USelection /></Layout>} />
                <Route path="/m3u/scheduling" element={<Layout><M3UScheduling /></Layout>} />

                {/* Administration & Logs */}
                <Route path="/admin" element={<Layout><Administration /></Layout>} />
                <Route path="/logs" element={<Layout><Logs /></Layout>} />

                {/* Redirect all other routes to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
