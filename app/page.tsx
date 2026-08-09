'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Project, UsageLog, UserRole, CloudinaryImage } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    Play,
    History,
    Copy,
    Check,
    Cpu,
    RefreshCw,
    Zap,
    Activity,
    Image as ImageIcon,
    Download,
    Info,
    Trash2,
    Loader2,
    Calendar,
    ArrowUpDown,
    X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [images, setImages] = useState<CloudinaryImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'logs'>('overview');
    const [origin, setOrigin] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [inspectImage, setInspectImage] = useState<CloudinaryImage | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<number | 'custom'>(7);
    const [customRange, setCustomRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchProjectData();
        }
    }, [user, timeRange, customRange.start, customRange.end, sortOrder]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        try {
            const { data: projectsData, error } = await supabase
                .from('projects')
                .select('*')
                .limit(1);

            if (error) throw error;

            let p: any = null;
            if (projectsData && projectsData.length > 0) {
                p = projectsData[0];
            }

            if (p) {
                const mapped: Project = {
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    totalUsage: p.total_usage || 0,
                    createdAt: p.created_at,
                    ownerId: p.created_by || ''
                };

                setProject(mapped);

                // Fetch Usage Logs
                let beginDate: Date;
                let finalDate: Date = new Date();

                if (timeRange === 'custom') {
                    beginDate = new Date(customRange.start);
                    finalDate = new Date(customRange.end);
                    finalDate.setHours(23, 59, 59, 999);
                } else {
                    beginDate = new Date();
                    beginDate.setDate(beginDate.getDate() - timeRange);
                }

                const { data: logsData } = await supabase
                    .from('usage_logs')
                    .select('*')
                    .eq('project_id', p.id)
                    .gte('timestamp', beginDate.toISOString())
                    .lte('timestamp', finalDate.toISOString())
                    .order('timestamp', { ascending: false });

                setLogs((logsData || []).map(l => ({
                    id: l.id,
                    projectId: l.project_id,
                    timestamp: l.timestamp,
                    amount: l.amount
                })));

                fetchImages('', mapped, false);
            } else {
                // Fallback project object
                const fallback: Project = {
                    id: 'cairo-airport-photobooth',
                    name: 'Cairo Airport AI Photobooth',
                    description: 'Main AI Photobooth instance at Cairo International Airport',
                    createdAt: new Date().toISOString(),
                    ownerId: '',
                    totalUsage: 0
                };
                setProject(fallback);
                fetchImages('', fallback, false);
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchImages = async (tag?: string, targetProj?: Project, isNext = false) => {
        if (isNext) {
            setLoadingMore(true);
        } else {
            setLoadingImages(true);
            setImages([]);
            setNextCursor(null);
        }

        try {
            const queryParams = new URLSearchParams({
                sort: sortOrder
            });

            if (tag) {
                queryParams.append('tag', tag);
            }

            const activeCursor = isNext ? nextCursor : null;
            if (activeCursor) {
                queryParams.append('next_cursor', activeCursor);
            }

            const res = await fetch(`/api/cloudinary/images?${queryParams.toString()}`);
            const data = await res.json();

            if (res.ok) {
                const newImgs = data.resources || [];
                setImages(prev => isNext ? [...prev, ...newImgs] : newImgs);
                setNextCursor(data.next_cursor || null);
            } else {
                console.error('Cloudinary API error:', data.error);
            }
        } catch (err) {
            console.error('Failed to fetch Cloudinary images:', err);
        } finally {
            setLoadingImages(false);
            setLoadingMore(false);
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;

        const selectedImages = images.filter(img => selectedIds.includes(img.public_id));

        for (const img of selectedImages) {
            const dateStr = new Date(img.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/,/g, '').replace(/ /g, '_');

            const filename = `${project?.name.replace(/ /g, '_')}_${dateStr}.${img.format}`;
            const downloadUrl = `https://res.cloudinary.com/cairo-airport-photobooth/image/upload/fl_attachment/v${img.version}/${img.public_id}.${img.format}`;

            triggerDownload(downloadUrl, filename);
            await new Promise(r => setTimeout(r, 400));
        }
    };

    const triggerDownload = async (url: string, filename: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url + (url.includes('?') ? '&' : '?') + 'fl_attachment', '_blank');
        }
    };

    const handleDeleteImage = async (img: CloudinaryImage) => {
        if (!project || deletingId) return;
        if (!confirm('Are you sure you want to delete this image from Cloudinary? This action cannot be undone.')) return;

        setDeletingId(img.public_id);
        try {
            const res = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_id: img.public_id
                })
            });

            const data = await res.json();
            if (res.ok) {
                setImages(prev => prev.filter(i => i.public_id !== img.public_id));
                setSelectedIds(prev => prev.filter(id => id !== img.public_id));
            } else {
                alert(data.error || 'Failed to delete image');
            }
        } catch (err) {
            console.error('Error deleting image:', err);
            alert('An error occurred while deleting image');
        } finally {
            setDeletingId(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!project || selectedIds.length === 0 || isBulkDeleting) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected image(s) from Cloudinary? This action cannot be undone.`)) return;

        setIsBulkDeleting(true);
        try {
            const res = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_ids: selectedIds
                })
            });

            const data = await res.json();
            if (res.ok) {
                const deletedSet = new Set(selectedIds);
                setImages(prev => prev.filter(i => !deletedSet.has(i.public_id)));
                setSelectedIds([]);
            } else {
                alert(data.error || 'Failed to delete selected images');
            }
        } catch (err) {
            console.error('Error deleting selected images:', err);
            alert('An error occurred while deleting selected images');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const toggleImageSelection = (publicId: string) => {
        setSelectedIds(prev =>
            prev.includes(publicId)
                ? prev.filter(id => id !== publicId)
                : [...prev, publicId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === images.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(images.map(img => img.public_id));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const chartData = useMemo(() => {
        const lastDays: { name: string; dateStr: string; count: number }[] = [];

        let start: Date;
        let end: Date = new Date();
        let daysCount: number;

        if (timeRange === 'custom') {
            start = new Date(customRange.start);
            end = new Date(customRange.end);
            daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else {
            daysCount = timeRange as number;
            start = new Date();
            start.setDate(start.getDate() - (daysCount - 1));
        }

        for (let i = 0; i < daysCount; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];

            let label = d.toLocaleDateString(undefined, { weekday: 'short' });
            if (daysCount > 14) {
                label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }

            lastDays.push({
                name: label,
                dateStr: dateStr,
                count: 0
            });
        }

        logs.forEach(log => {
            const logDate = log.timestamp.split('T')[0];
            const dayEntry = lastDays.find(d => d.dateStr === logDate);
            if (dayEntry) {
                dayEntry.count += log.amount;
            }
        });

        return lastDays;
    }, [logs, timeRange, customRange]);

    const processedDetails = useMemo(() => {
        if (!inspectImage) return [];
        const ctx = inspectImage.context || {};
        const meta = inspectImage.metadata || {};

        const displayItems: { label: string; value: string }[] = [];

        const promptKeys = Object.keys(ctx).filter(k => k.startsWith('prompt_'));
        if (promptKeys.length > 0) {
            const sortedPromptKeys = promptKeys.sort((a, b) => {
                const numA = parseInt(a.replace('prompt_', '')) || 0;
                const numB = parseInt(b.replace('prompt_', '')) || 0;
                return numA - numB;
            });
            const fullPrompt = sortedPromptKeys.map(k => ctx[k]).join('');
            displayItems.push({ label: 'Full Generation Prompt', value: fullPrompt });
        }

        Object.entries(ctx).forEach(([key, value]) => {
            if (!key.startsWith('prompt_')) {
                displayItems.push({ label: key.replace(/_/g, ' '), value });
            }
        });

        Object.entries(meta).forEach(([key, value]) => {
            displayItems.push({ label: key.replace(/_/g, ' '), value });
        });

        return displayItems;
    }, [inspectImage]);

    if (!user) return null;

    if (isLoading || !project) {
        return (
            <div className="min-h-[500px] bg-slate-50 flex items-center justify-center rounded-3xl">
                <div className="flex flex-col items-center gap-4">
                    <Zap className="animate-pulse text-indigo-600" size={48} fill="currentColor" />
                    <p className="text-slate-500 font-medium animate-pulse">Loading Console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10 text-indigo-400 pointer-events-none">
                    <Zap size={240} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/30">
                            <Zap size={14} fill="currentColor" />
                            Cairo International Airport
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{project.name}</h1>
                        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xl leading-relaxed">{project.description}</p>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3">
                        <p className="text-xs text-slate-400 font-mono">
                            Status: <span className="text-indigo-300 font-bold">Active Instance</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'overview'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Overview & Analytics
                </button>
                <button
                    onClick={() => setActiveTab('images')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'images'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Generated Images
                </button>
                {user.role === UserRole.ADMIN && (
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'logs'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        API Logs
                    </button>
                )}
            </div>

            {/* Overview & Analytics Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Total Usage Stat Card */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Zap size={120} />
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Generations</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-slate-800">{(project.totalUsage || 0).toLocaleString()}</span>
                                    <span className="text-slate-400 font-medium">total images generated</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">Continuous active operation</p>
                    </div>

                    {/* Generations Analytics Chart */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Generations Activity</h3>
                            <div className="flex flex-wrap items-center gap-3">
                                {timeRange === 'custom' && (
                                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <input
                                            type="date"
                                            value={customRange.start}
                                            onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="bg-transparent text-[10px] font-bold text-slate-600 outline-none px-2"
                                        />
                                        <span className="text-slate-300">-</span>
                                        <input
                                            type="date"
                                            value={customRange.end}
                                            onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="bg-transparent text-[10px] font-bold text-slate-600 outline-none px-2"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    {[7, 30, 90].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range as number)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {range === 7 ? '7D' : range === 30 ? '30D' : '90D'}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setTimeRange('custom')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Custom
                                    </button>
                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                    <div className="flex items-center gap-1 px-2 text-slate-400">
                                        <Calendar size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Images Tab */}
            {activeTab === 'images' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm min-h-[500px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon className="text-indigo-500" />
                                Gallery
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-bold transition-all"
                            >
                                <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                            </button>
                            <button
                                onClick={() => fetchImages()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-bold transition-all"
                            >
                                <RefreshCw size={16} className={loadingImages ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {selectedIds.length > 0 && images.length > 0 && (
                        <div className="flex items-center justify-between mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.length === images.length ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-300'}`}>
                                        {selectedIds.length === images.length && <Check size={14} />}
                                    </div>
                                    {selectedIds.length === images.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-sm text-indigo-400">|</span>
                                <span className="text-sm font-medium text-indigo-600">{selectedIds.length} images selected</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkDownload}
                                    disabled={selectedIds.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Download size={18} />
                                    Download Selected
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedIds.length === 0 || isBulkDeleting}
                                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isBulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                                </button>
                            </div>
                        </div>
                    )}

                    {loadingImages ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                <div key={n} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : images.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {images.map(img => (
                                    <div
                                        key={img.public_id}
                                        onClick={() => toggleImageSelection(img.public_id)}
                                        className={`group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${selectedIds.includes(img.public_id) ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-indigo-200'}`}
                                    >
                                        <img
                                            src={img.secure_url || img.url || ''}
                                            alt={img.public_id}
                                            className={`w-full h-full object-cover transition-transform duration-500 ${selectedIds.includes(img.public_id) ? 'scale-95 opacity-90' : 'group-hover:scale-110'}`}
                                        />

                                        <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(img.public_id) ? 'bg-indigo-600 border-indigo-600 text-white active:scale-90' : 'bg-black/20 backdrop-blur-md border-white/50 opacity-0 group-hover:opacity-100'}`}>
                                            {selectedIds.includes(img.public_id) && <Check size={16} />}
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                            <p className="text-white text-[10px] font-bold truncate">
                                                {project.name} - {new Date(img.created_at).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                                                <span className="text-[10px] text-slate-300 uppercase tracking-widest">{img.format} • {img.width}x{img.height}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const downloadUrl = img.secure_url || img.url || '';
                                                            triggerDownload(downloadUrl, `${project?.name}_${img.public_id}.${img.format}`);
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="Download Image"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInspectImage(img);
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteImage(img);
                                                        }}
                                                        disabled={deletingId === img.public_id}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                                        title="Delete Image"
                                                    >
                                                        {deletingId === img.public_id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {images.length === 0 && nextCursor && (
                                <div className="flex flex-col items-center justify-center py-20 text-center w-full">
                                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                                    <p className="text-slate-500 font-medium">Fetching more photos...</p>
                                </div>
                            )}

                            {nextCursor && (
                                <div className="mt-12 flex justify-center">
                                    <button
                                        onClick={() => fetchImages(undefined, undefined, true)}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        {loadingMore ? <RefreshCw className="animate-spin" size={18} /> : null}
                                        {loadingMore ? 'Loading More...' : 'Load More Images'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                <ImageIcon size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">No Images Found</h4>
                            <p className="text-slate-500 max-w-sm mt-2">
                                We couldn't find any images in Cloudinary. Make sure your photobooth is uploading assets to Cloudinary.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* API Access Logs Tab */}
            {user.role === UserRole.ADMIN && activeTab === 'logs' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <History className="text-indigo-500" />
                            API Access & Usage Logs
                        </h3>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                            Real-time feed
                        </span>
                    </div>
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                                        <Zap size={18} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Image Generation Event (+{log.amount})</p>
                                        <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()} • Successful API Call</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                        HTTP 200 OK
                                    </span>
                                    <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                                    <span className="text-[10px] text-slate-400 font-mono hidden md:block">
                                        ref: {log.id.split('-')[1] || log.id}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <Activity size={48} className="opacity-20 mb-4" />
                                <p className="font-medium">No generation logs recorded yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Inspect Image Modal */}
            {mounted && inspectImage && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex justify-center items-center py-8 md:py-20 px-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto"
                    onClick={() => setInspectImage(null)}
                >
                    <div
                        className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col md:flex-row max-h-[85vh]">
                            <div className="w-full md:w-3/5 bg-slate-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 min-h-[300px] md:min-h-0">
                                <img
                                    src={inspectImage.secure_url || inspectImage.url || ''}
                                    alt={inspectImage.public_id}
                                    className="w-full h-full object-contain max-h-[40vh] md:max-h-full"
                                />
                            </div>
                            <div className="w-full md:w-2/5 p-8 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <h2 className="text-xl font-bold text-slate-800">Image Details</h2>
                                    <button
                                        onClick={() => setInspectImage(null)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created At</label>
                                        <p className="text-sm font-medium text-slate-700">
                                            {new Date(inspectImage.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dimensions</label>
                                        <p className="text-sm font-medium text-slate-700">
                                            {inspectImage.width} x {inspectImage.height} ({inspectImage.format.toUpperCase()})
                                        </p>
                                    </div>

                                    {processedDetails.length > 0 ? (
                                        <div className="space-y-4">
                                            {processedDetails.map((item, idx) => (
                                                <div key={idx}>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</label>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                        "{item.value}"
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Generation Context</label>
                                            <p className="text-sm text-slate-400 italic">No prompt or context data available for this image.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 mt-6 border-t border-slate-100 shrink-0">
                                    <button
                                        onClick={() => setInspectImage(null)}
                                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-[0.98]"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
