import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Tv, Activity, HardDrive } from 'lucide-react';
import api from '@/lib/api';

interface DashboardStats {
    total_content: {
        total: number;
        movies: number;
        series: number;
    };
    sources: {
        total: number;
        active: number;
        inactive: number;
    };
    sync_status: {
        in_progress: number;
        errors_24h: number;
        success_rate: number;
    };
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const fetchData = async () => {
        try {
            const statsRes = await api.get<DashboardStats>('/dashboard/stats');
            setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your Xtream to STRM synchronization.</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_content?.total?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.sources?.total || 0} Sources Configured
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Movies</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_content?.movies?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.total_content?.total ? ((stats.total_content.movies / stats.total_content.total) * 100).toFixed(1) : 0}% of total
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Series</CardTitle>
                        <Tv className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_content?.series?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.total_content?.total ? ((stats.total_content.series / stats.total_content.total) * 100).toFixed(1) : 0}% of total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sync Status & Content Distribution */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sync Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex items-center">
                                <Activity className="mr-2 h-4 w-4 opacity-70" />
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">In Progress</p>
                                    <p className="text-sm text-muted-foreground">
                                        {stats?.sync_status?.in_progress || 0} active sync tasks
                                    </p>
                                </div>
                                <div className="ml-auto font-medium">
                                    {stats?.sync_status?.in_progress === 0 ? 'Idle' : 'Running'}
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Activity className="mr-2 h-4 w-4 opacity-70" />
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Success Rate</p>
                                    <p className="text-sm text-muted-foreground">
                                        Last 24 hours
                                    </p>
                                </div>
                                <div className="ml-auto font-medium text-green-500">
                                    {stats?.sync_status?.success_rate || 100}%
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Activity className="mr-2 h-4 w-4 opacity-70" />
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Errors</p>
                                    <p className="text-sm text-muted-foreground">
                                        Last 24 hours
                                    </p>
                                </div>
                                <div className="ml-auto font-medium text-red-500">
                                    {stats?.sync_status?.errors_24h || 0}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Content Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex items-center">
                                <HardDrive className="mr-2 h-4 w-4 opacity-70" />
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Sources</p>
                                    <p className="text-sm text-muted-foreground">
                                        {stats?.sources?.active || 0} Active / {stats?.sources?.total || 0} Total
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Movies</span>
                                    <span>{stats?.total_content?.movies ? ((stats.total_content.movies / (stats.total_content.total || 1)) * 100).toFixed(0) : 0}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${stats?.total_content?.movies ? ((stats.total_content.movies / (stats.total_content.total || 1)) * 100) : 0}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Series</span>
                                    <span>{stats?.total_content?.series ? ((stats.total_content.series / (stats.total_content.total || 1)) * 100).toFixed(0) : 0}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${stats?.total_content?.series ? ((stats.total_content.series / (stats.total_content.total || 1)) * 100) : 0}%` }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Info */}
            <div>
                <h3 className="text-xl font-semibold mb-4">Quick Info</h3>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">
                            For detailed subscription management and sync controls, visit the <strong>XtreamTV &gt; Subscriptions</strong> page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
