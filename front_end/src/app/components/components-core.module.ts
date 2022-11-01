import { CdkAccordionModule } from '@angular/cdk/accordion';
import { PortalModule } from '@angular/cdk/portal';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxFileDropModule } from 'ngx-file-drop';
import { HoverPreloadModule } from 'ngx-hover-preload';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxGenericDropdownModule } from './dropdowns/generic/dropdown.module';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        HoverPreloadModule,
        AngularSvgIconModule.forRoot(),
        CdkTableModule,
        CdkStepperModule,
        CdkTreeModule,
        NgxFileDropModule,
        EditorModule,
        TextFieldModule,
        EditorModule,
        PortalModule,
        NgxTranslateCutModule,
        NxGenericDropdownModule,
    ],
    declarations: [
    ],
    providers: [
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'static/tinymce/tinymce.min.js' },
    ],
    exports: [
        CommonModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        CdkStepperModule,
        CdkTableModule,
        CdkTreeModule,
        NgxFileDropModule,
        EditorModule,
        CdkAccordionModule,
        TextFieldModule,
        EditorModule,
        PortalModule,
        NgxTranslateCutModule,
        NxGenericDropdownModule,
        HoverPreloadModule
    ]
})

export class ComponentsCoreModule {}
