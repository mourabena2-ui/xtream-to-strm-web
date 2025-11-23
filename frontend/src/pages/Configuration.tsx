import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from 'lucide-react';
import api from '@/lib/api';

interface Config {
    XC_URL: string;
    XC_USER: string;
    XC_PASS: string;
    OUTPUT_DIR: string;
    MOVIES_DIR: string;
    SERIES_DIR: string;
}

export default function Configuration() {
    const [config, setConfig] = useState<Config>({
        XC_URL: '',
        XC_USER: '',
        XC_PASS: '',
        OUTPUT_DIR: '/output',
        MOVIES_DIR: '/output/movies',
        SERIES_DIR: '/output/series'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get<Config>('/config/');
                // Merge with defaults if some fields are missing
                setConfig(prev => ({ ...prev, ...res.data }));
            } catch (error) {
                console.error("Failed to fetch config", error);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await api.post('/config/', config);
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
                <p className="text-muted-foreground">Manage your Xtream Codes credentials and settings.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Xtream Codes Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Xtream URL
                            </label>
                            <Input
                                name="XC_URL"
                                value={config.XC_URL || ''}
                                onChange={handleChange}
                                placeholder="http://example.com:8080"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Username
                                </label>
                                <Input
                                    name="XC_USER"
                                    value={config.XC_USER || ''}
                                    onChange={handleChange}
                                    placeholder="username"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Password
                                </label>
                                <Input
                                    name="XC_PASS"
                                    type="password"
                                    value={config.XC_PASS || ''}
                                    onChange={handleChange}
                                    placeholder="password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Output Directory (Legacy - for backward compatibility)
                            </label>
                            <Input
                                name="OUTPUT_DIR"
                                value={config.OUTPUT_DIR || '/output'}
                                onChange={handleChange}
                                placeholder="/output"
                            />
                            <p className="text-xs text-muted-foreground">
                                This is the base output directory. Use the fields below for separate movie/series directories.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Movies Directory
                                </label>
                                <Input
                                    name="MOVIES_DIR"
                                    value={config.MOVIES_DIR || '/output/movies'}
                                    onChange={handleChange}
                                    placeholder="/output/movies"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Series Directory
                                </label>
                                <Input
                                    name="SERIES_DIR"
                                    value={config.SERIES_DIR || '/output/series'}
                                    onChange={handleChange}
                                    placeholder="/output/series"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message.text}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full">
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
