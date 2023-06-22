import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxGridLayoutComponent } from './layout.component';

// const appRoutes: Routes = [
//     { path: 'layout', component: NxGridLayoutComponent },
// ];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DirectivesModule,
        PipesModule,
        // RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [NxGridLayoutComponent],
    bootstrap: [],
    exports: [NxGridLayoutComponent],
})
export class NxGridLayoutModule {}
