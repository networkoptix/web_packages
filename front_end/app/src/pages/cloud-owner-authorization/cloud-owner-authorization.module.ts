import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CloudOwnerAuthorizationComponent } from './cloud-owner-authorization.component';
import { RouterModule, Routes } from '@angular/router';
import { PipesModule } from '../../pipes/pipes.module';

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
