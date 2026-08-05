
'use client';

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { Plus, Mail, Shield, User as UserIcon, MoreHorizontal, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/utils/supabase';

interface WhitelistUser {
    email: string;
    role: string;
    created_at: string;
}

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [profiles, setProfiles] = useState<User[]>([]);
    const [whitelist, setWhitelist] = useState<WhitelistUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        role: UserRole.REGULAR
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser?.role === UserRole.ADMIN) {
            fetchData();
        }
    }, [currentUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch profiles (logged in users)
            const { data: profileData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (pError) throw pError;

            // Fetch whitelist (authorized emails)
            const { data: whitelistData, error: wError } = await supabase
                .from('allowed_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (wError) throw wError;

            setProfiles(profileData.map(p => ({
                id: p.id,
                name: p.full_name || 'New User',
                email: p.email,
                role: p.role as UserRole,
                avatarUrl: p.avatar_url,
                assignedProjectIds: []
            })));

            setWhitelist(whitelistData);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { error: insertError } = await supabase
                .from('allowed_users')
                .insert([{
                    email: newUser.email.toLowerCase().trim(),
                    role: newUser.role
                }]);

            if (insertError) {
                if (insertError.code === '23505') {
                    setError('This email is already whitelisted.');
                } else {
                    throw insertError;
                }
                return;
            }

            setShowModal(false);
            setNewUser({ email: '', role: UserRole.REGULAR });
            fetchData();
        } catch (err) {
            console.error('Error whitelisting user:', err);
            setError('Failed to grant access. Please try again.');
        }
    };

    const handleDeleteUser = async (email: string, profileId?: string) => {
        const confirmMsg = profileId
            ? `Are you sure? This will delete ${email}'s profile and revoke their login access. Projects they created will become ownerless.`
            : `Are you sure you want to revoke access for ${email}?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            // 1. Remove from Whitelist
            const { error: wError } = await supabase
                .from('allowed_users')
                .delete()
                .eq('email', email);
            if (wError) throw wError;

            // 2. If they have a profile, clean up
            if (profileId) {
                // Set projects to NULL owner instead of deleting them
                const { error: pUpdateError } = await supabase
                    .from('projects')
                    .update({ created_by: null })
                    .eq('created_by', profileId);

                if (pUpdateError) console.warn('Could not detach projects:', pUpdateError);

                // Delete the profile
                const { error: pDeleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', profileId);

                if (pDeleteError) throw pDeleteError;
            }

            fetchData();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert(`Failed to delete user: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (currentUser?.role !== UserRole.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Shield size={48} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
                <p className="text-slate-500">You don't have permission to access user management.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Access Control</h2>
                    <p className="text-slate-500 text-sm">Manage the secure whitelist for your organization.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <Plus size={20} />
                    Grant New Access
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <UserIcon className="text-indigo-500" size={18} />
                                Active Profiles
                            </h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase">
                                {profiles.length} Users Logged In
                            </span>
                        </div>
                        {loading ? (
                            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="animate-spin mb-4" size={32} />
                                <p className="font-medium">Fetching active users...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {profiles.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {p.avatarUrl ? (
                                                            <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                                                {p.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-bold text-slate-800">{p.name}</p>
                                                            <p className="text-xs text-slate-500">{p.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                        {p.role === UserRole.ADMIN ? <Shield size={10} /> : <UserIcon size={10} />}
                                                        {p.role}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(p.email, p.id)}
                                                        disabled={p.email === currentUser?.email}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Shield className="text-indigo-400" size={20} />
                            Authorized Whitelist
                        </h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            These emails are pre-authorized to join via Google. If an email isn't on this list, they cannot log in.
                        </p>
                        <div className="space-y-3">
                            {whitelist.map(entry => (
                                <div key={entry.email} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 group">
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold truncate">{entry.email}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{entry.role}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUser(entry.email)}
                                        disabled={entry.email === currentUser.email}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:hidden"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Plus size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Grant Access</h2>
                                <p className="text-slate-500 text-sm">Add a user to the secure whitelist.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in shake duration-300">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleGrantAccess} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Google Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="email"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                        placeholder="user@gmail.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Level</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none"
                                    >
                                        <option value={UserRole.REGULAR}>Regular User</option>
                                        <option value={UserRole.ADMIN}>Super Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                                >
                                    Authorize User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
