import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Save, X, Check, Film, Tv, RefreshCw, StopCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface Subscription {
    id: number;
    name: string;
    xtream_url: string;
    username: string;
    password: string;
    movies_dir: string;
    series_dir: string;
    is_active: boolean;
}

interface SubscriptionForm {
    name: string;
    xtream_url: string;
    username: string;
    password: string;
    movies_dir: string;
    series_dir: string;
    is_active: boolean;
}

interface SyncStatus {
    id: number;
    subscription_id: number;
    type: string;
    last_sync: string | null;
    status: string;
    items_added: number;
    items_deleted: number;
    error_message?: string;
}

export default function XTVSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [statuses, setStatuses] = useState<SyncStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<SubscriptionForm>({
        name: '',
        xtream_url: '',
        username: '',
        password: '',
        movies_dir: '/output/movies',
        series_dir: '/output/series',
        is_active: true
    });

    const fetchData = async () => {
        try {
            const [subsRes, statusRes] = await Promise.all([
                api.get<Subscription[]>('/subscriptions/'),
                api.get<SyncStatus[]>('/sync/status')
            ]);
            setSubscriptions(subsRes.data);
            setStatuses(statusRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const startAdd = () => {
        setFormData({
            name: '',
            xtream_url: '',
            username: '',
            password: '',
            movies_dir: '',
            series_dir: '',
            is_active: true
        });
        setIsAdding(true);
        setEditingId(null);
    };

    const startEdit = (sub: Subscription) => {
        setFormData({
            name: sub.name,
            xtream_url: sub.xtream_url,
            username: sub.username,
            password: sub.password,
            movies_dir: sub.movies_dir,
            series_dir: sub.series_dir,
            is_active: sub.is_active
        });
        setEditingId(sub.id);
        setIsAdding(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({
            name: '',
            xtream_url: '',
            username: '',
            password: '',
            movies_dir: '',
            series_dir: '',
            is_active: true
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (isAdding) {
                await api.post('/subscriptions/', formData);
            } else if (editingId) {
                await api.put(`/subscriptions/${editingId}`, formData);
            }
            await fetchData();
            cancelEdit();
        } catch (error) {
            console.error("Failed to save subscription", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this subscription?')) return;

        setLoading(true);
        try {
            await api.delete(`/subscriptions/${id}`);
            await fetchData();
        } catch (error) {
            console.error("Failed to delete subscription", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (sub: Subscription) => {
        setLoading(true);
        try {
            await api.put(`/subscriptions/${sub.id}`, {
                is_active: !sub.is_active
            });
            await fetchData();
        } catch (error) {
            console.error("Failed to toggle subscription", error);
        } finally {
            setLoading(false);
        }
    };

    const triggerSync = async (subscriptionId: number, type: 'movies' | 'series') => {
        try {
            setLoading(true);
            await api.post(`/sync/${type}/${subscriptionId}`);
            await fetchData();
        } catch (error) {
            console.error(`Failed to trigger ${type} sync`, error);
        } finally {
            setLoading(false);
        }
    };

    const stopSync = async (subscriptionId: number, type: 'movies' | 'series') => {
        try {
            setLoading(true);
            await api.post(`/sync/stop/${subscriptionId}/${type}`);
            await fetchData();
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
            default: return <div className="w-5 h-5 rounded-full bg-muted" />;
        }
    };

    const getStatus = (subscriptionId: number, type: string) => {
        return statuses.find(s => s.subscription_id === subscriptionId && s.type === type);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">XtreamTV Subscriptions</h2>
                <p className="text-muted-foreground">Manage your Xtream Codes subscriptions and synchronization.</p>
            </div>

            {/* Subscription Management Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Configuration</CardTitle>
                    <Button onClick={startAdd} disabled={isAdding || editingId !== null || loading} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subscription
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="p-3 text-left">Name</th>
                                    <th className="p-3 text-left">URL</th>
                                    <th className="p-3 text-left">Username</th>
                                    <th className="p-3 text-left">Password</th>
                                    <th className="p-3 text-left">Movies Dir</th>
                                    <th className="p-3 text-left">Series Dir</th>
                                    <th className="p-3 text-center">Active</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isAdding && (
                                    <tr className="bg-accent/50">
                                        <td className="p-2">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="My Subscription"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                name="xtream_url"
                                                value={formData.xtream_url}
                                                onChange={handleInputChange}
                                                placeholder="http://example.com:8080"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                name="username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                placeholder="username"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                name="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="password"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                name="movies_dir"
                                                value={formData.movies_dir}
                                                onChange={handleInputChange}
                                                placeholder="/output/movies"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                name="series_dir"
                                                value={formData.series_dir}
                                                onChange={handleInputChange}
                                                placeholder="/output/series"
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleInputChange}
                                                className="w-4 h-4"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2 justify-end">
                                                <Button onClick={handleSave} disabled={loading} size="sm" variant="default">
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button onClick={cancelEdit} disabled={loading} size="sm" variant="outline">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {subscriptions.map(sub => (
                                    editingId === sub.id ? (
                                        <tr key={sub.id} className="bg-accent/50">
                                            <td className="p-2">
                                                <Input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    name="xtream_url"
                                                    value={formData.xtream_url}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    name="password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    name="movies_dir"
                                                    value={formData.movies_dir}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    name="series_dir"
                                                    value={formData.series_dir}
                                                    onChange={handleInputChange}
                                                    className="h-8"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    name="is_active"
                                                    checked={formData.is_active}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <div className="flex gap-2 justify-end">
                                                    <Button onClick={handleSave} disabled={loading} size="sm" variant="default">
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button onClick={cancelEdit} disabled={loading} size="sm" variant="outline">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="p-3 font-medium">{sub.name}</td>
                                            <td className="p-3 text-muted-foreground">{sub.xtream_url}</td>
                                            <td className="p-3 text-muted-foreground">{sub.username}</td>
                                            <td className="p-3 text-muted-foreground">••••••••</td>
                                            <td className="p-3 text-muted-foreground">{sub.movies_dir}</td>
                                            <td className="p-3 text-muted-foreground">{sub.series_dir}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => toggleActive(sub)}
                                                    disabled={loading}
                                                    className={`w-5 h-5 rounded flex items-center justify-center ${sub.is_active ? 'bg-green-500 text-white' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    {sub.is_active && <Check className="w-3 h-3" />}
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        onClick={() => startEdit(sub)}
                                                        disabled={loading || isAdding || editingId !== null}
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDelete(sub.id)}
                                                        disabled={loading || isAdding || editingId !== null}
                                                        size="sm"
                                                        variant="destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                                {subscriptions.length === 0 && !isAdding && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            No subscriptions configured. Click "Add Subscription" to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Status & Controls */}
            <div>
                <h3 className="text-xl font-semibold mb-4">Synchronization Status</h3>
                {subscriptions.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Add a subscription above to see synchronization controls.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {subscriptions.map(sub => {
                            const movieStatus = getStatus(sub.id, 'movies');
                            const seriesStatus = getStatus(sub.id, 'series');

                            return (
                                <Card key={sub.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>{sub.name}</span>
                                            {!sub.is_active && (
                                                <span className="text-sm font-normal text-muted-foreground">(Inactive)</span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Movies */}
                                            <div className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Film className="w-5 h-5 text-muted-foreground" />
                                                        <span className="font-medium">Movies</span>
                                                    </div>
                                                    {getStatusIcon(movieStatus?.status || 'idle')}
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Status:</span>
                                                        <span className={`font-medium capitalize ${getStatusColor(movieStatus?.status || 'idle')}`}>
                                                            {movieStatus?.status || 'Idle'}
                                                        </span>
                                                    </div>
                                                    {movieStatus?.last_sync && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Last Sync:</span>
                                                            <span>{new Date(movieStatus.last_sync).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {movieStatus && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Added:</span>
                                                                <span className="text-green-600">{movieStatus.items_added}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Deleted:</span>
                                                                <span className="text-red-600">{movieStatus.items_deleted}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    {movieStatus?.status === 'running' ? (
                                                        <Button
                                                            onClick={() => stopSync(sub.id, 'movies')}
                                                            disabled={loading || !sub.is_active}
                                                            variant="destructive"
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <StopCircle className="w-4 h-4 mr-2" />
                                                            Stop Sync
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => triggerSync(sub.id, 'movies')}
                                                            disabled={loading || !sub.is_active}
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Sync Now
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Series */}
                                            <div className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Tv className="w-5 h-5 text-muted-foreground" />
                                                        <span className="font-medium">Series</span>
                                                    </div>
                                                    {getStatusIcon(seriesStatus?.status || 'idle')}
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Status:</span>
                                                        <span className={`font-medium capitalize ${getStatusColor(seriesStatus?.status || 'idle')}`}>
                                                            {seriesStatus?.status || 'Idle'}
                                                        </span>
                                                    </div>
                                                    {seriesStatus?.last_sync && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Last Sync:</span>
                                                            <span>{new Date(seriesStatus.last_sync).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {seriesStatus && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Added:</span>
                                                                <span className="text-green-600">{seriesStatus.items_added}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Deleted:</span>
                                                                <span className="text-red-600">{seriesStatus.items_deleted}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    {seriesStatus?.status === 'running' ? (
                                                        <Button
                                                            onClick={() => stopSync(sub.id, 'series')}
                                                            disabled={loading || !sub.is_active}
                                                            variant="destructive"
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <StopCircle className="w-4 h-4 mr-2" />
                                                            Stop Sync
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => triggerSync(sub.id, 'series')}
                                                            disabled={loading || !sub.is_active}
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Sync Now
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
