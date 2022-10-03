import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '../../pipes/pipes.module';

import { CloudOwnerAuthorizationComponent } from './cloud-owner-authorization.component';

const appRoutes: Routes = [
    { path: '**', component: CloudOwnerAuthorizationComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    declarations: [
        CloudOwnerAuthorizationComponent
    ],
    providers: [
        CloudOwnerAuthorizationComponent
    ],
    exports: [
    ]
})
export class CloudOwnerAuthorizationModule {
}
