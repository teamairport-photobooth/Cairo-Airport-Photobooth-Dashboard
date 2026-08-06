'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    Zap,
    AlertCircle,
    ArrowRight,
    Image as ImageIcon,
    Activity
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                        <p className="text-xs text-slate-400 font-mono">
                            Tag: <span className="text-indigo-300 font-bold">#{project.cloudinaryTag}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Usage Stat Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                        <Activity size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Generations</p>
                        <h2 className="text-4xl font-black text-slate-800">
                            {(project.totalUsage || 0).toLocaleString()}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">Cumulative photobooth image generation count</p>
                    </div>
                </div>

                <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 text-sm shrink-0"
                >
                    View Analytics & Usage
                    <ArrowRight size={18} />
                </Link>
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
                    <h2 className="text-2xl font-bold mb-1">Photobooth Media Gallery</h2>
                    <p className="text-indigo-100 text-sm leading-relaxed">
                        Inspect live generated images, view prompt details, download assets, and manage featured gallery photos.
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
