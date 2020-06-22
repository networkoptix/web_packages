import { float, int } from "../../numberTypeAliases"


export interface IRangerStatus {
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
