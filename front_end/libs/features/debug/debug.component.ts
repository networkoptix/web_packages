import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';
import { NxSystemsService } from '@services/systems.service';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import type { LinkSettings } from '@services/url-protocol.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-debug',
    templateUrl: 'debug.component.html'
})
export class NxDebugComponent {
    LANG: LanguageI18NStaticTypes;
    // eslint-disable-next-line no-tabs
    actionParameters = '{\n	"example": true\n}';
    actionParametersError = false;
    debugProcess;
    debugProxySettings = {
        authGet: '',
        authPost: '',
        method: 'POST',
        proxyUrl: 'relay-bur.vmsproxy.hdw.mx',
        systemId: new Watcher<string>(),
        apiCall: 'web/ec2/saveUser',
        data: '{}',
        success: undefined,
        result: ''
    };

    linkSettings: LinkSettings = {
        native: true,
        from: undefined, // client, mobile, portal, webadmin
        context: undefined,
        command: undefined, // client, cloud, system
        systemId: undefined,
        action: undefined,
        actionParameters: undefined, // Object with parameters
        auth: undefined // true for request, undefined for skipping, string for specific value
    };

    mergeSettings = {
        masterSystemId: '',
        slaveSystemId: '',
        result: ''
    };

    message = JSON.stringify({ code: 'test_code' }, undefined, '\t');
    notificationError = false;
    notifyCounter = 0;
    password: '';
    result = '';
    system: NxSystemWithUserInfo;
    systems: NxSystemWithUserInfo[];
    type = 'activate_account';
    userEmail = '';
    constructor(@Inject(WINDOW) private window: Window,
        private http: HttpClient,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private dialogsService: NxDialogsService,
        private languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private systemsService: NxSystemsService,
        private urlProtocol: NxUrlProtocolService,
    ) {
        this.LANG = this.languageService.translations;
        this.accountService.get().then(acc => {
            this.init();
        });
    }

    private clearEmptyStrings(obj) {
        const temp = { ...obj };
        Object.entries(obj).forEach(([key, value]: [string, any]) => {
            if (value === '' || value === undefined) {
                delete temp[key];
            }
        });
        return temp;
    }

    private parseActionParams(): void {
        this.linkSettings.actionParameters = undefined;
        try {
            this.actionParametersError = false;
            if (this.actionParameters && this.actionParameters !== '') {
                this.linkSettings.actionParameters = JSON.parse(this.actionParameters);
            }
        } catch (a) {
            this.actionParametersError = true;
        }
    }

    private init(): void {
        this.systemsService.systemsSubject
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                this.systems = systems;
                if (!this.debugProxySettings.systemId.value && this.systems[0]) {
                    this.debugProxySettings.systemId.value = this.systems[0].id;
                    this.system = this.systems[0];
                }
            });
        this.debugProxySettings.systemId.valueSubject.pipe(
            filter(systemId => systemId !== undefined)
        ).subscribe((systemId: string) => {
            this.system = this.systems.find(system => system.id === systemId);
            this.cloudApiService.getSystemAuth(systemId)
                .subscribe(authKeys => {
                    this.debugProxySettings.authGet = authKeys.authGet;
                    this.debugProxySettings.authPost = authKeys.authPost;
                });
        });

        const debugProcess = this.processService.createProcess(() => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (this.debugProcess.success) {
                        resolve({
                            data: {
                                resultCode: this.LANG.errorCodes.ok?.()
                            }
                        });
                    } else {
                        reject(false);
                    }
                }, 2000);
            });
        }, {
            successMessage: 'Success!',
            errorPrefix: 'Fail!'
        }).then(res => {
            console.log(res);
        }, error => {
            console.error(error);
        });

        this.debugProcess = {
            success: true,
            process: debugProcess
        };
        // Handling promise to satisfy the linter.
        this.systemsService.forceUpdateSystemsAsPromise().then(() => { });
    }

    debugProxy(): void {
        let data;
        if (this.debugProxySettings.data) {
            data = JSON.parse(this.debugProxySettings.data);
        }
        let request;
        if (this.debugProxySettings.method === 'GET') {
            request = this.http.get(this.debugProxyUrl());
        } else {
            request = this.http.post(this.debugProxyUrl(), { data });
        }
        request.subscribe(result => {
            this.debugProxySettings.success = true;
            this.debugProxySettings.result = JSON.stringify(result, undefined, 2);
        }, error => {
            this.debugProxySettings.success = false;
            this.debugProxySettings.result = JSON.stringify(error, undefined, 2);
        });
    }

    debugProxyUrl() {
        const auth = (this.debugProxySettings.method === 'GET')
            ? this.debugProxySettings.authGet
            : this.debugProxySettings.authPost;
        const protocol = this.window.location.protocol;
        const systemId = this.debugProxySettings.systemId.value;
        const proxyUrl = this.debugProxySettings.proxyUrl;
        const apiCall = this.debugProxySettings.apiCall;
        return `${protocol}//${systemId}.${proxyUrl}/${apiCall}?auth=${auth}`;
    }

    formatJSON(data) {
        return JSON.stringify(data, undefined, '\t');
    }

    generateLink() {
        this.parseActionParams();
        return this.urlProtocol.generateLink(
            this.clearEmptyStrings(this.linkSettings)
        );
    }

    getTempKey(): void {
        this.accountService.authKey().then(authKey => {
            this.linkSettings.auth = authKey;
        }, noAccount => {
            console.error(`Couldn't retrieve temporary auth_key from cloud_portal ${noAccount}`);
            this.linkSettings.auth = 'couldn\'t retrieve temporary auth_key from cloud_portal';
        });
    }

    mergeSystems(): void {
        this.mergeSettings.result = 'working';
        this.cloudApiService.merge(
            this.mergeSettings.masterSystemId,
            this.mergeSettings.slaveSystemId,
            this.password
        ).then(success => {
            this.mergeSettings.result = JSON.stringify(success, undefined, 2);
        }, error => {
            this.mergeSettings.result = JSON.stringify(error, undefined, 2);
        });
    }

    notify(): void {
        const states = Object.values(toast);
        const type = states[Math.floor(Math.random() * states.length)];
        const hold = Math.random() > 0.9;
        this.dialogsService.notify(
            `${this.notifyCounter++}: ${type}: ${hold}`, type, hold
        );
    }

    openLink(): void {
        this.parseActionParams();
        this.urlProtocol.getLink(this.clearEmptyStrings(this.linkSettings))
            .then((data: any) => {
                const link = data.link;
                // @ts-expect-error
                this.window.protocolCheck(
                    link,
                    openClientTimeout,
                    openMobileClientTimeout,
                    () => { alert('Protocol not recognized'); },
                    () => { alert('Ok - protocol is working'); }
                );
            });
    }

    testNotification(): void {
        this.result = undefined;
        let message = this.message;
        try {
            message = JSON.parse(message);
        } catch (a) {
            this.result = 'Message is not a valid JSON object';
            console.warn(`Message is not json ${message}`);
        }
        this.cloudApiService.notificationSend(this.userEmail, this.type, message)
            .then((res: any) => {
                this.notificationError = false;
                this.result = this.formatJSON(res.data);
                console.warn(res);
            }, (error: any) => {
                this.notificationError = true;
                this.result = error.data.errorText;
                console.error(error);
            }
            );
    }
}
