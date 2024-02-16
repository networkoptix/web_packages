import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    Inject,
    OnDestroy,
    OnInit,
    LOCALE_ID,
    ViewChild,
    signal,
    effect,
    computed,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { cloneDeep, escape } from 'lodash-es';
import { lastValueFrom } from 'rxjs';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { MergeRefactored as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import {
    DiscoveredPeersReply,
    ModuleInformation,
    ModuleInformationReply,
} from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { assignFrom, alphabeticalSort, cleanIp, strSplice, cleanIdLegacy } from '@utils/general';
import { makeProxy } from '@utils/signals';
import { servers } from '@variables/static-variables';

import { NxMergeAdminPasswordComponent } from './admin-password/admin-password.component';
import { NxMergeChoosePrimaryComponent } from './choose-primary/choose-primary.component';
import { NxMergeConfirmMergeComponent } from './confirm-merge/confirm-merge.component';
import { NxMergeGenericMergeComponent } from './generic-merge/generic-merge.component';
import { MergeErrorData, MergeState, MergeSystem } from './merge.refactor.component.types';
import { NxMergeSelectSystemComponent } from './select-system/select-system.component';

const MergeServerErrorCodes = {
    1: 'noServerFound',
    2: 'wrongPassword',
    3: 'systemsIncompatible',
    10: 'differentOwners',
    13: 'duplicateServers',
};

const MergeRestServerErrorCodes = {
    2: 'wrongPassword',
    4: 'duplicateServers',
    11: 'noServerFound',
};

const StateProcesses = {
    select: 'selectSystem',
    admin: 'adminPassword',
    primary: 'choosePrimary',
    confirm: 'confirmMerge',
    generic: 'genericMerge',
};

const ResponseStrings = {
    canceled: 'canceled',
    timeoutHasOccured: 'Timeout has occurred',
    noServerFound: 'noServerFound',
    unknownError: 'unknownError',
    serverNotAvailable: 'serverNotAvailable',
    missingPassword: 'missingPassword',
    wrongPassword: 'wrongPassword',
    passwordRequired: 'passwordRequired',
    vmsRequestFailure: 'vmsRequestFailure',
    timeoutError: 'TimeoutError',
    bothSystemsConnectedToCloud: 'bothSystemsConnectedToCloud',
    unknownTargetSystemConnectedToCloud: 'unknownTargetSystemConnectedToCloud',
    systemOffline: 'systemOffline',
    systemOfflineUrl: 'systemOfflineUrl',
    secondarySystemUnavailable: 'secondarySystemUnavailable',
    secondarySystemIsOffline: 'secondarySystemIsOffline',
    duplicateServers: 'duplicateServers',
    currentSystemVersionIsNewer: 'currentSystemVersionIsNewer',
    currentSystemVersionIsOlder: 'currentSystemVersionIsOlder',
    differentOwners: 'differentOwners',
    configurationError: 'CONFIGURATION_ERROR',
    serviceUnavailable: 'Service Unavailable',
    badGateway: 'Bad Gateway',
    systemUnavailable: 'systemUnavailable',
    mergedSystemIsOffline: 'mergedSystemIsOffline',
    skip: 'skip',
    online: 'online',
    fail: 'fail',
    wrongLogin: 'Wrong username or password.',
};

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-merge-refactor-component',
    templateUrl: 'merge.refactor.component.html',
    styleUrls: ['merge.refactor.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxMergeSelectSystemComponent,
        NxMergeAdminPasswordComponent,
        NxMergeChoosePrimaryComponent,
        NxMergeConfirmMergeComponent,
        NxMergeGenericMergeComponent,
    ],
})
export class NxMergeComponent extends ModalBase<DT['return']> implements OnInit, OnDestroy {
    @ViewChild('nxMergeSelectSystem', { static: false }) selectSystem: NxMergeSelectSystemComponent;
    CONFIG: IConfig;
    LANG = staticLang;
    account: Account;
    readonly environment = environment;

    // only used inside parent component
    systems: NxSystemInfo[];
    peerSystems: Partial<DiscoveredPeersReply[] | MergeSystem[]>;
    currentProcess: Process;

    // shared between components
    currentState$$ = computed(() => {
        const history = this.stateHistory$$();
        const historyLength = history.length;
        return historyLength ? history[historyLength - 1] : MergeState.select;
    });
    private stateHistory$$ = signal<MergeState[]>([]);
    private currentSystemIsPrimary$$ = signal(true);
    readonly MergeState = MergeState;
    readonly maxServers = 100;
    isLocal: boolean = environment.isLocal;
    dryRunAvailable: boolean;
    isSessionOauth: boolean;
    systemUrls: { [ip: string]: string } = {};
    mergeSystems: MergeSystem[];
    system: NxSystem;
    targetSystem: MergeSystem;
    cleanUrl: string;
    serverUrl: string;
    remotePassword: string;
    private primarySystem$$ = computed<NxSystem | MergeSystem>(() => {
        return this.currentSystemIsPrimary$$() ? this.system : this.targetSystem;
    });
    private secondarySystem$$ = computed<NxSystem | MergeSystem>(() => {
        return this.currentSystemIsPrimary$$() ? this.targetSystem : this.system;
    });
    primaryName$$ = computed<string>(() => {
        return escape(
            this.currentSystemIsPrimary$$()
                ? this.system.info.name
                : this.targetSystem.name || this.defaultServerName(),
        );
    });
    secondaryName$$ = computed<string>(() => {
        return escape(
            this.currentSystemIsPrimary$$()
                ? this.targetSystem.name || this.defaultServerName()
                : this.system.info.name,
        );
    });

    isNxSystem = (s: NxSystem | MergeSystem): s is NxSystem => {
        return (s as NxSystem).info !== undefined;
    };

    isMergeSystem = (s: NxSystem | MergeSystem): s is MergeSystem => {
        return (s as MergeSystem).stateOfHealth !== undefined;
    };

    // select system
    selectSystemProcess: Process;
    targetSystemDropdown: DropdownItem<string>;
    checking: boolean = false;
    checkedMergeabilityOnce: boolean = false; // changes process button text when true
    noOtherSystems: boolean = false;
    selectSystemErrorCode: string;
    cloudHost: string;
    otherSystem: boolean = false; // verify that this works

    // admin password
    adminPasswordProcess: Process;
    adminPassword: string;
    adminPasswordErrorCode: string;

    // choose primary
    choosePrimaryErrorCode: string;

    // confirm merge
    confirmMergeProcess: Process;
    tooManyServers: boolean = false; // currently only checked for on cloud (not webadmin)
    confirmPassword: string;
    confirmMergeErrorCode: string;

    // generic dialog
    genericMergeProcess: Process;
    thisSystemHasOutdatedServer: boolean = false;
    failedToFindAnySystem: boolean = false;
    serverUrlErrorText: string;
    genericMergeErrorCode: string;

    // update webadmin session
    alertMessage: string;

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
        private httpService: HttpClient,
        private cloudApi: NxCloudApiService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        private title: Title,
        private accountService: NxAccountService,
        private elem: ElementRef<HTMLElement>,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
        @Inject(WINDOW) public window: Window,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        super(dialogRef);
        this.CONFIG = configService.getConfig();
        this.cloudHost = this.CONFIG.cloudHost;
        effect(() => {
            const state = this.currentState$$();

            if ([MergeState.select, MergeState.admin, MergeState.confirm].includes(state)) {
                this.setupUpdateWebadminSession(state);
            }
            this.checkedMergeabilityOnce = false;
            setTimeout(() => {
                if (state === MergeState.admin) {
                    this.elem.nativeElement
                        .querySelector<HTMLInputElement>('#adminPassword')
                        .focus();
                } else if (state === MergeState.primary) {
                    // Handles the radio button that was set when going back from MergeState.confirm
                    const firstSystem =
                        this.elem.nativeElement.querySelector<HTMLInputElement>('#firstSystem');
                    const secondSystem =
                        this.elem.nativeElement.querySelector<HTMLInputElement>('#secondSystem');
                    if (this.currentSystemIsPrimary$$()) {
                        firstSystem.click();
                        firstSystem.focus();
                    } else {
                        secondSystem.click();
                        secondSystem.focus();
                    }
                } else if (state === MergeState.confirm) {
                    this.elem.nativeElement
                        .querySelector<HTMLButtonElement>('#confirmBackBtn')
                        .focus();
                } else {
                    // Focus on the Close button on default
                    this.elem.nativeElement
                        .querySelector<HTMLButtonElement>('.modal-header .close')
                        .focus();
                }
            });
        });
    }

    updateStateHistory = (state?: MergeState): void => {
        this.stateHistory$$.update(prev => {
            const history = makeProxy(prev);
            if (state) {
                history.push(state);
            } else {
                history.pop();
            }
            return history;
        });
    };

    // TODO: verify that this works and whether the implementation is performant enough
    getSystemInfo = async (systemId: string): Promise<ModuleInformation> => {
        const url = `https://${this.CONFIG.trafficRelayHost.replace(
            '{systemId}',
            systemId,
        )}/api/moduleInformation`;
        return lastValueFrom(this.httpService.get<ModuleInformation>(url));
    };

    defaultServerName = (): string => {
        return this.translateService.instant(this.LANG.dialogs.merge.serverAtUrl, {
            url: this.cleanUrl || this.serverUrl || this.targetSystem.url,
        });
    };

    // not sure how this is going to work for the generic component yet
    setupUpdateWebadminSession(state: MergeState): void {
        this.currentProcess = this[`${StateProcesses[state]}Process`];
        const message = this.LANG.dialogs.merge.updateWebadminSession[state];
        this.alertMessage =
            state === MergeState.confirm
                ? this.translateService.instant(message, {
                      primarySystem: this.primaryName$$(),
                      secondarySystem: this.secondaryName$$(),
                  })
                : this.translateService.instant(message);
    }

    async ngOnInit(): Promise<void> {
        this.title.setTitle(`${this.LANG.pageTitles.auth} - ${this.CONFIG.cloudName}`);

        assignFrom(this.dialogData, ['system', 'systems'], this);

        this.isSessionOauth = this.system.mediaserver.isSessionOauth;
        this.dryRunAvailable = this.system.info.capabilities.merge_systems >= 1;
        if (this.system.canMerge) {
            await lastValueFrom(this.system.serverManager.getModuleInfo());
            this.account = await this.accountService.get();

            // set up cloud or peer systems
            if (this.isLocal) {
                this.mergeSystems = [];
                await this.webadminSetup();
            } else {
                this.cloudSetup();
            }
        } else {
            this.thisSystemHasOutdatedServer = true;
            this.stateHistory$$.update(history => [...history, MergeState.generic]);
        }

        this.initProcesses();
    }

    cleanUpWebadminSystem(
        systemInfo: DiscoveredPeersReply | ModuleInformationReply,
        systemUrls: { [ip: string]: string },
        newSystemFlag: string,
    ): MergeSystem {
        const {
            id,
            cloudSystemId,
            localSystemId,
            name,
            systemName,
            status = '',
            protoVersion,
            remoteAddresses,
            port,
            serverFlags,
        } = systemInfo;
        const { cloudOwnerId } = systemInfo as DiscoveredPeersReply;
        let firstValidIp: string;
        if (remoteAddresses?.length) {
            remoteAddresses.forEach((addy: string) => {
                const ip = cleanIp(addy);
                systemUrls[`${ip}:${port}`] = cleanIdLegacy(id);
            });
            // remoteAddress might give a weird address with systemId.serverId
            // finds first valid ipv4/ipv6 address
            firstValidIp =
                remoteAddresses.find(
                    (addy: string) =>
                        addy.split('.')[0].length <= 4 || addy.split(':')[0].length <= 4,
                ) || remoteAddresses[0];
        }
        return {
            id: cleanIdLegacy(id),
            cloudSystemId,
            cloudOwnerId: cleanIdLegacy(cloudOwnerId),
            localSystemId: cleanIdLegacy(localSystemId),
            name: systemName || name,
            stateOfHealth: status.toLowerCase(),
            protoVersion,
            remoteAddresses,
            url: `${firstValidIp}:${port}`,
            port,
            isNew: serverFlags.includes(newSystemFlag),
        };
    }

    async webadminSetup(): Promise<void> {
        const peerSystems: DiscoveredPeersReply[] = (
            await this.system.mediaserver.getPeerSystems().toPromise()
        ).reply.filter((peer: DiscoveredPeersReply) => this.system.id !== peer.localSystemId);
        this.mergeSystems = peerSystems
            .map((peer: DiscoveredPeersReply) =>
                this.cleanUpWebadminSystem(
                    peer,
                    this.systemUrls,
                    this.CONFIG.system.flags.newSystem,
                ),
            )
            .sort(alphabeticalSort(this.locale, (sys: MergeSystem) => sys.name));

        if (this.mergeSystems.length === 0) {
            this.otherSystem = true;
            this.noOtherSystems = true;
        }

        this.stateHistory$$.update(history => [...history, MergeState.select]);
    }

    cloudSetup(): void {
        let state: MergeState;
        if (this.systems.length === 0) {
            this.failedToFindAnySystem = true;
            state = MergeState.generic;
        } else {
            this.mergeSystems = this.systems.map(
                ({ id, name, canMerge, stateOfHealth = '' }: NxSystemInfo) => ({
                    id,
                    name,
                    stateOfHealth,
                    canMerge,
                }),
            );
            state = MergeState.select;
        }
        this.stateHistory$$.update(history => [...history, state]);
    }

    initProcesses(): void {
        this.selectSystemProcess = this.processService.createProcess(
            () => {
                this.lock();
                this.checking = true;
                this.checkedMergeabilityOnce = true;
                return this.preCheckSystemMerge();
            },
            { ignoreError: true },
            res => {
                this.unlock();
                this.checking = false;
                if (res !== ResponseStrings.skip) {
                    this.checkedMergeabilityOnce = false;
                    this.currentSystemIsPrimary$$.set(true);
                    // covers case where system (cloud & non-cloud) is not set up yet
                    if (res.isNew) {
                        if (this.serverUrl) {
                            this.serverUrl = strSplice(
                                this.serverUrl,
                                this.serverUrl.indexOf('//') + 2,
                                'admin:admin@',
                            );
                        }
                        this.remotePassword = MergeState.admin;
                        this.stateHistory$$.update(history => [...history, MergeState.confirm]);
                    } else if (!Object.keys(res).length || res.error === '0' || !res.error) {
                        if (this.serverUrl) {
                            // this.isLocal? + some indication that it's not cloud merge?
                            this.stateHistory$$.update(history => [...history, MergeState.admin]);
                        } else {
                            this.stateHistory$$.update(history => [...history, MergeState.primary]);
                        }
                    }
                }
            },
            err => {
                this.unlock();
                this.checking = false;
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    return this.showSessionExpiredAlert();
                }
                if (err !== ResponseStrings.canceled) {
                    if (err.message === ResponseStrings.timeoutHasOccured) {
                        err.message = ResponseStrings.noServerFound;
                    }
                    const errorCodes = this.system.useRest
                        ? MergeRestServerErrorCodes
                        : MergeServerErrorCodes;
                    if (err.error) {
                        err.message = errorCodes[err.error];
                    }
                    this.selectSystemErrorCode = err.message || ResponseStrings.unknownError;
                }
            },
        );

        this.adminPasswordProcess = this.processService.createProcess(
            () => {
                this.lock();
                // when trying again, does not have access to previous state template
                if (!this.dryRunAvailable) {
                    this.selectSystemProcess.processing = false;
                    this.selectSystemProcess.finished = true;
                    this.stateHistory$$.update(history => [...history, MergeState.confirm]);
                    return Promise.resolve();
                } else {
                    return lastValueFrom(
                        this.system.mediaserver.mergeSystems(
                            this.serverUrl,
                            this.targetSystem.id,
                            true,
                            this.adminPassword,
                            !!this.system.serverManager.moduleInfo.cloudOwnerId,
                        ),
                    );
                }
            },
            {
                ignoreError: true,
                errorCodes: { [ResponseStrings.wrongLogin]: ResponseStrings.wrongLogin },
            },
            res => {
                this.unlock();
                if (!res) {
                    return;
                }
                if (!res.error || res.error === '0') {
                    this.remotePassword = this.adminPassword;
                    this.checkForChoosePrimary(false);
                } else if (res.error !== '0') {
                    let errorCode: string =
                        MergeServerErrorCodes[res.error] || ResponseStrings.serverNotAvailable;
                    if (res.error === '1') {
                        errorCode = ResponseStrings.systemOfflineUrl;
                    }
                    this.adminPasswordErrorCode = errorCode;
                }
            },
            err => {
                this.unlock();
                if (err.error && err.error !== '0') {
                    this.adminPasswordErrorCode = this.system.useRest
                        ? MergeRestServerErrorCodes[err.error]
                        : MergeServerErrorCodes[err.error];
                    return;
                }
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    return this.showSessionExpiredAlert();
                }

                this.adminPasswordErrorCode =
                    err.message === ResponseStrings.timeoutHasOccured
                        ? ResponseStrings.systemOfflineUrl
                        : ResponseStrings.unknownError;
            },
        );

        this.confirmMergeProcess = this.processService.createProcess(
            () => {
                this.lock();
                let password = this.confirmPassword;

                if (this.environment.isLocal) {
                    password = this.remotePassword;
                }
                if (!password && !this.isSessionOauth) {
                    return Promise.reject({
                        error: { data: { resultCode: ResponseStrings.missingPassword } },
                    });
                }

                if (this.isLocal) {
                    const takeRemoteSettings = this.system.id === this.secondarySystem$$().id;
                    const bothAreCloud = this.isSessionOauth && !!this.targetSystem.cloudSystemId;
                    return this.system.mediaserver
                        .mergeSystems(
                            this.serverUrl,
                            bothAreCloud ? '' : this.targetSystem.id,
                            false,
                            password,
                            takeRemoteSettings,
                        )
                        .toPromise();
                } else {
                    return this.cloudApi.merge(
                        this.primarySystem$$().id,
                        this.secondarySystem$$().id,
                        password,
                    );
                }
            },
            {
                errorCodes: {
                    mergedSystemIsOffline: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    vmsRequestFailure: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    missingPassword: () => {
                        this.confirmMergeErrorCode = ResponseStrings.passwordRequired;
                    },
                    wrongPassword: () => {
                        this.confirmMergeErrorCode = ResponseStrings.wrongPassword;
                        this.confirmPassword = '';
                    },
                    [ResponseStrings.wrongLogin]: ResponseStrings.wrongLogin,
                },
                ignoreError: true,
            },
            res => {
                this.unlock();
                if (
                    res.mergeInProgress ||
                    res.error === '0' ||
                    res.resultCode === this.LANG.errorCodes.ok
                ) {
                    // handles telling the app which systems are getting merged and the proper messaging
                    if (this.isLocal) {
                        const template = `<div class="my-1">
                            <div class="larger"><strong>${this.secondaryName$$()}</strong> ${this.translateService.instant(
                                this.LANG.ribbon.beingMerged.to,
                            )}</div>
                            <div class="mt-2">${this.translateService.instant(
                                this.LANG.ribbon.beingMerged.mayTake,
                            )}</div>
                        </div>`;
                        this.ribbonService.hide();
                        this.ribbonService.show(template, [], 'alert');
                    } else {
                        this.systemsService.forceUpdateSystems();
                    }
                    this.close({
                        secondary: {
                            id: this.secondarySystem$$().id,
                            name: this.secondaryName$$(),
                        },
                        primary: {
                            id: this.primarySystem$$().id,
                            name: this.primaryName$$(),
                        },
                        anotherSystemId: this.targetSystem.id,
                        role:
                            this.primarySystem$$().id === this.system.id
                                ? this.CONFIG.system.status.master
                                : this.CONFIG.system.status.slave,
                    });
                    // wrong cloud password
                }
            },
            error => {
                this.unlock();
                if (
                    error.errorId === servers.errors.oldSessionErrorId ||
                    error.resultCode === ResponseStrings.vmsRequestFailure
                ) {
                    return this.showSessionExpiredAlert();
                }
                // for errors that pop up during the merge
                let errorCode = error.resultCode || error.data?.resultCode;
                if (
                    errorCode === ResponseStrings.missingPassword ||
                    errorCode === ResponseStrings.wrongPassword
                ) {
                    return;
                }
                if (!errorCode && error.name === ResponseStrings.timeoutError) {
                    errorCode = ResponseStrings.fail;
                }

                /** Get the names of the primary and secondary system.
                        Next try to figure out which system caused the problem.
                        If the primary system's stateOfHealth is not online set it as the failedSystem.
                        Otherwise the secondary system is set as the failedSystem no matter what.
                    */
                error.resultCode = errorCode;
                this.handleMergeError(error);
            },
        );
    }

    cleanUpUrl = (serverUrl: string): string => {
        if (!/^https?:\/\//.test(serverUrl)) {
            serverUrl = `${this.window.location.protocol}//${serverUrl}`;
        }
        if (!/:\d{1,5}$/.test(serverUrl)) {
            serverUrl += ':7001';
        }
        return serverUrl;
    };

    async preCheckSystemMerge(): Promise<
        { error?: string; errorId?: string; errorString?: string; isNew?: boolean } | Error | 'skip'
    > {
        const isNew = { isNew: true };
        /**
         * targetSystem
         * no id = Other System
         * localSystemId = auto-discovered system
         * else = cloud-connected merge check
         */
        if (this.isLocal) {
            this.cleanUrl = this.cleanUpUrl(this.serverUrl);
            if (this.otherSystem || !this.targetSystem.id) {
                let secondarySystem: ModuleInformationReply;
                try {
                    if (this.system.useRest) {
                        secondarySystem = await (this.system.mediaserver as NxSystemRestAPI)
                            .getRemoteServerInfo(this.serverUrl)
                            .toPromise();
                    } else {
                        secondarySystem = (
                            await this.system.serverManager
                                .getModuleInfoUsingUrl(this.serverUrl)
                                .toPromise()
                        ).reply;
                    }
                } catch (err) {
                    this.selectSystem.checkMergeabilityFunction(err.name);
                    throw Error(err);
                }
                this.targetSystem = this.cleanUpWebadminSystem(
                    secondarySystem,
                    this.systemUrls,
                    this.CONFIG.system.flags.newSystem,
                );
            }
            if (
                this.targetSystem.cloudOwnerId &&
                this.system.serverManager.moduleInfo.cloudOwnerId
            ) {
                throw Error(
                    !this.targetSystem?.name
                        ? ResponseStrings.unknownTargetSystemConnectedToCloud
                        : ResponseStrings.bothSystemsConnectedToCloud,
                );
            }

            if (!this.dryRunAvailable) {
                // used to be code that would update system/systems and then check if dryRunAvailable again
                // using .init(), but little value received, so removed to reduce complexity
                return this.targetSystem.isMergeable ? { error: '0' } : 'skip';
            }
            const res = await lastValueFrom(
                this.system.mediaserver.mergeSystems(
                    this.serverUrl,
                    this.targetSystem.id,
                    true,
                    '',
                    !!this.targetSystem.cloudOwnerId,
                ),
            );
            if (res.error && res.error !== '0') {
                throw Error(MergeServerErrorCodes[res.error] || ResponseStrings.unknownError);
            }
            return this.targetSystem.isNew ? isNew : res;
        } else if (this.targetSystem) {
            const targetSystemService = this.systemService.createSystem(
                this.account.email,
                this.targetSystem.id,
                undefined,
                true,
                true,
            );
            let targetSystem: NxSystem;
            try {
                targetSystem = await targetSystemService.getInfo(true, false);
            } catch (err) {
                throw Error(ResponseStrings.systemOffline);
            }
            await targetSystemService.getUsers(true, true);
            if (!targetSystem.isOnline) {
                throw Error(ResponseStrings.systemOffline);
            } else if (!targetSystem.isAvailable) {
                throw Error(ResponseStrings.secondarySystemUnavailable);
            }
            const mainSystemProto = this.system.serverManager.moduleInfo.protoVersion;
            let targetSystemProto: number;
            try {
                targetSystemProto = (
                    await lastValueFrom(targetSystemService.serverManager.getModuleInfo())
                ).reply.protoVersion;
            } catch (err) {
                if (err.status === 502) {
                    throw Error(ResponseStrings.secondarySystemIsOffline);
                }
            }

            if (mainSystemProto === targetSystemProto) {
                const [mainServers, targetServers] = await Promise.all([
                    this.system.mediaserver.getMediaServers(false).toPromise(),
                    targetSystemService.mediaserver.getMediaServers(false).toPromise(),
                ]);
                const primaryServerIds: Set<string> = mainServers.reduce(
                    (list, { id }) => list.add(id),
                    new Set<string>(),
                );
                if (targetServers.some(server => primaryServerIds.has(server.id))) {
                    throw Error(ResponseStrings.duplicateServers);
                }
                this.tooManyServers = mainServers.length + targetServers.length > this.maxServers;
            } else {
                throw Error(
                    mainSystemProto < targetSystemProto
                        ? ResponseStrings.currentSystemVersionIsNewer
                        : ResponseStrings.currentSystemVersionIsOlder,
                );
            }
            targetSystemService.stopPoll();
        }
        this.selectSystem.checkMergeabilityFunction();
        return this.targetSystem.isNew ? isNew : { error: '0' };
    }

    checkForChoosePrimary(changePrimary: boolean): void {
        const primary = this.system.serverManager.moduleInfo;
        const secondary = this.targetSystem;
        this.currentSystemIsPrimary$$.set(!changePrimary);

        if (!!primary.cloudSystemId !== !!secondary.cloudSystemId) {
            if (secondary.cloudSystemId) {
                this.currentSystemIsPrimary$$.set(false);
            }
            this.stateHistory$$.update(history => [...history, MergeState.confirm]);
        } else if (primary.cloudOwnerId !== secondary.cloudOwnerId) {
            this.adminPasswordErrorCode = ResponseStrings.differentOwners;
        } else {
            this.stateHistory$$.update(history => [...history, MergeState.primary]);
        }
    }

    handleMergeError(error: MergeErrorData): void {
        const err = cloneDeep(error.data);
        err.primarySystemName = this.primaryName$$();
        err.secondarySystemName = this.secondaryName$$();

        let system: NxSystemInfo;
        this.systemsService
            .forceUpdateSystems()
            .toPromise()
            .then(systems => {
                system = systems.find(system => system.id === this.primarySystem$$().id);
            })
            .finally(() => {
                const primarySystem = this.primarySystem$$();
                let stateOfHealth = system?.stateOfHealth;
                if (
                    !stateOfHealth &&
                    this.isMergeSystem(primarySystem) &&
                    'stateOfHealth' in primarySystem &&
                    primarySystem.stateOfHealth
                ) {
                    stateOfHealth = primarySystem.stateOfHealth;
                }

                err.failedSystemName =
                    stateOfHealth === ResponseStrings.online
                        ? err.secondarySystemName
                        : err.primarySystemName;

                const { errorText } = err;
                if (
                    err.resultCode === ResponseStrings.vmsRequestFailure &&
                    [
                        ResponseStrings.fail.toUpperCase(),
                        ResponseStrings.configurationError,
                        ResponseStrings.serviceUnavailable,
                        ResponseStrings.badGateway,
                    ].includes(errorText)
                ) {
                    err.errorText =
                        errorText === ResponseStrings.badGateway
                            ? ResponseStrings.systemUnavailable
                            : ResponseStrings.mergedSystemIsOffline;
                }

                this.close(err);
            });
    }

    private showSessionExpiredAlert(): void {
        this.toastService.notify(this.alertMessage, ToastType.Warning);
    }

    ngOnDestroy(): void {}
}
