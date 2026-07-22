import React, { createContext, useContext, useState } from 'react';
import { TrackId, TrackInfo } from '../types';

export const TRACKS: TrackInfo[] = [
    {
        id: 'dsa',
        name: 'Data Structures & Algorithms',
        description: 'Core patterns, LeetCode curated problems, and step-by-step revision guides.',
        icon: '🧠',
        badge: 'Popular',
    },
    {
        id: 'frontend',
        name: 'Frontend Machine Coding',
        description: 'Debounce, throttle, promise polyfills, UI widgets, and DOM algorithms.',
        icon: '🎨',
        badge: 'Hot',
    },
    {
        id: 'sde1',
        name: 'SDE 1 Interview Questions',
        description: 'System design basics, OS/Networking fundamentals, and Object-Oriented Design.',
        icon: '💼',
        badge: 'New',
    },
];

type TrackContextType = {
    activeTrackId: TrackId;
    activeTrack: TrackInfo;
    selectTrack: (trackId: TrackId) => void;
};

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTrackId, setActiveTrackId] = useState<TrackId>('dsa');

    const activeTrack = TRACKS.find((t) => t.id === activeTrackId) || TRACKS[0];

    const selectTrack = (trackId: TrackId) => {
        setActiveTrackId(trackId);
    };

    return (
        <TrackContext.Provider
            value={{
                activeTrackId,
                activeTrack,
                selectTrack,
            }}
        >
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
