import { deg, px, rad } from './types';

function degToRad(x: deg): rad {
    return (Math.PI / 180) * x;
}

const cache: Record<string, number> = {};

export function getSlopeWidth(angle: deg, h: px): number {
    const cacheKey = `(${angle}, ${h})`;
    if (cacheKey in cache) {
        return cache[cacheKey];
    }
    const slope = degToRad(angle);
    const result = Math.round(h / Math.tan(slope));
    cache[cacheKey] = result;
    return result;
}
