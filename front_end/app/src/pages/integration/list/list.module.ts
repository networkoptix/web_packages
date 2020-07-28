import { NgModule }        from '@angular/core';
import { CommonModule }    from '@angular/common';
import { BrowserModule }   from '@angular/platform-browser';
import { UpgradeModule }   from '@angular/upgrade/static';
import { RouterModule }    from '@angular/router';
import { NgbModule }       from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule }            from '../../../components/components.module';
import { NxIntegrationsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule
    ],
    providers : [],
    declarations : [
        NxIntegrationsListComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxIntegrationsListComponent
    ],
    exports: [
        NxIntegrationsListComponent
    ]
})
export class IntegrationsListModule {
}
