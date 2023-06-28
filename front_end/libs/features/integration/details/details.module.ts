import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxCarouselComponent } from '@components/carousel/carousel.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxExternalVideoComponent } from '@components/external-video/external-video.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { TagModule } from '@components/tag/tag.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxIntegrationDetailsComponent } from './details.component';
import { NxOverviewComponent } from './overview/overview.component';
import { NxSetupComponent } from './setup/setup.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'integrations',
        component: NxIntegrationDetailsComponent,
        children: [
            { path: '', component: NxOverviewComponent },
            { path: 'how-to-setup', component: NxSetupComponent },
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        NxCarouselComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        NxExternalVideoComponent,
        NxFooterComponent,
        MenuModule,
        PipesModule,
        NxPreLoaderComponent,
        TagModule,
    ],
    providers: [],
    declarations: [NxIntegrationDetailsComponent, NxSetupComponent, NxOverviewComponent],
    bootstrap: [],
    exports: [NxIntegrationDetailsComponent, NxSetupComponent, NxOverviewComponent],
})
export class IntegrationDetailModule {}
