import {
    Component,
    Inject,
    TemplateRef
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DialogRef, DIALOG_DATA } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
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
    icons = icons;

    LANG: LanguageI18NStaticTypes;
    constructor(
        language: NxLanguageProviderService,
        public dialogsService: NxDialogsService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) public dialogData: {
            template: string | TemplateRef<T>,
            licenseManager?: LicenseManager
        }
    ) {
        this.LANG = language.translations;
        if (dialogData.template instanceof TemplateRef) {
            this.dynamicTemplate = dialogData.template;
        } else {
            this.templateName = dialogData.template;
        }
    }

    close = (): void => this.dialogRef.close();
}
