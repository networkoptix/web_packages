import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { PipesModule } from '@pipes/pipes.module';

@NgModule({
    imports: [NxTagComponent, NxProcessButtonComponent, NxProcessCancelButtonComponent],
    declarations: [],
    providers: [],
    exports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NgxMaskModule,
        TranslateModule,

        NxTagComponent,
        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        PipesModule,
    ],
})
export class CloudStorageModule {}
