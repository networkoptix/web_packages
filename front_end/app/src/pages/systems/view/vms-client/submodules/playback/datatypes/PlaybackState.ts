import { ms } from '../../../utils/type-aliases'


export enum PLAYBACK_MODE {
  STOPPED = 0,
  ARCHIVE = 1,
  LIVE = 2,
}

export interface AbstractPlaybackState {
  mode: PLAYBACK_MODE,
  initializedAt: ms,
}

export interface StoppedPlaybackState extends AbstractPlaybackState {
  mode: PLAYBACK_MODE.STOPPED,
  quality: string,
}

export interface ArchivePlaybackState extends AbstractPlaybackState {
  mode: PLAYBACK_MODE.ARCHIVE,
  sourceUrl: string,
  startTime: ms,
  currentTime: ms,
  started: boolean,
  paused: boolean,
  quality: string,
}

export interface LivePlaybackState extends AbstractPlaybackState {
  mode: PLAYBACK_MODE.LIVE,
  sourceUrl: string,
  currentTime: ms,
  started: boolean,
  quality: string,
}

export type PlaybackState = StoppedPlaybackState | ArchivePlaybackState | LivePlaybackState

export default PlaybackState


export function createInitialStoppedState (quality: string = 'auto'): StoppedPlaybackState {
  return {
    mode: PLAYBACK_MODE.STOPPED,
    initializedAt: Date.now(),
    quality,
  }
}

export function createInitialArchiveState (sourceUrl: string, t: ms, quality: string): ArchivePlaybackState {
  return {
    mode: PLAYBACK_MODE.ARCHIVE,
    sourceUrl,
    started: false,
    paused: false,
    startTime: t,
    currentTime: t,
    quality,
    initializedAt: Date.now(),
  }
}

export function createInitialLiveState (sourceUrl: string, quality: string): LivePlaybackState {
  return {
    mode: PLAYBACK_MODE.LIVE,
    sourceUrl,
    started: false,
    quality,
    currentTime: Date.now(),
    initializedAt: Date.now(),
  }
}
