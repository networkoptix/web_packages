import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core'
import { IBasicScrollControls } from '../camera-timeline/timeline/ranger/IRangerControls'
import { float } from '../camera-timeline/timeline/basic_types/numbers'


@Component({
    selector: 'nx-timeline-scroll-button',
    templateUrl: 'timeline-scroll-button.component.html',
    styleUrls: ['timeline-scroll-button.component.scss']
})
export class NxTimelineScrollButtonComponent implements OnChanges, OnInit, OnDestroy {

  @Input() direction: 'left' | 'right'
  @Input() isActive: boolean
  @Input() controls: IBasicScrollControls

  isPressed: boolean = false
  protected MULTIPLIER: float = 0.25

    public ngOnChanges (changes: SimpleChanges) {
      if (changes.isActive) {
        this.reflectIsActiveChange()
      }
    }

    protected reflectIsActiveChange () {
      this.isPressed = false
    }

    public ngOnInit () {
      document.body.addEventListener('mouseup', this.onMouseUp)
      document.body.addEventListener('mouseleave', this.onMouseLeave)

      const onProgress = () => {
        requestAnimationFrame(onProgress)
        if (this.isPressed) {
          // this.controls.fine((this.direction === 'left' ? -1 : 1) * this.MULTIPLIER, false)
          this.controls.screens((this.direction === 'left' ? -1 : 1) * this.MULTIPLIER, false)
        }
      }
      requestAnimationFrame(onProgress)
    }

    public ngOnDestroy () {
      document.body.removeEventListener('mouseup', this.onMouseUp)
      document.body.removeEventListener('mouseleave', this.onMouseLeave)
    }

    public onMouseDown (e: MouseEvent) {
      if (!this.isActive) return
      e.preventDefault()
      e.stopPropagation()
      this.isPressed = true
    }
    public onMouseUp (e: MouseEvent) {
      if (!this.isActive) return
      this.isPressed = false
    }

    public onMouseLeave (e: MouseEvent) {
      if (!this.isActive) return
      this.isPressed = false
    }
}

export default NxTimelineScrollButtonComponent
