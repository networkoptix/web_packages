import { Injectable } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxAccountService } from '../../../../services/account.service';
import { NxSystemsService } from '../../../../services/systems.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription, BehaviorSubject } from 'rxjs';
import { NxSystemService } from '../../../../services/system.service';
import { IConfig } from '../../../../services/nx-config';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class NxCloudStorageService {
    cloudStorageState: BehaviorSubject<IMockState>;
    CONFIG: IConfig
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
      private systemService: NxSystemService,
      private systemsService: NxSystemsService,
      private route: ActivatedRoute,
      private http: HttpClient
    //   private accountService: NxAccountService
    ) {
        this.cloudStorageState = new BehaviorSubject(initialMockState);
        this.CONFIG = configService.getConfig();
    }

    get currentState() {
        return this.cloudStorageState;
    }

    // getMoveParams() {
    //     return ['this.system', 'this.systems', 'this.peerSystems', 'this.accountService'];
    // }

    // Post request to back end

    enable(systemId: string, password: string) {
        const prevState = this.cloudStorageState.value;
        return this.http.post(this.CONFIG.apiBase + '/storage/create', {
            systemId,
            password
        }).toPromise().then(() => {
            // handle success
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: true });
        }).catch(() => {
            // handle error
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: true }); // pretending this works
        });

        // this.mockState.next({ ...this.mockState.value, systemCloudEnabled: true, usageStats: emptyUsage });
    }

    disable(systemId: string, password: string) {
        const prevState = this.cloudStorageState.value;
        return this.http.post(this.CONFIG.apiBase + '/storage/delete', {
            systemId,
            password
        }).toPromise().then(() => {
            // handle success
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: false });
        }).catch(() => {
            // handle error
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: false }); // pretending this works
        });

        // this.mockState.next({ ...this.mockState.value, systemCloudEnabled: false, usageStats: emptyUsage });
    }

    move(sourceSystemId: string, destinationSystemId: string) {
        const prevState = this.cloudStorageState.value;
        return this.http.post(this.CONFIG.apiBase + '/storage/move', {
            sourceSystemId,
            destinationSystemId
        }).toPromise().then(() => {
            // handle success
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: false });
        }).catch(() => {
            // handle error
            this.cloudStorageState.next({ ...prevState, systemCloudEnabled: false }); // pretending this works
        });
    }
}

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

const initialMockState: IMockState = {
    cloudCapacity     : 53687091200, // bytes
    systemCloudEnabled: false,
    userCloudEnabled  : true,
    usageStats        : emptyUsage
};

export interface IMockState {
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
