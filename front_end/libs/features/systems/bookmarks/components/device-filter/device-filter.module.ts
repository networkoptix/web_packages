import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxSimpleSearchModule } from '@components/simple-search/simple-search.module';

import { NxDeviceFilterComponent } from './device-filter.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        // TranslateModule,
        NxCheckboxComponent,
        NxSimpleSearchModule,
    ],
    declarations: [NxDeviceFilterComponent],
    providers: [],
    exports: [NxDeviceFilterComponent],
})
export class NxDeviceFilterModule {}
