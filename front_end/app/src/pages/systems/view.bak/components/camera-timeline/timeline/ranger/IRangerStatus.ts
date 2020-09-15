import { int, float } from '../basic_types/numbers'

/**
 * This interface is supposed to be implemented lazily.
 * Basically, it's a formaly-defined read-only ranger state.
 */
export interface IRangerStatus {
    resolution: {
        pxPerMs: float,
        msPerPx: float,
    },
    zoom: {
        factor: float,        
        isMax: boolean, // a.k.a. "can zoom in?"
        isMin: boolean, // a.k.a. "can zoom out?"
    },
    scroll: {
        offset: {
            relative: float,
            absolute: int
        },
        isMax: boolean, // a.k.a. "can scroll right?"
        isMin: boolean, // a.k.a. "can scroll left?"
    }
}

export default IRangerStatus
