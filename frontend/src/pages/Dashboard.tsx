import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Film, Tv, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, StopCircle, List } from 'lucide-react';
import api from '@/lib/api';

interface SyncStatus {
    type: string;
    last_sync: string;
    status: string;
    items_added: number;
    items_deleted: number;
    error_message?: string;
}

export default function Dashboard() {
    const [statuses, setStatuses] = useState<SyncStatus[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get<SyncStatus[]>('/sync/status');
            setStatuses(res.data);
        } catch (error) {
            console.error("Failed to fetch status", error);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const triggerSync = async (type: 'movies' | 'series') => {
        try {
            setLoading(true);
            await api.post(`/sync/${type}`);
            await fetchStatus();
        } catch (error) {
            console.error(`Failed to trigger ${type} sync`, error);
        } finally {
            setLoading(false);
        }
    };

    const resetSyncHistory = async () => {
        if (!window.confirm('Are you sure you want to reset sync history? This will clear all sync status records.')) {
            return;
        }
        try {
            setLoading(true);
            await api.post('/sync/reset');
            await fetchStatus();
        } catch (error) {
            console.error('Failed to reset sync history', error);
        } finally {
            setLoading(false);
        }
    };

    const stopSync = async (type: 'movies' | 'series') => {
        try {
            setLoading(true);
            await api.post(`/sync/stop/${type}`);
            await fetchStatus();
        } catch (error) {
            console.error(`Failed to stop ${type} sync`, error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-500';
            case 'failed': return 'text-red-500';
            case 'running': return 'text-blue-500 animate-pulse';
            default: return 'text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
            default: return <Activity className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const movieStatus = statuses.find(s => s.type === 'movies');
    const seriesStatus = statuses.find(s => s.type === 'series');

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Overview of your Xtream to STRM synchronization.</p>
                </div>
                <Button onClick={resetSyncHistory} variant="outline" disabled={loading}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset History
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Movies Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Movies Sync</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                                {getStatusIcon(movieStatus?.status || 'idle')}
                                <span className={`text-2xl font-bold capitalize ${getStatusColor(movieStatus?.status || 'idle')}`}>
                                    {movieStatus?.status || 'Idle'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {movieStatus?.status === 'running' ? (
                                    <Button
                                        onClick={() => stopSync('movies')}
                                        disabled={loading}
                                        variant="destructive"
                                        size="sm"
                                    >
                                        <StopCircle className="w-4 h-4 mr-2" />
                                        Stop Sync
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => triggerSync('movies')}
                                        disabled={loading || movieStatus?.status === 'running'}
                                        size="sm"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Sync Now
                                    </Button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {movieStatus?.last_sync ? `Last synced: ${new Date(movieStatus.last_sync).toLocaleString()}` : 'Never synced'}
                        </p>
                        {movieStatus?.error_message && (
                            <p className="text-xs text-red-500 mt-1 truncate" title={movieStatus.error_message}>
                                Error: {movieStatus.error_message}
                            </p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-secondary p-2 rounded">
                                <span className="block font-semibold text-primary">{movieStatus?.items_added || 0}</span>
                                <span className="text-muted-foreground">Added/Updated</span>
                            </div>
                            <div className="bg-secondary p-2 rounded">
                                <span className="block font-semibold text-primary">{movieStatus?.items_deleted || 0}</span>
                                <span className="text-muted-foreground">Deleted</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Series Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Series Sync</CardTitle>
                        <Tv className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                                {getStatusIcon(seriesStatus?.status || 'idle')}
                                <span className={`text-2xl font-bold capitalize ${getStatusColor(seriesStatus?.status || 'idle')}`}>
                                    {seriesStatus?.status || 'Idle'}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => triggerSync('series')}
                                disabled={loading || seriesStatus?.status === 'running'}
                            >
                                {seriesStatus?.status === 'running' ? 'Syncing...' : 'Sync Now'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {seriesStatus?.last_sync ? `Last synced: ${new Date(seriesStatus.last_sync).toLocaleString()}` : 'Never synced'}
                        </p>
                        {seriesStatus?.error_message && (
                            <p className="text-xs text-red-500 mt-1 truncate" title={seriesStatus.error_message}>
                                Error: {seriesStatus.error_message}
                            </p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-secondary p-2 rounded">
                                <span className="block font-semibold text-primary">{seriesStatus?.items_added || 0}</span>
                                <span className="text-muted-foreground">Added/Updated</span>
                            </div>
                            <div className="bg-secondary p-2 rounded">
                                <span className="block font-semibold text-primary">{seriesStatus?.items_deleted || 0}</span>
                                <span className="text-muted-foreground">Deleted</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Selection Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Configuration</CardTitle>
                        <List className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 mt-2">
                            <p className="text-xs text-muted-foreground">
                                Manage which categories to synchronize for Movies and Series.
                            </p>
                            <Link to="/bouquets">
                                <Button className="w-full">
                                    <List className="w-4 h-4 mr-2" />
                                    Select Categories
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
