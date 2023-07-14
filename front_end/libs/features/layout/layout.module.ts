import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

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
