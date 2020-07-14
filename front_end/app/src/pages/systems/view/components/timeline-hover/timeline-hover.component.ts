import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { int, float } from '../camera-timeline/timeline/basic_types/numbers'
import { timeStampMs } from '../camera-timeline/timeline/basic_types/time'
import * as df from 'dateformat'
const dateformat = df.default || df


// all distances are measured in DOM logical pixels,
// i.e. not caring about `devicePixelRatio` value
type domPixels = int

@Component({
    selector: 'nx-timeline-hover',
    templateUrl: 'timeline-hover.component.html',
    styleUrls: ['timeline-hover.component.scss']
})
export class NxTimelineHoverComponent implements OnChanges {

    @Input() relativeX: float
    @Input() time: timeStampMs    

    public playbackTime: string
    public playbackDate: string
    
    protected outerOffsetLeft: domPixels
    protected innerOffsetLeft: domPixels
    protected INDICATOR_WIDTH: domPixels = 140
    protected ARROW_WIDTH: domPixels = 20
    protected MIN_MARGIN: domPixels = 20
    protected hideMe: boolean = false

    public ngOnChanges (changes: SimpleChanges) {
      if (changes.time) {
        this.updateView()
      }
    }

    protected updateView () {

      // TODO: check whether formats are proper
      this.playbackTime = dateformat(this.time, "HH:MM:ss")
      this.playbackDate = dateformat(this.time, "dd mmmm yyyy")
      
      const canvasWidth = this.canvas.getBoundingClientRect().width
      this.outerOffsetLeft = Math.round(
        canvasWidth * this.relativeX -
        this.INDICATOR_WIDTH / 2
      )
      this.innerOffsetLeft = (this.INDICATOR_WIDTH - this.ARROW_WIDTH) / 2

      const minOuterOffset = this.MIN_MARGIN
      const maxOuterOffset = (canvasWidth - this.MIN_MARGIN - this.INDICATOR_WIDTH)

      this.hideMe = (minOuterOffset - this.outerOffsetLeft > (this.INDICATOR_WIDTH - this.ARROW_WIDTH) / 2) ||
        (this.outerOffsetLeft - maxOuterOffset > (this.INDICATOR_WIDTH - this.ARROW_WIDTH) / 2)
      
      if (!this.hideMe) {
        if (this.outerOffsetLeft < minOuterOffset) {
          const diff = minOuterOffset - this.outerOffsetLeft
          this.outerOffsetLeft = minOuterOffset
          this.innerOffsetLeft -= diff
        } else if (this.outerOffsetLeft > maxOuterOffset) {
          const diff = this.outerOffsetLeft - maxOuterOffset
          this.outerOffsetLeft = maxOuterOffset
          this.innerOffsetLeft += diff
        }
      }
    }

    public get canvas () {
      return document.getElementById('timeline-canvas')
    }
}

export default NxTimelineHoverComponent
