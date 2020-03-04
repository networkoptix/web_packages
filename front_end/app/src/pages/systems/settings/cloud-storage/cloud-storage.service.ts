import { Injectable } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxAccountService } from '../../../../services/account.service';
import { NxSystemsService } from '../../../../services/systems.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxCloudStorageService {
    mockState: IMockState;
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
      private accountService: NxAccountService,
      private systemsService: NxSystemsService,
      private route: ActivatedRoute
    ) {
        this.mockState = initialMockState;
    }

    get currentState() {
        return this.mockState;
    }

    set currentState(updatedState) {
        this.mockState = { ...this.mockState, ...updatedState };
    }

    enable() {
        this.currentState = { ...this.mockState, systemCloudEnabled: true };
    }

    disable() {
        this.currentState = { ...this.mockState, systemCloudEnabled: false };
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
