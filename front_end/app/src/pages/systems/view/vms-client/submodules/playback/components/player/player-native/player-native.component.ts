import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter, isDevMode } from '@angular/core';
import PlaybackService from '../../../services/playback.service'
import { PlaybackState, PLAYBACK_MODE, ArchivePlaybackState, LivePlaybackState } from '../../../datatypes/PlaybackState'
import assertNever from '../../../../../utils/assertNever'
import { Subscription } from 'rxjs'
import { ms, int } from '../../../../../utils/type-aliases'
import Hls from 'hls.js'
import VideoManagementSystemService from '../../../../vms/services/vms.service';
import { VmsState, VMS_MODE } from '../../../../vms/datatypes/VmsState';


const BASE64_SINGLE_TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='


@Component({
  selector: 'player-native',
  templateUrl: './player-native.component.html',
  styleUrls: ['./player-native.component.styl'],
})
export class PlayerNativeComponent implements OnInit, OnDestroy, AfterViewInit {

  @Output() bufferingChange = new EventEmitter<boolean>();

  protected _log (...args: any[]) {
    if (isDevMode()) {
      console.log.apply(console, ['NATIVE PLAYER :: ', ...arguments])
    }
  }

  protected _warn (...args: any[]) {
    if (isDevMode()) {
      console.warn.apply(console, ['NATIVE PLAYER :: ', ...arguments])
    }
  }

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
    this.state = {...s}
    this._reactOnPlaybackStateChange(prevState)
  }

  protected _reactOnPlaybackStateChange (prevState: PlaybackState) {
    switch (this.state.mode) {
      case PLAYBACK_MODE.STOPPED:
        break
      case PLAYBACK_MODE.LIVE:
      case PLAYBACK_MODE.ARCHIVE:
        if (prevState.mode !== this.state.mode) {
          this._startPlayback()
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
    this._log('video can play')
    this.bufferingChange.emit(false)
    this.videoView.nativeElement.play()
  }

  public onVideoEnded (e: MediaStreamEvent) {
    this._log('video ended')
    this.playback.stop()
  }
}

export default PlayerNativeComponent
