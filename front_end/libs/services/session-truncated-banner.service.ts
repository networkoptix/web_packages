import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, from, of, timer } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import staticLang from '@language_static';
import { MS } from '@utils/general';
import { parseJWTToken } from '@utils/token-tools';

import { NxLoginService } from './login.service';
import { NxSystemRestAPI } from './system-rest-api.service';
import { NxSystemService } from './system.service/system.service';

const minutesToMilliseconds = (minutes: number): number => minutes * 60 * 1000;
const millisecondsToMinutes = (milliseconds: number): number => milliseconds / 60 / 1000;

const getPasswordEnteredTime = (token: string): number => {
    const parsedToken = parseJWTToken(token);
    // password is in seconds from JWT
    return parsedToken.passwordTime * 1000;
};

const DEFAULT_SETTINGS = {
    sessionLimitForCloudEnabled: false,
    sessionLimitLength: Number.POSITIVE_INFINITY,
};

const INTERVAL_TIME = MS.second * 10;

@Injectable({
    providedIn: 'root',
})
export class NxSessionTruncatedBannerService {
    private ribbonService = inject(NxRibbonService);
    private currentSystem = inject(NxSystemService).currentSystem$;
    private translateService = inject(TranslateService);
    private loginService = inject(NxLoginService);
    private LANG = staticLang;

    private showingSessionBanner = false;

    private currentSystemSettings = DEFAULT_SETTINGS;

    private hideSessionBannerIfShowing = (): void => {
        if (this.showingSessionBanner) {
            this.ribbonService.forceShow = false;
            this.ribbonService.hide();
            this.showingSessionBanner = false;
        }
    };

    private getTimeRemainingOnSession = async (): Promise<number> => {
        const currentSystem = this.currentSystem.value;
        if (!this.currentSystemSettings.sessionLimitForCloudEnabled || !currentSystem) {
            return Number.POSITIVE_INFINITY;
        }

        const mediaServer = currentSystem.mediaserver as NxSystemRestAPI;
        const accessToken = await firstValueFrom(mediaServer.getAccessTokenWithOptionalFetch());
        const passwordEnteredTime = getPasswordEnteredTime(accessToken);
        const sessionExpirationTime =
            passwordEnteredTime + this.currentSystemSettings.sessionLimitLength;
        const currentTime = Date.now();
        return sessionExpirationTime - currentTime;
    };

    private updateSessionBanner = async (): Promise<void> => {
        const timeRemaining = await this.getTimeRemainingOnSession();

        if (timeRemaining > MS.hour) {
            return this.hideSessionBannerIfShowing();
        }

        this.ribbonService.forceShow = true;
        const timeForText = Math.max(0, Math.floor(millisecondsToMinutes(timeRemaining)));
        const sessionTruncatedText = this.translateService.instant(
            this.LANG.ribbon.sessionTruncated,
            {
                count: timeForText,
            },
        );
        this.ribbonService.show(
            sessionTruncatedText,
            [
                {
                    type: 'button',
                    text: this.LANG.ribbon.reauthenticate,
                    value: () => {
                        if (!this.loginService.currentSystem && this.currentSystem.value) {
                            this.loginService.currentSystem = this.currentSystem.value;
                        }
                        this.loginService
                            .updateSession(SessionState.ContinueWorking, true)
                            .then(() => {
                                this.updateSessionBanner();
                            });
                    },
                },
            ],
            'session-expiring-alert',
        );
        this.showingSessionBanner = true;
    };

    constructor() {
        this.currentSystem
            .pipe(
                takeUntilDestroyed(),
                tap(() => {
                    // Anytime the system changes we need to hide the banner if it's showing
                    this.hideSessionBannerIfShowing();
                }),
                switchMap(system => {
                    if (!system) {
                        return of();
                    }
                    return system.updateOrGetSystemSettings().pipe(
                        map(settings => {
                            return {
                                sessionLimitForCloudEnabled: settings?.reply?.settings
                                    .useSessionLimitForCloud as unknown as boolean,
                                sessionLimitLength: minutesToMilliseconds(
                                    settings?.reply?.settings
                                        .sessionLimitMinutes as unknown as number,
                                ),
                            };
                        }),
                        switchMap(settings => {
                            this.currentSystemSettings = settings;
                            if (!settings.sessionLimitForCloudEnabled) {
                                // Setting not enabled, return so it will update the banner only once
                                return of();
                            }
                            return from(this.getTimeRemainingOnSession()).pipe(
                                switchMap(timeRemaining => {
                                    if (!timeRemaining) {
                                        return of();
                                    }
                                    // Start the interval when the session is 1 hour away from expiring
                                    return timer(
                                        Math.max(0, timeRemaining - MS.hour),
                                        INTERVAL_TIME,
                                    );
                                }),
                            );
                        }),
                    );
                }),
            )
            .subscribe(() => this.updateSessionBanner());
    }
}
