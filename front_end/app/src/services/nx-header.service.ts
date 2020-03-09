import { Injectable }             from '@angular/core';
import { NxConfigService }        from './nx-config/nx-config.service';
import { BehaviorSubject, timer } from 'rxjs';
import { IConfig } from './nx-config/config-types';

@Injectable({
    providedIn : 'root'
})
export class NxHeaderService {
    CONFIG: IConfig;

    // Only to communicate with AJS
    systemIdSubject = new BehaviorSubject(undefined);

    constructor(configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }
}
