import React from 'react';
import { TRACKS, useTrack } from '../context/TrackContext';
import { TrackId } from '../types';

export const TrackSelector: React.FC = () => {
    const { activeTrack, selectTrack } = useTrack();

    const handleSelect = (id: TrackId) => {
        selectTrack(id);
    };

    return (
        <div className="w-full flex items-center justify-center">
            {/* Segmented Control Bar */}
            <div className="w-full flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-1 shadow-inner gap-1 overflow-x-auto no-scrollbar">
                {TRACKS.map((track) => {
                    const isActive = activeTrack.id === track.id;
                    return (
                        <button
                            key={track.id}
                            type="button"
                            onClick={() => handleSelect(track.id)}
                            title={track.description}
                            className={`flex-1 min-w-max inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                            }`}
                        >
                            <span className="text-sm">{track.icon}</span>
                            <span>{track.name}</span>
                            {track.badge && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {track.badge}
                                </span>
                            )}
                        </button>
                    );
                })}

                <div className="flex-1 min-w-max inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 opacity-60 cursor-default">
                    <span className="text-xs">🚀</span>
                    <span>System Design</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Soon</span>
                </div>
            </div>
        </div>
    );
};
