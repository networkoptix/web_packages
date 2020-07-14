import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { int } from '../camera-timeline/timeline/basic_types/numbers'
import { timeStampMs } from '../camera-timeline/timeline/basic_types/time'
import ITimeRange from '../camera-timeline/timeline/time_range/ITimeRange'
import * as df from 'dateformat'
const dateformat = df.default || df


enum PLAYBACK_EDGE_CASES {
  LEFT_BEYOND = -3,
  LEFT_EDGE = -2,
  LEFT_FIX = -1,
  NONE = 0,
  RIGHT_FIX = +1,
  RIGHT_EDGE = +2,
  RIGHT_BEYOND = +3,
}

// all distances are measured in DOM logical pixels,
// i.e. not caring about `devicePixelRatio` value
type domPixels = int

@Component({
    selector: 'nx-archive-playback-indicator',
    templateUrl: 'archive-playback-indicator.component.html',
    styleUrls: ['archive-playback-indicator.component.scss']
})
export class NxArchivePlaybackIndicatorComponent implements OnChanges {

    @Input() display: boolean
    @Input() playbackPositionAbsolute: timeStampMs
    @Input() visibleRange: ITimeRange
    @Input() fullRange: ITimeRange
    @Input() canvas: HTMLCanvasElement

    protected MIN_MARGIN_X: domPixels = 20
    protected WHOLE_INDICATOR_HALF_WIDTH: domPixels = 70
    protected ARROW_HALF_WIDTH: domPixels = 10

    protected canvasWidth: domPixels
    protected canvasOffsetLeft: domPixels

    public playbackTime: string
    public playbackDate: string

    public outerOffsetX: domPixels
    public innerOffsetX: domPixels
    public globalOffsetX: domPixels

    public isEdgeCase: PLAYBACK_EDGE_CASES = PLAYBACK_EDGE_CASES.NONE
    public get edgeCaseClass () {
      switch (this.isEdgeCase) {
        case PLAYBACK_EDGE_CASES.LEFT_BEYOND:
          return 'edge-case-left-beyond'
        case PLAYBACK_EDGE_CASES.LEFT_EDGE:
          return 'edge-case-left-edge'
        case PLAYBACK_EDGE_CASES.LEFT_FIX:
          return 'edge-case-left-fix'
        case PLAYBACK_EDGE_CASES.RIGHT_FIX:
          return 'edge-case-right-fix'
        case PLAYBACK_EDGE_CASES.RIGHT_EDGE:
          return 'edge-case-right-edge'
        case PLAYBACK_EDGE_CASES.RIGHT_BEYOND:
          return 'edge-case-right-beyond'
        default:
          return ''
      }
    }

    public ngOnChanges (changes: SimpleChanges) {
      if (changes.playbackPositionAbsolute) {
        this.updateView()
      }
      if (changes.canvas) {
        this.updateCanvasParams()
      }
    }

    protected updateCanvasParams () {
      // TODO: some way to react on possible canvas resize
      this.canvasWidth = this.canvas.getBoundingClientRect().width
      this.canvasOffsetLeft = this.canvas.parentElement.offsetLeft
    }

    protected updateView () {

      // TODO: check whether formats are proper
      this.playbackTime = dateformat(this.playbackPositionAbsolute, "HH:MM:ss")
      this.playbackDate = dateformat(this.playbackPositionAbsolute, "dd mmmm yyyy")

      const pxPerMs = this.canvasWidth / this.visibleRange.duration
      const playbackOffsetX = Math.round((this.playbackPositionAbsolute - this.visibleRange.startTime) * pxPerMs)


      // default case: the arrow is in the center of the indicator
      this.outerOffsetX = Math.round(playbackOffsetX - this.WHOLE_INDICATOR_HALF_WIDTH)
      this.innerOffsetX = Math.round(this.WHOLE_INDICATOR_HALF_WIDTH - this.ARROW_HALF_WIDTH)
      this.isEdgeCase = PLAYBACK_EDGE_CASES.NONE

      this.globalOffsetX = Math.round((this.playbackPositionAbsolute - this.fullRange.startTime) / this.fullRange.duration * this.canvasWidth)
      // console.log('GO', this.globalOffsetX, (this.playbackPositionAbsolute - this.fullRange.startTime) / this.fullRange.duration)

      // checking left side constraints: (read comments below as a continuous sentence)
      if (playbackOffsetX < 0) {
        // playback position could be simply waaay too left, thus invisible;
        this.isEdgeCase = PLAYBACK_EDGE_CASES.LEFT_BEYOND
        this.outerOffsetX = this.MIN_MARGIN_X
        this.innerOffsetX = -this.ARROW_HALF_WIDTH
      } else if (playbackOffsetX < this.MIN_MARGIN_X) {
        // or visible, but really on the edge — on the margin, literally;
        this.isEdgeCase = PLAYBACK_EDGE_CASES.LEFT_EDGE
        this.outerOffsetX = this.MIN_MARGIN_X
        this.innerOffsetX = playbackOffsetX - this.MIN_MARGIN_X
      } else if (playbackOffsetX < this.MIN_MARGIN_X + this.WHOLE_INDICATOR_HALF_WIDTH) {
        // or still in the area of the indicator, but left from its center.
        this.isEdgeCase = PLAYBACK_EDGE_CASES.LEFT_FIX
        this.outerOffsetX = this.MIN_MARGIN_X
        this.innerOffsetX = playbackOffsetX - this.MIN_MARGIN_X
      }
      // at the moment, two latter cases result in the same output, but it's a very likely subject for changes


      // same logic applies to the right side
      if (playbackOffsetX > this.canvasWidth) {
        this.isEdgeCase = PLAYBACK_EDGE_CASES.RIGHT_BEYOND
        this.outerOffsetX = this.canvasWidth - this.MIN_MARGIN_X - 2 * this.WHOLE_INDICATOR_HALF_WIDTH
        this.innerOffsetX = 2 * this.WHOLE_INDICATOR_HALF_WIDTH
      } else if (playbackOffsetX > this.canvasWidth - this.MIN_MARGIN_X) {
        this.isEdgeCase = PLAYBACK_EDGE_CASES.RIGHT_EDGE
        this.outerOffsetX = this.canvasWidth - this.MIN_MARGIN_X - 2 * this.WHOLE_INDICATOR_HALF_WIDTH
        this.innerOffsetX = 2 * this.WHOLE_INDICATOR_HALF_WIDTH + (playbackOffsetX - (this.canvasWidth - this.MIN_MARGIN_X))
      } else if (playbackOffsetX > this.canvasWidth - this.MIN_MARGIN_X - this.WHOLE_INDICATOR_HALF_WIDTH) {
        this.isEdgeCase = PLAYBACK_EDGE_CASES.RIGHT_FIX
        this.outerOffsetX = this.canvasWidth - this.MIN_MARGIN_X - 2 * this.WHOLE_INDICATOR_HALF_WIDTH
        this.innerOffsetX = 2 * this.WHOLE_INDICATOR_HALF_WIDTH + (playbackOffsetX - (this.canvasWidth - this.MIN_MARGIN_X))
      }


      // finally, taking global canvas positioning into account
      this.outerOffsetX += this.canvasOffsetLeft
      this.globalOffsetX += this.canvasOffsetLeft
    }
}

export default NxArchivePlaybackIndicatorComponent
