'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { Project, UsageLog, UserRole, CloudinaryImage } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    ArrowLeft,
    Settings,
    Trash2,
    Play,
    History,
    Copy,
    Check,
    Cpu,
    RefreshCw,
    Zap,
    Activity,
    Image as ImageIcon,
    ExternalLink,
    Download,
    Info,
    Loader2,
    Users,
    UserPlus,
    UserMinus,
    Search,
    Calendar,
    ArrowUpDown,
    Star,
    StarOff,
    X,
    Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/AuthContext';

export default function ProjectDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [images, setImages] = useState<CloudinaryImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'featured' | 'logs'>('overview');
    const [origin, setOrigin] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [featuredImages, setFeaturedImages] = useState<CloudinaryImage[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(false);
    const [featuredCursor, setFeaturedCursor] = useState<string | null>(null);
    const [loadingMoreFeatured, setLoadingMoreFeatured] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        cloudinaryTag: ''
    });
    const [taggingId, setTaggingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [inspectImage, setInspectImage] = useState<CloudinaryImage | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [isLoading, setIsLoading] = useState(true);
    const [members, setMembers] = useState<any[]>([]);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeRange, setTimeRange] = useState<number | 'custom'>(7);
    const [customRange, setCustomRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (!user || !id) return;
        fetchProjectData();
    }, [id, user, timeRange, customRange.start, customRange.end, sortOrder]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        try {
            const { data: p, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!p) {
                router.push('/projects');
                return;
            }

            const mapped: Project = {
                id: p.id,
                name: p.name,
                description: p.description || '',
                totalUsage: p.total_usage || 0,
                createdAt: p.created_at,
                ownerId: p.created_by || ''
            };

            setProject(mapped);
            setEditForm({
                name: mapped.name,
                description: mapped.description,
                cloudinaryTag: ''
            });

            // Fetch Usage Logs based on timeRange
            let beginDate: Date;
            let finalDate: Date = new Date();

            if (timeRange === 'custom') {
                beginDate = new Date(customRange.start);
                finalDate = new Date(customRange.end);
                finalDate.setHours(23, 59, 59, 999);
            } else {
                beginDate = new Date();
                beginDate.setDate(beginDate.getDate() - (timeRange as number));
            }

            const { data: logsData } = await supabase
                .from('usage_logs')
                .select('*')
                .eq('project_id', id)
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

            fetchMembers();
            if (user.role === UserRole.ADMIN) {
                fetchAllProfiles();
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('project_members')
                .select('id, user_id, profiles(id, full_name, email, avatar_url, role)')
                .eq('project_id', id);

            if (error) throw error;
            setMembers((data || []).map((m: any) => ({
                memberId: m.id,
                ...m.profiles
            })));
        } catch (err) {
            console.error('Error fetching members:', err);
        }
    };

    const fetchAllProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setAllProfiles(data || []);
        } catch (err) {
            console.error('Error fetching profiles:', err);
        }
    };

    const handleAddMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('project_members')
                .insert([{ project_id: id, user_id: userId }]);

            if (error) throw error;
            fetchMembers();
        } catch (err: any) {
            alert(`Could not add member: ${err.message}`);
        }
    };

    const handleRemoveMember = async (memberTableId: string) => {
        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .eq('id', memberTableId);

            if (error) throw error;
            fetchMembers();
        } catch (err: any) {
            alert(`Could not remove member: ${err.message}`);
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

    const fetchFeaturedImages = async (targetProj?: Project, isNext = false) => {
        const p = targetProj || project;
        if (!p) return;

        if (isNext) {
            setLoadingMoreFeatured(true);
        } else {
            setLoadingFeatured(true);
            setFeaturedImages([]);
            setFeaturedCursor(null);
        }

        try {
            const queryParams = new URLSearchParams({
                tag: 'Featured',
                sort: sortOrder
            });

            const activeCursor = isNext ? featuredCursor : null;
            if (activeCursor) {
                queryParams.append('next_cursor', activeCursor);
            }

            const res = await fetch(`/api/cloudinary/images?${queryParams.toString()}`);
            const data = await res.json();

            if (res.ok) {
                const newImgs = data.resources || [];
                setFeaturedImages(prev => isNext ? [...prev, ...newImgs] : newImgs);
                setFeaturedCursor(data.next_cursor || null);
            } else {
                console.error('Cloudinary Featured API error:', data.error);
            }
        } catch (err) {
            console.error('Failed to fetch Cloudinary featured images:', err);
        } finally {
            setLoadingFeatured(false);
            setLoadingMoreFeatured(false);
        }
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    name: editForm.name,
                    description: editForm.description,
                    cloudinary_tag: editForm.cloudinaryTag
                })
                .eq('id', project.id);

            if (error) throw error;

            await fetchProjectData();
            setShowEditModal(false);
        } catch (err) {
            console.error('Update error:', err);
            alert('Failed to update project');
        }
    };

    const handleToggleTag = async (img: CloudinaryImage) => {
        if (!project || taggingId) return;

        const isFeatured = img.tags?.includes('Featured');
        const action = isFeatured ? 'remove' : 'add';
        const tag = 'Featured';

        setTaggingId(img.public_id);
        try {
            const response = await fetch('/api/cloudinary/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_id: img.public_id,
                    tag,
                    action
                })
            });

            if (response.ok) {
                setImages(prev => prev.map(i => {
                    if (i.public_id === img.public_id) {
                        const newTags = isFeatured
                            ? (i.tags || []).filter(t => t !== tag)
                            : [...(i.tags || []), tag];
                        return { ...i, tags: newTags };
                    }
                    return i;
                }));

                if (isFeatured) {
                    setFeaturedImages(prev => prev.filter(i => i.public_id !== img.public_id));
                } else {
                    setFeaturedImages(prev => [img, ...prev]);
                }
            } else {
                alert('Failed to update image tag');
            }
        } catch (err) {
            console.error('Error toggling tag:', err);
            alert('An error occurred while updating tag');
        } finally {
            setTaggingId(null);
        }
    };

    const handleDeleteProject = async () => {
        if (!project || isDeleting) return;
        if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', project.id);

            if (error) throw error;
            router.push('/projects');
        } catch (err: any) {
            console.error('Delete project error:', err);
            alert(`Failed to delete project: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSimulateApiCall = async () => {
        if (!project || isSimulating) return;
        setIsSimulating(true);

        try {
            const amount = 1;

            // 1. Create a log entry in usage_logs
            const { error: logError } = await supabase
                .from('usage_logs')
                .insert([{ project_id: project.id, amount }]);

            if (logError) throw logError;

            // 2. Increment project total_usage
            const { error: updateError } = await supabase.rpc('increment_project_usage', {
                p_id: project.id,
                p_amount: amount
            });

            if (updateError) throw updateError;

            // Refresh UI and logs
            await fetchProjectData();

        } catch (err) {
            console.error('Simulation error:', err);
            alert('Simulation failed. Did you execute the increment_project_usage database RPC?');
        } finally {
            setIsSimulating(false);
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;

        const currentImages = activeTab === 'featured' ? featuredImages : images;
        const selectedImages = currentImages.filter(img => selectedIds.includes(img.public_id));

        for (const img of selectedImages) {
            const dateStr = new Date(img.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/,/g, '').replace(/ /g, '_');

            const filename = `${project?.name.replace(/ /g, '_')}_${dateStr}.${img.format}`;
            const downloadUrl = img.secure_url || img.url || '';
            
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
        if (!project || deletingId || user?.role !== UserRole.ADMIN) return;
        if (!confirm('Are you sure you want to delete this image from Cloudinary? This action cannot be undone.')) return;

        setDeletingId(img.public_id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-supabase-auth': session?.access_token || ''
                },
                body: JSON.stringify({
                    public_id: img.public_id
                })
            });

            const data = await res.json();
            if (res.ok) {
                setImages(prev => prev.filter(i => i.public_id !== img.public_id));
                setFeaturedImages(prev => prev.filter(i => i.public_id !== img.public_id));
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
        if (!project || selectedIds.length === 0 || isBulkDeleting || user?.role !== UserRole.ADMIN) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected image(s) from Cloudinary? This action cannot be undone.`)) return;

        setIsBulkDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-supabase-auth': session?.access_token || ''
                },
                body: JSON.stringify({
                    public_ids: selectedIds
                })
            });

            const data = await res.json();
            if (res.ok) {
                const deletedSet = new Set(selectedIds);
                setImages(prev => prev.filter(i => !deletedSet.has(i.public_id)));
                setFeaturedImages(prev => prev.filter(i => !deletedSet.has(i.public_id)));
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
        const currentImages = activeTab === 'featured' ? featuredImages : images;
        if (selectedIds.length === currentImages.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentImages.map(img => img.public_id));
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

    if (isLoading || !project || !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="text-slate-500 font-medium tracking-wide">Fetching project details...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/projects')}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
                            <p className="text-slate-500 text-sm flex items-center gap-2">
                                ID: {project.id} • <span className="text-indigo-600 font-medium">Photobooth Instance</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#d0deea] shadow-xs">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-[#002d42] text-[#d4af37] shadow-md' : 'text-slate-600 hover:text-[#002d42]'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('images')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'images' ? 'bg-[#002d42] text-[#d4af37] shadow-md' : 'text-slate-600 hover:text-[#002d42]'}`}
                        >
                            Generated Images
                        </button>
                        {user.role === UserRole.ADMIN && (
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-[#002d42] text-[#d4af37] shadow-md' : 'text-slate-600 hover:text-[#002d42]'}`}
                            >
                                API Logs
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className={`grid grid-cols-1 ${user.role === UserRole.ADMIN ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'} gap-8`}>
                        <div className={user.role === UserRole.ADMIN ? 'lg:col-span-2 space-y-8' : 'space-y-8'}>
                            {/* Total Usage Stat Card */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
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
                                <p className="text-xs text-slate-400 mt-4">Continuous generation enabled with no usage cap</p>
                            </div>

                            {/* Generations Analytics Chart */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
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
                                                    <stop offset="5%" stopColor="#005d87" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#005d87" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #d0deea', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)' }}
                                            />
                                            <Area type="monotone" dataKey="count" stroke="#004869" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: Settings */}
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Settings size={18} className="text-slate-400" />
                                        Project Settings
                                    </h3>
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="text-xs font-bold text-[#002d42] hover:text-[#004869] bg-[#d0deea]/30 px-3 py-1 rounded-lg transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Global System Settings</p>
                                            <p className="text-xs font-medium text-slate-700">Cloudinary & System Config</p>
                                        </div>
                                        <button
                                            onClick={() => router.push('/settings')}
                                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                            Settings
                                            <ExternalLink size={12} />
                                        </button>
                                    </div>
                                    <div className="p-4 bg-[#002d42]/5 rounded-xl border border-[#002d42]/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-[#002d42] uppercase mb-1 flex items-center gap-1.5">
                                                <Clock size={14} />
                                                Storage Cleanup Scheduler
                                            </p>
                                            <p className="text-xs text-slate-500">Automated Image Cleanup</p>
                                        </div>
                                        <button
                                            onClick={() => router.push('/cron-jobs')}
                                            className="px-3 py-1.5 bg-[#002d42] hover:bg-[#003854] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                        >
                                            Manage
                                            <ExternalLink size={12} />
                                        </button>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <button
                                            onClick={handleDeleteProject}
                                            disabled={isDeleting}
                                            className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium disabled:opacity-50"
                                        >
                                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            {isDeleting ? 'Deleting...' : 'Delete Project'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generated Images Tab */}
                {activeTab === 'images' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <ImageIcon className="text-[#002d42]" />
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
                                    title={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
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
                            <div className="flex items-center justify-between mb-6 p-4 bg-[#002d42]/5 rounded-2xl border border-[#002d42]/10 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-sm font-bold text-[#002d42] hover:text-[#004869] flex items-center gap-2"
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.length === images.length ? 'bg-[#002d42] border-[#002d42] text-white' : 'bg-white border-[#002d42]/30'}`}>
                                            {selectedIds.length === images.length && <Check size={14} />}
                                        </div>
                                        {selectedIds.length === images.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-sm text-[#002d42]/40">|</span>
                                    <span className="text-sm font-medium text-[#002d42]">{selectedIds.length} images selected</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleBulkDownload}
                                        disabled={selectedIds.length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-[#002d42] text-white rounded-xl text-sm font-bold hover:bg-[#003854] transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
                                    >
                                        <Download size={18} />
                                        Download Selected
                                    </button>
                                    {user?.role === UserRole.ADMIN && (
                                        <button
                                            onClick={handleBulkDelete}
                                            disabled={selectedIds.length === 0 || isBulkDeleting}
                                            className="flex items-center gap-2 px-6 py-2 bg-[#d9381e] text-white rounded-xl text-sm font-bold hover:bg-[#b82b14] transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {isBulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                                        </button>
                                    )}
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
                                                                handleToggleTag(img);
                                                            }}
                                                            disabled={taggingId === img.public_id}
                                                            className={`p-1.5 rounded-lg transition-colors ${img.tags?.includes('Featured') ? 'bg-amber-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                                                            title={img.tags?.includes('Featured') ? 'Remove from Featured' : 'Tag as Featured'}
                                                        >
                                                            {taggingId === img.public_id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : img.tags?.includes('Featured') ? (
                                                                <Star size={14} fill="currentColor" />
                                                            ) : (
                                                                <StarOff size={14} />
                                                            )}
                                                        </button>
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
                                                        {user?.role === UserRole.ADMIN && (
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
                                                        )}
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

                {/* Featured Photos Tab */}
                {activeTab === 'featured' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Zap className="text-amber-500" />
                                    Featured Photos
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">High-quality photos tagged for Featured</p>
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
                                    onClick={() => fetchFeaturedImages()}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-bold transition-all"
                                >
                                    <RefreshCw size={16} className={loadingFeatured ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {loadingFeatured ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <div key={n} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : (featuredImages.length > 0 || featuredCursor) ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {featuredImages.map(img => (
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
                                                                handleToggleTag(img);
                                                            }}
                                                            disabled={taggingId === img.public_id}
                                                            className="p-1.5 bg-amber-500/80 backdrop-blur-md rounded-lg text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                                                            title="Remove from Featured"
                                                        >
                                                            {taggingId === img.public_id ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} fill="currentColor" />}
                                                        </button>
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
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                    <Zap size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">No Featured Photos</h4>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Photos tagged with <span className="font-bold">"Featured"</span> will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* API Access Logs Tab */}
                {user.role === UserRole.ADMIN && activeTab === 'logs' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
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
            </div>

            {/* Edit Project Modal */}
            {mounted && showEditModal && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="bg-white w-full max-w-xl rounded-2xl p-8 animate-in zoom-in-95 duration-200 my-8 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Edit Project</h2>
                        <form onSubmit={handleUpdateProject} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Basic Information</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gallery Configuration</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Asset Tag/Folder</label>
                                        <input
                                            type="text"
                                            value={editForm.cloudinaryTag}
                                            onChange={e => setEditForm({ ...editForm, cloudinaryTag: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
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
        </>
    );
}
