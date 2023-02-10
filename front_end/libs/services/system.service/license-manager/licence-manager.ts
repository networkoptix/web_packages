import { chunk } from 'lodash-es';
import { BehaviorSubject, map, Observable, shareReplay, switchMap, filter, tap, catchError } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { Translatable, TranslateObject } from '@pipes/nx-translate.types';
import { CloudLicenseUpdate, LicenseInfo, LicenseState } from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';
import { NxSystemsService } from '@services/systems.service';
import { Destroyable } from '@utils/Destroyable';
import { bitsToString } from '@utils/bits-to-string';

import { LicenseServerAPI } from '../../nx-cloud-api/cloud-services/license-server/license-server-api';
import { NxSystem } from '../system';

import { mapLicenseKeyInfo } from './license-manager-utils';
import { ProcessedLicenseKey, CLOUD_STORAGE_STATES, LicenseTagInfo, LicenseTranslationBaseKeys, LicenseKeyInfo } from './license-manager.types';

export class LicenseManager extends Destroyable {
    #systemsService: NxSystemsService;

    #updater$ = new BehaviorSubject<('system' | 'user')[]>(['system', 'user']);

    static readonly TRANSLATION_BASE = staticLang.cloudStorage.fromServer;

    /** Base State */
    public readonly systemLicenses$ = new BehaviorSubject<LicenseInfo[]>(null);
    public readonly userLicenses$ = new BehaviorSubject<LicenseInfo[]>(null);

    /** State factories */

    processLicenseKeys = (licenses: LicenseKeyInfo[], filterState: LicenseState): Observable<ProcessedLicenseKey[]> => this.#systemsService.systemsSubject.pipe(
        map(systems => licenses
            .filter(({ licenseState }) => !filterState || licenseState === filterState)
            .map(({
                expirationDate, licenseState, cloudSystemId, licenseKey, cloudStorageSizeBytes
            }) => ({
                size: bitsToString(+cloudStorageSizeBytes),
                state: licenseState,
                system: licenseState === LicenseState.ACTIVE ? systems.find(({ id }) => id === cloudSystemId)?.name || cloudSystemId : this.translateMessage(staticLang.cloudStorage.fromServer.Unassigned as LicenseTranslationBaseKeys),
                expires: new Date(expirationDate).toLocaleDateString(),
                key: licenseKey,
                sizeBytes: +cloudStorageSizeBytes
            }))));

    #processForCloudStorageUi = (base: Observable<LicenseInfo[]>, filterState?: LicenseState): Observable<ProcessedLicenseKey[]> => base.pipe(
        filter(licenses => !!licenses),
        map(mapLicenseKeyInfo),
        switchMap(licenses => this.processLicenseKeys(licenses, filterState)),
        shareReplay({ bufferSize: 1, refCount: true }),
        this.onDestroyed
    );

    /** LicenseManager State */
    public readonly state$ = this.systemLicenses$.pipe(
        map(licenses => !licenses ? CLOUD_STORAGE_STATES.LOADING : licenses.length && licenses.some(({ state: { licenseState } }) => licenseState === LicenseState.ACTIVE) ? CLOUD_STORAGE_STATES.ACTIVATED : CLOUD_STORAGE_STATES.DEFAULT),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    /** Cloud Storage State */

    /** License Keys for system */
    public readonly systemKeys$ = this.#processForCloudStorageUi(this.systemLicenses$, LicenseState.ACTIVE);

    /** License Keys for user */
    public readonly userKeys$ = this.#processForCloudStorageUi(this.userLicenses$);

    /** License Manager Helpers */

    translateMessage = (key: LicenseTranslationBaseKeys, params?: TranslateObject['params']): Translatable => ({ value: LicenseManager.TRANSLATION_BASE[key], params: params || {} });

    #toTagInfo = (keyInfo: ProcessedLicenseKey): LicenseTagInfo => ({
        key: keyInfo.key,
        info: this.translateMessage('until', { ...keyInfo, sizeBytes: keyInfo.sizeBytes.toString() })
    });

    /** Cloud Storage Helpers */

    /** Get Target Systems */
    public readonly getTargetSystems = (excludeSystemId = this.system.id): Observable<DropdownItem<string>[]> => this.#systemsService.systemsSubject.pipe(
        map(systems => systems.filter(({ id, isMine }) => isMine && id !== excludeSystemId && !this.userLicenses$.value.find(({ state: { cloudSystemId, licenseState } }) => cloudSystemId === id && licenseState === LicenseState.ACTIVE)).map(({ id }) => id)),
        switchMap(cloudSystemIds => this.licenseServerApi.getStorageActivations({ cloudSystemIds }).pipe(map(storages => ({ storages, cloudSystemIds })))),
        map(({ storages, cloudSystemIds }) => cloudSystemIds.filter(id => !storages.find(({ systemId }) => systemId === id)?.activations?.length)),
        switchMap(systemIds => this.#systemsService.systemsSubject.pipe(map(systems => systemIds.map(value => ({ name: systems.find(({ id }) => id === value)?.name || value, value }))))),
        this.onDestroyed
    );

    /**
     *  Get list of tags that could be activated.
     *
     * @param licenseState LicenseState
     * @returns Observable<LicenseTagInfo[]
     */
    public readonly getLicenseTagInfo = (licenseState?: LicenseState): Observable<LicenseTagInfo[]> => this.userKeys$.pipe(
        map(keys => keys.filter(({ state }) => !licenseState || state === licenseState)),
        map(keys => keys.map(this.#toTagInfo)),
        this.onDestroyed
    );

    static normalizeKey = (key: string): string => chunk(key.toUpperCase().replace(/-/g, '').split(''), 4).map(chunk => chunk.join('')).join('-');

    /** Cloud Storage State Handlers */

    #updateLicense = (update: ('system' | 'user')[] = ['system', 'user']): void => this.#updater$.next(update);

    #generateUpdateParams = (key: string, cloudSystemId?: string): CloudLicenseUpdate => {
        const licenseKey = LicenseManager.normalizeKey(key);
        const { email: userId } = this.system.userManager.currentUser;
        cloudSystemId ||= this.system.id;
        const params = { licenseKey, cloudSystemId, userId };
        return params;
    };

    #inspectLicense = (license: LicenseInfo): Promise<LicenseInfo> => {
        if (!+license.params.services.cloudStorage.cloudStorageSizeBytes) {
            // Will add to lang file after lang refactor has been merged in
            return Promise.reject({ licenseKey: ['This license does not include cloud storage.'] });
        }
        return Promise.resolve(license);
    };

    /** Cloud Storage Actions */

    public readonly activate = (key: string): Observable<LicenseInfo> => {
        return this.licenseServerApi.inspectLicense(LicenseManager.normalizeKey(key)).pipe(
            switchMap(this.#inspectLicense),
            switchMap(() => this.licenseServerApi.activateLicense(this.#generateUpdateParams(key))),
            tap(() => this.#updateLicense()),
            this.onDestroyed
        );
    };

    public readonly deactivate = (password: string, key?: string): Observable<LicenseInfo> => {
        key ||= this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.licenseServerApi.verify(password).pipe(
            catchError(async () => ({ password: ['Invalid Password'] })),
            switchMap((res: Record<string, unknown>) => res?.password ? Promise.reject(res) : this.licenseServerApi.deactivateLicense(this.#generateUpdateParams(key))),
            tap(() => this.#updateLicense()),
            this.onDestroyed
        );
    };

    public readonly move = (targetCloudSystemId: string, key: string): Observable<LicenseInfo> => {
        const licenseKey = LicenseManager.normalizeKey(key || this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey);
        const sourceCloudSystemId = this.system.id;
        return this.licenseServerApi.changeLicense({ targetCloudSystemId, licenseKey, sourceCloudSystemId }).pipe(
            tap(() => this.#updateLicense()),
            this.onDestroyed
        );
    };

    public readonly modify = (key: string): Observable<LicenseInfo> => {
        const originalKey = this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.activate(key).pipe(
            switchMap(licenseInfo => this.licenseServerApi.deactivateLicense(
                this.#generateUpdateParams(originalKey)).pipe(
                map(() => licenseInfo)
            )),
            tap(() => this.#updateLicense()),
            this.onDestroyed
        );
    };

    constructor(private licenseServerApi: LicenseServerAPI, private system: NxSystem, systemsService: NxSystemsService) {
        super();
        this.#systemsService = systemsService;

        this.#updater$.pipe(
            filter(updates => updates.includes('system')),
            switchMap(() => this.licenseServerApi.getLicenses(this.system.id)),
            catchError(() => Promise.resolve([] as LicenseInfo[])),
            this.onDestroyed
        ).subscribe(this.systemLicenses$);

        this.#updater$.pipe(
            filter(updates => updates.includes('user')),
            switchMap(() => this.licenseServerApi.getLicenses()),
            catchError(() => Promise.resolve([] as LicenseInfo[])),
            this.onDestroyed
        ).subscribe(this.userLicenses$);
    }
}
