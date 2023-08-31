import { Component, Input, OnChanges, ViewChild } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxToastService } from '@services/toast.service';
import { NgChanges } from '@utils/ng-changes';

interface ServerOption extends DropdownItem<string> {
    status: string;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-license-new-component',
    templateUrl: 'new.component.html',
    styleUrls: ['new.component.scss'],
})
export class NxLicenseNewComponent implements OnChanges {
    LANG = staticLang;

    serverOptions: ServerOption[] = [];
    activateKey: any;

    formattedKey: string;
    license: string;
    selectedServer: ServerOption;
    keyUsedIn: string;

    @Input() servers: NxSystemServer[] = [];
    @Input() system: NxSystem;
    @Input() licenses: any = [];

    windowSizeSubscription: SubscriptionLike;
    hideErrors = true;

    @ViewChild('newLicenseForm') licenseForm: HTMLFormElement;
    @ViewChild('errorDiv') errorDiv: HTMLDivElement;
    @ViewChild('errorDivMirror') errorDivMirror: HTMLDivElement;

    private setupDefaults(): void {
        this.activateKey = this.processService.createProcess(
            () => {
                this.hideErrors = false;
                if (!this.system.isOnline) {
                    return new Promise((resolve, reject) => {
                        this.licenseForm.controls.licenseKey.setErrors({ offline: true });
                        this.licenseForm.controls.licenseKey.markAsTouched();

                        return reject('offline');
                    });
                } else if (this.isActivated(this.license)) {
                    return new Promise((resolve, reject) => {
                        this.licenseForm.controls.licenseKey.setErrors({ alreadyRegistered: true });
                        this.licenseForm.controls.licenseKey.markAsTouched();

                        return reject('alreadyRegistered');
                    });
                } else {
                    // this.system.serverManager.initSystemMediaServers();
                    return this.system.serverManager
                        .activateLicense(
                            this.selectedServer.value,
                            this.formatLicenseKey(this.license),
                        )
                        .then(
                            (response: any) => {
                                if (response.reply) {
                                    this.system.licensesModified = this.license;
                                    this.license = '';
                                    this.formattedKey = '';
                                    this.licenseForm.controls.licenseKey.markAsUntouched();

                                    this.toastService.notify(
                                        this.LANG.license.messages.activated,
                                        ToastType.Success,
                                    );

                                    return;
                                }

                                // legacy license api returns 200
                                this.processErrors(response);
                            },
                            fail => {
                                if (
                                    fail.name === 'HttpErrorResponse' ||
                                    (fail.error && fail.error.type === 'error')
                                ) {
                                    // license api v2 returns 422
                                    this.processErrors(fail.error);
                                } else {
                                    if (fail.name === 'TimeoutError') {
                                        this.toastService.notify(
                                            this.LANG.errorCodes.licenseTimeout,
                                            ToastType.Danger,
                                        );
                                    }
                                    console.error(fail);
                                }
                            },
                        );
                }
            },
            {
                errorCodes: {
                    offline: () => {},
                    alreadyRegistered: () => {},
                },
            },
        );
    }

    constructor(private processService: NxProcessService, private toastService: NxToastService) {}

    ngOnInit(): void {
        this.setupDefaults();
    }

    ngOnChanges(changes: NgChanges<NxLicenseNewComponent>): void {
        if (changes.servers && changes.servers.currentValue) {
            this.serverOptions = [];

            if (changes.servers.currentValue.length) {
                this.serverOptions = changes.servers.currentValue.map(server => {
                    const option: ServerOption = {
                        name: server.name,
                        value: server.id,
                        status: server.status,
                    };

                    if (server.status !== 'Online') {
                        option.help = ` - ${server.status}`;
                    }

                    return option;
                });

                // prevent server change
                const serverMatch = this.serverOptions.find(
                    server => server.value === this.selectedServer?.value,
                );

                if (!serverMatch) {
                    this.selectedServer =
                        this.serverOptions.find(server => server.status === 'Online') ??
                        this.serverOptions[0];
                }
            }
        }
    }

    processErrors(response): void {
        const error = response.errorString.toLowerCase();
        const matchError = errorString => error.includes(errorString);

        switch (response.error) {
            case '1':
                this.toastService.notify(response.errorString, ToastType.Danger); // missing param?
                break;

            case '2':
            // Invalid license serial number provided. Serial number MUST be in format AAAA-BBBB-CCCC-DDDD

            // eslint-disable-next-line no-fallthrough
            case '3':
                // Network/Http error has occurred during license activation. Error code: -1
                if (matchError('error has occurred during license activation')) {
                    this.toastService.notify(
                        this.LANG.errorCodes.licenseServerError,
                        ToastType.Danger,
                    );
                    break;
                }
                if (matchError('license is expired')) {
                    // Can't activate license: License is expired.
                    this.licenseForm.controls.licenseKey.setErrors({ expired: true });
                } else if (matchError('only one nvr license')) {
                    // Only one NVR license is allowed per System.↵You already have one active NVR license.
                    this.licenseForm.controls.licenseKey.setErrors({ nvrError: true });
                } else if (matchError('only one starter license is allowed')) {
                    // Can't activate license: Only one Starter license is allowed per System.↵You already have one active Starter license.
                    // Can't activate license: Only one starter license is allowed per System.
                    this.licenseForm.controls.licenseKey.setErrors({ starter: true });
                } else if (matchError('license key you have entered is invalid')) {
                    // Can't activate license:  license key you have entered is invalid.
                    this.licenseForm.controls.licenseKey.setErrors({ mask: true });
                } else if (
                    [
                        'requires higher software version',
                        'you are trying to activate a license incompatible with your software.',
                    ].some(matchError)
                ) {
                    // Can't activate license: This license type requires higher software version
                    // Can't activate license: You are trying to activate a license incompatible with your software.
                    this.licenseForm.controls.licenseKey.setErrors({ compatibility: true });
                } else {
                    // Can't activate license:   This License Key has been previously activated to Hardware Id 052f2577426947...
                    let matchStart = response.errorString.indexOf('activated to Hardware Id');
                    if (matchStart !== -1) {
                        // get HWID
                        matchStart += 'activated to Hardware Id '.length;
                        const matchEnd = response.errorString.substr(matchStart).indexOf(' ');
                        this.keyUsedIn = response.errorString.substr(matchStart, matchEnd);
                        this.licenseForm.controls.licenseKey.setErrors({ inuse: true });
                    }
                }
                this.licenseForm.controls.licenseKey.markAsTouched();
                break;

            default:
                this.toastService.notify(this.LANG.errorCodes.licenseFail, ToastType.Danger);
        }
    }

    setLicenseKey(key, form): void {
        this.license = key;
        this.formattedKey = this.formatLicenseKey(this.license);
        form.controls.licenseKey.markAsUntouched();
    }

    updateCursorPosition(event): void {
        setTimeout(() => {
            const cursorPosition = this.license.length + Math.floor(this.license.length / 4);
            event.target.setSelectionRange(cursorPosition, cursorPosition);
        });
    }

    changeServer(server: ServerOption): void {
        this.selectedServer = server;
    }

    displayErrors = (): void => {
        this.hideErrors = false;
    };

    public formatLicenseKey = (key: string) => {
        if (key) {
            const chunks = key.match(/.{1,4}/g);
            return chunks.join('-').toUpperCase(); // returns AAAA-BBBB-CCCC-DDDD
        }
    };

    public isActivated(license): boolean {
        return this.licenses.find(lic => {
            return lic.key === this.formatLicenseKey(license);
        });
    }
}
