import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy, LOCALE_ID, Input, OnChanges, SimpleChanges
} from '@angular/core';
import {
    filter, map, delay,
    retryWhen
}                                     from 'rxjs/operators';
import { Subscription }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService } from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../../language_i18n_static_types';
import { NxSystem } from '../../../../../services/system.service';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxApplyService } from '../../../../../services/apply.service';
import { NxProcessService } from '../../../../../services/process.service';
import { NxDialogsService } from '../../../../../dialogs/dialogs.service';
import { NxSettingsService } from '../../settings.service';
import { NxMenuService } from '../../../../../components/menu/menu.service';
import { NxUriService } from '../../../../../services/uri.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-logger-component',
    templateUrl : 'logger.component.html',
    styleUrls   : ['logger.component.scss']
})

export class NxSystemAdvancedLoggerComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    viewContainerRef: ViewContainerRef;

    @Input() system: any;
    @Input() server: any;

    systemLoggers: any = {

    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.server) {
            this.system
                .logLevel(changes.server.currentValue)
                .toPromise()
                .then(response => {
                    this.applyService.setVisible(false);
                    this.applyService.hardReset();
                    this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                    this.applyService.reset();
                    this.applyService.setVisible(true);

                    // this.systemLoggers = Object.keys(response.reply)
                    //     .map((key, value) => {
                    //         return {
                    //             key, value: response.reply.settings[key]
                    //         };
                    //     });
                });
        }
    }

    ngOnDestroy(): void {
    }

    settingsToBeDisplayedOrUpdated(loggers) {
        // Object.keys(loggers).forEach((key) => {
        //     const value = loggers[key];
        //     debugger;
            // if (!this.CONFIG.loggersConfig[key]) {
            //     let type = 'text';
            //     if (value === true || value === false ||
            //         value === 'true' || value === 'false') {
            //         type = 'checkbox';
            //     }
            //     this.CONFIG.settingsConfig[key] = { label: key, type: type };
            // }

            // if (this.CONFIG.loggersConfig[key].type === 'number') {
            //     this.systemSettings[key].value = this.systemSettings[key].originalValue = (value !== '') ? parseInt(value) : '';
            // } else if (this.CONFIG.loggersConfig[key].type === 'checkbox') {
            //     this.systemSettings[key].value = this.systemSettings[key].originalValue = (value === 'true');
            // } else {
            //     this.systemSettings[key].value = this.systemSettings[key].originalValue = value;
            // }
            //
            // this.CONFIG.loggersConfig[key].oldValue = value;
        // });
    }
}
