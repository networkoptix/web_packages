import { map, Observable } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { CloudStorage as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { Translatable } from '@pipes/nx-translate.types';
import { LicenseState } from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { Process, ProcessSettings } from '@services/process.service/process';
import { CloudStorageManager, CloudStorageUpdate } from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import { LicenseTagInfo, LicenseTranslationBaseKeys } from '@services/system.service/license-manager/license-manager.types';
import { pickFrom } from '@utils/general';

export enum CloudStorageActionType {
    ACTIVATE = 'activate',
    MODIFY = 'modify',
    MOVE = 'move',
    DELETE = 'delete'
}

export class BaseCloudStorageActionModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    CONFIG: IConfig;
    actionProcess: Process;
    actionType: CloudStorageActionType;
    licenseManager: LicenseManager;
    cloudStorageManager: CloudStorageManager;
    protected dialogData: DT['data'];
    targetSystem: DropdownItem<string>;
    targetSystems$: Observable<DropdownItem<string>[]>;
    processConfig: Partial<ProcessSettings> = { ignoreError: true, ignoreUnauthorized: true };

    // Dynamically set based on action type
    showLicenseInput: boolean;
    showSystemsDropdown: boolean;
    showPasswordInput: boolean;

    // Template lookups
    readonly ACTION_TYPES = CloudStorageActionType;
    readonly DEFAULT_MASK = 'AAAA-AAAA-AAAA-AAAA';

    // Action properties
    password = '';
    license = '';
    licenseMessage: Translatable = '';
    licenseWarning: Translatable = '';
    systemWarning: Translatable = '';
    passwordWarning: Translatable = '';
    mask = this.DEFAULT_MASK;
    success = false;
    dashes = /-/g;
    errors: Translatable[] = [];

    licenses$: Observable<LicenseTagInfo[]>;

    #updateMessages = (license?: LicenseTagInfo): void => {
        this.licenseMessage = license?.info || '';
        this.licenseWarning = license?.warningText || '';
    };

    updateLicense = (licenseInfo?: LicenseTagInfo): void => {
        this.license = (licenseInfo?.key?.toUpperCase() || '').replace(this.dashes, '');
        this.#updateMessages(licenseInfo);
    };

    updateMessage = (licenseKey: string): void => {
        this.licenses$.pipe(
            map(licenses => licenses.find(({ key }) => key.toUpperCase() === licenseKey.toUpperCase()))
        ).subscribe(license => {
            this.#updateMessages(license);
        });
    };

    updateCursorPosition(event: ClipboardEvent): void {
        setTimeout(() => {
            const cursorPosition = this.license.length + Math.floor(this.license.length / 4);
            (event.target as HTMLInputElement).setSelectionRange(cursorPosition, cursorPosition);
        });
    }

    showSuccess = (activate = false): void => {
        if (!this.LANG.dialogs.cloudStorage.actions[this.actionType]?.success) {
            return this.close();
        }

        if (activate) {
            this.cloudStorageManager.updateState(CloudStorageUpdate.ACTIVATE);
        }

        this.success = true;
        this.unlock();
    };

    showErrors = ({
        userId = [],
        cloudSystemId = [],
        licenseKey = [],
        password = [],
        non_field_errors: nonFieldErrors = []
    }: {
        userId: LicenseTranslationBaseKeys[];
        cloudSystemId: LicenseTranslationBaseKeys[];
        licenseKey: LicenseTranslationBaseKeys[];
        password: LicenseTranslationBaseKeys[];
        non_field_errors: LicenseTranslationBaseKeys[];
        status: string;
    }): void => {
        const errors: Translatable[] = [];

        const [licenseError, ...otherLicenseErrors] = licenseKey.map(k => this.licenseManager.translateMessage(k));

        if (licenseError) {
            this.licenseMessage = '';
            if (this.showLicenseInput) {
                this.licenseWarning = licenseError;
            } else {
                errors.push(licenseError);
            }
            errors.push(...otherLicenseErrors);
        }

        const [systemError, ...otherSystemErrors] = cloudSystemId.map(k => this.licenseManager.translateMessage(k));

        if (systemError) {
            if (this.showLicenseInput) {
                this.systemWarning = systemError;
            } else {
                errors.push(systemError);
            }
            errors.push(...otherSystemErrors);
        }

        const [passwordError, ...otherPasswordErrors] = password.map(k => this.licenseManager.translateMessage(k));

        if (passwordError) {
            if (this.showPasswordInput) {
                this.passwordWarning = passwordError;
            } else {
                errors.push(passwordError);
            }
            errors.push(...otherPasswordErrors);
        }

        if (nonFieldErrors) {
            errors.push(...nonFieldErrors);
        }

        errors.push(...userId.map(k => this.licenseManager.translateMessage(k)));

        this.errors = errors;
        this.unlock();
    };

    init = (): void => {
        pickFrom(this.dialogData, ['licenseManager', 'cloudStorageManager'], this);
        this.targetSystems$ = this.licenseManager.getTargetSystems();
        this.licenses$ = this.licenseManager.getLicenseTagInfo(LicenseState.INACTIVE);
        if ([CloudStorageActionType.DELETE, CloudStorageActionType.MOVE].includes(this.actionType)) {
            this.licenseManager.systemKeys$.pipe(map(([{ key }]) => key.replace(/-/g, ''))).subscribe(key => {
                this.license = key;
            });
        }
        this.showLicenseInput = [CloudStorageActionType.ACTIVATE, CloudStorageActionType.MODIFY].includes(this.actionType);
        this.showSystemsDropdown = CloudStorageActionType.MOVE === this.actionType;
        this.showPasswordInput = CloudStorageActionType.DELETE === this.actionType;
    };

    // Currently not used but might be needed
    // updateLicense = license => {
    //     const segmentSize = 4;
    //     const toReplace =Math.floor((license.length - 1) / segmentSize);
    //     let placeholder = 1;
    //     let mask = 'AAAA AAAA AAAA AAAA';

    //     while (placeholder <= toReplace) {
    //         const position = placeholder * (segmentSize + 1);
    //         mask = mask.substring(0, position - 1) + '-' + mask.substring(position);
    //         placeholder++;
    //     }

    //     this.mask = mask;
    //     this.license = license;
    // };
}
