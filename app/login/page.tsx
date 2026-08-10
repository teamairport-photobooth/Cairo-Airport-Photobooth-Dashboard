
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-[#001c2b] via-[#002d42] to-[#001c2b] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Lighting Accents */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#005d87]/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#d9381e]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-[#d4af37]/30 shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300">
                        <img src="/CAC-Logo.png" alt="Cairo Airport Company" className="h-20 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">AI Photobooth Console</h1>
                    <p className="text-[#d4af37] font-semibold text-xs tracking-widest uppercase mt-1">Cairo International Airport</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/20 shadow-2xl text-center relative overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#d9381e] via-[#d4af37] to-[#004869] absolute top-0 left-0" />
                    
                    <h2 className="text-xl font-bold text-[#002d42] mb-2">Authorized Access Only</h2>
                    <p className="text-slate-500 mb-8 text-xs md:text-sm leading-relaxed">
                        Sign in with your whitelisted Cairo Airport Company corporate email account.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-[#002d42] hover:bg-[#003854] text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#002d42]/30 mb-6 disabled:opacity-50 border border-[#d4af37]/30"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                        {loading ? 'Connecting to Portal...' : 'Continue with Google Account'}
                    </button>

                    <div className="p-4 bg-[#f0f6fa] rounded-2xl border border-[#004869]/15 flex items-start gap-3 text-left">
                        <ShieldCheck className="text-[#005d87] shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs font-bold text-[#002d42]">Restricted Console</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                Only authorized staff registered by system administrators can sign in.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-slate-400 mt-8">
                    © {new Date().getFullYear()} Cairo Airport Company. All Rights Reserved.
                </p>
            </div>
        </div>
    );
}

