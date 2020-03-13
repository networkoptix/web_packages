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
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

export enum StateActions {
    PENDING = 'PENDING',
    ENABLE = 'ENABLE',
    DISABLE = 'DISABLE',
    MOVE = 'MOVE',
    FAILED = 'FAILED'
}

@AutoUnsubscribe()
@Injectable({
    providedIn: 'root'
})
export class NxCloudStorageService {
    CONFIG: IConfig

    // State handling
    userCloudEnabled$: BehaviorSubject<boolean> // Implemented
    // Subscribe to infoSubject from systemService instead of using systemCloudEnabled$
    systemCloudEnabled$: BehaviorSubject<boolean> // TODO: Need to find the correct place to get system cloud capabilities
    cloudCapacity$: BehaviorSubject<number> // TODO: Need to find where this will come from. Currently mock data.
    usageStats$: BehaviorSubject<IUsageStats> // TODO: Need to find where this will come from. Currently mock data.
    system$: BehaviorSubject<NxSystem> // Implemented
    systemId$: BehaviorSubject<string> // TODO: Weird issues getting systemId froma activatedRoute
    pending$: BehaviorSubject<boolean> // Implemented

    // Combined State
    currentState: ICloudStorageState;
    currentState$: Observable<any>;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        /*
            Get system from settingsService
            Remove accountService and systemService
            Add get and set for account and system
            initialize in storage component
        */
        private cloudApiService: NxCloudApiService,
        private systemService: NxSystemService
    ) {
        this.CONFIG = configService.getConfig();
        this.init();
    }

    // Private instance methods

    init() {
        // setting up observables
        this.systemId$ = new BehaviorSubject('cff37c9f-969f-4c68-8cf0-e071a182a0d8'); // TODO: Issue with getting :systemId using activated route
        this.pending$ = new BehaviorSubject(false);
        // TODO: Cloud capacity in bytes, need to find where this will come from and in what format
        this.cloudCapacity$ = new BehaviorSubject(53687091200);
        // TODO: Currently using mock data, need to find where this will come from and in what format.
        this.usageStats$ = new BehaviorSubject(emptyUsage);

        // Replace and use settings service
        this.systemId$.subscribe(() => {
            const { value: systemId } = this.systemId$;
            this.systemService
                .createSystem(this.accountService.email, systemId)
                .getInfoAndPermissions(false)
                .catch(() => {}).then((systemWithPermissions: NxSystem) => {
                    this.system$ = new BehaviorSubject(systemWithPermissions);
                    // Need to find the correct place to get system cloud capabilities
                    this.systemCloudEnabled$ = new BehaviorSubject(systemWithPermissions.info.capabilities.vms_metrics);
                    this.userCloudEnabled$ = new BehaviorSubject(systemWithPermissions.canViewCloudStorage());
                    this.currentState$ = combineLatest(
                        this.userCloudEnabled$,
                        this.systemCloudEnabled$,
                        this.cloudCapacity$,
                        this.usageStats$
                    );

                    this.currentState$.subscribe(([userCloudEnabled, systemCloudEnabled, cloudCapacity, usageStats]) => {
                        this.currentState = { userCloudEnabled, systemCloudEnabled, cloudCapacity, usageStats };
                        console.log(this.currentState);
                    });
                });
        });

        this.currentState = {
            cloudCapacity      : 10000000,
            systemCloudEnabled : true,
            userCloudEnabled   : true,
            usageStats         : regularUsage
        };

        // Setup combined state after all oberservables have been setup
        // this.usageStats$ = new BehaviorSubject(null);
        // this.systemId$ = new BehaviorSubject('');
    }

    ngOnDestroy() {}

    // private linkCurrentState() {
    //     const cloudCapacity = this.cloudCapacity$.value;
    //     const systemCloudEnabled = this.systemCloudEnabled$.value;
    //     const userCloudEnabled = this.userCloudEnabled$.value;
    //     const usageStats = this.usageStats$.value;

    //     this.currentState = { cloudCapacity, systemCloudEnabled, userCloudEnabled, usageStats };
    // }

    // Move into settings service?
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
                // Subscribe to infoSubject from systemService instead of using systemCloudEnabled$
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
    // Waiting state already handled by processService
    // Probably no need for these methods

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
    currentRecordings : '_',
    whenFullyUsed     : '_',
    amountUsed        : '_',
    archiveFrom       : '_',
    recordingBitrate  : '_',
    delayFromLive     : '_'
};

const regularUsage: IUsageStats = {
    currentRecordings : 7457136000, // ms, rounded to the hour
    whenFullyUsed     : 1209600000, // ms, rounded to the hour
    amountUsed        : 17424682320, // bytes rounded to 0.1 Gb, percent calculated and rounded to 1%
    archiveFrom       : 11, // number of cameras represented by integer
    recordingBitrate  : 1500000, // bps rounded to 0.1 Mbps
    delayFromLive     : 1200000 // ms, rounded to 0.1s
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

export const mockState: ICloudStorageState = {
    cloudCapacity      : 100000000000,
    systemCloudEnabled : true,
    userCloudEnabled   : true,
    usageStats         : regularUsage
};

type UsageTypes = '_' | number
