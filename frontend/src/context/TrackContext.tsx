import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { TrackId, TrackInfo } from '../types';

// Shown until /tracks responds (or if the backend is unreachable). The backend
// list is generated from content/*.json, so new tracks appear automatically.
export const FALLBACK_TRACKS: TrackInfo[] = [
    { id: 'dsa', name: 'DSA Patterns', description: 'Core patterns, curated LeetCode problems, and revision guides.', icon: '🧠', badge: 'Popular' },
    { id: 'system-design', name: 'System Design', description: 'HLD + LLD: framework, building blocks, case studies.', icon: '🏗️', badge: 'New' },
    { id: 'frontend', name: 'Frontend & Machine Coding', description: 'JavaScript internals, React, polyfills and UI rounds.', icon: '🎨', badge: 'Hot' },
    { id: 'cs-fundamentals', name: 'CS Fundamentals', description: 'OS, DBMS/SQL and Computer Networks.', icon: '💻' },
    { id: 'behavioral', name: 'Behavioral & HR', description: 'STAR stories, job-switch questions and negotiation.', icon: '🤝' },
];

type TrackContextType = {
    tracks: TrackInfo[];
    activeTrackId: TrackId;
    activeTrack: TrackInfo;
    selectTrack: (trackId: TrackId) => void;
};

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tracks, setTracks] = useState<TrackInfo[]>(FALLBACK_TRACKS);
    const [activeTrackId, setActiveTrackId] = useState<TrackId>('dsa');

    useEffect(() => {
        api.getTracks()
            .then((data) => {
                if (data.length > 0) setTracks(data);
            })
            .catch(() => {});
    }, []);

    const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

    return (
        <TrackContext.Provider value={{ tracks, activeTrackId, activeTrack, selectTrack: setActiveTrackId }}>
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = (): TrackContextType => {
    const context = useContext(TrackContext);
    if (!context) {
        throw new Error('useTrack must be used within a TrackProvider');
    }
    return context;
};
