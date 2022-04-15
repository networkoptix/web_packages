import type {
    float,
    ms,
    px,
    CanvasGeometry,
} from '@vms-client/utils/type-aliases';

import type { TimeRange } from './TimeRange';

export interface TimelineScrollbarRelativeServiceStatus {
    magnification: float,
    offset: float,
    canScrollLeft: boolean,
    canScrollRight: boolean,
}

export interface TimelineScrollbarAbsoluteServiceStatus extends TimelineScrollbarRelativeServiceStatus {
    isIllusionary: boolean,
    left: px,
    honestLeft: px,
    width: px,
    honestWidth: px,
    isBarGrabbed: boolean,
}

export interface PixelRange {
    left: px,
    right: px,
}

export interface TimelineSelectionServiceStatus {
    isActive: boolean,
    range: TimeRange,
    pixelRange: PixelRange,
}

export interface TimelineServiceStatus {
    fullRange: TimeRange,
    visibleRange: TimeRange,
    canvasGeometry: CanvasGeometry,
    zoom: {
        canZoomIn: boolean,
        canZoomOut: boolean,
    },
    canvasGeometryUpdateRequested: boolean,
}

export interface TimelineTimeUnderMouseServiceStatus {
    isMouseInside: boolean,
    timeUnderMouse: ms,
    offsetX: px,
    pressed: boolean,
}
