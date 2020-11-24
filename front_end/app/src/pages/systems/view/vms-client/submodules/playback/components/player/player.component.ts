import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import PlaybackService from '../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE, ArchivePlaybackState, LivePlaybackState } from '../../datatypes/PlaybackState'
import assertNever from '../../../../utils/assertNever'
import { Subscription } from 'rxjs'
import { ms } from '../../../../utils/type-aliases'
import Hls from 'hls.js'


@Component({
  selector: 'player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.styl'],
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild("video") videoView: ElementRef;
  @ViewChild("videoSource") videoSourceView: ElementRef;

  @Output() videoDblClick = new EventEmitter<boolean>();

  protected subscription: Subscription
  protected state: PlaybackState

  constructor (
    public playback: PlaybackService,
  ) {
    this.onSubjectChange = this.onSubjectChange.bind(this)
  }

  public get mode () {
    return this.playback.modeLiteral
  }

  public ngOnInit (): void {
    // this.subscription = this.playback.subject.subscribe(this.onSubjectChange)
  }

  protected _animationFrameRequestHandler: number

  public onAnimationFrame (): void {
    this.videoTimeUpdateHandler()

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngAfterViewInit (): void {
    this.subscription = this.playback.subject.subscribe(this.onSubjectChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    this.subscription.unsubscribe()
  }

  public onSubjectChange (s: PlaybackState) {
    const prevState = { ...this.state }
    this.state = {...s}
    this._reactOnPlaybackStateChange(prevState)
  }

  public isBuffering: boolean = false

  protected _reactOnPlaybackStateChange (prevState: PlaybackState) {
    switch (this.state.mode) {
      case PLAYBACK_MODE.STOPPED:
        if (prevState.mode !== this.state.mode) {
          this._setPlaybackSource('')
          this._stop()
        }
        break
      case PLAYBACK_MODE.LIVE:
        if (prevState.mode !== this.state.mode) {
          this._startLive()
        }
        break
      case PLAYBACK_MODE.ARCHIVE:
        if (prevState.mode !== this.state.mode) {
          this._startArchive()
        } else {
          const ps = prevState as ArchivePlaybackState
          if (ps.paused && !this.state.paused) {
            this.$video.play()
          } else if (!ps.paused && this.state.paused) {
            this.$video.pause()
          }
        }
        break
      default:
        assertNever(this.state)
    }
    if (prevState.mode === this.state.mode && (this.state.mode !== PLAYBACK_MODE.STOPPED)) {
      const ps = prevState as LivePlaybackState
      if (ps.started && !this.state.started) {
        setTimeout(() => this.isBuffering = true)
      } else if (!ps.started && this.state.started) {
        setTimeout(() => this.isBuffering = false)
      }
    }
  }

  protected get $video (): HTMLVideoElement {
    return this.videoView.nativeElement
  }

  protected _stop () {
    this._lastTimeUpdateTimeStamp = undefined
    this.$video.pause()
    this.$video.currentTime = 0
  }

  // public get isBuffering () {
  //   return !!(this.state && this.state.mode !== PLAYBACK_MODE.STOPPED && !this.state.started)
  // }

  protected _setPlaybackSource (sourceUrl: string) {
    this.videoSourceView.nativeElement.src = sourceUrl
  }

  protected _startLive () {
    if (!this.state || this.state.mode !== PLAYBACK_MODE.LIVE)
      return
    this._stop()
    this._unsafeStartPlayback()
  }

  protected _startArchive () {
    if (!this.state || this.state.mode !== PLAYBACK_MODE.ARCHIVE)
      return
    this._stop()
    this._unsafeStartPlayback()
  }

  protected _unsafeStartPlayback () {
    const sourceUrl = this.state['sourceUrl']

    if (sourceUrl.endsWith('mp4')) {
      this._setPlaybackSource(sourceUrl)
      setTimeout(() => this.isBuffering = true)
      setTimeout(() => this.$video.play(), 1000)

    } else if (sourceUrl.search('.m3u8') !== -1) {
      if (Hls.isSupported()) {
        setTimeout(() => this.isBuffering = true)
        var hls = new Hls();
        hls.loadSource(sourceUrl);
        hls.attachMedia(this.$video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.$video.play();
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          this.playback.handleStarted()
        })
      } else {
        console.warn('HLS is not supported')
      }

    } else {
      console.warn('unsopported video source', sourceUrl)
    }
  }

  // public videoPauseHandler (e: MediaStreamEvent) {
    // looks like it causes a loop
    // this.playback.handlePaused()
  // }

  public videoPlayHandler (e: MediaStreamEvent) {
    // this.playback.handleStarted()
  }

  protected _lastTimeUpdateTimeStamp: ms
  protected _lastCurrentTime: ms

  /*
  browser doesn't fire video time update event too often,
  so we use animation frame instead for smoother user experience
  */
  public videoTimeUpdateHandler () {
    if (!this.state ||
      this.state.mode === PLAYBACK_MODE.STOPPED ||
      ((this.state.mode === PLAYBACK_MODE.ARCHIVE || this.state.mode === PLAYBACK_MODE.LIVE) && !this.state.started) ||
      (this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.paused)
    ) {
      this._lastTimeUpdateTimeStamp = undefined
      return
    }

    const now = Date.now()
    if (!this._lastTimeUpdateTimeStamp) {
      this._lastCurrentTime = Math.round(this.$video.currentTime * 1000)
    } else {
      const diff = now - this._lastTimeUpdateTimeStamp
      this._lastCurrentTime += diff
    }
    this.playback.handleTimeUpdate(this._lastCurrentTime)
    this._lastTimeUpdateTimeStamp = now
  }

  public videoClickHandler (e: MouseEvent) {

    if (this.playback.canPause) {
      this.playback.pause()
    } else if (this.playback.canUnpause) {
      this.playback.unpause()
    } else if (this.playback.canStop) {
      this.playback.stop()
    } else if (this.playback.canPlayLive) {
      this.playback.playLive()
    }
  }

  public videoDblClickHandler (e: MouseEvent) {
    this.videoDblClick.emit(true)
  }
}

export default PlayerComponent
