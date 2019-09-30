import { NgModule }        from '@angular/core';
import { CommonModule }    from '@angular/common';
import { BrowserModule }   from '@angular/platform-browser';
import { UpgradeModule }   from '@angular/upgrade/static';
import { NgbModule }       from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule }    from '@angular/router';

import { NxDynamicTableComponent } from './dynamic-table.component';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,

        TranslateModule,
    ],
    providers: [
    ],
    declarations: [
        NxDynamicTableComponent
    ],
    bootstrap: [],
    entryComponents: [
        NxDynamicTableComponent
    ],
    exports: [
        NxDynamicTableComponent
    ]
})
export class DynamicTableModule {
}
