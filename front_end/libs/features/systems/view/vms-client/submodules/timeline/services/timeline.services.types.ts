import type { float, ms, px, CanvasGeometry } from '@vms-client/utils/type-aliases';

import type { TimeRange } from './TimeRange';

export interface TimelineScrollbarRelativeServiceStatus {
    magnification: float;
    offset: float;
    canScrollLeft: boolean;
    canScrollRight: boolean;
}

export interface TimelineScrollbarAbsoluteServiceStatus extends TimelineScrollbarRelativeServiceStatus {
    isIllusionary: boolean;
    left: px;
    honestLeft: px;
    width: px;
    honestWidth: px;
    isBarGrabbed: boolean;
}

export interface PixelRange {
    left: px;
    right: px;
}

export interface TimelineSelectionServiceStatus {
    isActive: boolean;
    range: TimeRange;
    pixelRange: PixelRange;
    dragMode: number;
    hoverMode: boolean;
}

export interface TimelineServiceStatus {
    fullRange: TimeRange;
    visibleRange: TimeRange;
    canvasGeometry: CanvasGeometry;
    zoom: {
        canZoomIn: boolean;
        canZoomOut: boolean;
    };
    canvasGeometryUpdateRequested: boolean;
}

export interface TimelineTimeUnderMouseServiceStatus {
    isMouseInside: boolean;
    timeUnderMouse: ms;
    offsetX: px;
    pressed: boolean;
}

export enum SELECTION_DRAG_MODE {
    NO_DRAGGING = 0,
    DRAGGING_BACKGROUND = 1,
    DRAGGING_LEFT_EAR = 2,
    DRAGGING_RIGHT_EAR = 3,
    DRAGGING_SELECTED_RANGE = 4,
}
