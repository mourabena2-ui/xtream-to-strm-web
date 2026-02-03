import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Database, Settings } from 'lucide-react';
import api from '@/lib/api';

export default function Administration() {
    const [loading, setLoading] = useState(false);
    const [prefixRegex, setPrefixRegex] = useState('');
    const [formatDate, setFormatDate] = useState(false);
    const [cleanName, setCleanName] = useState(false);
    const [useSeasonFolders, setUseSeasonFolders] = useState(true);
    const [includeSeriesName, setIncludeSeriesName] = useState(false);
    const [regexLoading, setRegexLoading] = useState(false);

    // Load current settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await api.get('/config');
                setPrefixRegex(response.data.PREFIX_REGEX || '^(?:[A-Za-z0-9.-]+_|[A-Za-z]{2,}\\s*-\\s*)');
                setFormatDate(response.data.FORMAT_DATE_IN_TITLE === true);
                setCleanName(response.data.CLEAN_NAME === true);
                setUseSeasonFolders(response.data.SERIES_USE_SEASON_FOLDERS !== 'false'); // Default TRUE if missing
                setIncludeSeriesName(response.data.SERIES_INCLUDE_NAME_IN_FILENAME === 'true'); // Default FALSE
            } catch (error) {
                console.error('Failed to load settings', error);
            }
        };
        loadSettings();
    }, []);

    const saveNfoSettings = async () => {
        setRegexLoading(true);
        try {
            await api.post('/config', {
                PREFIX_REGEX: prefixRegex,
                FORMAT_DATE_IN_TITLE: formatDate,
                CLEAN_NAME: cleanName,
                SERIES_USE_SEASON_FOLDERS: useSeasonFolders,
                SERIES_INCLUDE_NAME_IN_FILENAME: includeSeriesName
            });
            alert('NFO settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Failed to save settings. Please check the logs.');
        } finally {
            setRegexLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Administration</h2>
                <p className="text-muted-foreground">Manage system settings and data.</p>
            </div>

            {/* Management Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Delete Generated Files */}
                <Card className="border-orange-200 dark:border-orange-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <Trash2 className="w-5 h-5" />
                            Delete Generated Files
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Remove all .strm and .nfo files from movies and series directories.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
                            onClick={async () => {
                                if (!confirm('Are you sure you want to delete all generated files? This cannot be undone.')) return;
                                setLoading(true);
                                try {
                                    await api.post('/admin/delete-files');
                                    alert('All generated files have been deleted successfully.');
                                } catch (error) {
                                    console.error('Failed to delete files', error);
                                    alert('Failed to delete files. Please check the logs.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All Files
                        </Button>
                    </CardContent>
                </Card>

                {/* Reset Database */}
                <Card className="border-red-200 dark:border-red-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                            <Database className="w-5 h-5" />
                            Reset Database
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Clear all data from the database (subscriptions, sync states, selections, etc.).
                        </p>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={async () => {
                                if (!confirm('⚠️ WARNING: This will delete ALL data from the database!\n\nAre you absolutely sure?')) return;
                                setLoading(true);
                                try {
                                    await api.post('/admin/reset-database');
                                    alert('Database has been reset successfully.');
                                } catch (error) {
                                    console.error('Failed to reset database', error);
                                    alert('Failed to reset database. Please check the logs.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <Database className="w-4 h-4 mr-2" />
                            Reset Database
                        </Button>
                    </CardContent>
                </Card>

                {/* Reset All Data */}
                <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <AlertTriangle className="w-5 h-5" />
                            Reset All Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Delete all files AND reset the database. Complete system reset.
                        </p>
                        <Button
                            variant="destructive"
                            className="w-full bg-red-700 hover:bg-red-800"
                            onClick={async () => {
                                if (!confirm('🚨 CRITICAL WARNING 🚨\n\nThis will DELETE ALL FILES and RESET THE DATABASE!\n\nThis action cannot be undone. Are you ABSOLUTELY SURE?')) return;
                                if (!confirm('Final confirmation: Type YES in the prompt to continue') || !prompt('Type YES to confirm:')?.toUpperCase().includes('YES')) {
                                    alert('Reset cancelled.');
                                    return;
                                }
                                setLoading(true);
                                try {
                                    await api.post('/admin/reset-all');
                                    alert('All data has been reset successfully.');
                                } catch (error) {
                                    console.error('Failed to reset all data', error);
                                    alert('Failed to reset all data. Please check the logs.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Reset Everything
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* NFO Settings */}
            <div>
                <h3 className="text-xl font-semibold mb-4">NFO Settings</h3>
                <Card className="border-blue-200 dark:border-blue-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Settings className="w-5 h-5" />
                            Title Formatting
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title Prefix Regex</label>
                            <p className="text-sm text-muted-foreground">
                                Pattern to strip language/country prefixes. Default: <code className="bg-muted px-1 py-0.5 rounded">^(?:[A-Za-z0-9.-]+_|[A-Za-z]{"{2,}"}\\s*-\\s*)</code>
                            </p>
                            <Input
                                type="text"
                                value={prefixRegex}
                                onChange={(e) => setPrefixRegex(e.target.value)}
                                placeholder="^(?:[A-Za-z0-9.-]+_|[A-Za-z]{2,}\s*-\s*)"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Examples: "FR - Movie Name" → "Movie Name"
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="formatDate"
                                    checked={formatDate}
                                    onChange={(e) => setFormatDate(e.target.checked)}
                                    className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="formatDate" className="text-sm font-medium leading-none cursor-pointer">
                                        Format date at end of name
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        If name ends with year (e.g. "Name_2024"), format as "Name (2024)"
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="cleanName"
                                    checked={cleanName}
                                    onChange={(e) => setCleanName(e.target.checked)}
                                    className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <label htmlFor="cleanName" className="text-sm font-medium leading-none cursor-pointer">
                                        Clean name
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Replace all remaining underscores "_" with spaces
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="default"
                            className="w-full"
                            onClick={saveNfoSettings}
                            disabled={regexLoading}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    </CardContent>
                </Card>

                {/* Series Formatting Settings */}
                <Card className="border-purple-200 dark:border-purple-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                            <Settings className="w-5 h-5" />
                            Series Formatting
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="useSeasonFolders"
                                checked={useSeasonFolders}
                                onChange={(e) => setUseSeasonFolders(e.target.checked)}
                                className="h-4 w-4 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                                <label htmlFor="useSeasonFolders" className="text-sm font-medium leading-none cursor-pointer">
                                    Use Season Folders
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Organize episodes into "Season XX" subfolders (Default: Enabled)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="includeSeriesName"
                                checked={includeSeriesName}
                                onChange={(e) => setIncludeSeriesName(e.target.checked)}
                                className="h-4 w-4 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                                <label htmlFor="includeSeriesName" className="text-sm font-medium leading-none cursor-pointer">
                                    Include Series Name in Filename
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Prefix filenames with series name (e.g. "Series - S01E01 - Title.strm")
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="default"
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={saveNfoSettings}
                            disabled={regexLoading}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Save Series Settings
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Cache Management */}
            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Cache Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-yellow-200 dark:border-yellow-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <Database className="w-5 h-5" />
                                Clear Movie Cache
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Force metadata refresh for all movies on next sync. Does not delete files.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950"
                                onClick={async () => {
                                    if (!confirm('Clear movie cache? Next sync will re-fetch metadata.')) return;
                                    setLoading(true);
                                    try {
                                        await api.post('/admin/clear-movie-cache');
                                        alert('Movie cache cleared successfully.');
                                    } catch (error) {
                                        console.error('Failed to clear movie cache', error);
                                        alert('Failed to clear movie cache.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                Clear Movie Cache
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-yellow-200 dark:border-yellow-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <Database className="w-5 h-5" />
                                Clear Series Cache
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Force metadata refresh for all series/episodes on next sync. Does not delete files.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950"
                                onClick={async () => {
                                    if (!confirm('Clear series cache? Next sync will re-fetch metadata.')) return;
                                    setLoading(true);
                                    try {
                                        await api.post('/admin/clear-series-cache');
                                        alert('Series cache cleared successfully.');
                                    } catch (error) {
                                        console.error('Failed to clear series cache', error);
                                        alert('Failed to clear series cache.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                Clear Series Cache
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
