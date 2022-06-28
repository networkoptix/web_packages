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
        @Inject(DIALOG_DATA) { template }: {
            template: string | TemplateRef<T>
        }
    ) {
        this.LANG = language.translations;
        this.CONFIG = config.getConfig();
        if (template instanceof TemplateRef) {
            this.dynamicTemplate = template;
        } else {
            this.templateName = template;
        }
    }

    close = () => this.dialogRef.close();
}
