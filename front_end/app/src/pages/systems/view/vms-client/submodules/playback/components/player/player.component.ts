import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import PlaybackService from '../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE, ArchivePlaybackState, LivePlaybackState } from '../../datatypes/PlaybackState'
import assertNever from '../../../../utils/assertNever'
import { Subscription } from 'rxjs'
import { ms, int } from '../../../../utils/type-aliases'
import Hls from 'hls.js'
import VideoManagementSystemService from '../../../vms/services/vms.service';
import { VmsState, VMS_MODE } from '../../../vms/datatypes/VmsState';


const BASE64_SINGLE_TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='


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

  protected _camera_rotation: int = 0

  constructor (
    public playback: PlaybackService,
    public vms: VideoManagementSystemService,
  ) {
    this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this)
    this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this)
  }

  public get mode () {
    return this.playback.modeLiteral
  }

  public ngOnInit (): void {
    // this.subscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
    this.onVmsSubjectChange(this.vms.state)
  }

  protected _animationFrameRequestHandler: number

  public onAnimationFrame (): void {
    this.videoTimeUpdateHandler()

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngAfterViewInit (): void {
    this.subscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    this.subscription.unsubscribe()
  }

  public onPlaybackSubjectChange (s: PlaybackState) {
    const prevState = { ...this.state }
    this.state = {...s}
    this._reactOnPlaybackStateChange(prevState)
  }

  public onVmsSubjectChange (s: VmsState) {
    const rotationWas = this._camera_rotation
    // console.log('rotationWas', rotationWas)
    switch (s.mode) {
      case VMS_MODE.CAMERA_SELECTED:
        // console.log('camera got selected', s.selectedCamera.id, 'rotation is', s.selectedCamera.rotation)
        this._camera_rotation = s.selectedCamera.rotation
        break;
      default:
        this._camera_rotation = 0
    }
    const waitUntilThereIsVideoView = new Promise((resolve) => {
      const nextMoment = () => {
        if (this.videoView) {
          // console.log('finally videoView')
          resolve(this.videoView)
        } else {
          // console.log('still no videoView')
          requestAnimationFrame(nextMoment)
        }
      }
      nextMoment()
    })

    if (this._camera_rotation === 0) {
      waitUntilThereIsVideoView.then(() => {
        this.videoView.nativeElement.style.transform = ''
        console.log('video rotation reset')
      })
    }
  }

  public isBuffering: boolean = false

  protected _playVideo () {
    console.log('video play request, promise is', this._playPromise)
    this._playPromise = this.$video.play().then(() => {
      console.log('play promise resolved', this._camera_rotation, this.vms.selectedCamera.rotation)
      if (this._camera_rotation) {
        console.log('rotation change')
        this.videoView.nativeElement.style.transform = `rotate(${this._camera_rotation}deg)`
      }
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
        console.log('PLAYBACK_MODE -> STOPPED')
        this._setPlaybackSource('')
        this.videoView.nativeElement.style.transform = ''
        console.log('video rotation reset')
        if (prevState.mode !== this.state.mode) {
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

  protected _setPlaybackSource (sourceUrl: string, posterUrl?: string) {
    // console.log('_setPlaybackSource', sourceUrl, posterUrl)
    this.videoView.nativeElement.pause()
    this.videoView.nativeElement.src = sourceUrl
    this.videoSourceView.nativeElement.src = sourceUrl
    this.videoView.nativeElement.setAttribute('poster', posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL)
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
    const posterUrl = this.state['posterUrl'] || null

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
        this.videoView.nativeElement.setAttribute('poster', posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL)
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
