
'use client';

import React, { useState } from 'react';
import { Zap, LogIn, Mail } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { loginWithGoogle, isAuthenticated } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        router.push('/');
        return null;
    }

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mb-6">
                        <Zap size={32} fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI Booth Console</h1>
                    <p className="text-slate-500 font-medium">Enterprise Photobooth Management</p>
                </div>

                <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                    <p className="text-slate-500 mb-8 text-sm">
                        Please sign in with your pre-authorized corporate Google account.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-4 py-4 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] shadow-sm mb-6 disabled:opacity-50"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        {loading ? 'Connecting...' : 'Continue with Google'}
                    </button>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                            <b>Secure Invite-Only:</b> Only users whitelisted by the Superadmin can access this console.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
