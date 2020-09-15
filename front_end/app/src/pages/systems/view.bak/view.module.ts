import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../../components/components.module';
import { ApplyGuard } from '../../../routeGuards';
import { NxSystemViewComponent } from './views/system-view/system-view.component'
import { NxSystemCameraViewComponent } from './views/system-camera-view/system-camera-view.component'
import { CookieService } from 'ngx-cookie-service'

import components from './components'
import routes from './routes'
import IpInfoPipe from './pipes/ip_info.pipe'

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(routes),
    ],
    providers: [
        ApplyGuard,
        CookieService,
    ],
    declarations: [
        NxSystemViewComponent,
        NxSystemCameraViewComponent,
        components,
        IpInfoPipe,
    ],
    bootstrap       : [],
    entryComponents : [
        NxSystemViewComponent,
    ],
    exports: [
        NxSystemViewComponent,
    ]
})
export class NxSystemViewModule {
}
