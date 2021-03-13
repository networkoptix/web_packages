import TimelineService from './timeline.service'
import TimelineExtendToNowService from './timeline.extend-to-now.service'
import TimelineScrollbarService from './timeline.scrollbar.service'
import TimelineSelectionService from './timeline.selection.service'
import TimelineTimeUnderMouseService from './timeline.time-under-mouse.service'
import TimelineWheelHandlerService from './timeline.wheel-handler.service'

export default [
  TimelineService,
  TimelineExtendToNowService,
  TimelineScrollbarService,
  TimelineSelectionService,
  TimelineTimeUnderMouseService,
  TimelineWheelHandlerService,
]
