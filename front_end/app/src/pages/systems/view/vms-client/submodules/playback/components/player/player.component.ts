import { Component, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, isDevMode } from '@angular/core';
import PlaybackService from '../../services/playback.service'
import { PlaybackState } from '../../datatypes/PlaybackState'
import { Subscription } from 'rxjs'
import { PlaybackTransport } from '@pages/systems/view/view.types';


@Component({
  selector: 'player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.styl'],
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {

  @Output() videoDblClick = new EventEmitter<boolean>();

  protected _log (...args: any[]) {
    if (isDevMode()) {
      console.log.apply(console, ['PLAYER (WRAPPER) ::', ...arguments])
    }
  }

  protected _warn (...args: any[]) {
    if (isDevMode()) {
      console.warn.apply(console, ['PLAYER (WRAPPER) ::', ...arguments])
    }
  }

  protected playbackSubscription: Subscription
  public transport: PlaybackTransport

  public showOverlay: boolean = false

  public get useNativePlayer () {
    return this.transport === 'webm'
  }

  public get useHlsPlayer () {
    return this.transport === 'hls'
  }

  constructor (
    public playback: PlaybackService,
  ) {
    this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this)
  }

  public ngOnInit (): void {
    this.onPlaybackSubjectChange(this.playback.state)
  }


  public ngAfterViewInit (): void {
    this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange)
  }

  public ngOnDestroy (): void {
    this.playbackSubscription.unsubscribe()
  }

  public onPlaybackSubjectChange (s: PlaybackState) {
    if (s.transport !== this.transport) {
      this.transport = s.transport
    }
  }

  public onBufferingChange (s: boolean) {
    this._log('on buffering change', s)
    setTimeout(() => this.showOverlay = s, 0)
    if (!s) {
      this.playback.handleStarted()
    }
  }

  public onClick (e: MouseEvent) {
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

  public onDblClick (e: MouseEvent) {
    this.videoDblClick.emit(true)
  }


}

export default PlayerComponent
