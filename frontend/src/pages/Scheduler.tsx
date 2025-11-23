import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ScheduleConfig {
    type: 'movies' | 'series';
    enabled: boolean;
    frequency: string;
    last_run: string | null;
    next_run: string | null;
}

interface ExecutionHistory {
    id: number;
    schedule_id: number;
    started_at: string;
    completed_at: string | null;
    status: 'success' | 'failed' | 'cancelled' | 'running';
    items_processed: number;
    error_message: string | null;
}

const frequencyOptions = [
    { value: 'hourly', label: 'Toutes les heures' },
    { value: 'six_hours', label: 'Toutes les 6 heures' },
    { value: 'twelve_hours', label: 'Toutes les 12 heures' },
    { value: 'daily', label: 'Quotidiennement' },
    { value: 'weekly', label: 'Hebdomadairement' },
];

export default function Scheduler() {
    const [moviesConfig, setMoviesConfig] = useState<ScheduleConfig | null>(null);
    const [seriesConfig, setSeriesConfig] = useState<ScheduleConfig | null>(null);
    const [history, setHistory] = useState<ExecutionHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedules();
        fetchHistory();
    }, []);

    const fetchSchedules = async () => {
        try {
            const response = await api.get<ScheduleConfig[]>('/scheduler/config');
            const configs = response.data;
            setMoviesConfig(configs.find((c) => c.type === 'movies') || null);
            setSeriesConfig(configs.find((c) => c.type === 'series') || null);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get<ExecutionHistory[]>('/scheduler/history?limit=50');
            setHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const updateSchedule = async (type: 'movies' | 'series', enabled: boolean, frequency: string) => {
        try {
            await api.put(`/scheduler/config/${type}`, { enabled, frequency });
            await fetchSchedules();
        } catch (error) {
            console.error('Error updating schedule:', error);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Jamais';
        return new Date(dateString).toLocaleString('fr-FR');
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return '-';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            success: 'bg-green-500/10 text-green-500 border-green-500/20',
            failed: 'bg-red-500/10 text-red-500 border-red-500/20',
            running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        };

        const labels: Record<string, string> = {
            success: 'Succès',
            failed: 'Échec',
            running: 'En cours',
            cancelled: 'Annulé',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${colors[status] || colors.success}`}>
                {status === 'success' && <CheckCircle className="w-3 h-3" />}
                {status === 'failed' && <XCircle className="w-3 h-3" />}
                {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Planification</h2>
                <p className="text-muted-foreground">Configurez les synchronisations automatiques</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Movies Schedule */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Films
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Activé</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={moviesConfig?.enabled || false}
                                    onChange={(e) =>
                                        updateSchedule('movies', e.target.checked, moviesConfig?.frequency || 'daily')
                                    }
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fréquence</label>
                            <select
                                className="w-full p-2 border rounded-md bg-background"
                                value={moviesConfig?.frequency || 'daily'}
                                onChange={(e) =>
                                    updateSchedule('movies', moviesConfig?.enabled || false, e.target.value)
                                }
                                disabled={!moviesConfig?.enabled}
                            >
                                {frequencyOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 space-y-1 text-sm border-t">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dernière exécution:</span>
                                <span>{formatDate(moviesConfig?.last_run || null)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Prochaine exécution:</span>
                                <span>{formatDate(moviesConfig?.next_run || null)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Series Schedule */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Séries
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Activé</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={seriesConfig?.enabled || false}
                                    onChange={(e) =>
                                        updateSchedule('series', e.target.checked, seriesConfig?.frequency || 'daily')
                                    }
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fréquence</label>
                            <select
                                className="w-full p-2 border rounded-md bg-background"
                                value={seriesConfig?.frequency || 'daily'}
                                onChange={(e) =>
                                    updateSchedule('series', seriesConfig?.enabled || false, e.target.value)
                                }
                                disabled={!seriesConfig?.enabled}
                            >
                                {frequencyOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 space-y-1 text-sm border-t">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dernière exécution:</span>
                                <span>{formatDate(seriesConfig?.last_run || null)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Prochaine exécution:</span>
                                <span>{formatDate(seriesConfig?.next_run || null)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Execution History */}
            <Card>
                <CardHeader>
                    <CardTitle>Historique des exécutions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 font-medium">Type</th>
                                    <th className="text-left p-2 font-medium">Début</th>
                                    <th className="text-left p-2 font-medium">Fin</th>
                                    <th className="text-left p-2 font-medium">Durée</th>
                                    <th className="text-left p-2 font-medium">Statut</th>
                                    <th className="text-right p-2 font-medium">Éléments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center p-4 text-muted-foreground">
                                            Aucune exécution pour le moment
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((exec) => (
                                        <tr key={exec.id} className="border-b hover:bg-accent/50">
                                            <td className="p-2 font-medium">
                                                {exec.schedule_id === 1 ? 'Films' : 'Séries'}
                                            </td>
                                            <td className="p-2 text-sm">{formatDate(exec.started_at)}</td>
                                            <td className="p-2 text-sm">{formatDate(exec.completed_at)}</td>
                                            <td className="p-2 text-sm">{formatDuration(exec.started_at, exec.completed_at)}</td>
                                            <td className="p-2">{getStatusBadge(exec.status)}</td>
                                            <td className="p-2 text-right">{exec.items_processed}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
