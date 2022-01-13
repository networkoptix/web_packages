import TimelineExtendToNowService from './timeline.extend-to-now.service';
import TimelineScrollbarAbsoluteService from './timeline.scrollbarAbsolute.service';
import TimelineScrollbarRelativeService from './timeline.scrollbarRelative.service';
import TimelineSelectionService from './timeline.selection.service';
import TimelineService from './timeline.service';
import TimelineTimeUnderMouseService from './timeline.time-under-mouse.service';
import TimelineWheelHandlerService from './timeline.wheel-handler.service';

export default [
    TimelineService,
    TimelineExtendToNowService,
    TimelineScrollbarRelativeService,
    TimelineScrollbarAbsoluteService,
    TimelineSelectionService,
    TimelineTimeUnderMouseService,
    TimelineWheelHandlerService
];
