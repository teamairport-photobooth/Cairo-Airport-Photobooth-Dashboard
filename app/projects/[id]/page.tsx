
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
    Clock,
    Star,
    StarOff,
    X
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
        dailyLimit: 0,
        cloudinaryTag: ''
    });
    const [taggingId, setTaggingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [inspectImage, setInspectImage] = useState<CloudinaryImage | null>(null);
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

            // Fallback for Cloudinary settings
            let finalCloudName = p.cloudinary_cloud_name;
            let finalApiKey = p.cloudinary_api_key;
            let finalApiSecret = p.cloudinary_api_secret;

            if (!finalCloudName) {
                const { data: globalSettings } = await supabase
                    .from('global_settings')
                    .select('*')
                    .eq('id', 'current')
                    .single();

                if (globalSettings) {
                    finalCloudName = globalSettings.cloudinary_cloud_name;
                    finalApiKey = globalSettings.cloudinary_api_key;
                    finalApiSecret = globalSettings.cloudinary_api_secret;
                }
            }

            const mapped: Project = {
                id: p.id,
                name: p.name,
                description: p.description || '',
                dailyLimit: p.max_usage || 0,
                currentGenerations: p.total_usage || 0,
                createdAt: p.created_at,
                ownerId: p.created_by || '',
                status: p.is_active ? ((p.total_usage || 0) >= (p.max_usage || 0) ? 'exhausted' : 'active') : 'paused',
                cloudinaryCloudName: finalCloudName,
                cloudinaryTag: p.cloudinary_tag,
                cloudinaryApiKey: finalApiKey,
                cloudinaryApiSecret: finalApiSecret
            };

            setProject(mapped);
            setEditForm({
                name: mapped.name,
                description: mapped.description,
                dailyLimit: mapped.dailyLimit,
                cloudinaryTag: mapped.cloudinaryTag || ''
            });

            // Fetch Logs based on timeRange
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

            if (mapped.cloudinaryTag) {
                fetchImages(mapped.cloudinaryTag, mapped, false);
                fetchFeaturedImages(mapped, false);
            }

            // Fetch Members
            const { data: memberData, error: mError } = await supabase
                .from('project_members')
                .select('id, profiles(id, full_name, email, avatar_url, role)')
                .eq('project_id', id);


            setMembers((memberData || []).map((m: any) => ({
                memberId: m.id,
                ...(Array.isArray(m.profiles) ? m.profiles[0] : m.profiles || {})
            })));

            // Fetch All Profiles (for adding)
            if (user?.role === UserRole.ADMIN) {
                const { data: profileData, error: pError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, role');
                setAllProfiles(profileData || []);
            }

        } catch (err) {
            console.error('Error fetching project:', err);
            router.push('/projects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('project_members')
                .insert([{ project_id: id, user_id: userId }]);

            if (error) throw error;
            fetchProjectData();
        } catch (err) {
            console.error('Error adding member:', err);
            alert('User might already be a member of this project.');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
            fetchProjectData();
        } catch (err) {
            console.error('Error removing member:', err);
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${project.name}"?\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', project.id);

            if (error) throw error;

            router.push('/projects');
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete project. Please try again.');
            setIsDeleting(false);
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
                    max_usage: editForm.dailyLimit,
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
                    action,
                    cloudName: project.cloudinaryCloudName,
                    apiKey: project.cloudinaryApiKey,
                    apiSecret: project.cloudinaryApiSecret
                })
            });

            if (response.ok) {
                // Update local state for 'images'
                setImages(prev => prev.map(i => {
                    if (i.public_id === img.public_id) {
                        const newTags = isFeatured
                            ? (i.tags || []).filter(t => t !== tag)
                            : [...(i.tags || []), tag];
                        return { ...i, tags: newTags };
                    }
                    return i;
                }));

                // Update featuredImages if needed
                if (isFeatured) {
                    setFeaturedImages(prev => {
                        const remaining = prev.filter(i => i.public_id !== img.public_id);
                        // If we just emptied the list but there's more on the server, auto-fetch
                        if (remaining.length === 0 && featuredCursor) {
                            fetchFeaturedImages(undefined, true);
                        }
                        return remaining;
                    });
                } else {
                    const updatedImg = { ...img, tags: [...(img.tags || []), tag] };
                    setFeaturedImages(prev => {
                        if (prev.some(i => i.public_id === img.public_id)) return prev;
                        return [updatedImg, ...prev];
                    });
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to update tag: ${errorData.error}`);
            }
        } catch (err) {
            console.error('Error toggling tag:', err);
        } finally {
            setTaggingId(null);
        }
    };

    const fetchImages = async (tag?: string, currentProject?: Project, append = false) => {
        const p = currentProject || project;
        if (!p) return;

        const activeTag = tag || p.cloudinaryTag || '';
        if (!activeTag) return;

        if (append) setLoadingMore(true);
        else setLoadingImages(true);

        try {
            // Simplified URL: The server-side API now fetches secrets from Supabase global_settings
            let url = `/api/cloudinary/images?tag=${encodeURIComponent(activeTag)}&sort=${sortOrder}`;
            if (p.cloudinaryCloudName) {
                url += `&cloudName=${encodeURIComponent(p.cloudinaryCloudName)}`;
            }
            if (append && nextCursor) {
                url += `&next_cursor=${nextCursor}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (append) {
                    setImages(prev => {
                        const existingIds = new Set(prev.map(i => i.public_id));
                        const newResources = (data.resources || []).filter((r: any) => !existingIds.has(r.public_id));
                        return [...prev, ...newResources];
                    });
                } else {
                    setImages(data.resources || []);
                }
                setNextCursor(data.next_cursor || null);
            } else {
                if (!append) setImages([]);
            }
        } catch (err) {
            console.error('Error fetching Cloudinary images:', err);
        } finally {
            setLoadingImages(false);
            setLoadingMore(false);
        }
    };

    const fetchFeaturedImages = async (currentProject?: Project, append = false) => {
        const p = currentProject || project;
        if (!p) return;

        const projectTag = p.cloudinaryTag || '';
        if (!projectTag) return;

        const activeTag = 'Featured';

        if (append) setLoadingMoreFeatured(true);
        else setLoadingFeatured(true);

        try {
            let url = `/api/cloudinary/images?tag=${encodeURIComponent(projectTag)}&subtag=${encodeURIComponent(activeTag)}&sort=${sortOrder}`;
            if (p.cloudinaryCloudName) {
                url += `&cloudName=${encodeURIComponent(p.cloudinaryCloudName)}`;
            }
            if (append && featuredCursor) {
                url += `&next_cursor=${featuredCursor}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (append) {
                    setFeaturedImages(prev => {
                        const existingIds = new Set(prev.map(i => i.public_id));
                        const newResources = (data.resources || []).filter((r: any) => !existingIds.has(r.public_id));
                        return [...prev, ...newResources];
                    });
                } else {
                    setFeaturedImages(data.resources || []);
                }
                setFeaturedCursor(data.next_cursor || null);
            } else {
                if (!append) setFeaturedImages([]);
            }
        } catch (err) {
            console.error('Error fetching Featured images:', err);
        } finally {
            setLoadingFeatured(false);
            setLoadingMoreFeatured(false);
        }
    };

    const handleSimulateApiCall = async () => {
        if (!project || isSimulating) return;
        setIsSimulating(true);

        try {
            const amount = 1;

            // 1. Create a log entry
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

            // Refresh UI
            await fetchProjectData();

        } catch (err) {
            console.error('Simulation error:', err);
            alert('Simulation failed. Did you create the increment_project_usage function?');
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
            }).replace(/[,:]/g, '').replace(/\s+/g, '_');
            const fileName = `${project?.name}_${dateStr}.${img.format}`;
            const url = `https://res.cloudinary.com/${project?.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`;

            await handleDownload(url, fileName);
            // Small delay to prevent browser blocking multiple downloads
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    };

    const toggleSelectAll = () => {
        const currentImages = activeTab === 'featured' ? featuredImages : images;
        if (selectedIds.length === currentImages.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentImages.map(img => img.public_id));
        }
    };

    const toggleImageSelection = (publicId: string) => {
        setSelectedIds(prev =>
            prev.includes(publicId)
                ? prev.filter(id => id !== publicId)
                : [...prev, publicId]
        );
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab with attachment flag if possible
            window.open(url + (url.includes('?') ? '&' : '?') + 'fl_attachment', '_blank');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const chartData = useMemo(() => {
        const lastDays = [];

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

        // Merge prompt_1, prompt_2, prompt_11, etc.
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

        // Add other context fields (excluding the merged prompts)
        Object.entries(ctx).forEach(([key, value]) => {
            if (!key.startsWith('prompt_')) {
                displayItems.push({ label: key.replace(/_/g, ' '), value });
            }
        });

        // Add metadata fields (from structured metadata if any)
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

    const usagePercent = (project.currentGenerations / project.dailyLimit) * 100;

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
                                ID: {project.id} • <span className="text-indigo-600 font-medium">#{project.cloudinaryTag || 'No Tag'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('images')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'images' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Generated Images
                        </button>
                        <button
                            onClick={() => setActiveTab('featured')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'featured' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Featured
                        </button>
                        {user.role === UserRole.ADMIN && (
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                API Logs
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className={`grid grid-cols-1 ${user.role === UserRole.ADMIN ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'} gap-8`}>
                        <div className={user.role === UserRole.ADMIN ? 'lg:col-span-2 space-y-8' : 'space-y-8'}>
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Zap size={120} />
                                </div>
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Real-time Usage</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-slate-800">{project.currentGenerations}</span>
                                            <span className="text-slate-400 font-medium">/ {project.dailyLimit} images</span>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                        {project.status}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-700 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                                                }`}
                                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">{Math.floor(usagePercent)}% capacity used</span>
                                        <span className="text-slate-800 font-bold">{project.dailyLimit - project.currentGenerations} remaining</span>
                                    </div>
                                </div>
                            </div>

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

                            {user.role === UserRole.ADMIN && (
                                <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-slate-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                                <Cpu size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold">API Integration</h3>
                                        </div>
                                        <button
                                            onClick={handleSimulateApiCall}
                                            disabled={isSimulating || project.status === 'exhausted'}
                                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isSimulating || project.status === 'exhausted'
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                : 'bg-white text-slate-900 hover:bg-indigo-50 active:scale-95 shadow-lg shadow-white/10'
                                                }`}
                                        >
                                            {isSimulating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                            {isSimulating ? 'Sending Request...' : 'Simulate API Call'}
                                        </button>
                                    </div>
                                    <p className="text-slate-400 mb-6 text-sm">
                                        Use the endpoint below to increment image generation counts. Every request updates Cloudinary project usage.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Endpoint URL</label>
                                            <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                                                <code className="text-indigo-400 text-sm flex-1 truncate">
                                                    {origin}/api/projects/{project.id}/generate
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(`${origin}/api/projects/${project.id}/generate`)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                                                >
                                                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {user.role === UserRole.ADMIN && (
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <Users size={18} className="text-indigo-500" />
                                        Team Members
                                    </h3>

                                    <div className="space-y-3 mb-6">
                                        {members.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                        {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full rounded-full" /> : member.full_name?.charAt(0)}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{member.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMember(member.memberId)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {members.length === 0 && (
                                            <div className="py-6 text-center text-slate-400">
                                                <p className="text-sm font-medium">No members assigned yet</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Add Member</label>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                placeholder="Search active users..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>

                                        {searchQuery && (
                                            <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                                                {allProfiles
                                                    .filter(p => {
                                                        const name = (p.full_name || '').toLowerCase();
                                                        const email = (p.email || '').toLowerCase();
                                                        const q = searchQuery.toLowerCase();
                                                        return name.includes(q) || email.includes(q);
                                                    })
                                                    .filter(p => !members.find(m => m.id === p.id))
                                                    .map(profile => (
                                                        <button
                                                            key={profile.id}
                                                            onClick={() => {
                                                                handleAddMember(profile.id);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                                                    {profile.full_name?.charAt(0) || profile.email?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800">{profile.full_name || 'New User'}</p>
                                                                    <p className="text-[10px] text-slate-500">{profile.email}</p>
                                                                </div>
                                                            </div>
                                                            <UserPlus size={16} className="text-indigo-500" />
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Settings size={18} className="text-slate-400" />
                                            Project Settings
                                        </h3>
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Cloudinary Cloud</p>
                                            <p className="font-medium text-slate-700">{project.cloudinaryCloudName || 'Managed via Global Settings'}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Tag / Folder Path</p>
                                            <p className="font-medium text-slate-700">{project.cloudinaryTag || 'Not set'}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">API Security</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                                                    SDK Protected
                                                </span>
                                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    Supabase Secure
                                                </span>
                                            </div>
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
                        )}
                    </div>
                )}

                {activeTab === 'images' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px]">
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
                                <button
                                    onClick={handleBulkDownload}
                                    disabled={selectedIds.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Download size={18} />
                                    Download Selected
                                </button>
                            </div>
                        )}

                        {!project.cloudinaryTag ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                                    <Info size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">Cloudinary Not Configured</h4>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Please set a Cloud Name and Tag in the project settings to fetch generated images from your Cloudinary account.
                                </p>
                            </div>
                        ) : loadingImages ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <div key={n} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : (images.length > 0 || nextCursor) ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {images.map(img => (
                                        <div
                                            key={img.public_id}
                                            onClick={() => toggleImageSelection(img.public_id)}
                                            className={`group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${selectedIds.includes(img.public_id) ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-indigo-200'}`}
                                        >
                                            <img
                                                src={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/w_400,c_fill,g_auto/v${img.version}/${img.public_id}.${img.format}`}
                                                alt={img.public_id}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${selectedIds.includes(img.public_id) ? 'scale-95 opacity-90' : 'group-hover:scale-110'}`}
                                            />

                                            <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(img.public_id) ? 'bg-indigo-600 border-indigo-600 text-white active:scale-90' : 'bg-black/20 backdrop-blur-md border-white/50 opacity-0 group-hover:opacity-100'}`}>
                                                {selectedIds.includes(img.public_id) && <Check size={16} />}
                                            </div>

                                            {img.tags?.includes('Featured') && (
                                                <div className="absolute top-3 left-3 z-20 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-lg flex items-center gap-1 animate-in zoom-in-95">
                                                    <Zap size={10} fill="currentColor" />
                                                    Featured
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                                <p className="text-white text-[10px] font-bold truncate">
                                                    {project.name} - {new Date(img.created_at).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateStr = new Date(img.created_at).toLocaleString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }).replace(/[,:]/g, '').replace(/\s+/g, '_');
                                                            const fileName = `${project.name}_${dateStr}.${img.format}`;
                                                            handleDownload(
                                                                `https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`,
                                                                fileName
                                                            );
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="Download Image"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <a
                                                        href={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleTag(img);
                                                        }}
                                                        disabled={taggingId === img.public_id}
                                                        className={`p-1.5 backdrop-blur-md rounded-lg text-white transition-colors ${img.tags?.includes('Featured')
                                                            ? 'bg-amber-500 hover:bg-amber-600'
                                                            : 'bg-white/20 hover:bg-white/40'
                                                            }`}
                                                        title={img.tags?.includes('Featured') ? 'Remove from Featured' : 'Mark as Featured'}
                                                    >
                                                        {taggingId === img.public_id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : img.tags?.includes('Featured') ? (
                                                            <Star size={14} fill="currentColor" />
                                                        ) : (
                                                            <Star size={14} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInspectImage(img);
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="View Information"
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {images.length === 0 && nextCursor && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center w-full">
                                        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                                        <p className="text-slate-500 font-medium">Fetching more images...</p>
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
                                    We couldn't find any images for the tag <span className="font-bold">"{project.cloudinaryTag}"</span>. Make sure your photobooth is uploading assets to Cloudinary.
                                </p>
                                <div className="mt-6 p-4 bg-indigo-50 rounded-xl text-left">
                                    <p className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                                        <Info size={14} /> Tip for developers
                                    </p>
                                    <p className="text-xs text-indigo-900 leading-relaxed">
                                        The dashboard now uses the <b>Cloudinary Node.js SDK</b> securely. Ensure you have provided your <b>API Key</b> and <b>Secret</b> in the global settings. No insecure "Resource List" settings are required on Cloudinary.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                                    title={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
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

                        {selectedIds.length > 0 && featuredImages.length > 0 && (
                            <div className="flex items-center justify-between mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.length === featuredImages.length ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-300'}`}>
                                            {selectedIds.length === featuredImages.length && <Check size={14} />}
                                        </div>
                                        {selectedIds.length === featuredImages.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-sm text-indigo-400">|</span>
                                    <span className="text-sm font-medium text-indigo-600">{selectedIds.length} images selected</span>
                                </div>
                                <button
                                    onClick={handleBulkDownload}
                                    disabled={selectedIds.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Download size={18} />
                                    Download Selected
                                </button>
                            </div>
                        )}

                        {!project.cloudinaryTag ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                                    <Info size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">Cloudinary Not Configured</h4>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Please set a Cloud Name and Tag in the project settings to fetch featured photos from your Cloudinary account.
                                </p>
                            </div>
                        ) : loadingFeatured ? (
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
                                                src={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/w_400,c_fill,g_auto/v${img.version}/${img.public_id}.${img.format}`}
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
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateStr = new Date(img.created_at).toLocaleString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }).replace(/[,:]/g, '').replace(/\s+/g, '_');
                                                            const fileName = `${project.name}_${dateStr}.${img.format}`;
                                                            handleDownload(
                                                                `https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`,
                                                                fileName
                                                            );
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="Download Image"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <a
                                                        href={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleTag(img);
                                                        }}
                                                        disabled={taggingId === img.public_id}
                                                        className={`p-1.5 backdrop-blur-md rounded-lg text-white transition-colors ${img.tags?.includes('Featured')
                                                            ? 'bg-amber-500 hover:bg-amber-600'
                                                            : 'bg-white/20 hover:bg-white/40'
                                                            }`}
                                                        title={img.tags?.includes('Featured') ? 'Remove from Featured' : 'Mark as Featured'}
                                                    >
                                                        {taggingId === img.public_id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : img.tags?.includes('Featured') ? (
                                                            <Star size={14} fill="currentColor" />
                                                        ) : (
                                                            <Star size={14} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInspectImage(img);
                                                        }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                                        title="View Information"
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {featuredImages.length === 0 && featuredCursor && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center w-full">
                                        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                                        <p className="text-slate-500 font-medium">Fetching more featured photos...</p>
                                    </div>
                                )}

                                {featuredCursor && (
                                    <div className="mt-12 flex justify-center">
                                        <button
                                            onClick={() => fetchFeaturedImages(undefined, true)}
                                            disabled={loadingMoreFeatured}
                                            className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            {loadingMoreFeatured ? <RefreshCw className="animate-spin" size={18} /> : null}
                                            {loadingMoreFeatured ? 'Loading More...' : 'Load More Images'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                    <Zap size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">No Featured Photos</h4>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Photos tagged with <span className="font-bold">"Featured"</span> will appear here. These are typically your best shots selected for the carousel.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {user.role === UserRole.ADMIN && activeTab === 'logs' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <History className="text-indigo-500" />
                                API Access Logs
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
                                            <p className="text-sm font-bold text-slate-800">Image Generation Increment (+{log.amount})</p>
                                            <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()} • Successful Request</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                            HTTP 200 OK
                                        </span>
                                        <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                                        <span className="text-[10px] text-slate-400 font-mono hidden md:block">
                                            ref: {log.id.split('-')[1]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                    <Activity size={48} className="opacity-20 mb-4" />
                                    <p className="font-medium">No activity detected for this project yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
                }
            </div>

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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                                        <input
                                            type="number"
                                            value={editForm.dailyLimit}
                                            onChange={e => setEditForm({ ...editForm, dailyLimit: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                        <p className="mt-2 text-[10px] text-slate-400 leading-relaxed italic">
                                            * Cloudinary Cloud Name and API credentials are now managed globally in Settings.
                                        </p>
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
                                    src={`https://res.cloudinary.com/${project?.cloudinaryCloudName || 'placeholder'}/image/upload/v${inspectImage.version}/${inspectImage.public_id}.${inspectImage.format}`}
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
