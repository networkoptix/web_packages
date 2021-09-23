import { NgModule }              from '@angular/core';
import { CommonModule }          from '@angular/common';
import { TranslateModule }       from '@ngx-translate/core';

import { NxGridLayoutComponent } from './layout.component';
import { ComponentsModule }      from '@components/components.module';
import { DirectivesModule }      from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

// const appRoutes: Routes = [
//     { path: 'layout', component: NxGridLayoutComponent },
// ];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule
        // RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxGridLayoutComponent
    ],
    bootstrap : [],
    exports   : [
        NxGridLayoutComponent
    ]
})
export class NxGridLayoutModule {
}
