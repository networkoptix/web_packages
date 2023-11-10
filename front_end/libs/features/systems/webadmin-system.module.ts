import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxSystemAdminModule } from './settings/admin/admin.module';
import { NxCamerasModule } from './settings/cameras/cameras.module';
import { NxSystemLicensesModule } from './settings/licenses/licenses.module';
import { NxSystemServersModule } from './settings/servers/servers.module';
import { NxSettingsModule } from './settings/settings.module';
import { NxSystemUsersModule } from './settings/users/users.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        MenuModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCamerasModule,
        NxSettingsModule,
        NxSystemLicensesModule,
        PipesModule,
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class NxSystemModule {}
