import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    HostListener,
    Inject,
    OnDestroy,
    OnInit,
    // ViewEncapsulation,
    LOCALE_ID,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep, escape } from 'lodash-es';
import { lastValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
// import { NxToastService } from '@dialogs/toast.service';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { MergeRefactored as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
// import { NxThemeService } from '@services/theme.service';
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
import { WINDOW } from '@services/window-provider';
import { servers } from '@src/app/variables/static-variables';
import { pickFrom, alphabeticalSort, cleanIp, strSplice, cleanId } from '@utils/general';

import { MergeErrorData, MergeState, MergeStateType, MergeSystem } from './merge.refactor.component.types';

require('what-input');

const MAX_SERVERS = 100;

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

const stateProcesses = {
    select: 'selectSystem',
    admin: 'adminPassword',
    primary: 'choosePrimary',
    confirm: 'confirmMerge',
    generic: 'genericMerge',
};

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-merge-refactor-component',
    templateUrl: 'merge.refactor.component.html',
    styleUrls: ['merge.refactor.component.scss'],
    // encapsulation: ViewEncapsulation.None
})
export class NxMergeComponent extends ModalBase<DT['return']> implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG = staticLang;
    MergeState = MergeState;
    account: Account;
    readonly environment = environment;
    readonly wrongLogin: string = 'Wrong username or password.';

    // only used inside parent component
    systems: NxSystemInfo[];
    peerSystems: Partial<DiscoveredPeersReply[] | MergeSystem[]>;
    currentProcess: Process;

    // shared between components
    currentState: MergeStateType;
    stateHistory: MergeStateType[] = [];
    isLocal: boolean = environment.isLocal;
    dryRunAvailable: boolean;
    isSessionOauth: boolean;
    maxServers = MAX_SERVERS;
    systemUrls: { [ip: string]: string } = {};
    mergeSystems: MergeSystem[];
    system: NxSystem;
    targetSystem: MergeSystem;
    _currentSystemIsPrimary: boolean = true;
    primarySystem: NxSystem | MergeSystem;
    secondarySystem: NxSystem | MergeSystem;
    cleanUrl: string;
    serverUrl: string;
    remotePassword: string;

    get currentSystemIsPrimary(): boolean {
        return this._currentSystemIsPrimary;
    }

    set currentSystemIsPrimary(newValue: boolean) {
        this._currentSystemIsPrimary = newValue;
        this.primarySystem = newValue ? this.system : this.targetSystem;
        this.secondarySystem = newValue ? this.targetSystem : this.system;
    }

    get primaryName(): string {
        return escape(this.currentSystemIsPrimary
            ? this.system.info.name
            : (this.targetSystem.name || this.defaultServerName));
    }

    get secondaryName(): string {
        return escape(this.currentSystemIsPrimary
            ? (this.targetSystem.name || this.defaultServerName)
            : this.system.info.name);
    }

    get defaultServerName(): string {
        return this.translateService.instant(
            this.LANG.dialogs.merge.serverAtUrl,
            { url: this.cleanUrl || this.serverUrl || this.targetSystem.url }
        );
    }

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

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (['Enter', 'NumpadEnter'].includes(event.code || event.key)) {
            this.elem.nativeElement
                .querySelector<HTMLButtonElement>('button.on-keypress-enter')
                .click();
        }
    }

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
        private httpService: HttpClient,
        private cloudApi: NxCloudApiService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        // private cdRef: ChangeDetectorRef, // verify whether this is needed
        // private simpleDialogService: NxSimpleDialogsService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        private title: Title,
        // private localStorageService: LocalStorageService,
        // private themeService: NxThemeService,
        // private cookieService: CookieService,
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
    }

    // TODO: verify that this works and whether the implementation is performant enough
    async getSystemInfo(systemId: string): Promise<ModuleInformation> {
        const url = `https://${this.CONFIG.trafficRelayHost.replace('{systemId}', systemId)}/api/moduleInformation`;
        return this.httpService.get<ModuleInformation>(url).toPromise();
    }

    // method only used by child components to transition between child components
    setCurrentState(state?: MergeStateType): void {
        if (!state) {
            this.stateHistory.pop();
            state = this.stateHistory.pop();
        }
        if (state !== this.stateHistory[this.stateHistory.length - 1]) {
            this.stateHistory.push(state);
        }

        if (['select', 'admin', 'confirm'].includes(state)) {
            this.setupUpdateWebadminSession(state);
        }

        this.checkedMergeabilityOnce = false;
        this.currentState = state;

        // if going back to 'select', used to reinitialize components to update system/systems
        // removed init() due to limited value and to reduce complexity
        // may revisit with subscriptions later
    }

    // not sure how this is going to work for the generic component yet
    setupUpdateWebadminSession(state: MergeStateType): void {
        this.currentProcess = this[`${stateProcesses[state]}Process`];
        const message = this.LANG.dialogs.merge.updateWebadminSession[state];
        this.alertMessage = state === 'confirm'
            ? this.translateService.instant(message, {
                primarySystem: this.primaryName,
                secondarySystem: this.secondaryName
            })
            : this.translateService.instant(message);
    }

    async ngOnInit(): Promise<void> {
        this.title.setTitle(`${this.LANG.pageTitles.auth} - ${this.CONFIG.cloudName}`);

        pickFrom(this.dialogData, ['system', 'systems'], this);

        this.isSessionOauth = this.system.mediaserver.isSessionOauth;

        this.dryRunAvailable = this.system.info.capabilities.merge_systems >= 1;
        if (this.system.canMerge) {
            await lastValueFrom(this.system.serverManager.getModuleInfo());
            this.account = await this.accountService.get();

            // set up cloud or peer systems
            if (this.isLocal) {
                this.webadminSetup();
            } else {
                this.cloudSetup();
            }
        } else {
            this.thisSystemHasOutdatedServer = true;
            this.setCurrentState('generic');
        }

        this.initProcesses();
    }

    cleanUpWebadminSystem(
        systemInfo: DiscoveredPeersReply | ModuleInformationReply,
        systemUrls: { [ip: string]: string },
        newSystemFlag: string
    ): MergeSystem {
        const { id, cloudSystemId, localSystemId, name, systemName, status = '', protoVersion, remoteAddresses, port, serverFlags } = systemInfo;
        const { cloudOwnerId } = systemInfo as DiscoveredPeersReply;
        let firstValidIp: string;
        if (remoteAddresses?.length) {
            remoteAddresses.forEach((addy: string) => {
                const ip = cleanIp(addy);
                systemUrls[`${ip}:${port}`] = cleanId(id);
            });
            // remoteAddress might give a weird address with systemId.serverId
            // finds first valid ipv4/ipv6 address
            firstValidIp = remoteAddresses.find((addy: string) => (
                addy.split('.')[0].length <= 4 || addy.split(':')[0].length <= 4
            )) || remoteAddresses[0];
        }
        return {
            id: cleanId(id),
            cloudSystemId,
            cloudOwnerId: cleanId(cloudOwnerId),
            localSystemId: cleanId(localSystemId),
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
        const peerSystems: DiscoveredPeersReply[] = (await this.system.mediaserver.getPeerSystems().toPromise()).reply
            .filter((peer: DiscoveredPeersReply) => this.system.id !== peer.localSystemId);
        this.mergeSystems = peerSystems
            .map((peer: DiscoveredPeersReply) => (
                this.cleanUpWebadminSystem(peer, this.systemUrls, this.CONFIG.system.flags.newSystem)
            ))
            .sort(alphabeticalSort(this.locale, (sys: MergeSystem) => sys.name));

        if (this.mergeSystems.length === 0) {
            this.otherSystem = true;
            this.noOtherSystems = true;
        }

        this.setCurrentState('select');
    }

    cloudSetup(): void {
        let state: MergeStateType;
        if (this.systems.length === 0) {
            this.failedToFindAnySystem = true;
            state = 'generic';
        } else {
            this.mergeSystems = this.systems.map(({ id, name, canMerge, stateOfHealth = '' }: NxSystemInfo) => ({
                id,
                name,
                stateOfHealth,
                canMerge,
            }));
            state = 'select';
        }
        this.setCurrentState(state);
    }

    initProcesses(): void {
        this.selectSystemProcess = this.processService
            .createProcess(
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
                    if (res !== 'skip') {
                        this.checkedMergeabilityOnce = false;
                        this.currentSystemIsPrimary = true;
                        // covers case where system (cloud & non-cloud) is not set up yet
                        if (res.isNew) {
                            if (this.serverUrl) {
                                this.serverUrl = strSplice(
                                    this.serverUrl,
                                    this.serverUrl.indexOf('//') + 2,
                                    'admin:admin@'
                                );
                            }
                            this.remotePassword = 'admin';
                            this.setCurrentState('confirm');
                        } else if (!Object.keys(res).length || res.error === '0' || !res.error) {
                            if (this.serverUrl) { // this.isLocal? + some indication that it's not cloud merge?
                                this.setCurrentState('admin');
                            } else {
                                this.setCurrentState('primary');
                            }
                        }
                    }
                },
                err => {
                    this.unlock();
                    this.checking = false;
                    if (err.errorId === servers.errors.oldSessionErrorId) {
                        return this.showSessionExpiredAlert();
                    } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                        return this.dialogs.expiredSession().then(() => this.window.location.reload());
                    }
                    if (err !== 'canceled') {
                        if (err.message === 'Timeout has occurred') {
                            err.message = 'noServerFound';
                        }
                        // Handling for rest errors. NEED TO FIGURE THIS OUT A DIFFERENT WAY
                        // asked Mikhail about documentation on these for rest /merge route
                        // if (err.errorString) {
                        //     if (err.errorString.includes(this.LANG.dialogs.merge.restError.duplicateServer)) {
                        //         err.message = 'duplicateServers';
                        //     } else if (err.errorString.includes(this.LANG.dialogs.merge.restError.useCloudMerge)) {
                        //         err.message = 'targetSystemBoundToCloud';
                        //     } else if (err.errorString.includes(this.LANG.dialogs.merge.restError.differentCloudOwners)) {
                        //         err.message = 'differentOwners';
                        //     }
                        const errorCodes = this.system.useRest ? MergeRestServerErrorCodes : MergeServerErrorCodes;
                        if (err.error) {
                            err.message = errorCodes[err.error];
                        }
                        this.selectSystemErrorCode = err.message || 'unknownError';
                    }
                    // see if this is still an issue?
                    // this.serverUrlInputFocus ? this.serverUrlInputFocus.nativeElement.focus()
                    //     : this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
                }
            );

        this.adminPasswordProcess = this.processService
            .createProcess(() => {
                this.lock();
                // when trying again, does not have access to previous state template
                if (!this.dryRunAvailable) {
                    this.selectSystemProcess.processing = false;
                    this.selectSystemProcess.finished = true;
                    this.setCurrentState('confirm');
                    return Promise.resolve();
                } else {
                    return lastValueFrom(this.system.mediaserver.mergeSystems(
                        this.serverUrl,
                        this.targetSystem.id,
                        true,
                        this.adminPassword
                    ));
                }
            },
            {
                ignoreError: true,
                errorCodes: { [this.wrongLogin]: 'potentialErrorString' }
            },
            res => {
                this.unlock();
                if (!res) {
                    return;
                }
                if (!res.error || res.error === '0') {
                    this.remotePassword = this.adminPassword;
                    this.checkForChoosePrimary();
                } else if (res.error !== '0') {
                    let errorCode: string = MergeServerErrorCodes[res.error] || 'serverNotAvailable';
                    if (res.error === '1') {
                        errorCode = 'systemOfflineUrl';
                    }
                    this.adminPasswordErrorCode = errorCode;
                }
            }, err => {
                this.unlock();
                if (err.error && err.error !== '0') {
                    this.adminPasswordErrorCode = this.system.useRest
                        ? MergeRestServerErrorCodes[err.error]
                        : MergeServerErrorCodes[err.error];
                    return;
                }
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    return this.showSessionExpiredAlert();
                } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => this.window.location.reload());
                }

                this.adminPasswordErrorCode = err.message === 'Timeout has occurred'
                    ? 'systemOfflineUrl' : 'unknownError';
            });

        this.confirmMergeProcess = this.processService
            .createProcess(() => {
                this.lock();
                let password = this.confirmPassword;

                if (this.environment.isLocal) {
                    password = this.remotePassword;
                }
                if (!password && !this.isSessionOauth) {
                    return Promise.reject({ error: { data: { resultCode: 'missingPassword' } } });
                }

                if (this.isLocal) {
                    const takeRemoteSettings = this.system.id === this.secondarySystem.id;
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
                    return this.cloudApi.merge(this.primarySystem.id, this.secondarySystem.id, password);
                }
            }, {
                errorCodes: {
                    mergedSystemIsOffline: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    vmsRequestFailure: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    missingPassword: () => {
                        this.confirmMergeErrorCode = 'required';
                        // this.confirmMergeInput.nativeElement.focus();
                    },
                    wrongPassword: () => {
                        this.confirmMergeErrorCode = 'wrongPassword';
                        this.confirmPassword = '';
                        // this.confirmMergeInput.nativeElement.focus();
                    },
                    [this.wrongLogin]: 'potentialErrorString'
                },
                ignoreError: true
            }
            , res => {
                this.unlock();
                if (res.mergeInProgress || res.error === '0' || res.resultCode === this.LANG.errorCodes.ok) {
                    // handles telling the app which systems are getting merged and the proper messaging
                    if (this.isLocal) {
                        const template =
                                `<div class="my-1">
                            <div class="larger"><strong>${this.secondaryName}</strong> ${this.translateService.instant(this.LANG.ribbon.beingMerged.to)}</div>
                            <div class="mt-2">${this.translateService.instant(this.LANG.ribbon.beingMerged.mayTake)}</div>
                        </div>`;
                        this.ribbonService.hide();
                        this.ribbonService.show(template, [], 'alert');
                    } else {
                        this.systemsService.forceUpdateSystems();
                    }
                    this.close(
                        {
                            secondary: {
                                id: this.secondarySystem.id,
                                name: this.secondaryName
                            },
                            primary: {
                                id: this.primarySystem.id,
                                name: this.primaryName
                            },
                            anotherSystemId: this.targetSystem.id,
                            role: this.primarySystem.id === this.system.id
                                ? this.CONFIG.system.status.master
                                : this.CONFIG.system.status.slave
                        }
                    );
                // wrong cloud password
                } else if (res.errorString === this.wrongLogin) {
                    this.confirmMergeErrorCode = 'wrongPassword';
                    // this.confirmMergeInput.nativeElement.focus();
                // wrong local admin password when checking VMS <= 4.0 systems
                } else if (res.errorString === 'UNAUTHORIZED') {
                    this.confirmMergeErrorCode = 'wrongPasswordAdmin';
                    // this.confirmMergeInput.nativeElement.focus();
                } else if (res.error) {
                    res.resultCode = res.errorString.toLowerCase();
                    this.handleMergeError(res);
                }
            }, error => {
                this.unlock();
                if (error.errorString === this.wrongLogin) {
                    this.confirmMergeErrorCode = 'wrongPassword';
                    // this.confirmMergeInput.nativeElement.focus();
                    return;
                }
                if (error.errorId === servers.errors.oldSessionErrorId || error.resultCode === 'vmsRequestFailure') {
                    return this.showSessionExpiredAlert();
                } else if (error.status === 403 || error.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => this.window.location.reload());
                }
                // for errors that pop up during the merge
                let errorCode = error.resultCode || (error.data?.resultCode);
                if (errorCode === 'missingPassword' || errorCode === 'wrongPassword') {
                    return;
                }
                if (!errorCode && error.name === 'TimeoutError') {
                    errorCode = 'fail';
                }

                /** Get the names of the primary and secondary system.
                        Next try to figure out which system caused the problem.
                        If the primary system's stateOfHealth is not online set it as the failedSystem.
                        Otherwise the secondary system is set as the failedSystem no matter what.
                    */
                error.resultCode = errorCode;
                this.handleMergeError(error);
            });
    }

    cleanUpUrl = (serverUrl: string): string => {
        if (!(/^https?:\/\//).test(serverUrl)) {
            serverUrl = `${this.window.location.protocol}//${serverUrl}`;
        }
        if (!(/:\d{1,5}$/).test(serverUrl)) {
            serverUrl += ':7001';
        }
        return serverUrl;
    };

    async preCheckSystemMerge(): Promise<
        { error?: string; errorId?: string; errorString?: string; isNew?: boolean } |
        Error |
        'skip'
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
                        secondarySystem = (await this.system.serverManager.getModuleInfoUsingUrl(this.serverUrl).toPromise()).reply;
                    }
                } catch (err) {
                    throw Error('secondaryOffline');
                }
                this.targetSystem = this.cleanUpWebadminSystem(secondarySystem, this.systemUrls, this.CONFIG.system.flags.newSystem);
            }
            if (this.targetSystem.cloudOwnerId && this.system.serverManager.moduleInfo.cloudOwnerId) {
                throw Error(`${!this.targetSystem?.name ? 'un' : ''}knownBothSystemsConnectedToCloud`);
            }

            if (!this.dryRunAvailable) {
                // used to be code that would update system/systems and then check if dryRunAvailable again
                // using .init(), but little value received, so removed to reduce complexity
                return this.targetSystem.isMergeable ? { error: '0' } : 'skip';
            }
            const res = await lastValueFrom(this.system.mediaserver.mergeSystems(this.serverUrl, this.targetSystem.id, true));
            if (res.error && res.error !== '0') {
                throw Error(MergeServerErrorCodes[res.error] || 'unknownError');
            }
            return this.targetSystem.isNew ? isNew : res;
        } else {
            const targetSystemService = this.systemService.createSystem(this.account.email, this.targetSystem.id, undefined, true, true);
            let targetSystem: NxSystem;
            try {
                targetSystem = await targetSystemService.getInfo(true, false);
            } catch (err) {
                throw Error('systemOffline');
            }
            await targetSystemService.getUsers(true, true);
            if (!targetSystem.isOnline) {
                throw Error('systemOffline');
            } else if (!targetSystem.isAvailable) {
                throw Error('secondarySystemUnavailable');
            }
            const mainSystemProto = this.system.serverManager.moduleInfo.protoVersion;
            let targetSystemProto: number;
            try {
                targetSystemProto = (await lastValueFrom(targetSystemService.serverManager.getModuleInfo())).reply.protoVersion;
            } catch (err) {
                if (err.status === 502) {
                    throw Error('secondaryOffline');
                }
            }

            if (mainSystemProto === targetSystemProto) {
                const [mainServers, targetServers] = await Promise.all([
                    this.system.mediaserver.getMediaServers(false).toPromise(),
                    targetSystemService.mediaserver.getMediaServers(false).toPromise()
                ]);
                const primaryServerIds: Set<string> = mainServers.reduce((list, { id }) => list.add(id), new Set<string>());
                if (targetServers.some(server => primaryServerIds.has(server.id))) {
                    throw Error('duplicateServers');
                }
                this.tooManyServers = mainServers.length + targetServers.length > this.maxServers;
            } else {
                throw Error(`systemVersion${mainSystemProto < targetSystemProto ? 'New' : 'Old'}`);
            }
            targetSystemService.stopPoll();
        }
        return this.targetSystem.isNew ? isNew : { error: '0' };
    }

    checkForChoosePrimary(): void {
        const primary = this.system.serverManager.moduleInfo;
        const secondary = this.targetSystem;
        if (!!primary.cloudSystemId !== !!secondary.cloudSystemId) {
            if (secondary.cloudSystemId) {
                this.currentSystemIsPrimary = false;
            }
            this.setCurrentState('confirm');
        } else if (primary.cloudOwnerId !== secondary.cloudOwnerId) {
            this.adminPasswordErrorCode = 'differentOwners';
        } else {
            this.setCurrentState('primary');
        }
    }

    handleMergeError(error: MergeErrorData): void {
        const err = cloneDeep(error.data);
        err.primarySystemName = this.primaryName;
        err.secondarySystemName = this.secondaryName;

        let system: NxSystemInfo;
        this.systemsService.forceUpdateSystems().toPromise()
            .then(systems => {
                system = systems.find(system => system.id === this.primarySystem.id);
            })
            .finally(() => {
                let stateOfHealth = system?.stateOfHealth;
                if (!stateOfHealth && this.isMergeSystem(this.primarySystem)) {
                    stateOfHealth = this.primarySystem.stateOfHealth;
                }

                err.failedSystemName = stateOfHealth === 'online'
                    ? err.secondarySystemName
                    : err.primarySystemName;

                const { errorText } = err;
                if (err.resultCode === 'vmsRequestFailure' && ['FAIL', 'CONFIGURATION_ERROR', 'Service Unavailable', 'Bad Gateway'].includes(errorText)) {
                    err.errorText = errorText === 'Bad Gateway' ? 'systemUnavailable' : 'mergedSystemIsOffline';
                }

                this.close(err);
            });
    }

    private showSessionExpiredAlert(): void {
        this.toastService.notify(
            this.alertMessage,
            toast.warning,
        );
    }

    // goBack(): void {
    //     this.confirmMergeForm && this.confirmMergeForm.form.markAsUntouched();
    //     this.adminPassword && this.adminPassword.form.markAsUntouched();
    //     this.machine.goBack();
    //     this.cdRef.detectChanges();
    //     this.mergeDropdown && this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
    //     this.primaryRadio && this.primaryRadio.inputRadio.nativeElement.focus();
    // }

    ngOnDestroy(): void { }
}
