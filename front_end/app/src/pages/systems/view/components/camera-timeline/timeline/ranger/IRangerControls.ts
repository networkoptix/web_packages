import { int, float } from '../basic_types/numbers'
import { durationMs, timeStampMs } from '../basic_types/time'


/**
 * Zooming operation is parametrized it differs by :
 * * the anchor position (see below)
 * * the amount of zoom level change requested (this interface's goal)
 */
export interface IBasicZoomControls {
    max: (skipAnimation: boolean) => boolean,
    double: (skipAnimation: boolean) => boolean,
    halve: (skipAnimation: boolean) => boolean,
    fine: (steps: int, skipAnimation: boolean) => boolean,
}

/**
 * Scrolling operation is defined by scroll direction and scroll amplitude.
 * Also, apart from relative steps, jumps are possible.
 */
export interface IBasicScrollControls {
    max: (direction: int, skipAnimation: boolean) => boolean,
    screens: (screens: int, skipAnimation: boolean) => boolean,
    fine: (steps: int, skipAnimation: boolean) => boolean,
    jump: {
      relative: (targetRelativeOffset: float, skipAnimation: boolean) => boolean,
      duration: (duration: durationMs, skipAnimation: boolean) => boolean,
    }
}

/**
 * Scrolling and Zooming features together form the Ranger's primary responsibility.
 */
export interface IRangerControls {
    zoom: {
        reset: () => boolean,
        atCenter: IBasicZoomControls,
        atLeftEdge: IBasicZoomControls,
        atRightEdge: IBasicZoomControls,
        atPosition: {
            max: (position: float, skipAnimation: boolean) => boolean,
            double: (position: float, skipAnimation: boolean) => boolean,
            halve: (position: float, skipAnimation: boolean) => boolean,
            fine: (position: float, steps: int, skipAnimation: boolean) => boolean,
        },
    },
    scroll: IBasicScrollControls
}

export default IRangerControls
