import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig } from '@services/nx-config/config-types';
import { Process } from '@services/process.service/process';

export interface LicenseInfo {
    key: string;
    info: string;
    warningText?: string;
}

export enum CloudStorageActionType {
    ACTIVATE = 'activate',
    MODIFY = 'modify',
    MOVE = 'move',
    DELETE = 'delete'
}

export class BaseCloudStorageActionModalContent {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    actionProcess: Process;
    actionType: CloudStorageActionType;
    close: () => void;

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
    licenseMessage = '';
    licenseWarning = '';
    mask = this.DEFAULT_MASK;
    success = false;

    // Mock systems
    systems = [
        {
            value: '1234abcd5678efgh',
            name: 'Some System'
        },
        {
            value: '2345abcd5678efgh',
            name: 'Another System'
        },
        {
            value: '6789abcd5678efgh',
            name: 'Also System'
        },
    ];

    // Mock data
    licenses: LicenseInfo[] = [
        {
            key: '1234abcd5678efgh',
            info: '50GB until 01 July 2022'
        },
        {
            key: '2345abcd5678efgh',
            info: '100GB until 01 July 2022'
        },
        {
            key: '6789abcd5678efgh',
            info: '200GB until 01 July 2022',
            warningText: 'Some data will be deleted due to the smaller size of the new Cloud Storage'
        },
    ];

    #updateMessages = (license?: LicenseInfo) => {
        this.licenseMessage = license?.info || '';
        this.licenseWarning = license?.warningText || '';
    };

    updateLicense = (licenseInfo?: LicenseInfo) => {
        this.license = licenseInfo?.key?.toUpperCase() || '';
        this.#updateMessages(licenseInfo);
    };

    updateMessage = licenseKey => {
        const license = this.licenses.find(({ key }) => key.toUpperCase() === licenseKey.toUpperCase());
        this.#updateMessages(license);
    };

    updateCursorPosition(event): void {
        setTimeout(() => {
            const cursorPosition = this.license.length + Math.floor(this.license.length / 4);
            event.target.setSelectionRange(cursorPosition, cursorPosition);
        });
    }

    showSuccess = () => {
        if (!this.LANG.dialogs.cloudStorage.actions[this.actionType]?.success) {
            return this.close();
        }

        this.success = true;
    };

    init = () => {
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
