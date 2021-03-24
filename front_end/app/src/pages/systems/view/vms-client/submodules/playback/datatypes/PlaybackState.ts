import { PlaybackQuality, PlaybackTransport } from '@pages/systems/view/view.types'
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
  quality: PlaybackQuality,
  transport: PlaybackTransport,
}

export interface ArchivePlaybackState extends AbstractPlaybackState {
  mode: PLAYBACK_MODE.ARCHIVE,
  sourceUrl: string,
  posterUrl?: string,
  startTime: ms,
  currentTime: ms,
  started: boolean,
  paused: boolean,
  quality: PlaybackQuality,
  transport: PlaybackTransport,
}

export interface LivePlaybackState extends AbstractPlaybackState {
  mode: PLAYBACK_MODE.LIVE,
  sourceUrl: string,
  posterUrl?: string,
  currentTime: ms,
  started: boolean,
  quality: PlaybackQuality,
  transport: PlaybackTransport,
}

export type PlaybackState = StoppedPlaybackState | ArchivePlaybackState | LivePlaybackState

export default PlaybackState


export function createInitialStoppedState (
  quality: PlaybackQuality = 'auto',
  transport: PlaybackTransport = 'webm',
): StoppedPlaybackState {
  return {
    mode: PLAYBACK_MODE.STOPPED,
    initializedAt: Date.now(),
    quality,
    transport,
  }
}

export function createInitialArchiveState (
  sourceUrl: string,
  t: ms,
  quality: PlaybackQuality = 'auto',
  transport: PlaybackTransport = 'webm',
  posterUrl?: string,
): ArchivePlaybackState {
  return {
    mode: PLAYBACK_MODE.ARCHIVE,
    sourceUrl,
    posterUrl,
    started: false,
    paused: false,
    startTime: t,
    currentTime: t,
    quality,
    transport,
    initializedAt: Date.now(),
  }
}

export function createInitialLiveState (
  sourceUrl: string,
  quality: PlaybackQuality = 'auto',
  transport: PlaybackTransport = 'webm',
  posterUrl?: string,
): LivePlaybackState {
  return {
    mode: PLAYBACK_MODE.LIVE,
    sourceUrl,
    posterUrl,
    started: false,
    quality,
    transport,
    currentTime: Date.now(),
    initializedAt: Date.now(),
  }
}
