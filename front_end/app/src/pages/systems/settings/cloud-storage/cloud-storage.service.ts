import { Injectable } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxAccountService } from '../../../../services/account.service';
import { NxSystemsService } from '../../../../services/systems.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription, BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxCloudStorageService {
    mockState: BehaviorSubject<IMockState>;
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
      // private accountService: NxAccountService,
      private systemsService: NxSystemsService,
      private route: ActivatedRoute
    ) {
        this.mockState = new BehaviorSubject(initialMockState);
    }

    get currentState() {
        return this.mockState;
    }

    enable() {
        this.mockState.next({ ...this.mockState.value, systemCloudEnabled: true });
    }

    disable() {
        this.mockState.next({ ...this.mockState.value, systemCloudEnabled: false });
    }
}

const initialMockState: IMockState = {
    systemCloudEnabled: false,
    userCloudEnabled  : true
};

export interface IMockState {
  systemCloudEnabled: boolean
  userCloudEnabled: boolean
}
