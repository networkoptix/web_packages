import { int, float, durationMs, timeStampMs } from "../../numberTypeAliases"


export interface IBasicZoomControls {
    double: (skipAnimation: boolean) => boolean,
    halve: (skipAnimation: boolean) => boolean,
    fine: (steps: int, skipAnimation: boolean) => boolean,
}

export interface IBasicScrollControls {
    max: (direction: int, skipAnimation: boolean) => boolean,
    screens: (screens: int, skipAnimation: boolean) => boolean,
    fine: (steps: int, skipAnimation: boolean) => boolean,
    jump: {
      relative: (targetRelativeOffset: float, skipAnimation: boolean) => boolean,
      duration: (duration: durationMs, skipAnimation: boolean) => boolean,
    }
}

export interface IRangerControls {
    zoom: {
        reset: () => boolean,
        atCenter: IBasicZoomControls,
        atLeftEdge: IBasicZoomControls,
        atRightEdge: IBasicZoomControls,
        atPosition: {
            double: (position: float, skipAnimation: boolean) => boolean,
            halve: (position: float, skipAnimation: boolean) => boolean,
            fine: (position: float, steps: int, skipAnimation: boolean) => boolean,
        },
    },
    scroll: IBasicScrollControls
}

export default IRangerControls
