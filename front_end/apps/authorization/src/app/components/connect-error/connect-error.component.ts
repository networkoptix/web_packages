import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Process } from '@services/process.service/process';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-connect-error-component',
    templateUrl: 'connect-error.component.html',
    styleUrls: ['connect-error.component.scss']
})
export class NxAuthorizeConnectErrorComponent implements OnInit {
    CONFIG: IConfig;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() clientType: string;
    @Input() errorType: string;
    @Input() processTryAgain: Process;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
    }

    setupNonCloudSystem(): void {
        // future TO-DO
    }
}
