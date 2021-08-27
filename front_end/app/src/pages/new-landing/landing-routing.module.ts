import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ROUTES, Routes } from '@angular/router';
import { NxConfigService } from '@services/nx-config';
import { FeatureFlagStrings }  from '@services/nx-config/base-config';

@NgModule({
    declarations : [],
    imports      : [
        CommonModule,
        RouterModule
    ],
    providers: [
        {
            provide    : ROUTES,
            useFactory : landingRoutes,
            deps       : [NxConfigService],
            multi      : true
        }
    ]
})
export class LandingRoutingModule { }

export function landingRoutes(configService: NxConfigService) {
    let routes: Routes = [];
    if (configService.flagsEnabled(FeatureFlagStrings.landingPage)) {
        routes = [
            {
                path: '', loadChildren: () => import('./new-landing.module').then(m => m.NewLandingModule)
            }
        ];
    } else {
        routes = [
            {
                path: '', loadChildren: () => import('../landing/landing.module').then(m => m.LandingModule)
            }
        ];
    }
    return routes;
}
