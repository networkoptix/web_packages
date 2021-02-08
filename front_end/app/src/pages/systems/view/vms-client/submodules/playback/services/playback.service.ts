import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

import assertNever from '../../../utils/assertNever'

import {
  PLAYBACK_MODE,
  PlaybackState,
  createInitialStoppedState,
  createInitialArchiveState,
  createInitialLiveState,
  ArchivePlaybackState
} from '../datatypes/PlaybackState'

import { ms } from '../../../utils/type-aliases'

import VideoManagementSystemService from '../../vms/services/vms.service'
import { VMS_MODE } from '../../vms/datatypes/VmsState'

import TimelineService from '../../timeline/services/timeline.service'
import { IRecord } from '../../vms/datatypes/ICamera'


@Injectable({
  providedIn: 'root',
 })
export class PlaybackService {

  constructor (
    protected vms: VideoManagementSystemService,
    protected timeline: TimelineService,
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

  public canPlayArchive (t: ms) {
    return this.vms.selectedCamera?.hasArchive
  }

  public playLive () {
    if (!this.canPlayLive) {
      return
    }
    this._state = createInitialLiveState(
      this.vms.selectedCamera.getLiveVideoUrl(this._state.quality),
      this._state.quality
    )
    console.log('started live', this._state.quality, this._state.currentTime, this._state.sourceUrl)
    this._emit()
  }

  public playArchive (t: ms) {
    if (!this.canPlayArchive(t)) {
      return
    }
    if (this._state.mode === PLAYBACK_MODE.ARCHIVE) {
      this.stop()
    }
    this._state = createInitialArchiveState(
      this.vms.selectedCamera.getArchiveVideoUrl(t, this._state.quality),
      t,
      this._state.quality
    )
    console.log('started archive', this._state.quality, this._state.currentTime, this._state.sourceUrl)
    this._emit()
  }

  public stop () {
    this._state = createInitialStoppedState(this._state.quality)
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
          // this._state.paused = false
          // this._emit()
          this.playArchive(this._state.currentTime)
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

        const newT = this._state.startTime + timeSinceStart
        const diff = newT - this._state.currentTime
        this._state.currentTime = newT

        if (!this.isBeyondVisibleRange) {
          const marginMs = this.timeline.canvasWidthToDuration(100)
          // make time marker appear fixed while the timeline scrolls, not the contrary
          if (this._state.currentTime > this.timeline.visibleRange.start + marginMs
            && this._state.currentTime < this.timeline.visibleRange.end
          ) {
            this.timeline.jumpScrollTo(this.timeline.visibleRange.start + diff)
          }
        }
        this._jumpOverTheGapIfNeeded()

        this._emit()
        break
      default:
        assertNever(this._state)
    }
  }

  public get isBeyondVisibleRange (): boolean {
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        return false
      case PLAYBACK_MODE.LIVE:
        return true
      case PLAYBACK_MODE.ARCHIVE:
        return this._state.currentTime < this.timeline.visibleRange.start
          || this._state.currentTime > this.timeline.visibleRange.end
      default:
        return false
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

  private _jumpOverTheGapIfNeeded () {
    if (this._state.mode === PLAYBACK_MODE.ARCHIVE) {
      const state = this._state as ArchivePlaybackState

      if (!_isThereRecord(this.vms.selectedCamera.archive, state.currentTime)) {
        const nextChunk = _getNextRecord(this.vms.selectedCamera.archive, state.currentTime)
        if (nextChunk) {
          const wasVisible = !this.isBeyondVisibleRange

          const was = this._state.currentTime
          const nextChunkStart = nextChunk.start
          const diff = nextChunkStart - (this._state as ArchivePlaybackState).currentTime;
          this._state.currentTime = nextChunkStart
          this._state.startTime += diff
          // console.log('jump', diff, 'was', was, 'diff', diff, new Date(diff + this.timeline.visibleRange.start))

          // TODO: request scroll jump animation
          // this.timeline.jumpScrollTo(this._state.currentTime)
          if (wasVisible) {
            this.timeline.jumpScrollTo(diff + this.timeline.visibleRange.start, true)
          }

          // TODO: maybe the logic here should be very different, actually
        } else {
          this.canPlayArchive ? this.playLive() : this.stop()
        }
      }
    }
  }


  public changeQuality (q: 'high' | 'low' | 'auto') {
    if (this._state.quality === q) {
      return
    }
    console.log('changeQuality', this._state.quality, '->', q)
    this._state.quality = q
    switch (this._state.mode) {
      case PLAYBACK_MODE.STOPPED:
        break
      case PLAYBACK_MODE.LIVE:
        this.stop()
        setTimeout(() => this.playLive(), 0)
        break
      case PLAYBACK_MODE.ARCHIVE:
        const t = this._state.currentTime
        this.stop()
        setTimeout(() => this.playArchive(t), 0)
        break
    }
    // if (this.state.mode === PLAYBACK_MODE.STOPPED) {
    //   return
    // }
    // const was = this.state.sourceUrl
    // this.state.sourceUrl = this.state.sourceUrl
    //   .replace('?lo', '%QUALITY%').replace('?hi', '%QUALITY%').replace('?', '%QUALITY%')
    //   .replace('%QUALITY', '?' + (q === 'auto' ? '' : q.slice(0, 2)))
    // if (was !== this.state.sourceUrl) {
    //   console.log('playback: changing stream quality, from', was, 'to', this.state.sourceUrl)
    //   this._emit()
    // } else {
    //   console.log('no real source change', this.state.sourceUrl)
    // }
  }

}

function _isThereRecord (archive: Array<IRecord>, t: ms): boolean {
  let l = 0, r = archive.length - 1
  while (l < r) {
    const m = l + Math.floor((r - l) / 2)
    const rec = archive[m]
    if (rec.start <= t && rec.end >= t) {
      return true
    }
    if (rec.start > t) {
      r = (m < r) ? m : (r - 1)
    } else {
      l = (m > l) ? m : (l + 1)
    }
  }
  return false

  // naive linear search approach
  // return !!archive.find(r => r.start <= t && r.end >= t)
}

function _getNextRecord (archive: Array<IRecord>, t: ms): IRecord {
  let l = 0, r = archive.length - 1
  while (l < r) {
    const m = l + Math.floor((r - l) / 2)
    const rec = archive[m]
    const prevRec = m > 0 ? archive[m - 1] : null
    if (rec.start >= t && (!prevRec || prevRec.end <= t )) {
      return rec
    }
    if (rec.start > t) {
      r = (m < r) ? m : (r - 1)
    } else {
      l = (m > l) ? m : (l + 1)
    }
  }
  return null
  // naive linear search approach
  // return archive.find(r => r.start >= t)
}

export default PlaybackService
