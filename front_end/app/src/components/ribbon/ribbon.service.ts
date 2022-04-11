import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import type { RibbonAction } from './ribbon.component.types';

export interface RibbonActionInput extends Omit<RibbonAction, 'text'> {
    text: string | Function;
}

@Injectable({ providedIn: 'root' })
export class NxRibbonService {
    LANG: LanguageI18NStaticTypes;
    context = {
        visibility: false,
        message: '',
        actions: [],
        type: '',
        updateFunction: ''
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor(
        private appStateService: NxAppStateService,
        private headerService: NxHeaderService,
        languageService: NxLanguageProviderService
    ) {
        this.LANG = languageService.translations;
    }

    show(
        message,
        actions: RibbonActionInput[],
        type?,
        updateFunction?,
        systemOnly = false
    ) {
        if (
            message === this.LANG.ribbon.systemOffline?.() &&
            environment.isLocal
        ) {
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
        actions.forEach(action => {
            if (action.type === 'link') {
                action.text = (typeof action.text === 'function')
                    ? action.text()
                    : action.text;
            }
        });
        const msg = (typeof message === 'function') ? message() : message;

        this.context = {
            visibility: true,
            message: msg,
            actions,
            type,
            updateFunction
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = true;
    }

    hide() {
        this.context = {
            visibility: false,
            message: '',
            actions: [],
            type: '',
            updateFunction: ''
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = false;
    }
}
