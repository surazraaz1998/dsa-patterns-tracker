import React from 'react';
import { useTrack } from '../context/TrackContext';
import { TrackId } from '../types';

export const TrackSelector: React.FC = () => {
    const { tracks, activeTrack, selectTrack } = useTrack();

    const handleSelect = (id: TrackId) => {
        selectTrack(id);
    };

    return (
        <div className="w-full min-w-0 flex items-center justify-center">
            {/* Segmented Control Bar */}
            <div className="w-full min-w-0 flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-1 shadow-inner gap-1 overflow-x-auto no-scrollbar">
                {tracks.map((track) => {
                    const isActive = activeTrack.id === track.id;
                    return (
                        <button
                            key={track.id}
                            type="button"
                            onClick={() => handleSelect(track.id)}
                            title={track.description}
                            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                            }`}
                        >
                            <span className="text-sm">{track.icon}</span>
                            <span>{track.name}</span>
                        </button>
                    );
                })}

            </div>
        </div>
    );
};
