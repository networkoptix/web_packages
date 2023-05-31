import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { DirectivesModule } from '@directives/directives.module';

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
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        NxSearchHighlightModule,
        PipesModule,
        PreLoaderModule,
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
