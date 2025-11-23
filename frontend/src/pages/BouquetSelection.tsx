import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save, CheckSquare, Square } from 'lucide-react';
import api from '@/lib/api';

interface Category {
    category_id: string;
    category_name: string;
    selected: boolean;
}

export default function BouquetSelection() {
    const [movieCategories, setMovieCategories] = useState<Category[]>([]);
    const [seriesCategories, setSeriesCategories] = useState<Category[]>([]);
    const [syncingMovies, setSyncingMovies] = useState(false);
    const [syncingSeries, setSyncingSeries] = useState(false);
    const [savingMovies, setSavingMovies] = useState(false);
    const [savingSeries, setSavingSeries] = useState(false);

    // Load categories on mount
    useEffect(() => {
        fetchMovies();
        fetchSeries();
    }, []);

    const fetchMovies = async () => {
        try {
            const res = await api.get<Category[]>('/selection/movies');
            setMovieCategories(res.data);
        } catch (error) {
            console.error("Failed to fetch movie categories", error);
        }
    };

    const fetchSeries = async () => {
        try {
            const res = await api.get<Category[]>('/selection/series');
            setSeriesCategories(res.data);
        } catch (error) {
            console.error("Failed to fetch series categories", error);
        }
    };

    const syncMovies = async () => {
        setSyncingMovies(true);
        try {
            await api.post('/selection/movies/sync');
            // Reload categories from database
            await fetchMovies();
            alert("Movie categories synchronized!");
        } catch (error) {
            console.error("Failed to sync movie categories", error);
            alert("Failed to sync movie categories");
        } finally {
            setSyncingMovies(false);
        }
    };

    const syncSeries = async () => {
        setSyncingSeries(true);
        try {
            await api.post('/selection/series/sync');
            // Reload categories from database
            await fetchSeries();
            alert("Series categories synchronized!");
        } catch (error) {
            console.error("Failed to sync series categories", error);
            alert("Failed to sync series categories");
        } finally {
            setSyncingSeries(false);
        }
    };

    const saveMovies = async () => {
        setSavingMovies(true);
        try {
            const selected = movieCategories.filter(c => c.selected);
            await api.post('/selection/movies', { categories: selected });
            alert("Movie selection saved!");
        } catch (error) {
            console.error("Failed to save movie selection", error);
            alert("Failed to save movie selection");
        } finally {
            setSavingMovies(false);
        }
    };

    const saveSeries = async () => {
        setSavingSeries(true);
        try {
            const selected = seriesCategories.filter(c => c.selected);
            await api.post('/selection/series', { categories: selected });
            alert("Series selection saved!");
        } catch (error) {
            console.error("Failed to save series selection", error);
            alert("Failed to save series selection");
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
        const allSelected = movieCategories.every(c => c.selected);
        setMovieCategories(prev => prev.map(c => ({ ...c, selected: !allSelected })));
    };

    const toggleAllSeries = () => {
        const allSelected = seriesCategories.every(c => c.selected);
        setSeriesCategories(prev => prev.map(c => ({ ...c, selected: !allSelected })));
    };

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Selection des bouquets</h2>
                <p className="text-muted-foreground">Choose which categories to synchronize.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Series Column (Left) */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Series Categories</CardTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={syncSeries} disabled={syncingSeries}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncingSeries ? 'animate-spin' : ''}`} />
                                Sync Categories
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
                                                    {seriesCategories.every(c => c.selected) ?
                                                        <CheckSquare className="w-4 h-4" /> :
                                                        <Square className="w-4 h-4" />
                                                    }
                                                </button>
                                            </th>
                                            <th className="p-3">Category Name</th>
                                            <th className="p-3 w-20">ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {seriesCategories.map(cat => (
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
                                                <td className="p-3 text-muted-foreground text-xs">{cat.category_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Click "List Categories" to load data.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Movies Column (Right) */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Movies Categories</CardTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={syncMovies} disabled={syncingMovies}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncingMovies ? 'animate-spin' : ''}`} />
                                Sync Categories
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
                                                    {movieCategories.every(c => c.selected) ?
                                                        <CheckSquare className="w-4 h-4" /> :
                                                        <Square className="w-4 h-4" />
                                                    }
                                                </button>
                                            </th>
                                            <th className="p-3">Category Name</th>
                                            <th className="p-3 w-20">ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {movieCategories.map(cat => (
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
                                                <td className="p-3 text-muted-foreground text-xs">{cat.category_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Click "List Categories" to load data.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
