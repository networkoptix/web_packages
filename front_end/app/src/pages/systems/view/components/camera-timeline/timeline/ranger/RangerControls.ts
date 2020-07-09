import IRangerControls from "./IRangerControls"
import Ranger from "./Ranger"
import { int, float } from '../basic_types/numbers'
import { durationMs, timeStampMs } from '../basic_types/time'


/**
 * It is exactly what it looks like: the interface-compliant
 * "control panel", or "change-request API" for the Ranger class.
 * Basically, it just redirects incoming calls to private'ish
 * methods of the Ranger class.
 */
export class RangerControls implements IRangerControls {

    constructor (
        protected ranger: Ranger,
    ) {
    }

    public readonly zoom = {
        reset: () =>
            this.ranger.zoomReset(),
        atCenter: {
            max: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'center', steps: Infinity, mode: 'max' }),
            double: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'center', steps: 1, mode: 'screens' }, skipAnimation),
            halve: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'center', steps: -1, mode: 'screens' }, skipAnimation),
            fine: (steps: int, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'center', steps, mode: 'fine' }, skipAnimation),
        },
        atLeftEdge: {
            max: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'left', steps: Infinity, mode: 'max' }),
            double: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'left', steps: 1, mode: 'screens' }, skipAnimation),
            halve: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'left', steps: -1, mode: 'screens' }, skipAnimation),
            fine: (steps: int, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'left', steps, mode: 'fine' }, skipAnimation),
        },
        atRightEdge: {
            max: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'right', steps: Infinity, mode: 'max' }),
            double: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'right', steps: 1, mode: 'screens' }, skipAnimation),
            halve: (skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'right', steps: -1, mode: 'screens' }, skipAnimation),
            fine: (steps: int, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position: 'right', steps, mode: 'fine' }, skipAnimation),
        },
        atPosition: {
            max: (position: float, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position, steps: Infinity, mode: 'max' }),
            double: (position: float, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position, steps: 1, mode: 'screens' }, skipAnimation),
            halve: (position: float, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position, steps: -1, mode: 'screens' }, skipAnimation),
            fine: (position: float, steps: int, skipAnimation: boolean = false) =>
                this.ranger.zoom({ position, steps, mode: 'fine' }, skipAnimation),
        },
    }

    public readonly scroll = {
        max: (direction: int = 1, skipAnimation: boolean = false) =>
            this.ranger.scroll({ steps: direction, mode: 'max' }, skipAnimation),
        screens: (screens: int = 1, skipAnimation: boolean = false) =>
            this.ranger.scroll({ steps: screens, mode: 'screens' }, skipAnimation),
        fine: (steps: int = 1, skipAnimation: boolean = false) =>
            this.ranger.scroll({ steps, mode: 'fine' }, skipAnimation),
        jump: {
          relative: (targetRelativeOffset: float, skipAnimation: boolean = false) =>
            this.ranger.scrollJumpRelative(targetRelativeOffset, skipAnimation),
          duration: (duration: durationMs, skipAnimation: boolean = false) =>
            this.ranger.scrollJumpDuration(duration, skipAnimation),
        }
    }
}

export default RangerControls
