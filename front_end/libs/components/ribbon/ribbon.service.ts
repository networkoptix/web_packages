import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import type { Translatable } from '@pipes/nx-translate.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';

import type { RibbonAction, RibbonContext } from './ribbon.types';

@Injectable({ providedIn: 'root' })
export class NxRibbonService {
    LANG = staticLang;
    context: RibbonContext = {
        visibility: false,
        message: undefined,
        actions: [],
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor(
        private appStateService: NxAppStateService,
        private headerService: NxHeaderService,
    ) {}

    show(
        message: Translatable,
        actions: RibbonAction[],
        type?: string,
        updateFunction?: () => void,
        systemOnly = false,
    ): void {
        if (message === this.LANG.ribbon.systemOffline && environment.isLocal) {
            return;
        }
        if (
            systemOnly &&
            !(
                this.headerService.currentLocation.isSystem &&
                this.headerService.currentLocation.path !== '/systems'
            )
        ) {
            return;
        }

        this.context = {
            visibility: true,
            message,
            actions,
            type,
            updateFunction,
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = true;
    }

    hide(): void {
        this.context = {
            visibility: false,
            message: '',
            actions: [],
            type: undefined,
            updateFunction: undefined,
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = false;
    }
}
