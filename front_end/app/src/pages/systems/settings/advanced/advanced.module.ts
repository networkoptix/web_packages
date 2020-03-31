import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { UpgradeModule }                     from '@angular/upgrade/static';
import { RouterModule }                      from '@angular/router';
import { FormsModule }                       from '@angular/forms';
import { NgbModule }                         from '@ng-bootstrap/ng-bootstrap';
import { AngularSvgIconModule }              from 'angular-svg-icon';
import { DirectivesModule }                  from '../../../../directives/directives.module';
import { NxSystemServerAdvancedComponent }   from './advanced.component';
import { TranslateModule }                   from '@ngx-translate/core';
import { ComponentsModule }                  from '../../../../components/components.module';
import { NxSystemAdvancedStorageComponent }  from './storage/storage.component';
import { NxSystemAdvancedLoggerComponent }   from './logger/logger.component';

@NgModule({
    imports         : [
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
    providers       : [],
    declarations    : [
        NxSystemServerAdvancedComponent,
        NxSystemAdvancedStorageComponent,
        NxSystemAdvancedLoggerComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxSystemServerAdvancedComponent,
        NxSystemAdvancedLoggerComponent
    ],
    exports         : [
        NxSystemServerAdvancedComponent,
        NxSystemAdvancedLoggerComponent
    ]
})
export class NxSystemServerAdvancedModule {
}
