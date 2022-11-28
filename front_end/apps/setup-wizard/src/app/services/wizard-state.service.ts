import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import type { SearchableDropdownItem as Item } from '@components/dropdowns/searchable/searchable.component.types';
import { alertTimeout, apiBase, icons, settingsConfig, simpleURLRegex } from '@lib/variables/static-variables';
import { Setting } from '@services/nx-config/base-config';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemAPIService } from '@services/system-api.service';
import { ModuleInformationReply, NormalResponse, SystemConfigSettings, UserSession } from '@services/system-api.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { WINDOW } from '@services/window-provider';
import { alphabeticalSort } from '@utils/general';

import { FORM_STATE, iState, SECURITY_LEVEL, WIZARD_STATE } from '../types/wizard-state.types';

interface BindResponse {
    id: string
    authKey: string
}

interface DiscoveredPeerSetup {
    compatibleCloudHost: boolean
    hint: string
    ip: string
    isNew: boolean
    name: string
    systemName: string
    url: string
    visibleName: string
}

interface HasInternet {
    client: boolean
    server: boolean
}

interface NetworkConfig {
    'dhcp'?: boolean
    'dns_servers'?: string
    'extraParams'?: unknown
    'gateway'?: string
    'ipAddr'?: string
    'mac'?: string
    'name'?: string
    'netMask'?: string
}

interface NormalNetworkConfig extends NormalResponse<NetworkConfig[]> {}

interface NetworkInfo {
    ip?: string
    port?: number
}

interface NetworkingInterfaces {
    interfaces: NetworkInfo[]
}

interface ServerFlags {
    hasHDD: string
    newServerFlag: string
    publicIpFlag: string
    ifListFlag: string
    timeCtrlFlag: string
}

interface SetupConfig {
    chooseCloudSystem: boolean,
    savePassword: boolean,
    systemName: string,

    cloudEmail: string,
    cloudPassword: string,
    cloudSystemID: string,

    localLogin: string,
    localPassword: string,
    localPasswordConfirmation: string,
    localLoginDataState: string,

    remoteSystem: Item,
    remoteLogin: string,
    remotePassword: string,
    mergeDataState: string
}

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class WizardStateService {
    currentState$ = new BehaviorSubject<WIZARD_STATE >(undefined);
    icons = icons;

    set currentState(state: WIZARD_STATE) {
        this.currentState$.next(state);
    }

    get currentState(): WIZARD_STATE {
        return this.currentState$.getValue();
    }

    get fsm(): iState {
        return this.wizardFSM[this.currentState];
    }

    get title(): string {
        return this.wizardFSM[this.currentState].title || '';
    }

    CONFIG: IConfig;
    LANG = staticLang;
    server: NxSystemRestAPI | NxSystemRestAPI2;

    private readonly defaultUser = 'admin';
    private readonly flags: ServerFlags = {
        hasHDD: 'SF_Has_HDD',
        newServerFlag: 'SF_NewSystem',
        publicIpFlag: 'SF_HasPublicIP',
        ifListFlag: 'SF_IfListCtrl',
        timeCtrlFlag: 'SF_timeCtrl',
    };
    private readonly serverVersion = 5.1;

    public wizardFSM: { [key: string]: iState };

    credentials = {
        isCloud: false,
        login: '',
        password: ''
    };

    hasInternet: HasInternet = {
        client: false,
        server: false
    };

    networkInfo: NetworkInfo = {};
    networkSettings: NetworkConfig;
    serverInfo: ModuleInformationReply;
    peers: DiscoveredPeerSetup[] = [];
    setupConfig: SetupConfig = {
        chooseCloudSystem: false,
        savePassword: true,
        systemName: '',

        cloudEmail: '',
        cloudPassword: '',
        cloudSystemID: '',

        localLogin: this.defaultUser,
        localPassword: this.defaultUser,
        localPasswordConfirmation: '',
        localLoginDataState: FORM_STATE.INVALID,

        remoteSystem: {
            name: '',
            value: ''
        },
        remoteLogin: '',
        remotePassword: '',
        mergeDataState: FORM_STATE.INVALID,
    };

    systemSettings: SystemConfigSettings = {
        settingsPreset: SECURITY_LEVEL.STANDARD,
        cloudAccountName: '',
        cloudHost: '',
        cloudSystemID: '',
        localSystemId: '',
        specificFeatures: undefined,
        statisticsAllowed: true,
        statisticsReportLastNumber: 0,
        statisticReportsLastTime: undefined,
        statisticReportLastVersion: '',
        systemName: '',
        mergeInfo: {},
    };

    // eslint-disable-next-line nx/no-untyped-init
    systemAdvancedSettings = {};

    securityLevel = SECURITY_LEVEL.STANDARD;
    formValidateSubject = new BehaviorSubject<boolean>(false);

    constructor(
        config: NxConfigService,
        private http: HttpClient,
        private nxSystemAPIService: NxSystemAPIService,
        private router: Router,
        private translate: TranslateService,
        @Inject(WINDOW) public window: Window,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = config.getConfig();

        const [host, port] = this.window.location.host.split(':');
        this.networkInfo = {
            ip: host,
            port: parseInt(port)
        };
        this.currentState$
            .pipe(untilDestroyed(this))
            .subscribe(state => {
                console.log(state);
                this.router.navigate([state || '/'], { skipLocationChange: true })
                    .catch(err => {
                        console.log('nav failed handle it', err);
                    });
            });

        this.wizardFSM = {
            start: {
                title: this.LANG.setupWizard.title.start,
                next: () => {
                    this.currentState = WIZARD_STATE.SystemName;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.Merge;
                }
            },
            systemName: {
                title: this.LANG.setupWizard.title.systemName,
                jump: () => {
                    this.currentState = WIZARD_STATE.Advanced;
                },
                back: () => {
                    this.currentState = WIZARD_STATE.Start;
                },
                next: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.Merge;
                },
                validate: () => this.setupConfig.systemName.length > 0
            },
            advanced: {
                title: this.LANG.setupWizard.title.advanced,
                back: () => {
                    this.currentState = WIZARD_STATE.SystemName;
                },
                next: () => {
                    this.currentState = WIZARD_STATE.SystemName;
                }
            },

            /** Disabled for now
            configureWrongNetwork: {
                retry: () => {
                    // restart mediaserver
                }
            },
            configureNetworkForInternet: {
                back: () => {
                    this.currentState = WIZARD_STATE.NoInternetOnServer;
                },
                retry: () => {
                    // restart mediaserver
                }
            },
            noInternetOnServer: {
                back: () => {
                    this.currentState = WIZARD_STATE.ChooseCloudOrLocal;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                },
                retry: () => {
                    // Check internet and cloudAuthorized ? 'cloudAuthorizedIntro' : 'cloudIntro'
                }
            },
            noInternetOnClient: {
                back: () => {
                    this.currentState = WIZARD_STATE.ChooseCloudOrLocal;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                },
                retry: () => {
                    // Check internet and cloudAuthorized ? 'cloudAuthorizedIntro' : 'cloudIntro'
                }
            },
            */

            /** Disabled cloud connectivity
            chooseCloudOrLocal: {
                back: () => {
                    this.currentState = WIZARD_STATE.SystemName;
                },
                next: () => {
                    // If cloud set WIZARD_STATE.LocalLogin
                    // If no internet on server set WIZARD_STATE.NoInternetOnServer
                    // If no internet on client set WIZARD_STATE.NoInternetOnClient
                    // cloudAuthorized ? 'cloudAuthorizedIntro' : 'cloudIntro'
                }
            },
            cloudIntro: {
                back: () => {
                    this.currentState = WIZARD_STATE.ChooseCloudOrLocal;
                },
                next: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                }
            },
            cloudAuthorizedIntro: {
                back: () => {
                    this.currentState = WIZARD_STATE.ChooseCloudOrLocal;
                },
                next: () => {
                    // Set cloud credentials;
                    this.currentState = WIZARD_STATE.CloudProcess;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                }
            },
            cloudLogin: {
                back: () => {
                    // cloudAuthorized ? 'cloudAuthorizedIntro' : 'cloudIntro'
                },
                next: () => {
                    this.currentState = WIZARD_STATE.CloudProcess;
                }
            },
            cloudProcess: {
            },
            cloudSuccess: {
                finish: true
            },
            cloudFailure: {
                back: () => {
                    this.currentState = WIZARD_STATE.CloudLogin;
                },
                next: () => {
                    this.currentState = WIZARD_STATE.LocalLogin;
                },
                retry: () => {
                    this.currentState = WIZARD_STATE.CloudLogin;
                }
            },
            /**/

            merge: {
                title: this.LANG.setupWizard.title.merge,
                back: () => {
                    this.currentState = WIZARD_STATE.Start;
                },
                next: () => {
                    this.currentState = WIZARD_STATE.MergeProcess;
                },
                validate: () => this.setupConfig.mergeDataState === FORM_STATE.VALID
            },
            mergeProcess: {
                title: this.LANG.setupWizard.title.mergeProcess
            },
            mergeFailure: {
                title: this.LANG.setupWizard.title.mergeFailure,
                back: () => {
                    this.currentState = WIZARD_STATE.Merge;
                },
                skip: () => {
                    this.currentState = WIZARD_STATE.Start;
                },
                retry: () => {
                    this.currentState = WIZARD_STATE.Merge;
                }
            },

            localLogin: {
                title: this.LANG.setupWizard.title.localLogin,
                back: () => {
                    // Reset Credentials
                    this.currentState = WIZARD_STATE.SystemName;
                },
                next: () => {
                    this.initSystem();
                },
                validate: () => this.setupConfig.localLoginDataState === FORM_STATE.VALID,
            },
            localSuccess: {
                title: this.LANG.setupWizard.title.localSuccess,
                finish: true
            },
            localFailure: {
                title: this.LANG.setupWizard.title.localFailure,
                back: () => {
                    this.currentState = WIZARD_STATE.SystemName;
                },
                retry: () => {
                    this.currentState = WIZARD_STATE.Start;
                },
                finish: true
            },

            initFailure: {
                title: this.LANG.setupWizard.title.initFailure,
                retry: () => {
                    this.initWizard();
                }
            },
            brokenSystem: {
                title: this.LANG.setupWizard.title.brokenSystem,
                retry: () => {
                    this.initWizard();
                }
            },
        };
    }

    getURLRegex(): string {
        return simpleURLRegex;
    }

    // nativeClient helpers
    public get hasNativeClient(): boolean {
        try {
            return !!nativeClient;
        } catch {
            return false;
        }
    }

    // @ts-expect-error Currently unused
    private cancelNative(): unknown {
        if (this.hasNativeClient) {
            nativeClient?.cancel();
        }
        return this.closeNative();
    }

    private closeNative(): Promise<void> {
        if (this.hasNativeClient) {
            this.window.close();
            return Promise.resolve();
        }
        return Promise.reject();
    }

    // @ts-expect-error Currently unused
    private openNative(url: string): void {
        if (this.hasNativeClient) {
            nativeClient.openUrlInBrowser(url);
        }
    }

    // FSM controls
    back(): void {
        this.wizardFSM[this.currentState]?.back();
    }

    cancel(): void {
        this.wizardFSM[this.currentState]?.cancel();
    }

    finish(): void {
        this.closeNative().catch(() => {
            const redirect = `${this.window.location.protocol}//${this.window.location.host}`;
            if (this.window.top !== this.window.self) {
                this.window.top.window.location.href = redirect;
            } else {
                this.window.location.href = redirect;
            }
        });
    }

    jump(): void {
        this.wizardFSM[this.currentState]?.jump();
    }

    next(): void {
        const state = this.wizardFSM[this.currentState];
        console.log(this.currentState); // Todo: remove
        if (state.validate && !state?.validate()) {
            this.formValidateSubject.next(true);
            return;
        }
        state?.next();
    }

    retry(): void {
        this.wizardFSM[this.currentState]?.retry();
    }

    skip(): void {
        this.wizardFSM[this.currentState]?.skip();
    }

    // Generic Helpers
    private getServerNetworkSettings(): Observable<NormalNetworkConfig> {
        return this.http.get<NormalNetworkConfig>('/web/api/iflist');
    }

    private setServerNetworkSettings(config: NetworkingInterfaces): Observable<NormalResponse> {
        return this.http.post<NormalResponse>('/web/api/ifconfig', config);
    }

    private checkInternetOnServer(): Promise<void> {
        return this.server.getServerInfo('this').toPromise()
            .then(({ serverFlags }) => {
                this.hasInternet.server = serverFlags.includes('SF_HasPublicIP');
            });
    }

    private getServerInfoWithFlags(): Promise<ModuleInformationReply> {
        return this.server.getServerInfo('this').toPromise()
            .then(data => {
                const ips = data?.remoteAddresses.filter(address => address !== '127.0.0.1');
                data.flags = {
                    noHDD: data?.ecDbReadOnly,
                    noNetwork: !ips.length,
                    wrongNetwork: !ips.some(address => !address.includes('169.254')),
                    hasInternet: data.serverFlags.includes(this.flags.publicIpFlag),
                    cleanSystem: data.serverFlags.includes(this.flags.newServerFlag),
                    canSetupNetwork: data.serverFlags.includes(this.flags.ifListFlag),
                    canSetupTime: data.serverFlags.includes(this.flags.timeCtrlFlag)
                };
                data.flags.brokenSystem = data.flags.noHDD || data.flags.noNetwork || (data.flags.wrongNetwork && !data.flags.canSetupNetwork);
                data.flags.newSystem = data.flags.cleanSystem && !data.flags.brokenSystem;
                return data;
            });
    }

    private checkInternetOnClient(): Promise<void> {
        return this.http.get(`${this.CONFIG.cloudHost}/api/ping`).toPromise().then(() => {
            this.hasInternet.client = true;
        });
    }

    private checkInternet(): void {
        this.checkInternetOnServer().catch(() => {
            this.hasInternet.server = false;
        });
        this.checkInternetOnClient().catch(() => {
            this.hasInternet.client = false;
        });
    }

    private checkSystem = (user?: UserSession): Promise<boolean> => {
        if (user) {
            this.setupConfig.localLogin = user.username || this.defaultUser;
        }
        // Add check cloud implementation
        return this.getServerInfoWithFlags().then(async data => {
            this.serverInfo = data;
            this.setupConfig.systemName = data.name.replace(/^Server\s/, '');
            if (this.serverInfo.flags.canSetupNetwork) {
                const networkInfo = await this.getServerNetworkSettings().toPromise();
                const settings: NetworkConfig[] = networkInfo?.reply || [];
                const activeSettings = settings.find(networkConfig => !!networkConfig.ipAddr) || settings[0];
                this.networkInfo.ip = activeSettings.ipAddr;
                this.networkInfo.port = this.serverInfo.port;
            }
            this.checkInternet();
            if (this.serverInfo.flags.brokenSystem) {
                if (this.serverInfo.flags.noHDD) {
                    // Error about hard drive
                } else {
                    // Error about network
                }
                this.currentState = WIZARD_STATE.BrokenSystem;
                return Promise.reject();
            }

            if (this.serverInfo.flags.newSystem) {
                if (this.serverInfo.flags.canSetupNetwork) {
                    const networkInfo = await this.setServerNetworkSettings({ interfaces: [this.networkInfo] }).toPromise();
                    this.networkSettings = networkInfo?.reply || {};
                    if (this.serverInfo.flags.wrongNetwork) {
                        this.currentState = WIZARD_STATE.ConfigureWrongNetwork;
                    }
                }
                if (this.serverInfo.flags.wrongNetwork) {
                    return Promise.reject();
                }
                this.currentState = WIZARD_STATE.Start;
                return Promise.resolve(true);
            }

            if (this.hasNativeClient) {
                nativeClient.connectUsingLocalAdmin(this.credentials.password, true);
            }
            this.currentState = WIZARD_STATE.LocalSuccess;
            return Promise.resolve(true);
        });
    };

    private updateCredentials(login: string, password: string, isCloud: boolean): Promise<unknown> {
        this.credentials.login = login;
        this.credentials.password = password;
        this.credentials.isCloud = isCloud;
        return this.server.loginToken(login, password, true).toPromise()
            .then(userData => {
                this.server.setVmsToken(userData.token);
                return userData;
            })
            .then(this.checkSystem, () => {}); // log error
    }

    // Error Handlers

    // Merge with another system
    connectToAnotherSystem(): void {
        const normalizeUrl = (_url: string): string => {
            if (!_url.includes('//')) {
                _url = `https://${_url}`;
            }
            const url = new URL(_url);
            if (!url.port) {
                url.port = '7001';
            }
            return url.toString();
        };

        const systemUrl = normalizeUrl(this.setupConfig.remoteSystem.value);
        this.server.mergeSystems(
            systemUrl,
            undefined,
            false,
            this.setupConfig.remotePassword,
            true
        )
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                const { remoteLogin, remotePassword } = this.setupConfig;
                return this.updateCredentials(remoteLogin, remotePassword, false);
            }, () => {
                this.currentState = WIZARD_STATE.MergeFailure;
            });
    }

    // Connect to cloud
    private connect(systemName: string, email: string, accessToken: string): Observable<BindResponse> {
        let headers = new HttpHeaders();
        headers = headers.set('Authorization', `Bearer ${accessToken}`);
        return this.http.post<BindResponse>(
            this.CONFIG.cloudHost + apiBase + '/systems/connect',
            { name: systemName, email },
            { headers }
        );
    }

    connectToCloud(): void {
        if (!this.hasNativeClient) {
            return;
        }
        const refreshToken = nativeClient.refreshToken();
        // Use the refresh token to set an access token.
        const accessToken = refreshToken; // Change later to the actual accessToken
        // Then use the access token to get the users email.
        const email = '';
        this.connect(this.setupConfig.systemName, email, accessToken)
            .pipe(untilDestroyed(this))
            .subscribe(data => {
                // add link to cloud
                this.server.setupCloudSystem(
                    this.setupConfig.systemName,
                    data.id,
                    data.authKey,
                    email,
                    this.systemSettings
                )
                    .toPromise()
                    .then(() => {});
            });
    }

    // Local setup
    private offlineErrorHandler = (): void => {
        // add local error
        this.currentState = WIZARD_STATE.LocalFailure;
    };

    initSystem(): void {
        const { localPassword, systemName } = this.setupConfig;
        const settings: Partial<SystemConfigSettings> = {};
        // eslint-disable-next-line array-callback-return
        Object.keys(this.systemAdvancedSettings).forEach((key: string): void => {
            if (typeof this.systemAdvancedSettings[key] === 'object') {
                settings[key] = this.systemAdvancedSettings[key].settingValue ?? false;
            } else {
                settings[key] = this.systemAdvancedSettings[key] ?? false;
            }
        });

        this.server.setupLocalSystem(systemName, localPassword, settings, this.securityLevel)
            .toPromise()
            .then(_ => {
                return this.updateCredentials(this.setupConfig.localLogin, localPassword, false)
                    .catch(this.offlineErrorHandler);
            });
    }

    // Polls
    waitForReboot(): void {
        this.currentState = WIZARD_STATE.Start;
        const pingInterval = setInterval(() => {
            this.server.getServerInfo('this')
                .pipe(untilDestroyed(this))
                .subscribe(() => {
                    clearInterval(pingInterval);
                    this.window.location.reload();
                });
        }, alertTimeout);
    }

    checkIfSystemIsReady(): void {
        const systemReadyInterval = setInterval(() => {
            this.getServerInfoWithFlags().then(data => {
                if (!data?.flags.cleanSystem) {
                    this.setupConfig.systemName = data.name.replace(/^Server\s/, '');
                    if (data.cloudSystemId) {
                        this.setupConfig.cloudSystemID = data.cloudSystemId;
                        // make portal links
                        this.currentState = WIZARD_STATE.CloudSuccess;
                    } else {
                        this.networkInfo.port = data.port;
                        this.currentState = WIZARD_STATE.LocalSuccess;
                    }
                }
                this.setupConfig.localPassword = '';
                clearInterval(systemReadyInterval);
            });
        }, alertTimeout);
    }

    // Initializers
    discoverSystems(): Promise<void> {
        return this.server.getPeerSystems().toPromise().then(res => {
            const cloudHost = this.CONFIG.cloudHost.replace('https://', '');
            this.peers = res.reply
                .filter(system => !system.serverFlags.includes('SF_NewSystem') && system.cloudHost === cloudHost)
                .map(_system => {
                    const system: DiscoveredPeerSetup = {
                        url: `${_system.remoteAddresses[0]}:${_system.port}`,
                        systemName: _system.systemName,
                        ip: _system.remoteAddresses[0],
                        name: _system.name,
                        isNew: _system.serverFlags.includes('SF_NewSystem'),
                        compatibleCloudHost: _system.cloudHost === this.CONFIG.cloudHost,
                        visibleName: '',
                        hint: ''
                    };
                    system.visibleName = `${system.systemName} (${system.url} - ${system.name})`;
                    system.hint = `${system.url} (${system.name})`;
                    return system;
                })
                .sort(alphabeticalSort(this.locale, sys => sys.visibleName));
        });
    }

    getAdvancedSettings(): Promise<void> {
        return this.server.wizardGetSystemSettings().toPromise()
            .then(systemSettings => {
                Object.entries(settingsConfig).forEach(([settingKey, settingConfig]: [string, Setting]) => {
                    // eslint-disable-next-line no-prototype-builtins
                    if (!systemSettings.hasOwnProperty(settingKey)) {
                        return;
                    }
                    if (!settingConfig.setupWizard) {
                        return;
                    }

                    let settingValue: boolean | number | string = systemSettings[settingKey] || false;
                    if (settingConfig.type === 'checkbox' && settingValue === undefined) {
                        settingValue = true;
                    } else if (settingConfig.type === 'number') {
                        settingValue = parseInt(<string>settingValue);
                    } else if (['true', 'false'].includes(<string>settingValue)) {
                        settingValue = settingValue === 'true';
                    }

                    let settingLabel = this.translate.instant(settingKey);
                    if (settingLabel === settingKey && settingConfig.label) {
                        settingLabel = settingConfig.label;
                    }
                    // TODO: REMOVE! ...Temporary fix for https://networkoptix.atlassian.net/browse/CLOUD-9716
                    // until server API is fixed
                    // rest/v1/system/settings returns null for “statisticsAllowed“
                    if (settingKey === 'statisticsAllowed' && settingValue === null) {
                        settingValue = true;
                    }
                    this.systemAdvancedSettings[settingKey] = { settingValue, settingLabel };
                });
            });
    }

    setSecurityLevel(level: string): void {
        this.securityLevel = <SECURITY_LEVEL>level;
    }

    initWizard = (): void => {
        this.currentState = undefined;
        this.updateCredentials(
            this.setupConfig.localLogin,
            this.setupConfig.localPassword,
            false,
        )
            .then(() => {
                Promise.all([
                    this.getAdvancedSettings(),
                    this.discoverSystems()
                ]).catch(() => {});
                this.checkIfSystemIsReady();
            }).catch(_ => {
                const params = new URLSearchParams(this.window.location.search);
                if (params.get('retry')) {
                    this.currentState = WIZARD_STATE.InitFailure;
                } else {
                    params.set('retry', 'true');
                    this.window.location.search = params.toString();
                    setTimeout(() => this.window.location.reload(), 1000);
                }
            });
    };

    init(): void {
        this.server = this.nxSystemAPIService
            .createConnection(undefined, undefined, undefined, () => of(''), this.serverVersion);
        this.initWizard();
    }
}
