
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, UserRole } from '@/types';
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const isResolving = React.useRef(false);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async (isRetry = false) => {
            if (isResolving.current && !isRetry) return;
            isResolving.current = true;

            try {
                console.log('🔄 Auth: Initializing session...');
                const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;
                if (!mounted) return;

                setSession(currentSession);
                if (currentSession) {
                    await fetchUserProfile(currentSession);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('❌ Auth: Initialization error:', err);
                if (mounted) setLoading(false);
            } finally {
                isResolving.current = false;
            }
        };

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log('🔑 Auth event:', event);

            // Only trigger a new profile fetch if the session actually changed
            setSession(prev => {
                if (session?.user.id !== prev?.user.id || event === 'SIGNED_IN') {
                    if (session) fetchUserProfile(session);
                    else {
                        setUser(null);
                        setLoading(false);
                    }
                }
                return session;
            });
        });

        // Wake up connection when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('☀️ Tab visible - verifying connection...');
                initializeAuth();
            }
        };

        initializeAuth();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchUserProfile = async (session: Session) => {
        try {
            console.log('👤 Auth: Fetching profile for', session.user.email);

            if (!session.user.email) {
                setUser(null);
                setLoading(false);
                return;
            }

            const cleanEmail = session.user.email.trim();

            // 1. GATEKEEPER CHECK: Verify email is in allowed_users whitelist (case-insensitive)
            const { data: allowedUser } = await supabase
                .from('allowed_users')
                .select('*')
                .ilike('email', cleanEmail)
                .maybeSingle();

            if (!allowedUser) {
                console.warn('⚠️ Auth: User email not found in allowed_users whitelist:', cleanEmail);
                // Clean up any stale profile if access was revoked
                await supabase.from('profiles').delete().eq('id', session.user.id);
                setUser(null);
                setLoading(false);
                return;
            }

            // 2. Query existing profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile) {
                setUser({
                    id: profile.id,
                    name: profile.full_name || 'Admin User',
                    email: profile.email,
                    role: (profile.role as UserRole) || UserRole.REGULAR,
                    assignedProjectIds: []
                });
                console.log('✅ Auth: Profile loaded for', profile.email);
                setLoading(false);
                return;
            }

            // 3. If profile doesn't exist yet, auto-provision it using allowedUser role
            console.log('✨ Auth: User is whitelisted! Provisioning profile...');
            const newProfileData = {
                id: session.user.id,
                email: cleanEmail,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || cleanEmail,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                role: allowedUser.role || UserRole.REGULAR
            };

            const { data: createdProfile, error: createError } = await supabase
                .from('profiles')
                .upsert(newProfileData)
                .select()
                .single();

            if (createdProfile) {
                setUser({
                    id: createdProfile.id,
                    name: createdProfile.full_name || 'Admin User',
                    email: createdProfile.email,
                    role: (createdProfile.role as UserRole) || UserRole.REGULAR,
                    assignedProjectIds: []
                });
                console.log('✅ Auth: Auto-provisioned profile successfully for', createdProfile.email);
            } else {
                console.error('❌ Auth: Failed to auto-provision profile:', createError);
                setUser(null);
            }
        } catch (error) {
            console.error('❌ Auth: Profile fetch/provisioning error:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) console.error('Error logging in:', error);
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            // Force a hard reload to the login page to clear all local states
            window.location.href = '/login';
        } catch (error) {
            console.error('Error during logout:', error);
            // Fallback redirect even on error
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!session,
            loginWithGoogle,
            logout,
            loading,
            session
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
