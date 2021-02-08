import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, OnInit, HostListener } from '@angular/core';
import { Subscription } from 'rxjs'
import PlaybackService from '../../../playback/services/playback.service'
import { PlaybackState, PLAYBACK_MODE } from '../../../playback/datatypes/PlaybackState'

import {
  TimelineScrollbarService,
  TimelineScrollbarServiceStatus
} from '../../services/timeline.scrollbar.service'
import TimelineService from '../../services/timeline.service';
import { float, percentage } from '../../../../utils/type-aliases';


const MIN_BAR_WIDTH_PX = 50


@Component({
  selector: 'timeline-scrollbar',
  templateUrl: './timeline-scrollbar.component.html',
  styleUrls: ['./timeline-scrollbar.component.scss'],
})
export class TimelineScrollbarComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild("background") backgroundView: ElementRef;
  @ViewChild("bar") barView: ElementRef;
  @ViewChild("currentPlayback") currentPlaybackView: ElementRef;

  protected scrollbarSubscription: Subscription
  protected playbackSubscription: Subscription

  public canScrollLeft: boolean = false
  public canScrollRight: boolean = false

  public isBarGrabbed: boolean = false

  constructor (
    private self: ElementRef,
    protected timeline: TimelineService,
    protected timelineScrollbar: TimelineScrollbarService,
    protected playback: PlaybackService,
  ) {
    this.onScrollBarSubjectChange = this.onScrollBarSubjectChange.bind(this)
    this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this)
  }

  public ngAfterViewInit (): void {
    this.scrollbarSubscription = this.timelineScrollbar.subject.subscribe(this.onScrollBarSubjectChange)
    this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
  }

  public ngOnDestroy (): void {
    this.scrollbarSubscription.unsubscribe()
    this.playbackSubscription.unsubscribe()
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  protected _magnification: float

  public onScrollBarSubjectChange (s: TimelineScrollbarServiceStatus) {
    const honestBarWidthPx = (this.self.nativeElement as HTMLElement).getBoundingClientRect().width / s.magnification

    const backgroundWidth = this.backgroundView.nativeElement.getBoundingClientRect().width
    const barWidth = Math.max(honestBarWidthPx, MIN_BAR_WIDTH_PX)
    this.barView.nativeElement.style.width = `${barWidth}px`

    const left = Math.min(Math.max(0, backgroundWidth * s.offset), backgroundWidth - barWidth)
    this.barView.nativeElement.style.left = `${left}px`

    // const barWidthFixPx = Math.max(0, MIN_BAR_WIDTH_PX - honestBarWidthPx)
    // const minBarWidthCompensationPx = barWidthFixPx * s.offset
    // this.barView.nativeElement.style.left = `calc(${100 * s.offset}% - ${minBarWidthCompensationPx}px)`
    // this.barView.nativeElement.style.width = `${100 / s.magnification}%`

    this.isBarGrabbed = s.isBarGrabbed
    this.canScrollLeft = s.canScrollLeft
    this.canScrollRight = s.canScrollRight

    this._magnification = s.magnification
  }

  public isPlaying: boolean = false
  public playbackLeftPercent: percentage = 0

  public onPlaybackSubjectChange (s: PlaybackState) {
    if (s.mode === PLAYBACK_MODE.STOPPED) {
      this.isPlaying = false
    } else {
      setTimeout(() => {
        this.playbackLeftPercent = 100 * (s.currentTime - this.timeline.fullRange.start) / this.timeline.fullRange.duration
        this.isPlaying = true
      }, 0)
    }

  }

  public barDoubleClickHandler (e: MouseEvent) {
    this.timelineScrollbar.handleBarDoubleClick(e)
  }

  public barMouseDownHandler (e: MouseEvent) {
    // const honestBarWidthPx = (this.self.nativeElement as HTMLElement).getBoundingClientRect().width / this._magnification
    // const visibleWidth = this.barView.nativeElement.clientWidth
    // if (honestBarWidthPx < visibleWidth) {
    //   console.log('weird case', e.offsetX, honestBarWidthPx, visibleWidth)
    // }
    this.timelineScrollbar.handleBarMouseDown(e) // , honestBarWidthPx, visibleWidth)
  }

  @HostListener('document:mouseup', ['$event'])
  public mouseUpHandler (e: MouseEvent) {
    this.timelineScrollbar.handleBackgroundMouseUp(e)
    this.timelineScrollbar.handleBarMouseUp(e)
  }

  @HostListener('document:mousemove', ['$event'])
  public barDragMouseMoveHandler (e: MouseEvent) {
    this.timelineScrollbar.handleBarDragMouseMove(e, this.barView.nativeElement)
  }

  public backgroundMouseDownHandler (e: MouseEvent) {
    this.timelineScrollbar.handleBackgroundMouseDown(e)
  }

  public backgroundDblClickHandler (e: MouseEvent) {
    this.timelineScrollbar.handleBackgroundDblClick(e)
  }


  public buttonLeftMouseDownHandler () {
    this.timelineScrollbar.handleButtonLeftMouseDown()
  }

  public buttonRightMouseDownHandler () {
    this.timelineScrollbar.handleButtonRightMouseDown()
  }

  public buttonLeftDblClickHandler () {
    this.timelineScrollbar.handleButtonLeftDblClick()
  }

  public buttonRightDblClickHandler () {
    this.timelineScrollbar.handleButtonRightDblClick()
  }


  protected _animationFrameRequestHandler: number

  public ngOnInit(): void {
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public onAnimationFrame (): void {
    this.timelineScrollbar.updateIfMouseIsDown()
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }


}

export default TimelineScrollbarComponent
