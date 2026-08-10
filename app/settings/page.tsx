'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { UserRole } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    Save,
    Cloud,
    ShieldCheck,
    Key,
    Loader2,
    AlertCircle,
    FolderKanban,
    Trash2,
    Check,
    Clock,
    Lock
} from 'lucide-react';

export default function SettingsPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectForm, setProjectForm] = useState({
        name: '',
        description: ''
    });

    const [globalForm, setGlobalForm] = useState({
        cloudinaryCloudName: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: '',
        cloudinaryTag: 'cairo-airport-photobooth',
        cronJobsApiKey: '',
        cronSecret: ''
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    // Storage Cleanup State
    const [isPurging, setIsPurging] = useState(false);
    const [purgeResult, setPurgeResult] = useState<{ success: boolean; message: string; deletedCount?: number } | null>(null);

    useEffect(() => {
        if (!isAuthenticated || (user && user.role !== UserRole.ADMIN)) {
            if (user && user.role !== UserRole.ADMIN) router.replace('/');
            return;
        }

        fetchSettings();
    }, [isAuthenticated, user, router]);

    const fetchSettings = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch Global Settings
            const { data: globalData, error: gError } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 'current')
                .single();

            if (gError && gError.code !== 'PGRST116') throw gError;

            if (globalData) {
                setGlobalForm({
                    cloudinaryCloudName: globalData.cloudinary_cloud_name || '',
                    cloudinaryApiKey: globalData.cloudinary_api_key || '',
                    cloudinaryApiSecret: globalData.cloudinary_api_secret || '',
                    cloudinaryTag: globalData.cloudinary_tag || 'cairo-airport-photobooth',
                    cronJobsApiKey: globalData.cron_jobs_api_key || '',
                    cronSecret: globalData.cron_secret || ''
                });
            }

            // Fetch Project Settings
            const { data: projectData, error: pError } = await supabase
                .from('projects')
                .select('*')
                .limit(1);

            if (pError) throw pError;

            if (projectData && projectData.length > 0) {
                const p = projectData[0];
                setProjectId(p.id);
                setProjectForm({
                    name: p.name || 'Cairo Airport AI Photobooth',
                    description: p.description || ''
                });
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSaving(true);
        setSaveSuccess(false);
        setError('');

        try {
            // 1. Update Global Settings
            const { error: globalError } = await supabase
                .from('global_settings')
                .upsert({
                    id: 'current',
                    cloudinary_cloud_name: globalForm.cloudinaryCloudName.trim(),
                    cloudinary_api_key: globalForm.cloudinaryApiKey.trim(),
                    cloudinary_api_secret: globalForm.cloudinaryApiSecret.trim(),
                    cloudinary_tag: globalForm.cloudinaryTag.trim(),
                    cron_jobs_api_key: globalForm.cronJobsApiKey.trim(),
                    cron_secret: globalForm.cronSecret.trim(),
                    updated_at: new Date().toISOString()
                });

            if (globalError) throw globalError;

            // 2. Update Project Details if project exists
            if (projectId) {
                const { error: projectError } = await supabase
                    .from('projects')
                    .update({
                        name: projectForm.name.trim(),
                        description: projectForm.description.trim()
                    })
                    .eq('id', projectId);

                if (projectError) throw projectError;
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3500);
        } catch (err: any) {
            console.error('Save Settings Error:', err);
            setError(err.message || 'Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualPurge = async () => {
        if (isPurging) return;

        const confirmPurge = window.confirm(
            `Are you sure you want to delete ALL photobooth images in folder "${globalForm.cloudinaryTag}" from Cloudinary storage?`
        );
        if (!confirmPurge) return;

        setIsPurging(true);
        setPurgeResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/cron/cleanup-cloudinary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-supabase-auth': session?.access_token || ''
                }
            });

            const data = await res.json();

            if (res.ok) {
                setPurgeResult({
                    success: true,
                    message: data.message || 'Storage cleanup completed successfully.',
                    deletedCount: data.deletedCount || 0
                });
            } else {
                setPurgeResult({
                    success: false,
                    message: data.error || 'Failed to execute storage cleanup.'
                });
            }
        } catch (err: any) {
            setPurgeResult({
                success: false,
                message: err.message || 'Network error executing storage cleanup.'
            });
        } finally {
            setIsPurging(false);
        }
    };

    if (!user || user.role !== UserRole.ADMIN) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage global system configurations, Cloudinary credentials, and Cron Scheduler settings.</p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-sm font-bold transition-all shadow-sm active:scale-95 shrink-0"
                >
                    <Loader2 size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh Settings
                </button>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-medium">Loading configurations...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <form onSubmit={handleSave} className="space-y-8">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {/* Section 1: Photobooth Details */}
                        <div className="bg-white rounded-3xl border border-[#d0deea] overflow-hidden shadow-xs">
                            <div className="bg-[#f0f6fa] px-8 py-6 border-b border-[#d0deea] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[#002d42] rounded-xl text-[#d4af37]">
                                        <FolderKanban size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#002d42]">Photobooth Instance Details</h3>
                                        <p className="text-xs text-slate-500">Configure display name and description.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Photobooth Name</label>
                                    <input
                                        type="text"
                                        value={projectForm.name}
                                        onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#002d42] outline-none transition-all"
                                        placeholder="e.g. Cairo Airport AI Photobooth"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        value={projectForm.description}
                                        onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#002d42] outline-none transition-all"
                                        placeholder="Description..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Cloudinary Global Credentials */}
                        <div className="bg-white rounded-3xl border border-[#d0deea] overflow-hidden shadow-xs">
                            <div className="bg-[#f0f6fa] px-8 py-6 border-b border-[#d0deea] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[#002d42] rounded-xl text-[#d4af37]">
                                        <Cloud size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#002d42]">Cloudinary Integration</h3>
                                        <p className="text-xs text-slate-500">Global Cloudinary credentials and asset tag folder.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Cloud Name</label>
                                        <input
                                            type="text"
                                            value={globalForm.cloudinaryCloudName}
                                            onChange={e => setGlobalForm({ ...globalForm, cloudinaryCloudName: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#002d42] outline-none transition-all font-mono text-sm"
                                            placeholder="Cloud Name"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Asset Tag / Folder</label>
                                        <input
                                            type="text"
                                            value={globalForm.cloudinaryTag}
                                            onChange={e => setGlobalForm({ ...globalForm, cloudinaryTag: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                            placeholder="e.g. cairo-airport-photobooth"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">API Key</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Key size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={globalForm.cloudinaryApiKey}
                                                onChange={e => setGlobalForm({ ...globalForm, cloudinaryApiKey: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                                placeholder="API Key"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">API Secret</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                value={globalForm.cloudinaryApiSecret}
                                                onChange={e => setGlobalForm({ ...globalForm, cloudinaryApiSecret: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                                placeholder="••••••••••••••••"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Cron Jobs Credentials */}
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Cron Scheduler Credentials</h3>
                                        <p className="text-xs text-slate-500">API token for cron-job.org and cleanup authorization secret.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cron-Job.org REST API Key</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Key size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={globalForm.cronJobsApiKey}
                                            onChange={e => setGlobalForm({ ...globalForm, cronJobsApiKey: e.target.value })}
                                            className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                            placeholder="Bearer API Key from cron-job.org console..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cron Cleanup Authorization Secret (CRON_SECRET)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={globalForm.cronSecret}
                                            onChange={e => setGlobalForm({ ...globalForm, cronSecret: e.target.value })}
                                            className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                            placeholder="Secret phrase for cleanup verification..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
                                {saveSuccess && (
                                    <p className="text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-right-2">
                                        Settings saved successfully!
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`
                                        flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg
                                        ${isSaving
                                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'}
                                    `}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    {isSaving ? 'Saving...' : 'Save All Settings'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Section 4: Storage Maintenance */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400 border border-rose-500/30">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Storage Maintenance</h3>
                                    <p className="text-xs text-slate-400">Purge images stored in Cloudinary folder "{globalForm.cloudinaryTag}".</p>
                                </div>
                            </div>

                            <button
                                onClick={handleManualPurge}
                                disabled={isPurging}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                                    isPurging
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-900/30'
                                }`}
                            >
                                {isPurging ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                {isPurging ? 'Purging Storage...' : 'Run Storage Cleanup Now'}
                            </button>
                        </div>

                        {purgeResult && (
                            <div className="p-8 border-t border-slate-100">
                                <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 ${
                                    purgeResult.success
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {purgeResult.success ? <Check className="text-emerald-600" size={20} /> : <AlertCircle className="text-red-600" size={20} />}
                                        <span>{purgeResult.message}</span>
                                    </div>
                                    {purgeResult.deletedCount !== undefined && (
                                        <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-black">
                                            {purgeResult.deletedCount} images deleted
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
