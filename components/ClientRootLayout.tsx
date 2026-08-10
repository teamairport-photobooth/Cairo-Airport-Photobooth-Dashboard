'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/types';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    Settings,
    ShieldAlert,
    ChevronLeft,
    ChevronRight,
    Clock
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
        { label: 'Storage Cleanup Scheduler', icon: <Clock size={20} />, path: '/cron-jobs', roles: [UserRole.ADMIN] },
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
            <div className="min-h-screen bg-[#001c2b] flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-6 text-center">
                    <img src="/CAC-Logo.png" alt="Cairo Airport Company" className="w-56 h-auto animate-pulse" />
                    <p className="text-[#d4af37] font-bold text-xs tracking-widest uppercase animate-pulse">
                        Initializing AI Photobooth Console...
                    </p>
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
            <div className="min-h-screen bg-[#f2f6f9] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#d0deea] shadow-2xl shadow-slate-300/50 animate-in fade-in zoom-in-95 duration-300">
                    <img src="/CAC-Logo.png" alt="Cairo Airport Company" className="h-16 mx-auto mb-6 object-contain" />
                    <div className="w-14 h-14 bg-red-50 text-[#d9381e] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100 shadow-sm">
                        <ShieldAlert size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-[#002d42] mb-2">Access Unauthorized</h2>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                        The account <span className="font-semibold text-[#002d42]">{session?.user?.email || 'you signed in with'}</span> is not authorized to access this console.
                    </p>
                    <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                        This console is strictly invite-only for Cairo Airport Company authorized personnel. Please request access from an administrator.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={logout}
                            className="w-full py-3.5 bg-[#002d42] text-white rounded-2xl font-bold hover:bg-[#003854] transition-all active:scale-95 shadow-lg shadow-[#002d42]/20 flex items-center justify-center gap-2"
                        >
                            Sign in with Different Email
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-white text-slate-600 border border-[#d0deea] rounded-2xl font-semibold hover:bg-slate-50 transition-all active:scale-95 text-sm"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f2f6f9] overflow-hidden">
            {/* Sidebar Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Minimizable Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-[#001c2b] border-r border-[#003854] transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                    w-64
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Header with Logo & Minimizer Toggle */}
                    <div className="p-4 flex items-center justify-between border-b border-[#003854] min-h-[72px]">
                        {!isCollapsed ? (
                            <>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img src="/CAC-Logo.png" alt="Cairo Airport Company" className="h-10 max-w-[170px] object-contain shrink-0" />
                                </div>
                                <button
                                    onClick={() => setIsCollapsed(true)}
                                    className="hidden lg:flex p-1.5 hover:bg-[#00283c] rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
                                    title="Collapse Sidebar"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            </>
                        ) : (
                            <div className="w-full flex items-center justify-center">
                                <button
                                    onClick={() => setIsCollapsed(false)}
                                    className="group relative w-11 h-11 bg-[#002d42] border border-[#d4af37]/30 rounded-xl flex items-center justify-center p-1.5 shadow-lg transition-transform active:scale-95 shrink-0"
                                    title="Expand Sidebar"
                                >
                                    <img src="/CAC-Logo.png" alt="CAC Logo" className="w-full h-full object-contain" />
                                    <div className="absolute -right-1 -top-1 w-4 h-4 bg-[#d9381e] text-white rounded-full flex items-center justify-center text-[9px] shadow-sm">
                                        <ChevronRight size={10} />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Navigation items */}
                    <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
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
                                            ? 'bg-[#003854] text-[#d4af37] font-bold shadow-md border-l-4 border-[#d4af37]'
                                            : 'text-slate-300 hover:bg-[#00283c] hover:text-white'}
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
                    <div className="p-3 border-t border-[#003854] bg-[#001724]">
                        <div className={`mb-3 flex items-center gap-3 px-2 py-2 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                            <div className="w-9 h-9 rounded-full bg-[#d4af37] text-[#001c2b] flex items-center justify-center text-sm font-black shrink-0 shadow-md">
                                {user.name.charAt(0)}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                                    <span className="text-[10px] uppercase font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20 inline-block">
                                        {user.role}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={logout}
                            title={isCollapsed ? "Logout" : undefined}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-[#e63946] hover:bg-[#d9381e]/15 rounded-xl transition-colors ${
                                isCollapsed ? 'lg:justify-center lg:px-0' : ''
                            }`}
                        >
                            <LogOut size={18} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-[#d0deea] px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-[#002d42] hover:bg-slate-100 rounded-lg"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-bold text-[#002d42] tracking-tight">
                            {navItems.find(n => n.path === pathname)?.label || 'Photobooth Console'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#002d42] bg-[#f0f6fa] px-3.5 py-1.5 rounded-full border border-[#004869]/20 flex items-center gap-2 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Cairo International Airport
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

