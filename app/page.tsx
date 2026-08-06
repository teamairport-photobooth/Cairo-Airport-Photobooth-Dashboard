'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    Zap,
    AlertCircle,
    ArrowRight,
    Loader2,
    Image as ImageIcon,
    Power,
    CheckCircle2,
    PauseCircle,
    Activity
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (user) {
            fetchSingleProject();
        }
    }, [user]);

    const fetchSingleProject = async () => {
        setIsLoading(true);
        try {
            const { data: projectsData, error } = await supabase
                .from('projects')
                .select('*')
                .limit(1);

            if (error) throw error;

            if (projectsData && projectsData.length > 0) {
                const p = projectsData[0];
                const mapped: Project = {
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    totalUsage: p.total_usage || 0,
                    status: p.is_active ? 'active' : 'paused',
                    is_active: p.is_active ?? true,
                    createdAt: p.created_at || '',
                    ownerId: p.created_by || '',
                    cloudinaryTag: p.cloudinary_tag || 'cairo-airport-photobooth'
                };
                setProject(mapped);
            } else {
                const fallback: Project = {
                    id: 'cairo-airport-photobooth',
                    name: 'Cairo Airport AI Photobooth',
                    description: 'Main AI Photobooth instance at Cairo International Airport',
                    totalUsage: 0,
                    status: 'active',
                    is_active: true,
                    createdAt: new Date().toISOString(),
                    ownerId: user?.id || 'system',
                    cloudinaryTag: 'cairo-airport-photobooth'
                };
                setProject(fallback);
            }
        } catch (err) {
            console.error('Error fetching single project:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!project) return;
        setIsUpdating(true);

        try {
            const nextIsActive = !project.is_active;
            const nextStatus = nextIsActive ? 'active' : 'paused';

            const { error } = await supabase
                .from('projects')
                .update({
                    is_active: nextIsActive,
                    status: nextStatus
                })
                .eq('id', project.id);

            if (error) throw error;

            setProject(prev => prev ? {
                ...prev,
                is_active: nextIsActive,
                status: nextStatus
            } : null);
        } catch (err: any) {
            console.error('Error updating project status:', err);
            alert(`Failed to update project status: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Zap className="animate-pulse text-indigo-600" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">Loading Photobooth Console...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
                <AlertCircle size={48} className="text-slate-400 mb-4" />
                <h3 className="text-xl font-bold text-slate-800">No Photobooth Project Found</h3>
                <p className="text-slate-500 text-sm mt-1">Please ensure the database seed script was executed.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header Banner */}
            <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10 text-indigo-400 pointer-events-none">
                    <Zap size={240} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/30">
                            <Zap size={14} fill="currentColor" />
                            Photobooth Dashboard
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{project.name}</h1>
                        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xl leading-relaxed">{project.description}</p>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                            project.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${project.is_active ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                            {project.is_active ? 'Active' : 'Paused'}
                        </span>
                        <p className="text-xs text-slate-400 font-mono">
                            Tag: <span className="text-indigo-300 font-bold">#{project.cloudinaryTag}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Usage Stat & Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Total Usage Counter Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                            <Activity size={24} />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Generations</p>
                        <h2 className="text-4xl font-black text-slate-800">
                            {(project.totalUsage || 0).toLocaleString()}
                        </h2>
                        <p className="text-slate-500 text-xs mt-2">Unlimited photobooth capacity</p>
                    </div>
                </div>

                {/* Status Toggle Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Power className="text-indigo-600" size={22} />
                            <h2 className="text-xl font-bold text-slate-800">Operational Status</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {project.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                                    <CheckCircle2 size={14} /> Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">
                                    <PauseCircle size={14} /> Paused
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {project.is_active
                            ? 'The photobooth is actively generating images. Click below to temporarily pause operations.'
                            : 'The photobooth is currently paused. Live requests will be rejected until re-activated.'}
                    </p>

                    <button
                        onClick={handleToggleStatus}
                        disabled={isUpdating}
                        className={`w-full py-3.5 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-3 shadow-lg ${
                            project.is_active
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                        }`}
                    >
                        {isUpdating ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Power size={18} />
                        )}
                        {project.is_active ? 'Pause Photobooth' : 'Activate Photobooth'}
                    </button>
                </div>
            </div>

            {/* Direct Gallery Link Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 p-6 pointer-events-none">
                    <ImageIcon size={200} />
                </div>
                <div className="relative z-10 max-w-xl">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <ImageIcon size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Photobooth Media Gallery & Usage Analytics</h2>
                    <p className="text-indigo-100 text-sm leading-relaxed">
                        Inspect live generated images, view historical generation charts, and manage featured gallery photos.
                    </p>
                </div>

                <Link
                    href={`/projects/${project.id}`}
                    className="relative z-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95 text-sm shrink-0"
                >
                    Open Photobooth Gallery
                    <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
