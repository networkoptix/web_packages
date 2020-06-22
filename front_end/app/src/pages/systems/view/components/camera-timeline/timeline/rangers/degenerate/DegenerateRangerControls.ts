import IRangerControls from "../abstract/IRangerControls"
import DegenerateRanger from "./DegenerateRanger"
import { int, float, durationMs } from "../../numberTypeAliases"


export class DegenerateRangerControls implements IRangerControls {

    constructor (
        protected ranger: DegenerateRanger,
    ) {
    }

    public readonly zoom = {
        reset: () => false,
        atCenter: {
            double: () => false,
            halve: () => false,
            fine: (steps: int) => false,
        },
        atLeftEdge: {
            double: () => false,
            halve: () => false,
            fine: (steps: int) => false,
        },
        atRightEdge: {
            double: () => false,
            halve: () => false,
            fine: (steps: int) => false,
        },
        atPosition: {
            double: (position: float) => false,
            halve: (position: float) => false,
            fine: (position: float, steps: int) => false,
        },
    }

    public readonly scroll = {
        max: (direction: int = 1) => false,
        screens: (screens: int = 1) => false,
        fine: (steps: int = 1) => false,
        jump: {
            relative: (targetRelativeOffset: float, skipAnimation: boolean = false) => false,
            duration: (duration: durationMs, skipAnimation: boolean) => false,
        }
    }
}

export default DegenerateRangerControls
