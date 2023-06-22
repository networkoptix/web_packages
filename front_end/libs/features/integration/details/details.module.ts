import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { CarouselModule } from '@components/carousel/carousel.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { ExternalVideoModule } from '@components/external-video/external-video.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
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
        CarouselModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        ExternalVideoModule,
        FooterModule,
        MenuModule,
        PipesModule,
        PreLoaderModule,
        TagModule,
    ],
    providers: [],
    declarations: [NxIntegrationDetailsComponent, NxSetupComponent, NxOverviewComponent],
    bootstrap: [],
    exports: [NxIntegrationDetailsComponent, NxSetupComponent, NxOverviewComponent],
})
export class IntegrationDetailModule {}
