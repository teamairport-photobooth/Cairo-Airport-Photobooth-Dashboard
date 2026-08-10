'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthContext';
import { UserRole } from '@/types';
import {
    Clock,
    Plus,
    RefreshCw,
    Play,
    Check,
    X,
    AlertCircle,
    Loader2,
    Trash2,
    Edit3,
    History,
    CheckCircle2,
    XCircle,
    Copy,
    ExternalLink,
    ShieldCheck,
    Power,
    Key,
    Lock
} from 'lucide-react';

interface CronJobSchedule {
    timezone: string;
    expiresAt: number;
    hours: number[];
    mdays: number[];
    minutes: number[];
    months: number[];
    wdays: number[];
}

interface JobExtendedData {
    headers?: Record<string, string>;
    body?: string;
}

interface CronJob {
    jobId: number;
    enabled: boolean;
    title: string;
    saveResponses?: boolean;
    url: string;
    lastStatus?: number; // 0=Unknown, 1=OK, 2=Failed, 3=Disabled
    lastDuration?: number;
    lastExecution?: number;
    nextExecution?: number;
    schedule: CronJobSchedule;
    requestMethod?: number;
    extendedData?: JobExtendedData;
}

interface HistoryItem {
    jobLogId: number;
    jobId: number;
    identifier: string;
    date: number;
    datePlanned: number;
    duration: number;
    status: number;
    statusText: string;
    httpStatus: number;
}

export default function CronJobsPage() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<CronJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [origin, setOrigin] = useState('');
    const [mounted, setMounted] = useState(false);
    const [defaultSecret, setDefaultSecret] = useState('');

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingJob, setEditingJob] = useState<CronJob | null>(null);
    const [historyJob, setHistoryJob] = useState<CronJob | null>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Form state for Create/Edit
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        secretHeader: '',
        enabled: true,
        timezone: 'Africa/Cairo',
        frequencyPreset: 'every_12h', // every_12h, daily_7am, custom_daily
        customDailyTime: '07:00'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchJobs();
        }
    }, [user]);

    const fetchJobs = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/cron-jobs');
            const data = await res.json();
            if (res.ok) {
                setJobs(data.jobs || []);
                if (data.defaultCronSecret) {
                    setDefaultSecret(data.defaultCronSecret);
                }
            } else {
                setErrorMsg(data.error || 'Failed to connect to cron-job.org');
            }
        } catch (err: any) {
            console.error('Fetch Jobs Error:', err);
            setErrorMsg('Failed to load cron jobs.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleEnable = async (job: CronJob) => {
        setActionLoadingId(job.jobId);
        try {
            const res = await fetch(`/api/cron-jobs/${job.jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job: {
                        enabled: !job.enabled
                    }
                })
            });

            if (res.ok) {
                setJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, enabled: !j.enabled } : j));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update job status');
            }
        } catch (err) {
            console.error('Toggle Job Error:', err);
            alert('Failed to update job status.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteJob = async (jobId: number) => {
        if (!confirm('Are you sure you want to delete this cleanup schedule? This cannot be undone.')) return;
        setActionLoadingId(jobId);
        try {
            const res = await fetch(`/api/cron-jobs/${jobId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setJobs(prev => prev.filter(j => j.jobId !== jobId));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete job');
            }
        } catch (err) {
            console.error('Delete Job Error:', err);
            alert('Failed to delete job.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const fetchJobHistory = async (job: CronJob) => {
        setHistoryJob(job);
        setLoadingHistory(true);
        setHistoryItems([]);
        try {
            const res = await fetch(`/api/cron-jobs/${job.jobId}/history`);
            const data = await res.json();
            if (res.ok) {
                setHistoryItems(data.history || []);
            } else {
                alert(data.error || 'Failed to fetch history');
            }
        } catch (err) {
            console.error('Fetch History Error:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const openCreateModal = () => {
        const defaultUrl = origin ? `${origin}/api/cron/cleanup-cloudinary` : '';
        setFormData({
            title: 'Cloudinary Bulk Storage Cleanup',
            url: defaultUrl,
            secretHeader: defaultSecret,
            enabled: true,
            timezone: 'Africa/Cairo',
            frequencyPreset: 'every_12h',
            customDailyTime: '07:00'
        });
        setShowCreateModal(true);
    };

    const openEditModal = (job: CronJob) => {
        let preset = 'custom_daily';
        let timeVal = '07:00';

        const schedule: Partial<CronJobSchedule> = job.schedule || {};
        if (schedule.hours?.length === 2 && schedule.hours[0] === 0 && schedule.hours[1] === 12 && schedule.minutes?.length === 1 && schedule.minutes[0] === 0) {
            preset = 'every_12h';
        } else if (schedule.hours?.length === 1 && schedule.hours[0] === 7 && schedule.minutes?.length === 1 && schedule.minutes[0] === 0) {
            preset = 'daily_7am';
        } else if (schedule.hours?.length === 1 && schedule.minutes?.length === 1) {
            preset = 'custom_daily';
            const h = String(schedule.hours[0]).padStart(2, '0');
            const m = String(schedule.minutes[0]).padStart(2, '0');
            timeVal = `${h}:${m}`;
        }

        // Extract secret header if present
        const headers = job.extendedData?.headers || {};
        const rawAuth = headers['Authorization'] || headers['authorization'] || '';
        let extractedSecret = rawAuth;
        if (rawAuth.startsWith('Bearer ')) {
            extractedSecret = rawAuth.replace('Bearer ', '').trim();
        }

        setFormData({
            title: job.title,
            url: job.url,
            secretHeader: extractedSecret || defaultSecret,
            enabled: job.enabled,
            timezone: schedule.timezone || 'Africa/Cairo',
            frequencyPreset: preset,
            customDailyTime: timeVal
        });
        setEditingJob(job);
    };

    const getSchedulePayload = (preset: string, timezone: string, customDailyTime: string): CronJobSchedule => {
        let hours = [0, 12];
        let minutes = [0];

        if (preset === 'every_12h') {
            hours = [0, 12];
            minutes = [0];
        } else if (preset === 'daily_7am') {
            hours = [7];
            minutes = [0];
        } else if (preset === 'custom_daily') {
            const [hStr, mStr] = (customDailyTime || '07:00').split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            hours = [isNaN(h) ? 7 : h];
            minutes = [isNaN(m) ? 0 : m];
        }

        return {
            timezone,
            expiresAt: 0,
            hours,
            mdays: [-1],
            minutes,
            months: [-1],
            wdays: [-1]
        };
    };

    const handleSaveJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const schedule = getSchedulePayload(formData.frequencyPreset, formData.timezone, formData.customDailyTime);
        
        // Build extendedData with Authorization header
        const formattedSecret = formData.secretHeader.trim();
        let extendedData: JobExtendedData | undefined = undefined;

        if (formattedSecret) {
            const authHeaderValue = formattedSecret.startsWith('Bearer ')
                ? formattedSecret
                : `Bearer ${formattedSecret}`;
            extendedData = {
                headers: {
                    Authorization: authHeaderValue
                }
            };
        }

        const payload = {
            job: {
                title: formData.title,
                url: formData.url,
                enabled: formData.enabled,
                saveResponses: true,
                schedule,
                ...(extendedData ? { extendedData } : {})
            }
        };

        try {
            if (editingJob) {
                // Update
                const res = await fetch(`/api/cron-jobs/${editingJob.jobId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    await fetchJobs();
                    setEditingJob(null);
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to update cron job');
                }
            } else {
                // Create
                const res = await fetch('/api/cron-jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    await fetchJobs();
                    setShowCreateModal(false);
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to create cron job');
                }
            }
        } catch (err) {
            console.error('Save Job Error:', err);
            alert('An error occurred while saving the job.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatSchedule = (schedule?: CronJobSchedule) => {
        if (!schedule) return 'Custom Schedule';
        const tz = schedule.timezone || 'Africa/Cairo';
        if (schedule.hours?.length === 2 && schedule.hours[0] === 0 && schedule.hours[1] === 12) {
            return `Every 12 Hours (00:00 & 12:00) • ${tz}`;
        }
        if (schedule.hours?.length === 1 && schedule.hours[0] === 7 && schedule.minutes?.length === 1 && schedule.minutes[0] === 0) {
            return `Daily at 7:00 AM (07:00) • ${tz}`;
        }
        if (schedule.hours?.length === 1 && schedule.minutes?.length === 1) {
            const h = String(schedule.hours[0]).padStart(2, '0');
            const m = String(schedule.minutes[0]).padStart(2, '0');
            return `Daily at ${h}:${m} • ${tz}`;
        }
        return `Custom Schedule • ${tz}`;
    };

    const getAuthHeaderValue = (job: CronJob) => {
        const headers = job.extendedData?.headers || {};
        return headers['Authorization'] || headers['authorization'] || null;
    };

    const renderStatusBadge = (status?: number) => {
        switch (status) {
            case 1:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        OK (Success)
                    </span>
                );
            case 2:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                        <XCircle size={14} className="text-red-600" />
                        Execution Failed
                    </span>
                );
            case 3:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                        <Power size={14} />
                        Disabled
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                        <AlertCircle size={14} />
                        Never Run / Pending
                    </span>
                );
        }
    };

    if (!user || user.role !== UserRole.ADMIN) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200">
                <AlertCircle className="text-amber-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-800">Admin Access Required</h2>
                <p className="text-slate-500 max-w-md mt-2">Only administrators can manage scheduled cron jobs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#001c2b] via-[#002d42] to-[#003854] rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border border-[#004869]/30">
                <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                    <img src="/CAC-Logo.png" alt="Cairo Airport Logo" className="w-80 h-auto object-contain" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#d4af37]/30">
                            <ShieldCheck size={14} />
                            Automated Storage Cleanup Active
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Storage Cleanup Scheduler</h1>
                        <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                            Manage automated storage cleanup tasks and scheduled cleanups for your photobooth images.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchJobs}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all border border-white/10"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            Refresh Schedules
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#d4af37] hover:bg-[#b89628] text-[#001c2b] rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                        >
                            <Plus size={18} />
                            New Cleanup Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Error state */}
            {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-[#d9381e] text-sm font-medium">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={fetchJobs} className="text-xs font-bold underline hover:text-red-900">Retry</button>
                </div>
            )}

            {/* Jobs Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-[#d0deea] text-slate-400">
                    <Loader2 className="animate-spin text-[#002d42] mb-4" size={40} />
                    <p className="font-medium text-slate-500">Connecting to storage cleanup service...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-dashed border-[#d0deea] text-center">
                    <div className="w-16 h-16 bg-[#f0f6fa] text-[#002d42] rounded-2xl flex items-center justify-center mb-4">
                        <Clock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[#002d42]">No Cleanup Schedules Configured</h3>
                    <p className="text-slate-500 text-sm max-w-md mt-2">
                        You don't have any storage cleanup schedules set up yet. Create your first schedule to start automated image cleanups.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#002d42] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#003854] transition-all"
                    >
                        <Plus size={18} />
                        Add First Cleanup Schedule
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {jobs.map(job => {
                        const authHeader = getAuthHeaderValue(job);
                        return (
                            <div
                                key={job.jobId}
                                className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all space-y-6"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold text-slate-800">{job.title}</h3>
                                            {renderStatusBadge(job.lastStatus)}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 pt-1">
                                            <span>Schedule ID: {job.jobId}</span>
                                            <span>•</span>
                                            <span>{formatSchedule(job.schedule)}</span>
                                        </p>
                                    </div>

                                    {/* Active Switch & Primary Controls */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                {job.enabled ? 'Active' : 'Disabled'}
                                            </span>
                                            <button
                                                onClick={() => handleToggleEnable(job)}
                                                disabled={actionLoadingId === job.jobId}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    job.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        job.enabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Target URL code box & Auth Header */}
                                <div className="space-y-2">
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Target:</span>
                                        <code className="text-indigo-600 text-xs font-mono flex-1 truncate">
                                            {job.url}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(job.url);
                                                alert('Target URL copied to clipboard');
                                            }}
                                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                            title="Copy Target URL"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>

                                    {/* Auth Header Box */}
                                    <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-indigo-900 font-mono truncate">
                                            <Lock size={14} className="text-indigo-600 shrink-0" />
                                            <span className="font-bold text-indigo-700">Authorization Header:</span>
                                            <code className="bg-white/80 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 truncate">
                                                {authHeader || 'None attached'}
                                            </code>
                                        </div>
                                        {authHeader && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(authHeader);
                                                    alert('Authorization header copied to clipboard');
                                                }}
                                                className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors shrink-0"
                                                title="Copy Secret Header"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Info Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Planned Run</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-1">
                                            {job.nextExecution && job.nextExecution > 0
                                                ? new Date(job.nextExecution * 1000).toLocaleString()
                                                : 'Not scheduled'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Execution</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-1">
                                            {job.lastExecution && job.lastExecution > 0
                                                ? new Date(job.lastExecution * 1000).toLocaleString()
                                                : 'Never run'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Run Duration</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-1">
                                            {job.lastDuration ? `${(job.lastDuration / 1000).toFixed(2)}s` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Save Responses</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-1">
                                            {job.saveResponses !== false ? 'Enabled (Logs Saved)' : 'Disabled'}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(job)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Edit3 size={14} />
                                            Edit Schedule
                                        </button>
                                        <button
                                            onClick={() => fetchJobHistory(job)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-[#002d42]/10 hover:bg-[#002d42]/20 text-[#002d42] rounded-xl text-xs font-bold transition-all"
                                        >
                                            <History size={14} />
                                            View History Logs
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteJob(job.jobId)}
                                        disabled={actionLoadingId === job.jobId}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {actionLoadingId === job.jobId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        Delete Schedule
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Create / Edit Job */}
            {mounted && (showCreateModal || editingJob) && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
                    onClick={() => { setShowCreateModal(false); setEditingJob(null); }}
                >
                    <div
                        className="bg-white w-full max-w-xl rounded-3xl p-8 animate-in zoom-in-95 duration-200 shadow-2xl relative my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-[#002d42]">
                                {editingJob ? 'Edit Storage Cleanup Schedule' : 'Create Storage Cleanup Schedule'}
                            </h2>
                            <button
                                onClick={() => { setShowCreateModal(false); setEditingJob(null); }}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveJob} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Schedule Title</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Daily Cairo Photobooth Cleanup"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002d42] text-sm"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Target Endpoint URL</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                url: `${origin}/api/cron/cleanup-cloudinary`
                                            }));
                                        }}
                                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                    >
                                        Pre-fill Cleanup Endpoint
                                    </button>
                                </div>
                                <input
                                    required
                                    type="url"
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://your-domain.com/api/cron/cleanup-cloudinary?key=..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                />
                            </div>

                            {/* Authorization Header / Secret Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Lock size={12} className="text-indigo-600" />
                                        Authorization Header Secret (CRON_SECRET)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, secretHeader: defaultSecret }))}
                                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                                    >
                                        Insert System Secret
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.secretHeader}
                                        onChange={e => setFormData({ ...formData, secretHeader: e.target.value })}
                                        placeholder="CRON_SECRET string..."
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    Sent as <code className="text-indigo-600 font-mono">Authorization: Bearer &lt;SECRET&gt;</code> HTTP header to authorize bulk deletion endpoint.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Timezone</label>
                                    <select
                                        value={formData.timezone}
                                        onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                                    >
                                        <option value="Africa/Cairo">Africa/Cairo (UTC+2 / EET)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="Europe/Berlin">Europe/Berlin</option>
                                        <option value="Europe/London">Europe/London</option>
                                        <option value="America/New_York">America/New_York</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Run Schedule</label>
                                    <select
                                        value={formData.frequencyPreset}
                                        onChange={e => setFormData({ ...formData, frequencyPreset: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                                    >
                                        <option value="every_12h">Every 12 Hours (00:00 & 12:00)</option>
                                        <option value="daily_7am">Daily at 7:00 AM (07:00)</option>
                                        <option value="custom_daily">Custom Daily Time...</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Daily Time Input */}
                            {formData.frequencyPreset === 'custom_daily' && (
                                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2 animate-in fade-in duration-200">
                                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <Clock size={14} className="text-indigo-600" />
                                        Custom Daily Execution Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.customDailyTime}
                                        onChange={e => setFormData({ ...formData, customDailyTime: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono bg-white text-indigo-950 font-bold"
                                        required
                                    />
                                    <p className="text-[11px] text-indigo-600/80">
                                        Job will execute automatically once every day at <span className="font-bold">{formData.customDailyTime}</span> ({formData.timezone}).
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="enabledCheck"
                                    checked={formData.enabled}
                                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                                    className="w-5 h-5 accent-indigo-600 rounded"
                                />
                                <label htmlFor="enabledCheck" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                    Enable Schedule immediately after saving
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setEditingJob(null); }}
                                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-[#002d42] text-white font-bold rounded-xl hover:bg-[#003854] transition-colors shadow-md text-sm flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                                    {isSaving ? 'Saving...' : editingJob ? 'Update Schedule' : 'Create Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Execution History Logs */}
            {mounted && historyJob && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setHistoryJob(null)}
                >
                    <div
                        className="bg-white w-full max-w-3xl rounded-3xl p-8 animate-in zoom-in-95 duration-200 shadow-2xl relative my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[#002d42]">Cleanup History Logs</h2>
                                <p className="text-xs text-slate-500 mt-1">{historyJob.title} • ID: {historyJob.jobId}</p>
                            </div>
                            <button
                                onClick={() => setHistoryJob(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
                                <p className="text-sm font-medium">Fetching history logs from cron-job.org...</p>
                            </div>
                        ) : historyItems.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
                                <History size={40} className="mb-3 opacity-30" />
                                <p className="font-semibold text-slate-600">No execution logs recorded yet</p>
                                <p className="text-xs mt-1 text-slate-400">Logs will appear here once the job triggers.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                {historyItems.map(item => (
                                    <div
                                        key={item.jobLogId}
                                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                item.httpStatus >= 200 && item.httpStatus < 300
                                                    ? 'bg-emerald-100 text-emerald-600'
                                                    : 'bg-red-100 text-red-600'
                                            }`}>
                                                {item.httpStatus >= 200 && item.httpStatus < 300 ? <Check size={18} /> : <X size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    HTTP {item.httpStatus || 200} ({item.statusText || 'OK'})
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(item.date * 1000).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                                            <span>Duration: {item.duration ? `${(item.duration / 1000).toFixed(2)}s` : 'N/A'}</span>
                                            <span className="text-slate-300">|</span>
                                            <span>Log ID: #{item.jobLogId}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-6 mt-6 border-t border-slate-100 text-right">
                            <button
                                onClick={() => setHistoryJob(null)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
