import { chunk } from 'lodash-es';
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    filter,
    map,
    Observable,
    shareReplay,
    switchMap,
    take,
    tap,
} from 'rxjs';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import staticLang from '@language_static';
import { Translatable, TranslateObject } from '@pipes/nx-translate.types';
import {
    CloudLicenseUpdate,
    LicenseInfo,
    LicenseState,
} from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';
import { NxSystemsService } from '@services/systems.service';
import { Destroyable } from '@utils/Destroyable';
import { bitsToString } from '@utils/bits-to-string';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { LicenseServerAPI } from '../../nx-cloud-api/cloud-services/license-server/license-server-api';
import { NxSystem } from '../system';

import { mapLicenseKeyInfo } from './license-manager-utils';
import {
    CLOUD_STORAGE_STATES,
    LicenseKeyInfo,
    LicenseTagInfo,
    LicenseTranslationBaseKeys,
    ProcessedLicenseKey,
} from './license-manager.types';

export class LicenseManager extends Destroyable {
    #updater$ = new BehaviorSubject<string[]>(['system', 'user']);

    static INSTANCES = new WeakMap<NxSystem, LicenseManager>();

    static getInstance(
        licenseServerApi: LicenseServerAPI,
        system: NxSystem,
        systemsService: NxSystemsService,
    ): LicenseManager {
        if (!LicenseManager.INSTANCES.has(system)) {
            LicenseManager.INSTANCES.set(
                system,
                new LicenseManager(licenseServerApi, system, systemsService),
            );
        }

        return LicenseManager.INSTANCES.get(system).update();
    }

    static readonly TRANSLATION_BASE = staticLang.cloudStorage.fromServer;

    /** Base State */
    static readonly systemLicensesMap = new WeakMap<NxSystem, BehaviorSubject<LicenseInfo[]>>();
    static readonly userLicensesMap = new WeakMap<
        LicenseServerAPI,
        BehaviorSubject<LicenseInfo[]>
    >();

    get systemLicenses$(): BehaviorSubject<LicenseInfo[]> {
        if (!LicenseManager.systemLicensesMap.has(this.system)) {
            const licenseInfoSubject = new BehaviorSubject<LicenseInfo[]>(null);
            this.#updater$
                .pipe(
                    filter(
                        updates => updates.includes(this.system.id) || updates.includes('system'),
                    ),
                    switchMap(() => this.licenseServerApi.getSystemLicenses(this.system.id)),
                    catchError(() => Promise.resolve([] as LicenseInfo[])),
                    this.onDestroyed,
                )
                .subscribe(licenseInfoSubject);
            LicenseManager.systemLicensesMap.set(this.system, licenseInfoSubject);
        }

        return LicenseManager.systemLicensesMap.get(this.system);
    }

    get userLicenses$(): BehaviorSubject<LicenseInfo[]> {
        if (!LicenseManager.userLicensesMap.has(this.licenseServerApi)) {
            const licenseInfoSubject = new BehaviorSubject<LicenseInfo[]>(null);
            this.#updater$
                .pipe(
                    filter(updates => updates.includes('user')),
                    switchMap(() => this.licenseServerApi.getUserLicenses()),
                    catchError(() => Promise.resolve([] as LicenseInfo[])),
                )
                .subscribe(licenseInfoSubject);
            LicenseManager.userLicensesMap.set(this.licenseServerApi, licenseInfoSubject);
        }

        return LicenseManager.userLicensesMap.get(this.licenseServerApi);
    }

    /** State factories */

    processLicenseKeys = (
        licenses: LicenseKeyInfo[],
        filterState: LicenseState,
    ): Observable<ProcessedLicenseKey[]> =>
        this.systemsService.systemsSubject.pipe(
            map(systems =>
                licenses
                    .filter(({ licenseState }) => !filterState || licenseState === filterState)
                    .map(
                        ({
                            expirationDate,
                            licenseState,
                            cloudSystemId,
                            licenseKey,
                            cloudStorageSizeBytes,
                        }) => ({
                            size: bitsToString(+cloudStorageSizeBytes),
                            state: licenseState,
                            system:
                                licenseState === LicenseState.ACTIVE
                                    ? systems.find(({ id }) => id === cloudSystemId)?.name ||
                                      cloudSystemId
                                    : this.translateMessage(
                                          staticLang.cloudStorage.fromServer
                                              .Unassigned as LicenseTranslationBaseKeys,
                                      ),
                            expires: new Date(expirationDate).toLocaleDateString(),
                            key: licenseKey,
                            sizeBytes: +cloudStorageSizeBytes,
                        }),
                    ),
            ),
        );

    #processForCloudStorageUi = (
        base: Observable<LicenseInfo[]>,
        filterState?: LicenseState,
    ): Observable<ProcessedLicenseKey[]> =>
        base.pipe(
            filter(licenses => !!licenses),
            map(mapLicenseKeyInfo),
            switchMap(licenses => this.processLicenseKeys(licenses, filterState)),
            shareReplay({ bufferSize: 1, refCount: true }),
            this.onDestroyed,
        );

    /** LicenseManager State */
    public readonly state$ = this.systemLicenses$.pipe(
        map(licenses =>
            !licenses
                ? CLOUD_STORAGE_STATES.LOADING
                : licenses.length &&
                    licenses.some(
                        ({ state: { licenseState } }) => licenseState === LicenseState.ACTIVE,
                    )
                  ? CLOUD_STORAGE_STATES.ACTIVATED
                  : CLOUD_STORAGE_STATES.DEFAULT,
        ),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    /** Cloud Storage State */

    /** License Keys for system */
    public readonly systemKeys$ = this.#processForCloudStorageUi(
        this.systemLicenses$,
        LicenseState.ACTIVE,
    );

    /** License Keys for user */
    public readonly userKeys$ = this.#processForCloudStorageUi(this.userLicenses$);

    /** License Manager Helpers */

    translateMessage = (
        key: LicenseTranslationBaseKeys,
        params?: TranslateObject['params'],
    ): Translatable => ({
        value: LicenseManager.TRANSLATION_BASE[key] || key,
        params: params || {},
    });

    #toTagInfo = (keyInfo: ProcessedLicenseKey): LicenseTagInfo => ({
        key: keyInfo.key,
        info: this.translateMessage('until', {
            ...keyInfo,
            sizeBytes: keyInfo.sizeBytes.toString(),
        }),
    });

    /** Cloud Storage Helpers */

    /** Get Target Systems */
    @memoizeAsyncPersistent
    public getTargetSystems(excludeSystemId = this.system.id): Observable<DropdownItem<string>[]> {
        return combineLatest([this.systemsService.systemsSubject, this.userLicenses$]).pipe(
            map(([systems, userLicenses]) =>
                systems
                    .filter(
                        ({ id, isMine }) =>
                            isMine &&
                            id !== excludeSystemId &&
                            !userLicenses.find(
                                ({ state: { cloudSystemId, licenseState } }) =>
                                    cloudSystemId === id && licenseState === LicenseState.ACTIVE,
                            ),
                    )
                    .map(({ id }) => id),
            ),
            switchMap(cloudSystemIds =>
                this.licenseServerApi
                    .getStorageActivations({ cloudSystemIds })
                    .pipe(map(storages => ({ storages, cloudSystemIds }))),
            ),
            map(({ storages, cloudSystemIds }) =>
                cloudSystemIds.filter(
                    id => !storages.find(({ systemId }) => systemId === id)?.activations?.length,
                ),
            ),
            switchMap(systemIds =>
                this.systemsService.systemsSubject.pipe(
                    map(systems =>
                        systemIds.map(value => ({
                            name: systems.find(({ id }) => id === value)?.name || value,
                            value,
                        })),
                    ),
                ),
            ),
            this.onDestroyed,
        );
    }

    /**
     *  Get list of tags that could be activated.
     *
     * @param licenseState LicenseState
     * @returns Observable<LicenseTagInfo[]
     */
    @memoizeAsyncPersistent
    public getLicenseTagInfo(licenseState?: LicenseState): Observable<LicenseTagInfo[]> {
        return this.userKeys$.pipe(
            map(keys => keys.filter(({ state }) => !licenseState || state === licenseState)),
            map(keys => keys.map(this.#toTagInfo)),
            this.onDestroyed,
        );
    }

    static normalizeKey = (key: string): string =>
        chunk(key.toUpperCase().replace(/-/g, '').split(''), 4)
            .map(chunk => chunk.join(''))
            .join('-');

    /** Cloud Storage State Handlers */

    #updateLicense = (update: string[] = []): void =>
        this.#updater$.next([...update, this.system.id, 'user']);

    update(): this {
        this.#updateLicense([this.system.id, 'user']);
        return this;
    }

    #generateUpdateParams = (key: string, cloudSystemId?: string): CloudLicenseUpdate => {
        const licenseKey = LicenseManager.normalizeKey(key);
        const { currentUserEmail: userId } = this.system.userManager;
        cloudSystemId ||= this.system.id;
        const params = { licenseKey, cloudSystemId, userId };
        return params;
    };

    #inspectLicense = (license: LicenseInfo): Promise<LicenseInfo> => {
        if (!+license.params.services.cloudStorage.cloudStorageSizeBytes) {
            // Will add to lang file after lang refactor has been merged in
            return Promise.reject({ licenseKey: [LicenseManager.TRANSLATION_BASE.noCloudStorage] });
        }
        return Promise.resolve(license);
    };

    /** Cloud Storage Actions */

    public readonly activate = (key: string): Observable<LicenseInfo> => {
        return this.licenseServerApi.inspectLicense(LicenseManager.normalizeKey(key)).pipe(
            switchMap(this.#inspectLicense),
            take(1),
            switchMap(() => this.licenseServerApi.activateLicense(this.#generateUpdateParams(key))),
            tap(() => this.#updateLicense()),
            this.onDestroyed,
        );
    };

    public readonly deactivate = (password: string, key?: string): Observable<LicenseInfo> => {
        key ||= this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.licenseServerApi.verify(password).pipe(
            catchError(async () => {
                return { password: [LicenseManager.TRANSLATION_BASE.incorrectPassword] };
            }),
            take(1),
            switchMap((res: Record<string, unknown>) =>
                res?.password
                    ? Promise.reject(res)
                    : this.licenseServerApi.deactivateLicense(this.#generateUpdateParams(key)),
            ),
            tap(() => this.#updateLicense()),
            this.onDestroyed,
        );
    };

    public readonly move = (targetCloudSystemId: string, key: string): Observable<LicenseInfo> => {
        const licenseKey = LicenseManager.normalizeKey(
            key || this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey,
        );
        const sourceCloudSystemId = this.system.id;
        return this.licenseServerApi
            .changeLicense({ targetCloudSystemId, licenseKey, sourceCloudSystemId })
            .pipe(
                tap(() => this.#updateLicense([targetCloudSystemId])),
                this.onDestroyed,
            );
    };

    public readonly modify = (key: string): Observable<LicenseInfo> => {
        const originalKey = this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.activate(key).pipe(
            switchMap(licenseInfo =>
                this.licenseServerApi
                    .deactivateLicense(this.#generateUpdateParams(originalKey))
                    .pipe(map(() => licenseInfo)),
            ),
            tap(() => this.#updateLicense()),
            this.onDestroyed,
        );
    };

    constructor(
        private licenseServerApi: LicenseServerAPI,
        private system: NxSystem,
        private systemsService: NxSystemsService,
    ) {
        super();
        this.systemsService = systemsService;
    }
}
