import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// import VideoManagementSystemService from './services/vms.service'

import IpInfoPipe from './pipes/ip_info.pipe';

import { ComponentsModule } from '../../../../../../components/components.module';

import components from './components';

import MediaServerList from './components/media-server-list/media-server-list.component';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

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
