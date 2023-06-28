import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { DirectivesModule } from '@directives/directives.module';

import { components } from './components';
import { MediaServerListComponent } from './components/media-server-list/media-server-list.component';
import { IpInfoPipe } from './pipes/ip_info.pipe';
// import { VideoManagementSystemService } from './services/vms.service'

@NgModule({
    declarations: [IpInfoPipe, components],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        NxSearchHighlightComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    exports: [MediaServerListComponent],
    providers: [
        // VideoManagementSystemService,
    ],
})
export class VmsClientVmsModule {}
