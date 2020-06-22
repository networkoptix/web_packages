import IRangerControls from "../abstract/IRangerControls"
import AbsoluteRanger from "./AbsoluteRanger"
import { int, float, timeStampMs, durationMs } from "../../numberTypeAliases"


export class AbsoluteRangerControls implements IRangerControls {

    constructor (
        protected ranger: AbsoluteRanger,
    ) {
    }

    public readonly zoom = {
        reset: () => { console.log('here'); return this.ranger.zoomReset() },
        atCenter: {
            double: (skipAnimation: boolean = false) => false,
            halve: (skipAnimation: boolean = false) => false,
            fine: (steps: int, skipAnimation: boolean = false) => this.ranger.zoom({ position: 'center', steps, mode: 'screens' }, skipAnimation),
        },
        atLeftEdge: {
            double: (skipAnimation: boolean = false) => false,
            halve: (skipAnimation: boolean = false) => false,
            fine: (steps: int, skipAnimation: boolean = false) => false,
        },
        atRightEdge: {
            double: (skipAnimation: boolean = false) => false,
            halve: (skipAnimation: boolean = false) => false,
            fine: (steps: int, skipAnimation: boolean = false) => false,
        },
        atPosition: {
            double: (position: float, skipAnimation: boolean = false) => false,
            halve: (position: float, skipAnimation: boolean = false) => false,
            fine: (position: float, steps: int, skipAnimation: boolean = false) => this.ranger.zoom({ position, steps, mode: 'fine' }, skipAnimation),
        },
    }

    public readonly scroll = {
        max: (direction: int = 1, skipAnimation: boolean = false) => this.ranger.scroll({ steps: direction, mode: 'max' }, skipAnimation),
        screens: (screens: int = 1, skipAnimation: boolean = false) => this.ranger.scroll({ steps: screens, mode: 'screens' }, skipAnimation),
        fine: (steps: int = 1, skipAnimation: boolean = false) => this.ranger.scroll({ steps, mode: 'fine' }, skipAnimation),
        jump: {
          relative: (targetRelativeOffset: float, skipAnimation: boolean = false) => this.ranger.scrollJumpRelative(targetRelativeOffset, skipAnimation),
          duration: (duration: durationMs, skipAnimation: boolean = false) => this.ranger.scrollJumpDuration(duration, skipAnimation),
        }
    }
}

export default AbsoluteRangerControls
