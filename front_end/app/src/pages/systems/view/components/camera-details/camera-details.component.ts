import { Component, Input, OnInit } from '@angular/core'
import { timeStampMs } from '../camera-timeline/timeline/basic_types/time'
import { NxCamera, NxSystem } from '../../../../../services/system.service'
import { PlaybackQuality } from '../../view.types'


@Component({
    selector: 'nx-system-camera-details',
    templateUrl: 'camera-details.component.html',
    styleUrls: ['camera-details.component.scss']
})
export class NxSystemCameraViewComponent implements OnInit {

    @Input() system: NxSystem
    @Input() camera: NxCamera
    public playbackStartTime: timeStampMs
    public playbackStartedTime: timeStampMs
    public isPlaying: boolean = false
    public isPlayingArchive: boolean = false
    public isPlayingLive: boolean = false
    public awaitsPlaybackStart: boolean = false
    public nowPlayingAt: timeStampMs

    public isFullScreen: boolean = false

    public settingsShown: boolean = false
    public qualitiesAvailable: Array<PlaybackQuality> = [ 'auto', 'low' ]
    public qualitySelected: PlaybackQuality = 'auto'

    public isTimelineAreaVisible: boolean = true

    constructor (
    ) {
    }

    public toggleTimelineAreaVisibility () {
      this.isTimelineAreaVisible = !this.isTimelineAreaVisible
    }

    public onLivePlayRequest (play_or_pause: boolean) {
      if (!this.camera || !(this.camera.status === 'Online' || this.camera.status === 'Recording')) {
        console.error('live play request on camera not capable of playing live', this.camera)
        return
      }
      return this.onPlayPauseButtonClick()
    }

    public onArchivePlayRequest (timestamp: timeStampMs) {
      this.playbackStartTime = timestamp
      this.isPlayingArchive = true
      this.awaitsPlaybackStart = true
    }

    public onPlaybackStarted (timestamp: timeStampMs) {
      this.isPlaying = true
      this.playbackStartedTime = timestamp
      this.nowPlayingAt = timestamp
      this.awaitsPlaybackStart = false
    }

    public onPlaybackTimeUpdate (timestamp: timeStampMs) {
      this.nowPlayingAt = timestamp
    }

    public onPlayPauseButtonClick () {
      if (this.isPlaying) {
        this.isPlaying = false
        if (this.isPlayingArchive) {
          this.playbackStartTime = undefined
          this.playbackStartedTime = undefined
        } else if (this.isPlayingLive) {
          this.playbackStartTime = undefined
          this.playbackStartedTime = undefined
        }
      } else {
        if (this.isPlayingArchive) {
          this.playbackStartTime = this.nowPlayingAt
          this.awaitsPlaybackStart = true
        }
        else {
          this.playbackStartTime = -1
          this.isPlayingLive = true
          this.awaitsPlaybackStart = true
        }
      }
    }

    public toggleFullScreen () {
      const fsArea = document.getElementById('nx-camera-page')
      if (this.isFullScreen) {
        document.exitFullscreen()
      } else {
        fsArea.requestFullscreen()
      }      
    }

    public ngOnInit () {
      document.addEventListener('fullscreenchange', e => {
        this.isFullScreen = !this.isFullScreen
      })      
    }

    public toggleSettings () {
      this.settingsShown = !this.settingsShown
    }

    public setQuality (q: PlaybackQuality) {
      this.qualitySelected = q
    }

}

export default NxSystemCameraViewComponent
