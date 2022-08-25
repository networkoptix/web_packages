import { TranslateService } from '@ngx-translate/core';
import { chunk } from 'lodash-es';
import { BehaviorSubject, map, Observable, shareReplay, switchMap, filter, tap, catchError } from 'rxjs';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { CloudLicenseUpdate, LicenseInfo, LicenseState } from '@services/nx-cloud-api/license-server-api.types';
import { NxSystemsService } from '@services/systems.service';

import { LicenseServerAPI } from '../../nx-cloud-api/license-server-api';
import { NxSystem } from '../system';

import { mapLicenseKeyInfo, processLicenseKeys } from './license-manager-utils';
import { ProcessedLicenseKey, CLOUD_STORAGE_STATES, LicenseTagInfo } from './license-manager.types';

export class LicenseManager {
    #systemsService: NxSystemsService;
    #translateService: TranslateService;

    #updater$ = new BehaviorSubject<('system' | 'user')[]>(['system', 'user']);

    static readonly TRANSLATION_KEY = 'cloudStorage.fromServer.';

    /** Base State */
    public readonly systemLicenses$ = new BehaviorSubject<LicenseInfo[]>(null);
    public readonly userLicenses$ = new BehaviorSubject<LicenseInfo[]>(null);

    /** State factories */

    #processForCloudStorageUi = (base: Observable<LicenseInfo[]>, filterState?: LicenseState): Observable<ProcessedLicenseKey[]> => base.pipe(
        filter(licenses => !!licenses),
        map(mapLicenseKeyInfo),
        switchMap(licenses => processLicenseKeys(this.#systemsService, this.translateMessage, licenses, filterState)),
        shareReplay({ bufferSize: 1, refCount: true })
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

    translateMessage = (text: string, params?: unknown): string => this.#translateService.instant(`${LicenseManager.TRANSLATION_KEY}${text}`, params).replace(LicenseManager.TRANSLATION_KEY, '');

    #toTagInfo = (keyInfo: ProcessedLicenseKey): LicenseTagInfo => ({
        key: keyInfo.key,
        info: this.translateMessage('until', keyInfo)
    });

    /** Cloud Storage Helpers */

    /** Get Target Systems */
    public readonly getTargetSystems = (excludeSystemId = this.system.id): Observable<DropdownItem<string>[]> => this.#systemsService.systemsSubject.pipe(
        map(systems => systems.filter(({ id, isMine }) => isMine && id !== excludeSystemId && !this.userLicenses$.value.find(({ state: { cloudSystemId, licenseState } }) => cloudSystemId === id && licenseState === LicenseState.ACTIVE)).map(({ id }) => id)),
        switchMap(cloudSystemIds => this.licenseServerApi.getStorageActivations({ cloudSystemIds }).pipe(map(storages => ({ storages, cloudSystemIds })))),
        map(({ storages, cloudSystemIds }) => cloudSystemIds.filter(id => !storages.find(({ systemId }) => systemId === id)?.activations?.length)),
        switchMap(systemIds => this.#systemsService.systemsSubject.pipe(map(systems => systemIds.map(value => ({ name: systems.find(({ id }) => id === value)?.name || value, value })))))
    );

    /**
     *  Get list of tags that could be activated.
     *
     * @param licenseState LicenseState
     * @returns Observable<LicenseTagInfo[]
     */
    public readonly getLicenseTagInfo = (licenseState?: LicenseState): Observable<LicenseTagInfo[]> => this.userKeys$.pipe(
        map(keys => keys.filter(({ state }) => !licenseState || state === licenseState)),
        map(keys => keys.map(this.#toTagInfo))
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

    /** Cloud Storage Actions */

    public readonly activate = (key: string): Observable<LicenseInfo> => {
        return this.licenseServerApi.activateLicense(this.#generateUpdateParams(key)).pipe(
            tap(() => this.#updateLicense())
        );
    };

    public readonly deactivate = (password: string, key?: string): Observable<LicenseInfo> => {
        key ||= this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.licenseServerApi.verify(password).pipe(
            catchError(async () => ({ password: ['Invalid Password'] })),
            switchMap((res: Record<string, unknown>) => res?.password ? Promise.reject(res) : this.licenseServerApi.deactivateLicense(this.#generateUpdateParams(key))),
            tap(() => this.#updateLicense())
        );
    };

    public readonly move = (targetCloudSystemId: string, key: string): Observable<LicenseInfo> => {
        const licenseKey = LicenseManager.normalizeKey(key || this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey);
        const sourceCloudSystemId = this.system.id;
        return this.licenseServerApi.changeLicense({ targetCloudSystemId, licenseKey, sourceCloudSystemId }).pipe(
            tap(() => this.#updateLicense())
        );
    };

    public readonly modify = (key: string): Observable<LicenseInfo> => {
        const originalKey = this.systemLicenses$.value?.[0]?.params.orderParams.licenseKey;
        return this.licenseServerApi.activateLicense(this.#generateUpdateParams(key)).pipe(
            switchMap(licenseInfo => this.licenseServerApi.deactivateLicense(
                this.#generateUpdateParams(originalKey)).pipe(
                map(() => licenseInfo)
            )),
            tap(() => this.#updateLicense())
        );
    };

    constructor(private licenseServerApi: LicenseServerAPI, private system: NxSystem, systemsService: NxSystemsService, translateService: TranslateService) {
        this.#systemsService = systemsService;
        this.#translateService = translateService;

        this.#updater$.pipe(
            filter(updates => updates.includes('system')),
            switchMap(() => this.licenseServerApi.getLicenses(this.system.id))
        ).subscribe(this.systemLicenses$);

        this.#updater$.pipe(
            filter(updates => updates.includes('user')),
            switchMap(() => this.licenseServerApi.getLicenses())
        ).subscribe(this.userLicenses$);
    }
}
