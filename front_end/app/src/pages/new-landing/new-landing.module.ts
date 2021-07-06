import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NxContentLandingBlockComponent } from './landing-content-block/landing-content-block.component';
import { DirectivesModule } from '@directives/directives.module';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '@components/components.module';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DevelopersGuard } from '@guards/developersGuard';
import { AuthGuard } from '@guards/authGuard';
import { NxLandingPageComponent } from './landing-page.component';
import { NxContentContainerComponent } from './content-container/content-container';
import { NxBackgroundGraphicComponent } from './background-graphic/background-graphic.component';
import { NxMaskComponent } from './mask/mask.component';
import { NxLearnMoreComponent } from './learn-more/learn-more.component';
import { NxIntroTextComponent } from './intro-text/intro-text.component';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxLandingPageComponent
        // canActivate : [DevelopersGuard, AuthGuard]
    }
];

@NgModule({
    declarations : [NxContentLandingBlockComponent, NxLandingPageComponent, NxContentContainerComponent, NxBackgroundGraphicComponent, NxMaskComponent, NxLearnMoreComponent, NxIntroTextComponent],
    imports      : [
        CommonModule,
        DirectivesModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule.forRoot()
    ],
    exports: []
})
export class NewLandingModule { }
