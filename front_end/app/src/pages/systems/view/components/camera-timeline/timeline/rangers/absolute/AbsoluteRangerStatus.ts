import AbsoluteRanger from "./AbsoluteRanger"
import IRangerStatus from "../abstract/IRangerStatus"


export class AbsoluteRangerStatus implements IRangerStatus {

    constructor (
        protected ranger: AbsoluteRanger,
    ) {
    }
    
    public get zoom () {
        const factor = this.ranger.fullRange.duration / this.ranger.visibleRange.duration
        return {
            factor,
            // @ts-ignore
            isMax: this.ranger.visibleRange.duration / this.ranger.ctx.canvas.width <= 1,
            isMin: factor <= 1

        }
    }

    public get scroll () {
        const absOffset = (this.ranger.visibleRange.startTime - this.ranger.fullRange.startTime)
        const result = {
            offset: {
                relative: absOffset / this.ranger.fullRange.duration,
                absolute: absOffset
            },
            isMax: absOffset >= this.ranger.fullRange.duration - this.ranger.visibleRange.duration,
            isMin: absOffset <= 0,
        }
        return result
    }
}

export default AbsoluteRangerStatus
