import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

import assertNever from '../../../utils/assertNever'

import {
  PLAYBACK_MODE,
  PlaybackState,
  createInitialStoppedState,
  createInitialArchiveState,
  createInitialLiveState,
} from '../datatypes/PlaybackState'

import { ms } from '../../../utils/type-aliases'

import VideoManagementSystemService from '../../vms/services/vms.service'
import { VMS_MODE } from '../../vms/datatypes/VmsState'


@Injectable({
  providedIn: 'root',
 })
export class PlaybackService {

  constructor (
    protected vms: VideoManagementSystemService,
  ) {
  }


  protected _subject = new BehaviorSubject<PlaybackState>(createInitialStoppedState())

  protected _emit (): void {
    this._subject.next(this.state)
  }

  public get subject (): BehaviorSubject<PlaybackState> {
    return this._subject
  }


  protected _state: PlaybackState = createInitialStoppedState()

  public get state (): PlaybackState {
    return this._state
  }


  public get modeLiteral (): string {
    return PLAYBACK_MODE[this._state.mode]
  }


  public playLive () {
    if (!this.canPlayLive) return
    this._state = createInitialLiveState()
    this._emit()
  }

  public canPlayArchive (t: ms) {
    return this.vms.selectedCamera?.hasArchive
  }

  public playArchive (t: ms) {
    if (!this.canPlayArchive(t)) return
    if (this._state.mode === PLAYBACK_MODE.ARCHIVE) {
      this.stop()
    }
    this._state = createInitialArchiveState(t)
    this._emit()
  }

  public stop () {
    this._state = createInitialStoppedState()
    this._emit()
  }

  public pause () {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('pause request while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        console.warn('pause request while playback mode is LIVE')
        break
      case PLAYBACK_MODE.ARCHIVE:
        if (!this._state.paused) {
          this._state.paused = true
          this._emit()
        } else {
          console.warn('pause request while already paused')
        }
        break
      default:
        assertNever(this._state)
    }
  }

  public unpause () {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('unpause request while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        console.warn('unpause request while playback mode is LIVE')
        break
      case PLAYBACK_MODE.ARCHIVE:
        if (this._state.paused) {
          this._state.paused = false
          this._emit()
        } else {
          console.warn('unpause request while already unpaused')
        }
        break
      default:
        assertNever(this._state)
    }
  }

  public handleStarted (): void {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('playback started while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        this._state.started = true
        this._emit()
        break
      case PLAYBACK_MODE.ARCHIVE:
        this._state.started = true
        this._state.paused = false
        this._emit()
        break
      default:
        assertNever(this._state)
    }
  }

  public handleTimeUpdate (timeSinceStart: ms): void {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('playback time update while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        this._state.currentTime = Date.now()
        this._emit()
        break
      case PLAYBACK_MODE.ARCHIVE:
        this._state.currentTime = this._state.startTime + timeSinceStart
        this._emit()
        break
      default:
        assertNever(this._state)
    }
  }

  public handlePaused (): void {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('playback pause while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        console.warn('playback pause while playback mode is LIVE')
        break
      case PLAYBACK_MODE.ARCHIVE:
        this._state.paused = true
        this._emit()
        break
      default:
        assertNever(this._state)
    }
  }

  public handleUnpaused (): void {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        console.warn('playback unpause while playback mode is STOPPED')
        break
      case PLAYBACK_MODE.LIVE:
        console.warn('playback unpause while playback mode is LIVE')
        break
      case PLAYBACK_MODE.ARCHIVE:
        this._state.paused = true
        this._emit()
        break
      default:
        assertNever(this._state)
    }
  }

  public get canPause (): boolean {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        return false
      case PLAYBACK_MODE.LIVE:
        return false
      case PLAYBACK_MODE.ARCHIVE:
        return !this._state.paused
      default:
        assertNever(this._state)
    }
  }

  public get canUnpause (): boolean {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        return false
      case PLAYBACK_MODE.LIVE:
        return false
      case PLAYBACK_MODE.ARCHIVE:
        return this._state.paused
      default:
        assertNever(this._state)
    }
  }

  public get canStop (): boolean {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        return false
      case PLAYBACK_MODE.LIVE:
        return true
      case PLAYBACK_MODE.ARCHIVE:
        return true
      default:
        assertNever(this._state)
    }
  }

  public get canPlayLive (): boolean {
    if (!this.vms.selectedCamera?.isLive) {
      return false
    }
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        return true
      case PLAYBACK_MODE.LIVE:
        return false
      case PLAYBACK_MODE.ARCHIVE:
        return true
      default:
        assertNever(this._state)
    }
  }
}

export default PlaybackService
