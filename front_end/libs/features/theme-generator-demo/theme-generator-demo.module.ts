import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxThemeGeneratorModule } from '@components/theme-generator/theme-colors.module';

import { NxThemeGeneratorDemoComponent } from './theme-generator-demo.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'themeGenerator',
        component: NxThemeGeneratorDemoComponent,
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        NxThemeGeneratorModule
    ],
    providers: [],
    declarations: [
        NxThemeGeneratorDemoComponent
    ],
    bootstrap: [],
    exports: []
})
export class NxThemeGeneratorDemoModule {
}
