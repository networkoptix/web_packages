import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ModalBase } from '@dialogs/modal-base';
import { NxAccountService } from '@services/account.service';
import { NxSystemService } from '@services/system.service/system.service';

import type { OpenAuthenticationApp as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-open-authentication-app',
    templateUrl: 'open-authentication-app.component.html',
    styleUrls: ['open-authentication-app.component.scss'],
    standalone: true,
    imports: [CommonModule, NxPreLoaderComponent],
})
export class NxOpenAuthenticationApp extends ModalBase<DT['return']> {
    private accountService = inject(NxAccountService);
    private domSanitizer = inject(DomSanitizer);
    private http = inject(HttpClient);
    private systemService = inject(NxSystemService);

    private authorizationUrlString: string;
    authorizationUrl: SafeResourceUrl;

    iframeHeightInPixels = signal(480);
    iframeWidthInPixels = signal(480);

    constructor(dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
        // TODO: There might be something extra to do here for 2FA
        this.authorizationUrlString = `${window.location.origin}/authorize?email=${this.accountService.email}&redirect_uri=${window.location.href}`;
        this.authorizationUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
            this.authorizationUrlString,
        );
    }

    authorizationLoading = signal(true);

    handleLoad = async (event: Event): Promise<void> => {
        const contentWindow = (event.target as HTMLIFrameElement).contentWindow;
        if (!contentWindow) {
            return Promise.reject();
        }
        this.authorizationLoading.set(true);
        const style = contentWindow.document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .auth-footer {
                display: none !important;
            }
            .auth-window {
                overflow: hidden !important;
            }
        `;
        contentWindow.document.head.appendChild(style);

        const observer = new MutationObserver(() => {
            const authWindow = contentWindow.document.querySelector<HTMLElement>('.auth-window');
            if (authWindow) {
                // iframe size should match auth window size. This allows clicking outside of the auth window to close the dialog.
                // A possible improvement would be to add a close button to the actual auth app inside the iframe.
                this.iframeHeightInPixels.set(authWindow.scrollHeight);
                this.iframeWidthInPixels.set(authWindow.scrollHeight);
                observer.disconnect();
                this.dialogRef.disableClose = false;
                this.authorizationLoading.set(false);
            }
        });

        observer.observe(contentWindow.document, {
            childList: true,
            subtree: true,
        });

        const currentHref = contentWindow.location.href;

        if (
            currentHref &&
            !currentHref.startsWith(this.authorizationUrlString) &&
            currentHref.startsWith(window.location.origin)
        ) {
            event.preventDefault();
            const codeQueryParam = new URL(currentHref).searchParams.get('code');
            await firstValueFrom(
                this.http.post('/api/account/renewSession', { code: codeQueryParam }),
            );
            await this.systemService.logoutAllSystems();
            window.location.reload();
        }
    };
}
