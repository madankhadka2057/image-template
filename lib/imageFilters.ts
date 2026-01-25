/**
 * Image Filters Utility
 * Provides various filter effects for images
 */

export interface FilterPreset {
    name: string;
    filter: string;
    description: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
    {
        name: 'None',
        filter: 'none',
        description: 'Original image',
    },
    {
        name: 'Grayscale',
        filter: 'grayscale(100%)',
        description: 'Black and white',
    },
    {
        name: 'Sepia',
        filter: 'sepia(100%)',
        description: 'Vintage brown tone',
    },
    {
        name: 'Bright',
        filter: 'brightness(130%)',
        description: 'Increase brightness',
    },
    {
        name: 'High Contrast',
        filter: 'contrast(150%)',
        description: 'Boost contrast',
    },
    {
        name: 'Saturate',
        filter: 'saturate(150%)',
        description: 'Vivid colors',
    },
    {
        name: 'Vintage',
        filter: 'sepia(50%) contrast(120%) brightness(110%)',
        description: 'Retro look',
    },
    {
        name: 'Cool',
        filter: 'hue-rotate(180deg) saturate(120%)',
        description: 'Cool blue tones',
    },
    {
        name: 'Warm',
        filter: 'sepia(30%) saturate(130%)',
        description: 'Warm orange tones',
    },
];

/**
 * Apply filter to canvas context
 */
export function applyFilter(
    ctx: CanvasRenderingContext2D,
    filterString: string
) {
    ctx.filter = filterString;
}

/**
 * Reset filter
 */
export function resetFilter(ctx: CanvasRenderingContext2D) {
    ctx.filter = 'none';
}
