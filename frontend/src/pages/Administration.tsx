import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Database } from 'lucide-react';
import api from '@/lib/api';

export default function Administration() {
    const [loading, setLoading] = useState(false);

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
        </div>
    );
}
