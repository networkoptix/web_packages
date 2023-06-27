import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { TransferOwnershipModalContent } from './transfer-ownership.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        TranslateModule,
        NxSearchableDropdown,
        NxAlertBlockComponent,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [TransferOwnershipModalContent],
    providers: [],
    exports: [],
})
export class TransferOwnershipModule {}
