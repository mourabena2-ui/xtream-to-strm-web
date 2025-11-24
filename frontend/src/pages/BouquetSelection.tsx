import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save, CheckSquare, Square } from 'lucide-react';
import api from '@/lib/api';

interface Subscription {
    id: number;
    name: string;
    is_active: boolean;
}

interface Category {
    category_id: string;
    category_name: string;
    selected: boolean;
    item_count: number;
}

type SortKey = 'name' | 'id' | 'count';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

export default function BouquetSelection() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
    const [movieCategories, setMovieCategories] = useState<Category[]>([]);
    const [seriesCategories, setSeriesCategories] = useState<Category[]>([]);
    const [syncingMovies, setSyncingMovies] = useState(false);
    const [syncingSeries, setSyncingSeries] = useState(false);
    const [savingMovies, setSavingMovies] = useState(false);
    const [savingSeries, setSavingSeries] = useState(false);

    const [filterText, setFilterText] = useState('');
    const [movieSort, setMovieSort] = useState<SortConfig>({ key: 'name', direction: 'asc' });
    const [seriesSort, setSeriesSort] = useState<SortConfig>({ key: 'name', direction: 'asc' });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    useEffect(() => {
        if (selectedSubId) {
            fetchMovies();
            fetchSeries();
            setError(null);
        }
    }, [selectedSubId]);

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get<Subscription[]>('/subscriptions/');
            setSubscriptions(res.data.filter(s => s.is_active));
            if (res.data.length > 0 && !selectedSubId) {
                setSelectedSubId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch subscriptions", error);
            setError("Failed to fetch subscriptions");
        }
    };

    const fetchMovies = async () => {
        if (!selectedSubId) return;
        try {
            const res = await api.get<Category[]>(`/selection/movies/${selectedSubId}`);
            setMovieCategories(res.data);
        } catch (error) {
            console.error("Failed to fetch movie categories", error);
            setError("Failed to fetch movie categories");
        }
    };

    const fetchSeries = async () => {
        if (!selectedSubId) return;
        try {
            const res = await api.get<Category[]>(`/selection/series/${selectedSubId}`);
            setSeriesCategories(res.data);
        } catch (error) {
            console.error("Failed to fetch series categories", error);
            setError("Failed to fetch series categories");
        }
    };

    const syncMovies = async () => {
        if (!selectedSubId) return;
        setSyncingMovies(true);
        setError(null);
        try {
            await api.post(`/selection/movies/sync/${selectedSubId}`);
            await fetchMovies();
        } catch (error: any) {
            console.error("Failed to sync movie categories", error);
            setError(error.response?.data?.detail || "Failed to sync movie categories");
        } finally {
            setSyncingMovies(false);
        }
    };

    const syncSeries = async () => {
        if (!selectedSubId) return;
        setSyncingSeries(true);
        setError(null);
        try {
            await api.post(`/selection/series/sync/${selectedSubId}`);
            await fetchSeries();
        } catch (error: any) {
            console.error("Failed to sync series categories", error);
            setError(error.response?.data?.detail || "Failed to sync series categories");
        } finally {
            setSyncingSeries(false);
        }
    };

    const saveMovies = async () => {
        if (!selectedSubId) return;
        setSavingMovies(true);
        setError(null);
        try {
            const selected = movieCategories.filter(c => c.selected);
            await api.post(`/selection/movies/${selectedSubId}`, { categories: selected });
        } catch (error: any) {
            console.error("Failed to save movie selection", error);
            setError(error.response?.data?.detail || "Failed to save movie selection");
        } finally {
            setSavingMovies(false);
        }
    };

    const saveSeries = async () => {
        if (!selectedSubId) return;
        setSavingSeries(true);
        setError(null);
        try {
            const selected = seriesCategories.filter(c => c.selected);
            await api.post(`/selection/series/${selectedSubId}`, { categories: selected });
        } catch (error: any) {
            console.error("Failed to save series selection", error);
            setError(error.response?.data?.detail || "Failed to save series selection");
        } finally {
            setSavingSeries(false);
        }
    };

    const toggleMovie = (id: string) => {
        setMovieCategories(prev => prev.map(c =>
            c.category_id === id ? { ...c, selected: !c.selected } : c
        ));
    };

    const toggleSeries = (id: string) => {
        setSeriesCategories(prev => prev.map(c =>
            c.category_id === id ? { ...c, selected: !c.selected } : c
        ));
    };

    const toggleAllMovies = () => {
        const allSelected = filteredAndSortedMovies.every(c => c.selected);
        const visibleIds = new Set(filteredAndSortedMovies.map(c => c.category_id));

        setMovieCategories(prev => prev.map(c =>
            visibleIds.has(c.category_id) ? { ...c, selected: !allSelected } : c
        ));
    };

    const toggleAllSeries = () => {
        const allSelected = filteredAndSortedSeries.every(c => c.selected);
        const visibleIds = new Set(filteredAndSortedSeries.map(c => c.category_id));

        setSeriesCategories(prev => prev.map(c =>
            visibleIds.has(c.category_id) ? { ...c, selected: !allSelected } : c
        ));
    };

    const handleSort = (type: 'movie' | 'series', key: SortKey) => {
        if (type === 'movie') {
            setMovieSort(prev => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        } else {
            setSeriesSort(prev => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };

    const filterAndSort = (categories: Category[], sortConfig: SortConfig) => {
        let result = [...categories];

        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            result = result.filter(c =>
                c.category_name.toLowerCase().includes(lowerFilter) ||
                c.category_id.includes(filterText)
            );
        }

        result.sort((a, b) => {
            let aValue: any = a.category_name;
            let bValue: any = b.category_name;

            if (sortConfig.key === 'id') {
                aValue = parseInt(a.category_id) || a.category_id;
                bValue = parseInt(b.category_id) || b.category_id;
            } else if (sortConfig.key === 'count') {
                aValue = a.item_count;
                bValue = b.item_count;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    };

    const filteredAndSortedMovies = filterAndSort(movieCategories, movieSort);
    const filteredAndSortedSeries = filterAndSort(seriesCategories, seriesSort);

    const renderSortIcon = (config: SortConfig, key: SortKey) => {
        if (config.key !== key) return null;
        return config.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Bouquet Selection</h2>
                <p className="text-muted-foreground">Choose which categories to synchronize.</p>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Subscription:</label>
                    <select
                        value={selectedSubId || ''}
                        onChange={(e) => setSelectedSubId(Number(e.target.value))}
                        className="border rounded-md px-3 py-2 text-sm min-w-[200px]"
                    >
                        {subscriptions.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Filter categories..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {!selectedSubId ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No active subscriptions. Go to Configuration to add subscriptions.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* Movies Column (Left) */}
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Movies Categories ({filteredAndSortedMovies.length})</CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={syncMovies} disabled={syncingMovies}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncingMovies ? 'animate-spin' : ''}`} />
                                    Sync
                                </Button>
                                <Button size="sm" onClick={saveMovies} disabled={savingMovies || movieCategories.length === 0}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto min-h-[400px]">
                            {movieCategories.length > 0 ? (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <button onClick={toggleAllMovies}>
                                                        {filteredAndSortedMovies.length > 0 && filteredAndSortedMovies.every(c => c.selected) ?
                                                            <CheckSquare className="w-4 h-4" /> :
                                                            <Square className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </th>
                                                <th className="p-3 cursor-pointer hover:bg-muted" onClick={() => handleSort('movie', 'name')}>
                                                    Category Name {renderSortIcon(movieSort, 'name')}
                                                </th>
                                                <th className="p-3 w-20 cursor-pointer hover:bg-muted" onClick={() => handleSort('movie', 'count')}>
                                                    Count {renderSortIcon(movieSort, 'count')}
                                                </th>
                                                <th className="p-3 w-20 cursor-pointer hover:bg-muted" onClick={() => handleSort('movie', 'id')}>
                                                    ID {renderSortIcon(movieSort, 'id')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredAndSortedMovies.map(cat => (
                                                <tr key={cat.category_id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-3">
                                                        <button onClick={() => toggleMovie(cat.category_id)}>
                                                            {cat.selected ?
                                                                <CheckSquare className="w-4 h-4 text-primary" /> :
                                                                <Square className="w-4 h-4 text-muted-foreground" />
                                                            }
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium cursor-pointer" onClick={() => toggleMovie(cat.category_id)}>
                                                        {cat.category_name}
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">{cat.item_count}</td>
                                                    <td className="p-3 text-muted-foreground text-xs">{cat.category_id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Click "Sync" to load data.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Series Column (Right) */}
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Series Categories ({filteredAndSortedSeries.length})</CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={syncSeries} disabled={syncingSeries}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncingSeries ? 'animate-spin' : ''}`} />
                                    Sync
                                </Button>
                                <Button size="sm" onClick={saveSeries} disabled={savingSeries || seriesCategories.length === 0}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto min-h-[400px]">
                            {seriesCategories.length > 0 ? (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <button onClick={toggleAllSeries}>
                                                        {filteredAndSortedSeries.length > 0 && filteredAndSortedSeries.every(c => c.selected) ?
                                                            <CheckSquare className="w-4 h-4" /> :
                                                            <Square className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </th>
                                                <th className="p-3 cursor-pointer hover:bg-muted" onClick={() => handleSort('series', 'name')}>
                                                    Category Name {renderSortIcon(seriesSort, 'name')}
                                                </th>
                                                <th className="p-3 w-20 cursor-pointer hover:bg-muted" onClick={() => handleSort('series', 'count')}>
                                                    Count {renderSortIcon(seriesSort, 'count')}
                                                </th>
                                                <th className="p-3 w-20 cursor-pointer hover:bg-muted" onClick={() => handleSort('series', 'id')}>
                                                    ID {renderSortIcon(seriesSort, 'id')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredAndSortedSeries.map(cat => (
                                                <tr key={cat.category_id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-3">
                                                        <button onClick={() => toggleSeries(cat.category_id)}>
                                                            {cat.selected ?
                                                                <CheckSquare className="w-4 h-4 text-primary" /> :
                                                                <Square className="w-4 h-4 text-muted-foreground" />
                                                            }
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium cursor-pointer" onClick={() => toggleSeries(cat.category_id)}>
                                                        {cat.category_name}
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">{cat.item_count}</td>
                                                    <td className="p-3 text-muted-foreground text-xs">{cat.category_id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Click "Sync" to load data.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
