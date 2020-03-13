import { Injectable, OnInit, OnDestroy }           from '@angular/core';
import { NxConfigService, IConfig }      from '../../../../services/nx-config';
import {  BehaviorSubject, Observable, combineLatest, timer }     from 'rxjs';
import { HttpClient }           from '@angular/common/http';
import { NxCloudApiService } from '../../../../services/nx-cloud-api';
import { NxAccountService } from '../../../../services/account.service';
import { tap } from 'rxjs/operators';
import { NxSettingsService } from '../settings.service';
import { NxSystem, NxSystemService } from '../../../../services/system.service';
import { ActivatedRoute } from '@angular/router';
import { NxUriService } from '../../../../services/uri.service';

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
    userCloudEnabled$: BehaviorSubject<boolean> // Implemented
    systemCloudEnabled$: BehaviorSubject<boolean>
    cloudCapacity$: BehaviorSubject<number>
    usageStats$: BehaviorSubject<null | IUsageStats>
    system$: BehaviorSubject<NxSystem> // Implemented
    systemId$: BehaviorSubject<string> // TODO: Weird issues getting systemId froma activatedRoute
    pending$: BehaviorSubject<boolean> // Implemented

    // Combined State
    currentState$: Observable<any | ICloudStorageState>;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private systemService: NxSystemService
    ) {
        this.CONFIG = configService.getConfig();
        this.init();
    }

    // Private instance methods

    init() {
        // TODO: Issue with getting :systemId using activated route
        this.systemId$ = new BehaviorSubject('cff37c9f-969f-4c68-8cf0-e071a182a0d8');
        this.systemId$.subscribe(() => {
            const { value: systemId } = this.systemId$;
            this.systemService
                .createSystem(this.accountService.email, systemId)
                .getInfoAndPermissions(false)
                .catch(() => {}).then(systemWithPermissions => {
                    this.system$ = new BehaviorSubject(systemWithPermissions);
                    this.systemCloudEnabled$ = new BehaviorSubject(false); // Need to find out where this will come from
                    this.userCloudEnabled$ = new BehaviorSubject(this.system$.value.canViewCloudStorage());
                    // this.userCloudEnabled$.subscribe(value => alert(`can view cloud storage ${value}`));
                });
        });

        this.pending$ = new BehaviorSubject(false);

        // this.usageStats$ = new BehaviorSubject(null);
        // this.systemId$ = new BehaviorSubject('');
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
