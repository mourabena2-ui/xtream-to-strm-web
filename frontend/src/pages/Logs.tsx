import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2, Download } from 'lucide-react';

export default function Logs() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const pausedLogsRef = useRef<string[]>([]);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!isPaused) {
            scrollToBottom();
        }
    }, [logs, isPaused]);

    useEffect(() => {
        connectToLogs();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const connectToLogs = () => {
        const token = localStorage.getItem('token');
        const es = new EventSource(`/api/v1/logs/stream?token=${token}`);

        es.onopen = () => {
            setIsConnected(true);
            console.log('Connected to logs stream');
        };

        es.onmessage = (event) => {
            if (isPaused) {
                pausedLogsRef.current.push(event.data);
            } else {
                setLogs(prev => [...prev.slice(-500), event.data]); // Keep last 500 lines
            }
        };

        es.onerror = () => {
            setIsConnected(false);
            console.error('Lost connection to logs stream');
            es.close();
            // Reconnect after 5 seconds
            setTimeout(connectToLogs, 5000);
        };

        eventSourceRef.current = es;
    };

    const handlePauseToggle = () => {
        if (isPaused) {
            // Resume: add paused logs
            setLogs(prev => [...prev, ...pausedLogsRef.current]);
            pausedLogsRef.current = [];
        }
        setIsPaused(!isPaused);
    };

    const handleClear = () => {
        setLogs([]);
        pausedLogsRef.current = [];
    };

    const handleDownload = () => {
        const text = logs.join('');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xtream_logs_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Logs</h2>
                <p className="text-muted-foreground">Real-time application logs</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <span>Live Logs</span>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handlePauseToggle}>
                            {isPaused ? (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Resume
                                </>
                            ) : (
                                <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                </>
                            )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleClear}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleDownload} disabled={logs.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-[600px] overflow-auto">
                        {logs.length === 0 ? (
                            <div className="text-gray-500">Waiting for logs...</div>
                        ) : (
                            <>
                                {logs.map((log, index) => (
                                    <div key={index} className="whitespace-pre-wrap break-words">
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </>
                        )}
                    </div>
                    {isPaused && pausedLogsRef.current.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                            {pausedLogsRef.current.length} new log(s) paused
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
