import DegenerateRanger from "./DegenerateRanger"
import IRangerStatus from "../abstract/IRangerStatus"


export class DegenerateRangerStatus implements IRangerStatus {

    constructor (
        protected ranger: DegenerateRanger,
    ) {
    }
    
    public readonly zoom = {
        factor: 1,        
        isMax: true,
        isMin: true,
    }

    public readonly scroll = {
        offset: {
            relative: 0,
            absolute: 0
        },
        isMax: true,
        isMin: true,
    }
}

export default DegenerateRangerStatus
