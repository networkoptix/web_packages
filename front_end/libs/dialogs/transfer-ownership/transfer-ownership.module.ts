import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { SearchableModule } from '@components/dropdowns/searchable/searchable.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { UpdateWebadminSessionModule } from '@components/update-webadmin-session/update-webadmin-session.module';

import { TransferOwnershipModalContent } from './transfer-ownership.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule,
        SearchableModule,
        AlertBlockModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        UpdateWebadminSessionModule,
    ],
    declarations: [
        TransferOwnershipModalContent,
    ],
    providers: [],
    exports: []
})
export class TransferOwnershipModule {}
