
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { UserRole, GlobalSettings } from '@/types';
import { supabase } from '@/utils/supabase';
import { Save, Cloud, ShieldCheck, Key, Loader2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState<GlobalSettings>({
        cloudinaryCloudName: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || (user && user.role !== UserRole.ADMIN)) {
            if (user && user.role !== UserRole.ADMIN) router.replace('/');
            return;
        }

        fetchSettings();
    }, [isAuthenticated, user, router]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 'current')
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (data) {
                setSettings({
                    cloudinaryCloudName: data.cloudinary_cloud_name || '',
                    cloudinaryApiKey: data.cloudinary_api_key || '',
                    cloudinaryApiSecret: data.cloudinary_api_secret || ''
                });
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load global settings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!settings.cloudinaryCloudName || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
            setError('All fields are required.');
            return;
        }

        setIsSaving(true);
        setSaveSuccess(false);
        setError('');

        try {
            // TIMEOUT: Force break after 8 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Update timed out. Please check your connection.')), 8000)
            );

            // Back to standard Supabase Client!
            const updatePromise = supabase
                .from('global_settings')
                .update({
                    cloudinary_cloud_name: settings.cloudinaryCloudName.trim(),
                    cloudinary_api_key: settings.cloudinaryApiKey.trim(),
                    cloudinary_api_secret: settings.cloudinaryApiSecret.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', 'current');

            const { error: saveError } = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (saveError) throw saveError;

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error('Final Save Sync Error:', err);
            setError(err.message || 'Sync failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user || user.role !== UserRole.ADMIN) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Global Settings</h2>
                    <p className="text-slate-500 text-sm">Manage platform-wide configurations and secure credentials in Supabase.</p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-sm font-bold transition-all shadow-sm active:scale-95"
                >
                    <Loader2 size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh Database Access
                </button>
            </div>

            <div className="max-w-4xl">
                {isLoading ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mb-4" size={48} />
                        <p className="font-medium">Loading secure configurations...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                        <Cloud size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Cloudinary Infrastructure</h3>
                                        <p className="text-xs text-slate-500">Global credentials stored securely in Supabase.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                    <ShieldCheck size={12} />
                                    Database Encrypted
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Cloud Name</label>
                                            <input
                                                type="text"
                                                value={settings.cloudinaryCloudName}
                                                onChange={e => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                placeholder="Your Cloudinary cloud name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">API Key</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Key size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={settings.cloudinaryApiKey}
                                                    onChange={e => setSettings({ ...settings, cloudinaryApiKey: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                    placeholder="Cloudinary API Key"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">API Secret</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <ShieldCheck size={18} />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={settings.cloudinaryApiSecret}
                                                    onChange={e => setSettings({ ...settings, cloudinaryApiSecret: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-mono"
                                                    placeholder="••••••••••••••••"
                                                    required
                                                />
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-400 italic">
                                                * These credentials are now synced across all admin devices.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
                                {saveSuccess && (
                                    <p className="text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-right-2">
                                        Settings updated in Supabase!
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
                                    {isSaving ? 'Syncing...' : 'Update Global Cloud'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                        <Cloud size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900">Multi-Device Sync</h4>
                        <p className="text-sm text-indigo-800/80 leading-relaxed mt-1">
                            Your global settings are now stored in Supabase. Any changes made here will be instantly reflected for all project managers and on your production Vercel deployment.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
