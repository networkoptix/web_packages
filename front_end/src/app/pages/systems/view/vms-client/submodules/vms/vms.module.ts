import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { ComponentsModule } from '../../../../../../components/components.module';

import { components } from './components';
import { MediaServerListComponent } from './components/media-server-list/media-server-list.component';
import { IpInfoPipe } from './pipes/ip_info.pipe';
// import { VideoManagementSystemService } from './services/vms.service'

@NgModule({
    declarations: [
        IpInfoPipe,
        components
    ],
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        PipesModule
    ],
    exports: [
        MediaServerListComponent
    ],
    providers: [
        // VideoManagementSystemService,
    ]
})
export class VmsClientVmsModule {
}
