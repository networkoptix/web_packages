import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ExistingSiteDeployment } from './existing-site/existing-site-deployment.component';
import { NewSiteDeploymentComponent } from './new-site/new-site-deployment.component';
import { TestQrCodeDeploymentComponent } from './test-qrcode-deployment.component';

const appRoutes: Routes = [
    {
        path: '',
        component: TestQrCodeDeploymentComponent,
    },
    {
        path: 'new-site',
        component: NewSiteDeploymentComponent,
    },
    {
        path: 'existing-site',
        component: ExistingSiteDeployment,
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), TestQrCodeDeploymentComponent],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class TestQrCodeDeploymentModule {}
