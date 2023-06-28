import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { TagModule } from '@components/tag/tag.module';
import { PipesModule } from '@pipes/pipes.module';

import { CloudStorageActivateModalContent } from './activate/cloud-storage-activate.component';
import { CloudStorageDeleteModalContent } from './delete/cloud-storage-delete.component';
import { CloudStorageModifyModalContent } from './modify/cloud-storage-modify.component';
import { CloudStorageMoveModalContent } from './move/cloud-storage-move.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NgxMaskModule.forRoot(),
        TranslateModule,

        TagModule,
        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        PipesModule,
    ],
    declarations: [
        CloudStorageActivateModalContent,
        CloudStorageDeleteModalContent,
        CloudStorageModifyModalContent,
        CloudStorageMoveModalContent,
    ],
    providers: [],
    exports: [],
})
export class CloudStorageModule {}
