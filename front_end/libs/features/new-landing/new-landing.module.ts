import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { FooterModule } from '@components/footer/footer.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxBackgroundGraphicComponent } from './background-graphic/background-graphic.component';
import { NxContentContainerComponent } from './content-container/content-container';
import { NxIntroTextComponent } from './intro-text/intro-text.component';
import { NxContentLandingBlockComponent } from './landing-content-block/landing-content-block.component';
import { NxLandingPageComponent } from './landing-page.component';
import { NxLearnMoreComponent } from './learn-more/learn-more.component';
import { NxMaskComponent } from './mask/mask.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxLandingPageComponent,
    },
];

@NgModule({
    declarations: [
        NxContentLandingBlockComponent,
        NxLandingPageComponent,
        NxContentContainerComponent,
        NxBackgroundGraphicComponent,
        NxMaskComponent,
        NxLearnMoreComponent,
        NxIntroTextComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        FooterModule,
    ],
    exports: [],
})
export class NewLandingModule {}
