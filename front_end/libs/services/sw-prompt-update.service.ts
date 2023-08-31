import { ApplicationRef, Inject, Injectable, Injector } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';
import { concat, interval, zip } from 'rxjs';
import { first, tap, filter, take } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root',
})
export class NxSwPromptUpdateService {
    LANG = staticLang;
    ribbonService: NxRibbonService;
    processService: NxProcessService;

    constructor(
        translateService: TranslateService,
        updates: SwUpdate,
        appRef: ApplicationRef,
        injector: Injector,
        @Inject(WINDOW) private window: Window,
    ) {
        const languageSet$ = translateService.onTranslationChange.pipe(
            filter(translations => translations !== null),
            take(1),
            tap(_ => {
                this.ribbonService = injector.get(NxRibbonService);
                this.processService = injector.get(NxProcessService);
            }),
        );
        if (environment.production && !environment.isLocal) {
            updates.available.subscribe(evt => {
                // console.log(`New app version available: ${evt.available.hash}`);
                this.ribbonService.show(this.LANG.ribbon.newVersionAvailable.notification, [
                    {
                        type: 'process-button',
                        text: this.LANG.ribbon.newVersionAvailable.installButton,
                        value: this.processService.createProcess(() => {
                            return updates.activateUpdate().then(() => {
                                this.window.location.reload();
                            });
                        }),
                    },
                ]);
            });
        }
        const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
        const everyMinute$ = interval(60 * 1001);
        const everyMinuteOnceAppIsStable$ = concat(zip(languageSet$, appIsStable$), everyMinute$);
        if (environment.production && !environment.isLocal) {
            everyMinuteOnceAppIsStable$.subscribe(_ => {
                updates.checkForUpdate();
            });
        }
    }
}
