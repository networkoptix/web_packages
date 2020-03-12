import { Injectable, OnInit, OnDestroy }           from '@angular/core';
import { NxConfigService, IConfig }      from '../../../../services/nx-config';
import {  BehaviorSubject, Observable, combineLatest, timer }     from 'rxjs';
import { HttpClient }           from '@angular/common/http';
import { NxCloudApiService } from '../../../../services/nx-cloud-api';
import { NxAccountService } from '../../../../services/account.service';
import { tap } from 'rxjs/operators';
import { NxSettingsService } from '../settings.service';

export enum StateActions {
    PENDING = 'PENDING',
    ENABLE = 'ENABLE',
    DISABLE = 'DISABLE',
    MOVE = 'MOVE',
    FAILED = 'FAILED'
}

@Injectable({
    providedIn: 'root'
})
export class NxCloudStorageService {
    CONFIG: IConfig

    // State handling
    userCloudEnabled$: BehaviorSubject<boolean>
    systemCloudEnabled$: BehaviorSubject<boolean>
    cloudCapacity$: BehaviorSubject<number>
    usageStats$: BehaviorSubject<null | IUsageStats>
    systemId$: BehaviorSubject<string>
    pending$: BehaviorSubject<boolean>

    // Combined State
    currentState$: Observable<any | ICloudStorageState>;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    // Private instance methods

    init() {
        const userCloudEnabled = [...this.accountService.account.permissions, 'cloud_storage_enabled'].includes('cloud_storage_enabled');

        this.pending$ = new BehaviorSubject(false);
        this.userCloudEnabled$ = new BehaviorSubject(userCloudEnabled);
        this.systemCloudEnabled$ = new BehaviorSubject(false);
        this.usageStats$ = new BehaviorSubject(null);
        this.systemId$ = new BehaviorSubject('');
        // this.currentState$ = combineLatest(
        //     [this.userCloudEnabled$,
        //         this.systemCloudEnabled$,
        //         this.cloudCapacity$,
        //         this.usageStats$,
        //         this.systemId$]
        // );
    }

    private updateCloudStorageState(action: StateActions) {
        switch (action) {
            case StateActions.PENDING:
                this.pending$.next(true);
                break;
            case StateActions.FAILED:
                this.pending$.next(false);
                break;
            case StateActions.ENABLE:
                this.pending$.next(false);
                this.systemCloudEnabled$.next(true);
                break;
            case StateActions.DISABLE:
            case StateActions.MOVE:
                this.pending$.next(false);
                this.systemCloudEnabled$.next(false);
                break;
        }
    }

    // Cloud Storage Methods

    get currentState() {
        return new BehaviorSubject(initialMockState);
    }

    enable(systemId: string, password: string) {
        this.updateCloudStorageState(StateActions.PENDING);
        return this.cloudApiService.disableCloudStorage(
            systemId,
            password
        ).then(() => {
            // TODO handle success
            this.updateCloudStorageState(StateActions.ENABLE);
        }).catch(() => {
            // TODO handle error
            this.updateCloudStorageState(StateActions.FAILED);
        });
    }

    disable(systemId: string, password: string) {
        this.updateCloudStorageState(StateActions.PENDING);
        return this.cloudApiService.disableCloudStorage(
            systemId,
            password
        ).then(() => {
            // TODO handle success
            this.updateCloudStorageState(StateActions.DISABLE);
        }).catch(() => {
            // TODO handle error
            this.updateCloudStorageState(StateActions.FAILED);
        });
    }

    move(sourceSystemId: string, destinationSystemId: string, password) {
        this.updateCloudStorageState(StateActions.PENDING);
        return this.cloudApiService.moveCloudStorage(
            sourceSystemId,
            destinationSystemId,
            password
        ).then(() => {
            // TODO handle success
            this.updateCloudStorageState(StateActions.MOVE);
        }).catch(() => {
            // TODO handle error
            this.updateCloudStorageState(StateActions.FAILED);
        });
    }
}

// Lines below are for data, still need to implement retreiving from config or server
const emptyUsage: IUsageStats = {
    currentRecordings: '_',
    whenFullyUsed    : '_',
    amountUsed       : '_',
    archiveFrom      : '_',
    recordingBitrate : '_',
    delayFromLive    : '_'
};

const regularUsage: IUsageStats = {
    currentRecordings: 7457136000, // ms, rounded to the hour
    whenFullyUsed    : 1209600000, // ms, rounded to the hour
    amountUsed       : 17424682320, // bytes rounded to 0.1 Gb, percent calculated and rounded to 1%
    archiveFrom      : 11, // number of cameras represented by integer
    recordingBitrate : 1500000, // bps rounded to 0.1 Mbps
    delayFromLive    : 1200000 // ms, rounded to 0.1s
};

const initialMockState: ICloudStorageState = {
    cloudCapacity     : 53687091200, // bytes
    systemCloudEnabled: true,
    userCloudEnabled  : true,
    usageStats        : emptyUsage
};

export interface ICloudStorageState {
  cloudCapacity: number
  systemCloudEnabled: boolean
  userCloudEnabled: boolean
  usageStats: IUsageStats
}

export interface IUsageStats {
    currentRecordings: UsageTypes
    whenFullyUsed: UsageTypes
    amountUsed: UsageTypes
    archiveFrom: UsageTypes
    recordingBitrate: UsageTypes
    delayFromLive: UsageTypes
}

type UsageTypes = '_' | number
