import {
    Component,
    Inject,
    TemplateRef
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogRef, DIALOG_DATA } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
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

    LANG = staticLang;
    constructor(
        public dialogsService: NxDialogsService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) public dialogData: {
            template: string | TemplateRef<T>;
            licenseManager?: LicenseManager;
        }
    ) {
        if (dialogData.template instanceof TemplateRef) {
            this.dynamicTemplate = dialogData.template;
        } else {
            this.templateName = dialogData.template;
        }
    }

    close = (startTour = false): void => this.dialogRef.close(startTour);
}
