import React from 'react';
import { Visual } from '../types';
import { SortingVisualizer } from './SortingVisualizer';
import { StructureVisualizer } from './StructureVisualizer';

/** Renders the interactive visual a lesson section asks for; unknown types render nothing. */
export const VisualFor: React.FC<{ visual: Visual }> = ({ visual }) =>
    visual.type === 'sorting'
        ? <SortingVisualizer algorithm={visual.algorithm} />
        : <StructureVisualizer type={visual.type} algorithm={visual.algorithm} options={visual.options} />;
