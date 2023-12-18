import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CloudOwnerAuthorizationComponent } from './cloud-owner-authorization.component';

const appRoutes: Routes = [{ path: '**', component: CloudOwnerAuthorizationComponent }];

@NgModule({
    imports: [CloudOwnerAuthorizationComponent, RouterModule.forChild(appRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class CloudOwnerAuthorizationModule {}
