import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { PipesModule } from '@pipes/pipes.module';

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
        NxSearchHighlightComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
        NxIntersectionObserver,
    ],
    exports: [MediaServerListComponent],
    providers: [
        // VideoManagementSystemService,
    ],
})
export class VmsClientVmsModule {}
