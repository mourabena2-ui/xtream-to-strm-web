import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Activity, Tv, Radio, ChevronDown, ChevronRight, Menu, X, LogOut } from 'lucide-react';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useState, useEffect } from 'react';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const isXtreamActive = location.pathname.startsWith('/xtreamtv');
    const isM3UActive = location.pathname.startsWith('/m3u');

    // Close sidebar when route changes on mobile
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close sidebar when clicking outside on mobile
    const handleOverlayClick = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex relative">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border border-border shadow-lg"
                aria-label="Toggle menu"
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={handleOverlayClick}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 border-r border-border bg-card p-4 flex flex-col
                fixed lg:relative inset-y-0 left-0 z-40
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
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

                    <Link
                        to="/logs"
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === '/logs' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                    >
                        <FileText size={20} />
                        <span>Logs</span>
                    </Link>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-red-500/10 text-red-500 mt-4"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </nav>

                <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
                        <Activity size={16} />
                        <span>v2.6.1</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 overflow-auto w-full lg:w-auto pt-16 lg:pt-8">
                {children}
            </main>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />

                {/* XtreamTV */}
                <Route path="/xtreamtv/subscriptions" element={<ProtectedRoute><Layout><XTVSubscriptions /></Layout></ProtectedRoute>} />
                <Route path="/xtreamtv/selection" element={<ProtectedRoute><Layout><XTVSelection /></Layout></ProtectedRoute>} />
                <Route path="/xtreamtv/scheduling" element={<ProtectedRoute><Layout><XTVScheduling /></Layout></ProtectedRoute>} />

                {/* M3U */}
                <Route path="/m3u/sources" element={<ProtectedRoute><Layout><M3USources /></Layout></ProtectedRoute>} />
                <Route path="/m3u/selection" element={<ProtectedRoute><Layout><M3USelection /></Layout></ProtectedRoute>} />
                <Route path="/m3u/scheduling" element={<ProtectedRoute><Layout><M3UScheduling /></Layout></ProtectedRoute>} />

                {/* Administration & Logs */}
                <Route path="/admin" element={<ProtectedRoute><Layout><Administration /></Layout></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute><Layout><Logs /></Layout></ProtectedRoute>} />

                {/* Redirect all other routes to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
