import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { EditableModule } from '@components/editable/editable.module';
import { NxMultiLineEllipsisComponent } from '@components/multi-line-ellipsis/mle.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxForceVisibilityDirective } from '@directives/nx-force-visibility.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxAlexaComponent } from '@pages/systems/settings/admin/alexa/alexa.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxSystemAdminComponent } from './admin.component';
import { NxSystemAdvancedAdminComponent } from './advanced/advanced.component';
import { NxSystemDetailedSettingComponent } from './detailedSetting/detailedSetting.component';
import { NxSystemStandardAdminComponent } from './standard/standard.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAlertBlockComponent,
        NxCheckboxComponent,
        NxClientButtonComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        EditableModule,
        NxNumericComponent,
        NxGenericDropdownModule,
        PipesModule,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxSectionPlaceholderComponent,
        NxTagComponent,
        NxForceVisibilityDirective,
        NxTooltipDirective,
        TranslateModule,
        NxMultiLineEllipsisComponent,
        NxAlexaComponent,
    ],
    providers: [],
    declarations: [
        NxSystemAdminComponent,
        NxSystemStandardAdminComponent,
        NxSystemAdvancedAdminComponent,
        NxSystemDetailedSettingComponent,
    ],
    bootstrap: [],
    exports: [NxSystemAdminComponent],
})
export class NxSystemAdminModule {}
