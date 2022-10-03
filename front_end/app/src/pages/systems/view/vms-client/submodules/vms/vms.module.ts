import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { ComponentsModule } from '../../../../../../components/components.module';

import components from './components';
import MediaServerList from './components/media-server-list/media-server-list.component';
import IpInfoPipe from './pipes/ip_info.pipe';
// import VideoManagementSystemService from './services/vms.service'

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
        MediaServerList
    ],
    providers: [
    // VideoManagementSystemService,
    ]
})
export class VmsClientVmsModule {
}

export default VmsClientVmsModule;
