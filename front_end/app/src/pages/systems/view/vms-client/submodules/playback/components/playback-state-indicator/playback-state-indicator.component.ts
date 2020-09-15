import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlaybackState, PLAYBACK_MODE, LivePlaybackState } from '../../datatypes/PlaybackState'
import PlaybackService from '../../services/playback.service'
import { Subscription } from 'rxjs'
import VideoManagementSystemService from '../../../vms/services/vms.service'


@Component({
  selector: 'playback-state-indicator',
  templateUrl: './playback-state-indicator.component.html',
  styleUrls: ['./playback-state-indicator.component.styl'],
})
export class PlaybackStateIndicatorComponent implements OnInit, OnDestroy {

  protected subscription: Subscription
  public state: PlaybackState

  public get isLive () {
    return this.vms.selectedCamera.isLive
  }

  public get isPlaying () {
    return this.state.mode === PLAYBACK_MODE.LIVE && (this.state as LivePlaybackState).started
  }

  public get isRecording () {
    return this.vms.selectedCamera.isRecording
  }

  constructor (
    public playback: PlaybackService,
    public vms: VideoManagementSystemService,
  ) {
    this.onSubjectChange = this.onSubjectChange.bind(this)
  }

  public ngOnInit (): void {
    this.subscription = this.playback.subject.subscribe(this.onSubjectChange)
  }

  public ngOnDestroy (): void {
    this.subscription.unsubscribe()
  }

  public onSubjectChange (s: PlaybackState) {
    this.state = s
  }
}

export default PlaybackStateIndicatorComponent
