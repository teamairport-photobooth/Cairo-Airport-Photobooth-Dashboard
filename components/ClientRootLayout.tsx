
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/types';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    LogOut,
    Zap,
    Menu,
    Settings
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
    const { user, isAuthenticated, logout, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: [UserRole.ADMIN, UserRole.REGULAR] },
        { label: 'Projects', icon: <FolderKanban size={20} />, path: '/projects', roles: [UserRole.ADMIN, UserRole.REGULAR] },
        { label: 'User Management', icon: <Users size={20} />, path: '/users', roles: [UserRole.ADMIN] },
        { label: 'Global Settings', icon: <Settings size={20} />, path: '/settings', roles: [UserRole.ADMIN] },
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

    if (!isAuthenticated) return null;

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Verification</h2>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        We found your account, but couldn't verify your dashboard permissions.
                        This can happen if you are not authorized, or if your connection timed out while switching tabs.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={logout}
                            className="w-full py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Sign in with Different Email
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

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    <div className="p-6 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <span className="font-bold text-xl text-slate-800 tracking-tight">AI Booth</span>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-1">
                        {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${pathname === item.path
                                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                `}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-100">
                        <div className="mb-4 flex items-center gap-3 px-4 py-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 truncate capitalize">{user.role.toLowerCase()}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
                    <button
                        className="lg:hidden p-2 text-slate-500"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-slate-800">
                            {navItems.find(n => n.path === pathname)?.label || 'Project Details'}
                        </h1>
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
