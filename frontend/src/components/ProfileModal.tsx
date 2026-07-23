import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaTimes, FaTrophy, FaSignOutAlt, FaGithub, FaEnvelope, FaSync, FaSave, FaCheck, FaExclamationCircle } from 'react-icons/fa';

type ProfileModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, logout, solvedCount, updateProfile, syncLeetCode } = useAuth();
    const [leetcodeHandle, setLeetcodeHandle] = useState<string>(user?.leetcode_username || '');
    const [gfgHandle, setGfgHandle] = useState<string>(user?.gfg_username || '');
    const [isSavingHandle, setIsSavingHandle] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [savedHandleSuccess, setSavedHandleSuccess] = useState<boolean>(false);

    // Ensure state syncs whenever user updates
    useEffect(() => {
        if (user) {
            setLeetcodeHandle(user.leetcode_username || '');
            setGfgHandle(user.gfg_username || '');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleLogout = () => {
        logout();
        onClose();
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingHandle(true);
        setSyncMessage(null);
        try {
            await updateProfile({
                leetcode_username: leetcodeHandle.trim() || undefined,
                gfg_username: gfgHandle.trim() || undefined,
            });
            setSavedHandleSuccess(true);
            setTimeout(() => setSavedHandleSuccess(false), 2000);
        } catch (err: any) {
            setSyncMessage({ type: 'error', text: err.message || 'Failed to update profile handles' });
        } finally {
            setIsSavingHandle(false);
        }
    };

    const handleSyncLeetCode = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const result = await syncLeetCode(leetcodeHandle);
            setSyncMessage({
                type: 'success',
                text: `Successfully synced ${result.synced_count} solved ${result.synced_count === 1 ? 'problem' : 'problems'} from LeetCode!`
            });
        } catch (err: any) {
            setSyncMessage({ type: 'error', text: err.message || 'Failed to sync LeetCode' });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-center max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                >
                    <FaTimes size={14} />
                </button>

                {/* Avatar & Info */}
                <div className="flex flex-col items-center gap-2">
                    <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-16 h-16 rounded-full object-cover border-4 border-blue-500 shadow-xl bg-slate-950"
                    />
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{user.username}</h3>
                    
                    <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                        {user.auth_provider === 'github' ? (
                            <span className="flex items-center gap-1 text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                                <FaGithub /> {user.github_username ?? user.username}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                                <FaEnvelope /> {user.email}
                            </span>
                        )}
                        {user.leetcode_username && (
                            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-semibold">
                                🟠 {user.leetcode_username}
                            </span>
                        )}
                        {user.gfg_username && (
                            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                                🟢 {user.gfg_username}
                            </span>
                        )}
                    </div>
                </div>

                {/* Total Solved Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FaTrophy size={18} />
                    </div>
                    <div className="text-left">
                        <span className="block text-xl font-extrabold text-white tracking-tight">{solvedCount}</span>
                        <span className="text-[11px] text-slate-400">Total Problems Solved</span>
                    </div>
                </div>

                {/* Coding Profiles & Sync Section */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/20 text-left space-y-3.5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FaSync /> Linked Coding Profiles
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-normal">
                        Save your LeetCode & GeeksForGeeks usernames to sync progress across platforms.
                    </p>

                    <form onSubmit={handleSaveProfile} className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-amber-400 mb-1">🟠 LeetCode Username</label>
                            <input
                                type="text"
                                value={leetcodeHandle}
                                onChange={(e) => setLeetcodeHandle(e.target.value)}
                                placeholder="e.g. john_leetcode"
                                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-emerald-400 mb-1">🟢 GeeksForGeeks Username</label>
                            <input
                                type="text"
                                value={gfgHandle}
                                onChange={(e) => setGfgHandle(e.target.value)}
                                placeholder="e.g. john_gfg"
                                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isSavingHandle}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                {savedHandleSuccess ? <FaCheck className="text-emerald-300" /> : <FaSave />}
                                {savedHandleSuccess ? 'Saved ✓' : 'Save Handles'}
                            </button>

                            <button
                                type="button"
                                onClick={handleSyncLeetCode}
                                disabled={isSyncing || !leetcodeHandle.trim()}
                                className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                                    isSyncing || !leetcodeHandle.trim()
                                        ? 'bg-slate-800 text-slate-500 border border-slate-700'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                                }`}
                            >
                                <FaSync className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Syncing...' : 'Sync LeetCode'}
                            </button>
                        </div>
                    </form>

                    {syncMessage && (
                        <div
                            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                                syncMessage.type === 'success'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                            }`}
                        >
                            {syncMessage.type === 'success' ? <FaCheck className="shrink-0" /> : <FaExclamationCircle className="shrink-0" />}
                            <span>{syncMessage.text}</span>
                        </div>
                    )}
                </div>

                {/* Log Out */}
                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                    <FaSignOutAlt size={14} /> Log Out
                </button>
            </div>
        </div>
    );
};
