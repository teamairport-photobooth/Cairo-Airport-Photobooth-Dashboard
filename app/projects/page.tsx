'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Project, UserRole, User } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    Search,
    ExternalLink,
    FolderKanban,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

export default function ProjectsPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: projectsData, error: pError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            const mappedProjects: Project[] = (projectsData || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                totalUsage: p.total_usage || 0,
                createdAt: p.created_at,
                ownerId: p.created_by || ''
            }));

            setProjects(mappedProjects);
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProjects = useMemo(() => {
        if (!user) return [];
        let result = projects;

        if (searchTerm) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return result;
    }, [projects, user, searchTerm]);

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[#d0deea] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002d42] bg-white"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 text-slate-400">
                    <Loader2 className="animate-spin mb-4 text-[#002d42]" size={48} />
                    <p className="font-medium">Loading photobooth instances...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 text-slate-400 text-center">
                    <div className="w-16 h-16 bg-[#f0f6fa] rounded-full flex items-center justify-center mb-4 text-[#002d42]">
                        <FolderKanban size={32} />
                    </div>
                    <p className="font-medium text-slate-600">No projects found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="group bg-white p-6 rounded-2xl border border-[#d0deea] hover:border-[#002d42] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono font-bold text-[#002d42] bg-[#f0f6fa] px-2.5 py-1 rounded-md border border-[#004869]/10">
                                        Photobooth Instance
                                    </span>
                                    <ExternalLink size={18} className="text-slate-300 group-hover:text-[#002d42] transition-colors" />
                                </div>

                                <h3 className="text-lg font-bold text-[#002d42] mb-2 group-hover:text-[#004869] transition-colors">{project.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span>Total Generations</span>
                                <span className="font-bold text-[#002d42]">{(project.totalUsage || 0).toLocaleString()}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

