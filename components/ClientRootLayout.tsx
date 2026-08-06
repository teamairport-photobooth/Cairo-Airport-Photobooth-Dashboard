'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/types';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Zap,
    Menu,
    Settings,
    ShieldAlert,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/AuthContext';

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
    );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, logout, loading, session } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: [UserRole.ADMIN, UserRole.REGULAR] },
        { label: 'User Management', icon: <Users size={20} />, path: '/users', roles: [UserRole.ADMIN] },
        { label: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: [UserRole.ADMIN] },
    ];

    useEffect(() => {
        if (!loading && !isAuthenticated && pathname !== '/login') {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Zap className="text-indigo-600 animate-pulse" size={48} fill="currentColor" />
                    <p className="text-slate-500 font-medium animate-pulse">Initializing Dashboard...</p>
                </div>
            </div>
        );
    }

    if (pathname === '/login') {
        return <>{children}</>;
    }

    if (!isAuthenticated) return null;

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100 shadow-sm">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Unauthorized</h2>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                        The account <span className="font-semibold text-slate-800">{session?.user?.email || 'you signed in with'}</span> is not authorized to access this dashboard.
                    </p>
                    <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                        This console is invite-only. Please request access from an administrator or sign in with an authorized Google account.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={logout}
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                            Sign in with Different Email
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-semibold hover:bg-slate-50 transition-all active:scale-95 text-sm"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Minimizable Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                    w-64
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Header with Logo & Minimizer Toggle */}
                    <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'lg:px-4 lg:justify-center' : ''}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            {!isCollapsed && (
                                <span className="font-bold text-xl text-slate-800 tracking-tight whitespace-nowrap">AI Booth</span>
                            )}
                        </div>

                        {/* Minimize button visible on desktop */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>
                    </div>

                    {/* Navigation items */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                        {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    title={isCollapsed ? item.label : undefined}
                                    className={`
                                        flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200
                                        ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                                        ${isActive
                                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                                    `}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    {!isCollapsed && (
                                        <span className="whitespace-nowrap text-sm">{item.label}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User profile & Logout */}
                    <div className="p-3 border-t border-slate-100">
                        <div className={`mb-3 flex items-center gap-3 px-2 py-2 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                                {user.name.charAt(0)}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                    <p className="text-xs text-slate-500 truncate capitalize">{user.role.toLowerCase()}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={logout}
                            title={isCollapsed ? "Logout" : undefined}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors ${
                                isCollapsed ? 'lg:justify-center lg:px-0' : ''
                            }`}
                        >
                            <LogOut size={20} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-semibold text-slate-800">
                            {navItems.find(n => n.path === pathname)?.label || 'Photobooth Console'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            Cairo Airport AI Photobooth
                        </span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
