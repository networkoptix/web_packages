import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter, isDevMode } from '@angular/core';
import PlaybackService from '../../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE } from '../../../datatypes/PlaybackState'
import { Subscription } from 'rxjs'
import Hls from 'hls.js'
import { assertNever, LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL } from '@pages/systems/view/vms-client/utils'


@Component({
  selector: 'player-hls',
  templateUrl: './player-hls.component.html',
  styleUrls: ['./player-hls.component.styl'],
})
@LoggerDecorator('HLS PLAYER ::', true)
export class PlayerHlsComponent implements OnInit, OnDestroy, AfterViewInit {

  _log: Function
  _warn: Function

  @ViewChild("video") videoView: ElementRef;
  @ViewChild("videoSource") videoSourceView: ElementRef;

  @Output() bufferingChange = new EventEmitter<boolean>();

  protected get $video (): HTMLVideoElement {
    return this.videoView?.nativeElement
  }

  protected playbackSubscription: Subscription
  protected state: PlaybackState

  constructor (
    public playback: PlaybackService,
  ) {
    this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this)
  }

  public ngOnInit (): void {
  }

  public ngAfterViewInit (): void {
    this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
  }

  public ngOnDestroy (): void {
    this.playbackSubscription.unsubscribe()
    this.hls?.destroy()
  }

  public onPlaybackSubjectChange (s: PlaybackState) {
    const prevState = { ...this.state }
    this.state = {...s}
    this._reactOnPlaybackStateChange(prevState)
  }

  protected _reactOnPlaybackStateChange (prevState: PlaybackState) {
    switch (this.state.mode) {
      case PLAYBACK_MODE.STOPPED:
        this.$video.pause()
        this.$video.src = ''
        this._log('react on stopped')
        this.bufferingChange.emit(false)
        break
      case PLAYBACK_MODE.LIVE:
      case PLAYBACK_MODE.ARCHIVE:
        if (prevState.mode !== this.state.mode) {
          this._startPlayback()
        }
        if (this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.paused) {
          this.$video.pause()
          this._log('react on pause')
          this.bufferingChange.emit(false)
        }
        break
      default:
        assertNever(this.state)
    }
  }

  protected hls: Hls

  protected _startPlayback () {
    this._log('starting playback', { ...this.state })

    const sourceUrl = this.state['sourceUrl']
    const posterUrl = this.state['posterUrl'] || null

    this.videoView.nativeElement.setAttribute('poster', posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL)

    if (!sourceUrl) {
      console.warn("ordered start playback request with empty sourceUrl")
      return
    }

    const sourceUrlMainPart = sourceUrl.split('?')[0]
    const sourceUrlParts = sourceUrlMainPart.split('.')
    const sourceUrlExtension = sourceUrlParts[sourceUrlParts.length - 1]

    switch (sourceUrlExtension) {
      case 'm3u8':
        this._log('correct extension', sourceUrlExtension, sourceUrl)
        if (this.hls) {
          this.hls.destroy()
          this.hls = undefined
        }
        if (Hls.isSupported()) {
          this._log('HLS is supported')
          this.hls = new Hls()
          this.hls.loadSource(sourceUrl)
          this.hls.attachMedia(this.$video)
          this.bufferingChange.emit(true)
          this.hls.on(Hls.Events.ERROR, (event, data) => {
            console.warn('HLS PLAYER HLS.js ERROR', event, data)
            if (data.fatal) {
              // TODO: try to switch to WEBM or another alternative stream here
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  // try to recover network error
                  console.warn('fatal network error encountered, try to recover')
                  this.hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn('fatal media error encountered, try to recover')
                  this.hls.recoverMediaError()
                  break
                default:
                  console.error('HLS error, cannot recover')
                  this.hls.destroy()
                  this.hls = undefined
                  break
              }
            }
          })
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this._log('HLS manifest parsed')
            // this._playVideo()
            // console.log('PLAY 3 (HLS)')
          });
          this.hls.on(Hls.Events.FRAG_LOADED, () => {
            this._log('HLS Fragment Loaded')
            // if (this.playback.state.mode !== PLAYBACK_MODE.STOPPED) {
            //   if (!this.playback.state.started) {
            //     // console.log('HLS it was the first fragment')
            //     // this.playback.handleStarted()
            //   }
            // }
          })
        } else {
          this._warn('HLS is not supported')
        }
        break
      default:
        this._warn('wrong source format', sourceUrlExtension, sourceUrl)
        break
    }
  }

  public onVideoCanPlay (e: MediaStreamEvent) {
    this._log('video can play', this.state.mode, this.state)
    this.bufferingChange.emit(false)
    switch (this.state.mode) {
      case PLAYBACK_MODE.LIVE:
        this.videoView.nativeElement.play()
        this._log('LIVE play()')
        break
      case PLAYBACK_MODE.ARCHIVE:
        if (!this.state.paused) {
          this.videoView.nativeElement.play()
          this._log('ARCHIVE play()')
        } else {
          this._log('ARCHIVE could play but remains stopped')
        }
    }
  }

  public onVideoEnded (e: MediaStreamEvent) {
    this._log('video ended')
    this.playback.stop()
  }
}

export default PlayerHlsComponent
