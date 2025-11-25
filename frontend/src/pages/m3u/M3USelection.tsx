import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save, CheckSquare, Square } from 'lucide-react';
import api from '@/lib/api';

interface M3USource {
    id: number;
    name: string;
    is_active: boolean;
}

interface Group {
    group_title: string;
    entry_type: string;
    count: number;
    selected: boolean;
}

export default function M3USelection() {
    const [sources, setSources] = useState<M3USource[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
    const [movieGroups, setMovieGroups] = useState<Group[]>([]);
    const [seriesGroups, setSeriesGroups] = useState<Group[]>([]);
    const [syncingMovies, setSyncingMovies] = useState(false);
    const [syncingSeries, setSyncingSeries] = useState(false);
    const [savingMovies, setSavingMovies] = useState(false);
    const [savingSeries, setSavingSeries] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    useEffect(() => {
        if (selectedSourceId) {
            fetchGroups();
            setError(null);
        }
    }, [selectedSourceId]);

    const fetchSources = async () => {
        try {
            const res = await api.get<M3USource[]>('/m3u-sources/');
            setSources(res.data.filter(s => s.is_active));
            if (res.data.length > 0 && !selectedSourceId) {
                setSelectedSourceId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch M3U sources", error);
            setError("Failed to fetch M3U sources");
        }
    };

    const fetchGroups = async () => {
        if (!selectedSourceId) return;
        try {
            const res = await api.get<Group[]>(`/m3u-selection/${selectedSourceId}/groups`);
            const movies = res.data.filter(g => g.entry_type === 'movie');
            const series = res.data.filter(g => g.entry_type === 'series');
            setMovieGroups(movies);
            setSeriesGroups(series);
        } catch (error) {
            console.error("Failed to fetch groups", error);
            setError("Failed to fetch groups");
        }
    };

    const syncGroups = async (type: 'movies' | 'series') => {
        if (!selectedSourceId) return;

        if (type === 'movies') setSyncingMovies(true);
        else setSyncingSeries(true);

        setError(null);
        try {
            await api.post(`/m3u-selection/${selectedSourceId}/sync`, {
                sync_types: [type]
            });
            // Wait a bit for sync to complete, then fetch groups
            setTimeout(() => {
                fetchGroups();
                if (type === 'movies') setSyncingMovies(false);
                else setSyncingSeries(false);
            }, 3000);
        } catch (error: any) {
            console.error(`Failed to sync ${type}`, error);
            setError(error.response?.data?.detail || `Failed to sync ${type}`);
            if (type === 'movies') setSyncingMovies(false);
            else setSyncingSeries(false);
        }
    };

    const saveMovieGroups = async () => {
        if (!selectedSourceId) return;
        setSavingMovies(true);
        setError(null);
        try {
            const selected = movieGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'movie'
            }));
            const selectedSeries = seriesGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'series'
            }));

            await api.post(`/m3u-selection/${selectedSourceId}`, { groups: [...selected, ...selectedSeries] });
            alert('Movie groups saved successfully');
        } catch (error: any) {
            console.error("Failed to save movie groups", error);
            setError(error.response?.data?.detail || "Failed to save movie groups");
        } finally {
            setSavingMovies(false);
        }
    };

    const saveSeriesGroups = async () => {
        if (!selectedSourceId) return;
        setSavingSeries(true);
        setError(null);
        try {
            const selected = seriesGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'series'
            }));
            const selectedMovies = movieGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'movie'
            }));

            await api.post(`/m3u-selection/${selectedSourceId}`, { groups: [...selected, ...selectedMovies] });
            alert('Series groups saved successfully');
        } catch (error: any) {
            console.error("Failed to save series groups", error);
            setError(error.response?.data?.detail || "Failed to save series groups");
        } finally {
            setSavingSeries(false);
        }
    };

    const saveAllGroups = async () => {
        if (!selectedSourceId) return;
        setError(null);
        try {
            const selectedMovies = movieGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'movie'
            }));
            const selectedSeries = seriesGroups.filter(g => g.selected).map(g => ({
                group_title: g.group_title,
                type: 'series'
            }));
            await api.post(`/m3u-selection/${selectedSourceId}`, {
                groups: [...selectedMovies, ...selectedSeries]
            });
            alert('All groups saved successfully');
        } catch (error: any) {
            console.error("Failed to save groups", error);
            setError(error.response?.data?.detail || "Failed to save groups");
        }
    };

    const toggleMovieGroup = (groupTitle: string) => {
        setMovieGroups(prev => prev.map(g =>
            g.group_title === groupTitle ? { ...g, selected: !g.selected } : g
        ));
    };

    const toggleSeriesGroup = (groupTitle: string) => {
        setSeriesGroups(prev => prev.map(g =>
            g.group_title === groupTitle ? { ...g, selected: !g.selected } : g
        ));
    };

    const toggleAllMovies = () => {
        const filtered = filterGroups(movieGroups);
        const allSelected = filtered.every(g => g.selected);
        const visibleTitles = new Set(filtered.map(g => g.group_title));

        setMovieGroups(prev => prev.map(g =>
            visibleTitles.has(g.group_title) ? { ...g, selected: !allSelected } : g
        ));
    };

    const toggleAllSeries = () => {
        const filtered = filterGroups(seriesGroups);
        const allSelected = filtered.every(g => g.selected);
        const visibleTitles = new Set(filtered.map(g => g.group_title));

        setSeriesGroups(prev => prev.map(g =>
            visibleTitles.has(g.group_title) ? { ...g, selected: !allSelected } : g
        ));
    };

    const filterGroups = (groups: Group[]) => {
        if (!filterText) return groups;
        const lower = filterText.toLowerCase();
        return groups.filter(g => g.group_title.toLowerCase().includes(lower));
    };

    const filteredMovies = filterGroups(movieGroups);
    const filteredSeries = filterGroups(seriesGroups);

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">M3U Group Selection</h2>
                <p className="text-muted-foreground">Choose which groups to synchronize (Movies & Series).</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">M3U Source:</label>
                    <select
                        value={selectedSourceId || ''}
                        onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                        className="border rounded-md px-3 py-2 text-sm min-w-[200px]"
                    >
                        {sources.map(src => (
                            <option key={src.id} value={src.id}>{src.name}</option>
                        ))}
                    </select>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncGroups('movies')}
                        disabled={syncingMovies || !selectedSourceId}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncingMovies ? 'animate-spin' : ''}`} />
                        Sync Movies
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncGroups('series')}
                        disabled={syncingSeries || !selectedSourceId}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncingSeries ? 'animate-spin' : ''}`} />
                        Sync Series
                    </Button>
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Filter groups..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="flex-1 md:w-64 border rounded-md px-3 py-2 text-sm"
                    />
                    <Button size="sm" onClick={saveAllGroups}>
                        <Save className="w-4 h-4 mr-2" />
                        Save All
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {!selectedSourceId ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No M3U sources. Go to M3U Import to add sources.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* Movie Groups */}
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Movies ({filteredMovies.length})</CardTitle>
                            <Button size="sm" onClick={saveMovieGroups} disabled={savingMovies || movieGroups.length === 0}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto min-h-[400px]">
                            {movieGroups.length > 0 ? (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <button onClick={toggleAllMovies}>
                                                        {filteredMovies.length > 0 && filteredMovies.every(g => g.selected) ?
                                                            <CheckSquare className="w-4 h-4" /> :
                                                            <Square className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </th>
                                                <th className="p-3">Group Name</th>
                                                <th className="p-3 w-20">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredMovies.map(group => (
                                                <tr key={group.group_title} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-3">
                                                        <button onClick={() => toggleMovieGroup(group.group_title)}>
                                                            {group.selected ?
                                                                <CheckSquare className="w-4 h-4 text-primary" /> :
                                                                <Square className="w-4 h-4 text-muted-foreground" />
                                                            }
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium cursor-pointer" onClick={() => toggleMovieGroup(group.group_title)}>
                                                        {group.group_title}
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">{group.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Click "Sync Movies" to load data.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Series Groups */}
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Series ({filteredSeries.length})</CardTitle>
                            <Button size="sm" onClick={saveSeriesGroups} disabled={savingSeries || seriesGroups.length === 0}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto min-h-[400px]">
                            {seriesGroups.length > 0 ? (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <button onClick={toggleAllSeries}>
                                                        {filteredSeries.length > 0 && filteredSeries.every(g => g.selected) ?
                                                            <CheckSquare className="w-4 h-4" /> :
                                                            <Square className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </th>
                                                <th className="p-3">Group Name</th>
                                                <th className="p-3 w-20">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredSeries.map(group => (
                                                <tr key={group.group_title} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-3">
                                                        <button onClick={() => toggleSeriesGroup(group.group_title)}>
                                                            {group.selected ?
                                                                <CheckSquare className="w-4 h-4 text-primary" /> :
                                                                <Square className="w-4 h-4 text-muted-foreground" />
                                                            }
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium cursor-pointer" onClick={() => toggleSeriesGroup(group.group_title)}>
                                                        {group.group_title}
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">{group.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Click "Sync Series" to load data.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
