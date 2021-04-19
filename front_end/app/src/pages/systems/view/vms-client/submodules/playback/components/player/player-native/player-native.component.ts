import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import PlaybackService from '../../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE } from '../../../datatypes/PlaybackState'
import { Subscription } from 'rxjs'
import { assertNever, LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL } from '@pages/systems/view/vms-client/utils'


@Component({
  selector: 'player-native',
  templateUrl: './player-native.component.html',
  styleUrls: ['./player-native.component.styl'],
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
