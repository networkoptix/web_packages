import { ApplicationRef, Inject, Injectable, Injector } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { concat, interval, zip } from 'rxjs';
import { first, tap, filter, take } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxSwPromptUpdateService {
    LANG: LanguageI18NStaticTypes;
    ribbonService: NxRibbonService;
    processService: NxProcessService;

    constructor(
        languageService: NxLanguageProviderService,
        updates: SwUpdate,
        appRef: ApplicationRef,
        injector: Injector,
        @Inject(WINDOW) private window: Window
    ) {
        const languageSet$ = languageService.translateSubject.pipe(
            filter((translations: LanguageI18NStaticTypes) => translations !== null),
            take(1),
            tap(_ => {
                this.LANG = languageService.translations;
                this.ribbonService = injector.get(NxRibbonService);
                this.processService = injector.get(NxProcessService);
            }));
        updates.available.subscribe(evt => {
            console.log(`New app version available: ${evt.available.hash}`);
            this.ribbonService.show(this.LANG.ribbon.newVersionAvailable.notification(),
                [{
                    type: 'process-button',
                    text: this.LANG.ribbon.newVersionAvailable.installButton(),
                    value: this.processService.createProcess(() => {
                        return updates.activateUpdate().then(() => {
                            this.window.location.reload();
                        });
                    })
                }]);
        });

        const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
        const everyMinute$ = interval(60 * 1001);
        const everyMinuteOnceAppIsStable$ = concat(zip(languageSet$, appIsStable$), everyMinute$);
        everyMinuteOnceAppIsStable$.subscribe(_ => {
            updates.checkForUpdate();
        });
    }
}
