import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import PlaybackService                                                        from '../../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE, PLAYBACK_ERROR }                       from '../../../datatypes/PlaybackState'
import { Subscription }                                                       from 'rxjs'
import Hls                                                                    from 'hls.js'
import { assertNever, LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL }                            from '@pages/systems/view/vms-client/utils'
import { WebClientUxService }                                                                       from '@pages/systems/view/services/webclient-ux.service';
import { HttpClient }                                                                               from '@angular/common/http';


@Component({
  selector: 'player-native',
  templateUrl: './player-native.component.html',
  styleUrls: ['./player-native.component.scss'],
})
@LoggerDecorator('NATIVE PLAYER ::', true)
export class PlayerNativeComponent implements OnInit, OnDestroy, AfterViewInit {
  _log: Function;
  _warn: Function;

  @Output() bufferingChange = new EventEmitter<boolean>();

  @ViewChild("video") videoView: ElementRef;
  @ViewChild("videoSource") videoSourceView: ElementRef;

  protected get $video (): HTMLVideoElement {
    return this.videoView?.nativeElement
  }

  protected playbackSubscription: Subscription
  protected state: PlaybackState

  constructor (
    public playback: PlaybackService,
    public ux: WebClientUxService,
    private http: HttpClient
  ) {
    this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this)
  }

  public ngOnInit (): void {
  }

  public ngAfterViewInit (): void {
    this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
    this.ux.alternateFullScreen$.subscribe(fullscreen => {
      if (!fullscreen) return
      try {
        this.videoView.nativeElement.webkitEnterFullscreen()
      } catch (e) {
        console.error(e)
      }
    })

    this.videoView.nativeElement.addEventListener('error', (event: any) => {
      // media errors should be debugged while serving webadmin locally
      // as local proxy cannot be set to relay address and when returned result is JSON (error)
      // will trigger CORB -- TT
      if (event.target.error.message.startsWith(PLAYBACK_ERROR.DEMUXER_ERROR_COULD_NOT_OPEN)) {
        this.http.get(event.target.src)
            .subscribe((response: any) => {
                  switch (response.error) {
                    case '4':
                      if (response.errorString === 'Cannot decrypt media') {
                        this.playback.unplayableArchive();
                      } else {
                        this.playback.setError(response.errorString);
                      }
                      break;
                  }
            });
      }
    });
  }

  public ngOnDestroy (): void {
    this.playbackSubscription.unsubscribe()
  }

  public onPlaybackSubjectChange (s: PlaybackState) {
    const prevState = { ...this.state }
    this.state = {...s }
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

  protected _startPlayback () {
    this._log('starting playback', { ...this.state })

    const sourceUrl = this.state['sourceUrl']
    const posterUrl = this.state['posterUrl'] || null

    this.videoView.nativeElement.setAttribute('poster', posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL)

    if (!sourceUrl) {
      this._warn("ordered start playback request with empty sourceUrl")
      return
    }

    const sourceUrlMainPart = sourceUrl.split('?')[0]
    const sourceUrlParts = sourceUrlMainPart.split('.')
    const sourceUrlExtension = sourceUrlParts[sourceUrlParts.length - 1]

    switch (sourceUrlExtension) {
      case 'm3u8':
        if (!Hls.isSupported()) {
          this._warn('Hls is not supported on this device')
          break
        }
      case 'mp4':
      case 'webm':
      // case 'mpegts':
      // case 'mpjpeg':
      // case 'mkv':
        this._log('correct source format', sourceUrlExtension, sourceUrl)
        switch (this.state.mode) {
          case PLAYBACK_MODE.LIVE:
            this._log('setting LIVE source')
            this.bufferingChange.emit(true)
            this.videoView.nativeElement.src = sourceUrl
            this.videoSourceView.nativeElement.src = sourceUrl
            break
          case PLAYBACK_MODE.ARCHIVE:
            this._log('setting ARCHIVE source')
            this.bufferingChange.emit(true)
            this.videoView.nativeElement.src = sourceUrl
            this.videoSourceView.nativeElement.src = sourceUrl
            break
          default:
            this._warn('playback requested in wrong mode')
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

export default PlayerNativeComponent
