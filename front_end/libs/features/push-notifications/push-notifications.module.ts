import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { PushComponent } from './push-notifications.component';

const appRoutes: Routes = [
    {
        path: '',
        component: PushComponent,
    },
];

export function initializeApp(CONFIG: NxConfigService) {
    return CONFIG.getConfig().pushConfig;
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [],
    declarations: [PushComponent],
    bootstrap: [],
    exports: [],
})
export class PushNotificationsModule {}
