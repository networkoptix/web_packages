import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { NewFeature as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import { icons } from '@static-variables';

import { NewFeatureTemplate } from './new-feature.component.types';

@Component({
    selector: 'nx-modal-new-feature-content',
    templateUrl: 'new-feature.component.html',
    styleUrls: ['new-feature.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, TranslateModule, NxAddSvgSrcDirective],
})
export class NewFeatureInformationModalContent extends ModalBase<DT['return']> {
    NewFeatureTemplate = NewFeatureTemplate;
    licenseManager?: LicenseManager;

    templateName: string;
    dynamicTemplate: TemplateRef<unknown>;
    icons = icons;

    LANG = staticLang;
    constructor(
        public dialogsService: NxDialogsService,
        protected dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) dialogData: DT['data'],
    ) {
        super(dialogRef);
        if (dialogData.content instanceof TemplateRef) {
            this.dynamicTemplate = dialogData.content;
        } else {
            this.templateName = dialogData.content;
            if (dialogData.content === NewFeatureTemplate.CloudStorage) {
                this.licenseManager = dialogData.data;
            }
        }
    }

    override close = (startTour: DT['return'] = false): void => this.dialogRef.close(startTour);
}
