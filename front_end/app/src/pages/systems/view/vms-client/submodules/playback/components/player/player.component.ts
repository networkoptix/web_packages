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

  protected _playPromise: Promise<any>

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

  protected _playVideo () {
    console.log('video play request, promise is', this._playPromise)
    this._playPromise = this.$video.play().then(() => {
      console.log('play promise resolved')
    }).catch(e => {
      console.log('play promise catch', e)
    }).finally(() => {
      console.log('play promise reset')
      this._playPromise = undefined
    })
  }

  protected _pauseVideo () {
    console.log('pause video, play promise is', this._playPromise)
    if (this._playPromise) {
      console.log('ignorring pause request')
    } else {
      console.log('video.pause')
      this.$video.pause()
    }
  }

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
        } else {
          // if (prevState.sourceUrl !== this.state.sourceUrl) {
          //   // console.log('gotta react on sourceUrl change LIVE',
          //   //   this.state.sourceUrl.slice(this.state.sourceUrl.indexOf('?') + 1, this.state.sourceUrl.indexOf('?') + 3))
          //   this.$video.pause()
          //   this._setPlaybackSource(this.state.sourceUrl)
          //   this.$video.currentTime = 0
          //   this.$video.play()
          // }
        }
        break
      case PLAYBACK_MODE.ARCHIVE:
        if (prevState.mode !== this.state.mode) {
          this._startArchive()
        } else {
          const ps = prevState as ArchivePlaybackState
          if (ps.paused && !this.state.paused) {
            console.log('PLAY 1')
            this._playVideo()
          } else if (!ps.paused && this.state.paused) {
            console.log('PAUSE 1')
            this._pauseVideo()
          // } else if (prevState.sourceUrl !== this.state.sourceUrl) {
          //   // console.log('gotta react on sourceUrl change ARCHIVE',
          //   //   this.state.sourceUrl.slice(this.state.sourceUrl.indexOf('?') + 1, this.state.sourceUrl.indexOf('?') + 3))
          //   this.$video.pause()
          //   this._setPlaybackSource(this.state.sourceUrl)
          //   this.$video.currentTime = 0
          //   this.$video.play()
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
    console.log('PAUSE 2')
    this._pauseVideo()
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
      setTimeout(() => {
        console.log('PLAY 2 (MP4 case)')
        this._playVideo()
      }, 1000)

    } else if (sourceUrl.search('.m3u8') !== -1) {
      if (Hls.isSupported()) {
        setTimeout(() => this.isBuffering = true)
        var hls = new Hls();
        hls.loadSource(sourceUrl);
        hls.attachMedia(this.$video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed')
          // this._playVideo()
          // console.log('PLAY 3 (HLS)')
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          console.log('HLS Fragment Loaded')
          if (this.playback.state.mode !== PLAYBACK_MODE.STOPPED) {
            if (!this.playback.state.started) {
              console.log('HLS it was the first fragment')
              // this.playback.handleStarted()
            }
          }
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

  public videoLoadStartHandler (e: MediaStreamEvent) {
    console.log('video load start event', e)
  }

  public videoLoadedMetadataHandler (e: MediaStreamEvent) {
    console.log('video loaded metadata event', e)
  }

  public videoLoadedDataHandler (e: MediaStreamEvent) {
    console.log('video loaded data event', e)
  }

  public videoCanPlayHandler (e: MediaStreamEvent) {
    console.log('video can play event', e)
    this._playVideo()
    console.log('PLAY 3 (HLS)')
  }

  public videoCanPlayThroughHandler (e: MediaStreamEvent) {
    console.log('video can play through event', e)
  }

  public videoProgressHandler (e: MediaStreamEvent) {
    console.log('video progress event', e)
  }

  public videoPlayHandler (e: MediaStreamEvent) {
    // this.playback.handleStarted()
    console.log('video play event', e)
    if (this.playback.state.mode !== PLAYBACK_MODE.STOPPED) {
      if (!this.playback.state.started) {
        console.log('it was the first play event')
        this.playback.handleStarted()
      }
    } else {
      console.warn('video play event while playback state mode is STOPPED')
    }
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
    console.log('video click')
    if (this.playback.canPause) {
      console.log('can pause -> pause')
      this._pauseVideo()
    } else if (this.playback.canUnpause) {
      console.log('can unpause -> unpause')
      this.playback.unpause()
    } else if (this.playback.canStop) {
      console.log('can stop -> stop')
      this.playback.stop()
    } else if (this.playback.canPlayLive) {
      console.log('can play live -> play live')
      this.playback.playLive()
    } else {
      console.log('can not respond on click in any meaningful way -> doing nothing')
    }
  }

  public videoDblClickHandler (e: MouseEvent) {
    console.log('video double click -> emitting upstairs')
    this.videoDblClick.emit(true)
  }
}

export default PlayerComponent
