import { Component, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, isDevMode } from '@angular/core';
import PlaybackService from '../../services/playback.service'
import { ArchivePlaybackState, PlaybackState, PLAYBACK_MODE } from '../../datatypes/PlaybackState'
import { Subscription } from 'rxjs'
import { PlaybackTransport } from '@pages/systems/view/view.types';
import { LoggerDecorator } from '@pages/systems/view/vms-client/utils'


@Component({
  selector: 'player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.styl'],
})
@LoggerDecorator('PLAYER (WRAPPER) ::', true)
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  _log: Function
  _warn: Function

  @Output() videoDblClick = new EventEmitter<boolean>();

  protected playbackSubscription: Subscription
  public transport: PlaybackTransport

  public showOverlay: boolean = false

  public get useNativePlayer () {
    return (
      this.transport === 'webm'
      // || this.transport === 'mpegts'
      // || this.transport === 'mpjpeg'
      || this.transport === 'mp4'
      // || this.transport === 'mkv'
    )
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
    this._log('on buffering change', s, this.playback.state)
    setTimeout(() => this.showOverlay = s, 0)
    if (!s) {
      switch (this.playback.state.mode) {
        case PLAYBACK_MODE.LIVE:
        case PLAYBACK_MODE.ARCHIVE:
          if (!this.playback.state.started && !(<ArchivePlaybackState>this.playback.state).paused) {
            this._log('triggering handle started')
            this.playback.handleStarted()
          }
          break
      }
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
