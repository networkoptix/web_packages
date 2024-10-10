import { Injectable, isDevMode } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { LocalStorageService } from 'ngx-webstorage';
import { filter, tap } from 'rxjs';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';

@Injectable({
    providedIn: 'root',
})
export class NxSwPromptUpdateService {
    RELOAD_KEY = 'RELOAD_WINDOWS_ON_UPDATE';
    constructor(
        updates: SwUpdate,
        ribbonService: NxRibbonService,
        processService: NxProcessService,
        session: LocalStorageService,
    ) {
        if (!isDevMode() && !environment.isWebadmin) {
            updates.versionUpdates
                .pipe(
                    tap(evt => console.info('version update', evt)),
                    filter(evt => evt.type === 'VERSION_READY'),
                )
                .subscribe(() => {
                    const { notification, installButton } = staticLang.ribbon.newVersionAvailable;
                    ribbonService.show(notification, [
                        {
                            type: 'process-button',
                            text: installButton,
                            value: processService.createProcess(() =>
                                updates
                                    .activateUpdate()
                                    .then(() => session.store(this.RELOAD_KEY, true)),
                            ),
                        },
                    ]);
                });

            session.observe(this.RELOAD_KEY).subscribe(() => window.location.reload());
        }
    }
}
