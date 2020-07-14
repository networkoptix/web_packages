import Ranger from "./Ranger"
import IRangerStatus from "./IRangerStatus"


/**
 * It is exactly what it looks like: the interface-compliant
 * "control monitor", or "readonly state API" for the Ranger class.
 * Basically, it just redirects incoming getter calls to private'ish
 * mechanisms of the Ranger class.
 */
export class RangerStatus implements IRangerStatus {

    constructor (
        protected ranger: Ranger,
    ) {
    }
    
    public get zoom () {
        const factor = this.ranger.fullRange.duration / this.ranger.visibleRange.duration
        return {
            factor,
            // @ts-ignore
            isMax: (this.ranger.visibleRange.duration / (this.ranger.canvasWidth * (
                (typeof(window) === 'object' ? window.devicePixelRatio : 1)
            ))) <= 1,
            isMin: factor <= 1.01

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
            isMin: absOffset <= 60 * 1000,
        }
        return result
    }

    public get resolution () {
        return {
            pxPerMs: this.ranger.canvasWidth / this.ranger.visibleRange.duration,
            msPerPx: this.ranger.visibleRange.duration / this.ranger.canvasWidth,
        }
    }
}

export default RangerStatus
