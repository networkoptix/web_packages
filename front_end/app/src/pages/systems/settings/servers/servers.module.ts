import { NgModule }                         from '@angular/core';
import { CommonModule }                     from '@angular/common';
import { BrowserModule }                    from '@angular/platform-browser';
import { UpgradeModule }                    from '@angular/upgrade/static';
import { RouterModule }                     from '@angular/router';
import { FormsModule }                      from '@angular/forms';
import { NgbModule }                        from '@ng-bootstrap/ng-bootstrap';
import { AngularSvgIconModule }             from 'angular-svg-icon';
import { TranslateModule }                  from '@ngx-translate/core';

import { DirectivesModule }                 from '../../../../directives/directives.module';
import { ComponentsModule }                 from '../../../../components/components.module';
import { NxSystemServersComponent }         from './servers.component';
import { NxSystemStandardServerComponent }  from './standard/server.component';
import { NxServerLoggerComponent }          from './logger/logger.component';
import { NxSystemAdvancedStorageComponent } from './storage/storage.component';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot()
    ],
    providers: [
    ],
    declarations: [
        NxSystemServersComponent,
        NxSystemStandardServerComponent,
        NxServerLoggerComponent,
        NxSystemAdvancedStorageComponent
    ],
    bootstrap: [
    ],
    entryComponents: [
        NxSystemServersComponent
    ],
    exports: [
        NxSystemServersComponent
    ]
})
export class NxSystemServersModule {
}
