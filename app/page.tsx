
'use client';

import React, { useMemo } from 'react';
import { Project, UserRole, UsageLog } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    TrendingUp,
    FolderKanban,
    Users,
    Zap,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();

    const [allProjects, setAllProjects] = React.useState<Project[]>([]);
    const [allUsers, setAllUsers] = React.useState<any[]>([]);
    const [usageLogs, setUsageLogs] = React.useState<UsageLog[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [timeRange, setTimeRange] = React.useState<number | 'custom'>(7);
    const [customRange, setCustomRange] = React.useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    React.useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, timeRange, customRange.start, customRange.end]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Projects
            let projectsQuery = supabase.from('projects').select('*');

            if (user?.role !== UserRole.ADMIN) {
                const { data: memberProjects } = await supabase
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', user?.id);

                const memberIds = (memberProjects || []).map(m => m.project_id);
                projectsQuery = projectsQuery.or(`created_by.eq.${user?.id},id.in.(${memberIds.length ? memberIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
            }

            const { data: projectsData } = await projectsQuery;

            const mappedProjects: Project[] = (projectsData || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                dailyLimit: p.max_usage || 0,
                currentGenerations: p.total_usage || 0,
                status: p.is_active ? ((p.total_usage || 0) >= (p.max_usage || 0) ? 'exhausted' : 'active') : 'paused',
                createdAt: p.created_at || '',
                ownerId: p.created_by || ''
            }));
            setAllProjects(mappedProjects);

            // 2. Fetch Profiles for Admin
            if (user?.role === UserRole.ADMIN) {
                const { data: profilesData } = await supabase.from('profiles').select('id');
                setAllUsers(profilesData || []);
            }

            // 3. Usage Logs based on timeRange
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

            let logsQuery = supabase
                .from('usage_logs')
                .select('*')
                .gte('timestamp', beginDate.toISOString())
                .lte('timestamp', finalDate.toISOString());

            if (user?.role !== UserRole.ADMIN) {
                const projectIds = mappedProjects.map(p => p.id);
                if (projectIds.length > 0) {
                    logsQuery = logsQuery.in('project_id', projectIds);
                } else {
                    logsQuery = logsQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data: logsData } = await logsQuery;
            setUsageLogs((logsData || []).map(l => ({
                id: l.id,
                projectId: l.project_id,
                timestamp: l.timestamp,
                amount: l.amount
            })));

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const projects = allProjects;

    const stats = useMemo(() => {
        const totalGen = projects.reduce((acc, curr) => acc + curr.currentGenerations, 0);
        const totalLimit = projects.reduce((acc, curr) => acc + curr.dailyLimit, 0);
        const usagePercent = totalLimit > 0 ? (totalGen / totalLimit) * 100 : 0;

        return [
            {
                label: 'Active Projects',
                value: projects.length,
                icon: <FolderKanban className="text-indigo-600" />,
                trend: '+2',
                isUp: true,
                bgColor: 'bg-indigo-50'
            },
            {
                label: 'Total Generations',
                value: totalGen.toLocaleString(),
                icon: <Zap className="text-amber-600" />,
                trend: '+12%',
                isUp: true,
                bgColor: 'bg-amber-50'
            },
            {
                label: 'Capacity Usage',
                value: `${usagePercent.toFixed(1)}%`,
                icon: <TrendingUp className="text-emerald-600" />,
                trend: '-3%',
                isUp: false,
                bgColor: 'bg-emerald-50'
            },
            {
                label: 'Total Users',
                value: allUsers.length,
                icon: <Users className="text-blue-600" />,
                trend: '+0',
                isUp: true,
                bgColor: 'bg-blue-50'
            }
        ];
    }, [projects, allUsers]);

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
            daysCount = timeRange;
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

        usageLogs.forEach(log => {
            const logDate = log.timestamp.split('T')[0];
            const dayEntry = lastDays.find(d => d.dateStr === logDate);
            if (dayEntry) {
                dayEntry.count += log.amount;
            }
        });

        return lastDays;
    }, [usageLogs, timeRange, customRange]);

    if (!user) return null;
    if (isLoading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Zap className="animate-pulse text-indigo-600" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">Loading dashboard data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                {stat.icon}
                            </div>
                            <div className={`flex items-center text-xs font-bold ${stat.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {stat.trend}
                                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200">
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
                                    <span className="text-[10px] font-bold uppercase">Range</span>
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

                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Projects</h3>
                    <div className="space-y-4 flex-1">
                        {projects.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.currentGenerations} / {p.dailyLimit} gen</p>
                                    </div>
                                </div>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500"
                                        style={{ width: `${Math.min(100, (p.currentGenerations / p.dailyLimit) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <AlertCircle size={40} className="mb-2 opacity-20" />
                                <p>No projects found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
