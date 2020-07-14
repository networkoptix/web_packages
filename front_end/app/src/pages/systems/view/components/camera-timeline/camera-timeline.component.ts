import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core'

import TimeRange from './timeline/time_range/TimeRange'
import TimeLineController from './timeline/TimeLineController'
import installFpsMeter from './timeline/utils/installFpsMeter'
import { int, float } from './timeline/basic_types/numbers'
import { timeStampMs, timeStampS } from './timeline/basic_types/time'
import requestEventsBirdView from './timeline/utils/requestEventsBirdView'
import { NxSystem, NxCamera } from '../../../../../services/system.service'
import IEventBirdView from './timeline/archive/birdViews/IEventBirdView'
import ProxyEventBirdViewProvider from './timeline/archive/birdViews/providers/ProxyEventBirdViewProvider'
import ITimeRange from './timeline/time_range/ITimeRange'

import * as df from 'dateformat'
const dateformat = df.default || df


const now = Date.now()
const DAY = 24 * 60 * 60 * 1000
const MAX_MONTH = 31 * DAY
const MAX_YEAR = 366 * DAY
// const duration = 29 * MAX_YEAR
// const duration = 2 * MAX_YEAR
const duration = 2 * DAY
const archiveRange = new TimeRange(
  now - duration,
  now,
)


@Component({
  selector: 'nx-camera-timeline',
  templateUrl: 'camera-timeline.component.html',
  styleUrls: ['camera-timeline.component.scss']
})
export class NxCameraTimelineComponent implements OnInit, OnChanges {

  @Input() system: NxSystem
  @Input() camera: NxCamera
  @Input() playbackStartedTime: timeStampS

  @Output() archivePlayRequest: EventEmitter<timeStampMs> = new EventEmitter()
  @Output() livePlayRequest: EventEmitter<boolean> = new EventEmitter()
  @Output() playbackTimeUpdate: EventEmitter<timeStampMs> = new EventEmitter()

  public timelineController: TimeLineController

  // protected keepRendering: boolean = true

  public isPlayingArchive: boolean = false
  public awaitsVideoLoading: boolean = false
  public playbackPositionAbsolute: timeStampMs
  public playbackStartedAt: timeStampMs

  public mouseIsOverCanvas: boolean = false
  protected mouseIsOverCanvasAt: float = -1.0
  protected mouseIsOverCanvasAtTime: int = -1

  constructor (
  ) {
  }
    
  ngOnInit () { 
    const keepRendering = () => {
      if (this.timelineController) {
        this.updatePlaybackPosition()
        this.handleZooming()
        this.updateControlAvailability()
        // if (this.keepRendering) {
          try {
            this.timelineController.render()
          } catch (e) {
            console.error('catched timeline exception', e)
            this.initTimeline()
          }
          if (this.mouseIsOverCanvas) {
            this.mouseIsOverCanvasAtTime = Math.round(
              this.timelineController.visibleRange.startTime + 
              this.timelineController.visibleRange.duration * this.mouseIsOverCanvasAt
            )
            // console.log('mouseIsOverCanvasAt', this.mouseIsOverCanvasAt, dateformat(this.mouseIsOverCanvasAtTime))
          }
        // }
      }
      requestAnimationFrame(keepRendering)
    }
    requestAnimationFrame(keepRendering)
    installFpsMeter()
  }
  
  ngOnChanges (changes: SimpleChanges) {
    if (changes.camera) {
      this.resetArchiveRange()
    }
    if (changes.playbackStartedTime) {
      // console.log('change: playback started time', this.playbackStartedTime)
      if (this.playbackStartedTime) {
        this.isPlayingArchive = true
        this.awaitsVideoLoading = false
        this.playbackPositionAbsolute = this.playbackStartedTime
        this.playbackStartedAt = Date.now()
      } else {
        this.isPlayingArchive = false
      }
    }
  }

  ngOnDestroy () {        
  }

  protected archiveRange: TimeRange
  public archiveRequestFailed: boolean = false
  protected archiveDetailiedBirdView: IEventBirdView
  protected eventBirdViewProvider: ProxyEventBirdViewProvider

  protected resetArchiveRange () {    
    this.archiveRange = null
    this.archiveRequestFailed = false
    if (this.timelineController) {
      this.timelineController.dispose()
      this.timelineController = null
    }
    this.requestEventsBirdView().then(ebv => {
      if (!ebv || !ebv.events || !ebv.events.length) {
        // console.debug('A')
        console.error('faulty bird view', ebv)
        return Promise.reject()
        // this.archiveRange = new TimeRange(0, Date.now()) // allows some limited debug even without recording cameras
      } else {        
        this.archiveRange = TimeRange.fromRange(ebv.events[0] as ITimeRange)
        // console.debug('B', this.archiveRange)
      }
      // console.debug('C')
      return this.requestEventsBirdView(this.archiveRange, 1).then(ebv => {
        // console.debug('D', ebv)
        this.archiveDetailiedBirdView = ebv
      })
    }).then(() => {
      setTimeout(() => {
        this.eventBirdViewProvider = new ProxyEventBirdViewProvider(this.archiveDetailiedBirdView)
        // console.debug('E', this.eventBirdViewProvider)
        this.initTimeline()        
      }, 500)
    }, () => {
      console.error('failed archive range request')
      this.archiveRequestFailed = true
      // this.playbackJumpRequested.emit(-1)
    }).finally(() => {
      this.livePlayRequest.emit(true)
    })
  }

  protected requestEventsBirdView (
    range: TimeRange = new TimeRange(-Infinity, + Infinity),
    roughness = Infinity
  ):Promise<IEventBirdView> {
    return requestEventsBirdView(this.system, this.camera.id, range, roughness)
  }

  protected initTimeline () {
    console.debug('initTimeLine', this.timelineController)
    this.timelineController && this.timelineController.dispose()
    this.timelineController = new TimeLineController(
      'timeline-canvas',
      this.archiveRange,
      this.eventBirdViewProvider,
      true, // embed
      true, // animate
    )
  }    

  public zoomInDisabled: boolean = false
  public zoomOutDisabled: boolean = false

  protected updateControlAvailability () {
    this.zoomInDisabled = this.timelineController.rangerStatus.zoom.isMax
    this.zoomOutDisabled = this.timelineController.rangerStatus.zoom.isMin
  }

  public get canvas () {
    return document.getElementById('timeline-canvas')
  }

  protected zoomingDirection: int = 0

  public startZooming (direction: int) {
    this.zoomingDirection = direction
  }
  public stopZooming () {
    this.zoomingDirection = 0
  }
  protected handleZooming () {
    if (this.zoomingDirection) {
      this.timelineController.rangerControls.zoom.atCenter.fine(this.zoomingDirection, false)
    }
  }

  public onCanvasMouseEnter (e: MouseEvent) {    
  }

  public onCanvasMouseMove (e: MouseEvent) {
    const rect = document.getElementById('timeline-canvas').getBoundingClientRect()
    const relativeX = (e.clientX - rect.left) / rect.width
    this.mouseIsOverCanvas = true
    this.mouseIsOverCanvasAt = relativeX
  }

  public onCanvasMouseLeave (e: MouseEvent) {
    this.mouseIsOverCanvas = false
    this.mouseIsOverCanvasAt = -1
  }


  public onCanvasClick (e: MouseEvent) {
    const rect = document.getElementById('timeline-canvas').getBoundingClientRect()
    const relativeX = (e.clientX - rect.left) / rect.width
    const relativeY = (e.clientY - rect.top) / rect.height
    const clickInScrollbarArea = (relativeY >= 0.8)
    if (clickInScrollbarArea) {
      return
    }
    // console.log('click; stop playing')
    this.isPlayingArchive = false
    this.awaitsVideoLoading = true
    const time = Math.round(this.timelineController.visibleRange.startTime + this.timelineController.visibleRange.duration * relativeX)
    const nearestArchiveTime = this.timelineController.getNearestArchiveTime(time)
    this.archivePlayRequest.emit(nearestArchiveTime)
    this.playbackPositionAbsolute = nearestArchiveTime
  }
  
  protected updatePlaybackPosition () {
    if (!this.isPlayingArchive) {
      // console.log('guard: not playing')
      return
    }
    const now = Date.now()
    const newPlaybackPositionAbsolute = this.playbackStartedTime + (now - this.playbackStartedAt)
    const nearestArchiveTime = this.timelineController.getNearestArchiveTime(newPlaybackPositionAbsolute)
    const epsilon = 5
    if (Math.abs(nearestArchiveTime - newPlaybackPositionAbsolute) <= epsilon) {
      // console.log('playing normally')
      const dt = newPlaybackPositionAbsolute - this.playbackPositionAbsolute
      this.timelineController.rangerControls.scroll.jump.duration(dt, true)
      this.playbackPositionAbsolute = newPlaybackPositionAbsolute
      this.playbackTimeUpdate.emit(this.playbackPositionAbsolute)
    } else {
      // console.log('jump; stop playing')
      this.isPlayingArchive = false
      this.awaitsVideoLoading = true
      const dt = nearestArchiveTime - this.playbackPositionAbsolute
      this.timelineController.rangerControls.scroll.jump.duration(dt, true) // fails if animation is on
      this.archivePlayRequest.emit(nearestArchiveTime)
      setTimeout(() => this.playbackPositionAbsolute = nearestArchiveTime, 0)
    }
  }
}

export default NxCameraTimelineComponent
