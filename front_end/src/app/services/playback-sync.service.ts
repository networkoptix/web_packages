import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, interval, Subject } from 'rxjs';
import { debounceTime, filter, map, shareReplay } from 'rxjs/operators';

import type { NxVideoPlayerComponent } from '@components/video-player/video-player.component';

import { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxPlaybackSyncService {
    CONFIG: IConfig;

    // Playback sync config in seconds
    syncInterval = 2;
    maxDeviationFromLive = 0.5;
    allowableDeviationFromLive = 0.1;
    minBuffer = 3;
    targetBuffer = 6;
    playNextBuffer = 12;

    postersUpdating: { player: NxVideoPlayerComponent, poster: string }[] = [];

    #posterQueue$: Subject<'update'> = new Subject();

    syncTimer$ = interval(this.syncInterval * 1000).pipe(
        // tap(interval => Object.values(this.players).forEach(player => {
        //     if (!(interval % 5) && !player.player?.playing || player.player.buffering) {
        //         player.hash = uuid();
        //     }
        // })),
        map(() => Object.entries(this.players).filter(([_, { webRtcUrl }]) => !webRtcUrl).map(([playerId, { player }]) => ({ playerId, player }))),
        filter(players => players.length > 1),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    currentTime$ = this.syncTimer$.pipe(
        // tap(_ => Object.entries(this.players).forEach(([playerId, { player }]) => {
        //     console.log({ playerId, qualities: player.playbackQualities });
        // })),
        map(players => {
            let lowestBuffer = Infinity;
            let playersPlaying = 0;
            let time = 0;

            players.forEach(({ player }) => {
                const play = player.playing && player.buffered < this.minBuffer ? false : player.buffered > this.targetBuffer;
                const pausePlaying = player.playing && (player.buffered < this.minBuffer || !play);
                const startPlaying = play && !player.playing && player.buffered > this.playNextBuffer || !playersPlaying;

                if (pausePlaying) {
                    player.pause();
                } else if (startPlaying) {
                    player.play();
                    if (time) {
                        const absoluteDifference = time < player.currentTime ? player.currentTime - time : time - player.currentTime;
                        if (absoluteDifference > this.maxDeviationFromLive) {
                            player.currentTime = time;
                        }
                    }
                }

                if (startPlaying || !pausePlaying && player.playing) {
                    playersPlaying++;
                    time = Math.max(time, player.currentTime);
                    lowestBuffer = Math.min(lowestBuffer, player.buffered + player.currentTime - time);
                }
            });

            // console.log({ playersPlaying, lowestBuffer, time });
            return time;
        })
        // tap(time => console.log(time))
    );

    players: Record<string, NxVideoPlayerComponent> = {};

    register(player: NxVideoPlayerComponent): void {
        this.players[player.playerId] = player;
    }

    unregister(player: NxVideoPlayerComponent): void {
        delete this.players[player.playerId];
    }

    queuePosterUpdate(player: NxVideoPlayerComponent, poster: string): void {
        const queued = this.postersUpdating.find(cur => cur.player === player);
        if (queued) {
            queued.poster = poster;
        } else {
            this.postersUpdating.push({ player, poster });
        }
        this.#posterQueue$.next('update');
    }

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;

        combineLatest([this.#posterQueue$, interval(1000)]).pipe(
            debounceTime(100),
            untilDestroyed(this)
        ).subscribe(_ => {
            const update = this.postersUpdating.shift();
            if (update) {
                update.player.posterSrc = update.poster;
            }
        });
    }
}
