import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule }           from '@angular/router';
import { NxOldViewPageComponent } from './old-view.component';
import { PipesModule }            from '../../../pipes/pipes.module';
import { ComponentsModule }       from '../../../components/components.module';
import { AngularSvgIconModule }   from 'angular-svg-icon';
import routes                     from './routes';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule.forRoot(),

        RouterModule.forChild(routes),
        PipesModule,
        ComponentsModule
    ],
    providers: [
    ],
    declarations: [
        NxOldViewPageComponent
    ],
    bootstrap : [],
    exports   : [
        NxOldViewPageComponent
    ]
})
export class NxOldViewModule {
}
