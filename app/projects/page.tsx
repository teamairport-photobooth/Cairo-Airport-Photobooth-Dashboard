
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Project, UserRole, User } from '@/types';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { Plus, Search, ExternalLink, Image as ImageIcon, Loader2, FolderKanban, Check, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function ProjectListPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        dailyLimit: 1000,
        assignedUserIds: [] as string[],
        cloudinaryTag: ''
    });

    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Projects
            let projectsQuery = supabase.from('projects').select('*');

            // If not admin, filter by owner OR team membership
            if (user?.role !== UserRole.ADMIN) {
                const { data: memberProjects } = await supabase
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', user?.id);

                const memberIds = (memberProjects || []).map(m => m.project_id);
                projectsQuery = projectsQuery.or(`created_by.eq.${user?.id},id.in.(${memberIds.length ? memberIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
            }

            const { data: projectsData, error: pError } = await projectsQuery.order('created_at', { ascending: false });

            if (pError) throw pError;

            // Map Snake Case to Camel Case for the interface
            const mappedProjects: Project[] = (projectsData || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                dailyLimit: p.max_usage || 0,
                currentGenerations: p.total_usage || 0,
                createdAt: p.created_at,
                ownerId: p.created_by || '',
                status: p.is_active ? ((p.total_usage || 0) >= (p.max_usage || 0) ? 'exhausted' : 'active') : 'paused',
                cloudinaryCloudName: p.cloudinary_cloud_name,
                cloudinaryTag: p.cloudinary_tag,
                cloudinaryApiKey: p.cloudinary_api_key,
                cloudinaryApiSecret: p.cloudinary_api_secret
            }));

            setProjects(mappedProjects);

            // Fetch Users (for assignment)
            const { data: userData, error: uError } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (uError) throw uError;

            setUsers((userData || []).map(u => ({
                id: u.id,
                name: u.full_name || u.email,
                email: u.email,
                role: u.role as UserRole,
                assignedProjectIds: [] // This will need project_members table later
            })));

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const projectData = {
                name: newProject.name.trim(),
                description: newProject.description.trim(),
                max_usage: newProject.dailyLimit || 1000,
                cloudinary_tag: newProject.cloudinaryTag.trim(),
                created_by: user?.id,
                is_active: true
            };

            const { data: project, error: pError } = await supabase
                .from('projects')
                .insert([projectData])
                .select()
                .single();

            if (pError) throw pError;

            // 2. Assign Members
            if (newProject.assignedUserIds.length > 0) {
                const memberData = newProject.assignedUserIds.map(userId => ({
                    project_id: project.id,
                    user_id: userId
                }));
                const { error: mError } = await supabase
                    .from('project_members')
                    .insert(memberData);

                if (mError) console.warn('Could not assign some members:', mError);
            }

            // Refresh list
            await fetchData();
            setShowModal(false);
            setNewProject({ name: '', description: '', dailyLimit: 1000, assignedUserIds: [], cloudinaryTag: '' });
        } catch (err: any) {
            console.error('Error creating project:', err);
            alert(`Project Creation Failed: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredProjects = useMemo(() => {
        if (!user) return [];
        // Filtering is now handled at the query level for security/efficiency,
        // but we keep the memo for search Term filtering.
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>

                {user.role === UserRole.ADMIN && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} />
                        Create Project
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-medium">Loading your projects...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 text-slate-400 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FolderKanban size={32} />
                    </div>
                    <p className="font-medium text-slate-600">No projects found</p>
                    <p className="text-sm">Try a different search or create your first project.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {project.status}
                                </span>
                                <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600">{project.name}</h3>
                            <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2">{project.description}</p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-400 flex items-center gap-1">
                                        <ImageIcon size={14} /> Usage
                                    </span>
                                    <span className="text-slate-800">{project.currentGenerations} / {project.dailyLimit}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${(project.currentGenerations / project.dailyLimit) > 0.9 ? 'bg-amber-500' : 'bg-indigo-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (project.currentGenerations / project.dailyLimit) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-2xl p-8 animate-in zoom-in-95 duration-200 my-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Basic Information</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={newProject.name}
                                            onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. Summer Music Fest"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={newProject.description}
                                            onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Tell us about this project..."
                                            rows={3}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                                        <input
                                            type="number"
                                            value={newProject.dailyLimit}
                                            onChange={e => setNewProject({ ...newProject, dailyLimit: parseInt(e.target.value) })}
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
                                            value={newProject.cloudinaryTag}
                                            onChange={e => setNewProject({ ...newProject, cloudinaryTag: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. event-2024"
                                        />
                                        <p className="mt-1 text-[10px] text-slate-400 italic">* Cloudinary credentials are managed in Global Settings.</p>
                                    </div>
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <Users size={16} className="text-indigo-500" />
                                            Assign Team Members
                                        </label>
                                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto max-h-[220px] divide-y divide-slate-100">
                                            {users.filter(u => u.role === UserRole.REGULAR).map(u => {
                                                const isSelected = newProject.assignedUserIds.includes(u.id);
                                                return (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewProject(prev => ({
                                                                ...prev,
                                                                assignedUserIds: isSelected
                                                                    ? prev.assignedUserIds.filter(id => id !== u.id)
                                                                    : [...prev.assignedUserIds, u.id]
                                                            }));
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-white'}`}
                                                    >
                                                        <div className="flex flex-col items-start overflow-hidden">
                                                            <span className="text-sm font-bold text-slate-800 truncate w-full italic">{u.name}</span>
                                                            <span className="text-[10px] text-slate-500 truncate w-full">{u.email}</span>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                            {isSelected && <Check size={14} />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {users.filter(u => u.role === UserRole.REGULAR).length === 0 && (
                                                <div className="p-8 text-center text-slate-400">
                                                    <p className="text-xs">No regular users found to assign.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : null}
                                    {isSaving ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
