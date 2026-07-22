import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaTimes, FaTrophy, FaSignOutAlt, FaGithub, FaEnvelope } from 'react-icons/fa';

type ProfileModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, logout, solvedCount } = useAuth();

    if (!isOpen || !user) return null;

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div
                className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center"
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
                        className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 shadow-xl bg-slate-950"
                    />
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{user.username}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        {user.auth_provider === 'github' ? (
                            <span className="flex items-center gap-1 text-slate-300"><FaGithub /> {user.github_username ?? user.username}</span>
                        ) : (
                            <span className="flex items-center gap-1 text-slate-300"><FaEnvelope /> {user.email}</span>
                        )}
                    </div>
                </div>

                {/* Total Solved Card */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FaTrophy size={22} />
                    </div>
                    <div className="text-left">
                        <span className="block text-2xl font-extrabold text-white tracking-tight">{solvedCount}</span>
                        <span className="text-xs text-slate-400">Total Problems Solved</span>
                    </div>
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
