import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RibbonAction }              from './ribbon.component';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxHeaderService }           from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { IConfig, NxConfigService }  from '@services/nx-config';

export interface RibbonActionInput extends Omit<RibbonAction, 'text'>{
    text: string | Function;
}

@Injectable({ providedIn: 'root' })
export class NxRibbonService {
    LANG: LanguageI18NStaticTypes
    CONFIG: IConfig
    context = {
        visibility     : false,
        message        : '',
        actions        : [],
        type           : '',
        updateFunction : ''
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor(
        private appStateService: NxAppStateService,
        private headerService: NxHeaderService,
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.config;
    }

    show(message, actions: RibbonActionInput[], type?, updateFunction?, systemOnly = false) {
        if (message === this.LANG.ribbon.systemOffline?.() && this.CONFIG.isLocal) {
            return;
        }
        if (systemOnly && !(this.headerService.currentLocation.isSystem && this.headerService.currentLocation.path !== '/systems')) {
            this.hide();
            return;
        }
        actions.forEach(action => {
            if (action.type === 'link') {
                action.text = (typeof action.text === 'function') ? action.text() : action.text;
            }
        });
        const msg = (typeof message === 'function') ? message() : message;

        this.context = {
            visibility : true,
            message    : msg,
            actions,
            type,
            updateFunction
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = true;
    }

    hide() {
        this.context = {
            visibility     : false,
            message        : '',
            actions        : [],
            type           : '',
            updateFunction : ''
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = false;
    }
}
