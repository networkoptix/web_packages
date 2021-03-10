import { NgModule }                         from '@angular/core';
import { CommonModule }                     from '@angular/common';
import { RouterModule }                     from '@angular/router';
import { FormsModule }                      from '@angular/forms';
import { NgbModule }                        from '@ng-bootstrap/ng-bootstrap';
import { AngularSvgIconModule }             from 'angular-svg-icon';
import { TranslateModule }                  from '@ngx-translate/core';

import { DirectivesModule }                 from '@directives/directives.module';
import { ComponentsModule }                 from '@components/components.module';
import { NxSystemServersComponent }         from './servers.component';
import { NxSystemStandardServerComponent }  from './standard/server-standard.component';
import { NxServerLoggerComponent }          from './logger/logger.component';
import { NxSystemStorageComponent }         from './storage/server-storage-standard.component';
import { NxSystemAdvancedStorageComponent } from './storage-advanced/server-storage-adv.component';
import { NxStorageSizeComponent }           from './storage-advanced/size/size.component';
import { NxCloudStorageModule }             from '../cloud-storage/cloud-storage.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        NxCloudStorageModule
    ],
    providers: [
    ],
    declarations: [
        NxSystemServersComponent,
        NxSystemStandardServerComponent,
        NxServerLoggerComponent,
        NxSystemStorageComponent,
        NxSystemAdvancedStorageComponent,
        NxStorageSizeComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemServersComponent
    ]
})
export class NxSystemServersModule {
}
