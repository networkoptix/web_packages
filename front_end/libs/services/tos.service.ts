import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom, switchMap, timer } from 'rxjs';
import { filter } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { TosInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';

@Injectable({ providedIn: 'root' })
export class TosService {
    readonly LANG = staticLang;
    readonly tosDeferred = 'tosDeferred';
    private cookieService = inject(CookieService);
    private cloudApiService = inject(NxCloudApiService);
    private dialogService = inject(NxDialogsService);
    private store = inject(Store);
    dialogIsVisible = false;

    authorized$ = this.store.select(accountSelectors.selectIsAuthenticated);
    constructor() {
        if (nxConfig.featureFlags.tosRequired) {
            this.authorized$
                .pipe(
                    takeUntilDestroyed(),
                    filter(Boolean),
                    switchMap(() => timer(0, nxConfig.tosConfig.hourly)),
                )
                .subscribe(() => {
                    /* Tos dialog is shown if the feature is enabled and any following conditions are met
                     * - The backend requires the tos to be accepted. (Grace Period is over) (Handled by the interceptor)
                     * - The user has logged in. (On successful logout all non http cookies are cleared)
                     * - 24hrs has passed since the user deferred the tos update.
                     */
                    if (!this.checkDeferred() && !this.dialogIsVisible) {
                        this.checkTos();
                    }
                });
        }
    }

    private checkDeferred(): boolean {
        return this.cookieService.check(this.tosDeferred);
    }
    private setDeferred(): void {
        const oneDay = new Date();
        oneDay.setHours(oneDay.getHours() + 24);
        return this.cookieService.set(this.tosDeferred, '', oneDay);
    }

    async checkTos(): Promise<void> {
        if (!this.dialogIsVisible) {
            this.dialogIsVisible = true;
            const tosInfo = await firstValueFrom(this.cloudApiService.fetchTos());
            if (!tosInfo.accepted) {
                await this.showUpdatedTos(tosInfo);
            }
        }
    }
    private async showUpdatedTos(tosInfo: TosInfo): Promise<void> {
        const res = await this.dialogService.tosUpdate(tosInfo);
        if (res === 'rejected') {
            await this.showDeclinedTos(tosInfo);
        } else if (res === 'accepted') {
            await this.cloudApiService.acceptAgreement(tosInfo.review_id);
        } else {
            this.setDeferred();
        }
        this.dialogIsVisible = res !== 'rejected';
    }

    private async showDeclinedTos(tosInfo: TosInfo): Promise<void> {
        const message = this.LANG.dialogs.tosUpdate.warning;
        const title = this.LANG.dialogs.titles.tosUpdate;
        const res = await this.dialogService.confirm({
            message,
            title,
            footer: { actionLabel: this.LANG.dialogs.buttons.goBack },
        });
        if (res) {
            return this.showUpdatedTos(tosInfo);
        }
        try {
            await this.cloudApiService.logout();
        } finally {
            // eslint-disable-next-line nx/ban-global-variables
            window.location.reload();
        }
    }
}
