import {
    Component,
    Inject,
    TemplateRef
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DialogRef, DIALOG_DATA } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';

@Component({
    selector: 'nx-modal-new-feature-content',
    templateUrl: 'new-feature.component.html',
    styleUrls: ['new-feature.component.scss']
})
export class NewFeatureInformationModalContent<T> {
    templateName: string;
    dynamicTemplate: TemplateRef<T>;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    constructor(
        config: NxConfigService,
        language: NxLanguageProviderService,
        public dialogsService: NxDialogsService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) public dialogData: {
            template: string | TemplateRef<T>,
            licenseManager?: LicenseManager
        }
    ) {
        this.LANG = language.translations;
        this.CONFIG = config.getConfig();
        if (dialogData.template instanceof TemplateRef) {
            this.dynamicTemplate = dialogData.template;
        } else {
            this.templateName = dialogData.template;
        }
    }

    close = (): void => this.dialogRef.close();
}
