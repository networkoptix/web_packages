import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostBinding, input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxButtonComponent } from '@components/button/button.component';
import { NxContextMenu } from '@components/context-menu/context-menu';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxVideoPlayerComponent } from '@components/video-player/video-player.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-item-placeholder-template',
    templateUrl: 'layout-grid-item-placeholder-template.component.html',
    styleUrls: ['layout-grid-item-placeholder-template.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        DragDropModule,
        NxImageComponent,
        NxLayoutGridTreeComponent,
        NxMonitoringGraphComponent,
        NxPreLoaderComponent,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
        NxVideoPlayerComponent,
        NxAddSvgSrcDirective,
        NxTooltipV2Directive,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
        NxButtonComponent,
    ],
})
export class NxLayoutGridItemPlaceholderTemplateComponent {
    icon = input<string>('');
    message = input.required<Translatable>();
    description = input<Translatable>('');
    hint = input<Translatable>('');
    action = input<(() => void) | undefined>(undefined);
    actionName = input<Translatable>('');
    hasAction = input<boolean>(false);
    isError = input<boolean>(false);

    LANG = staticLang;

    @HostBinding('class') get class(): Record<string, boolean> {
        return {
            error: this.isError(),
        };
    }

    hasActionButton = computed(() => {
        return this.hasAction() && !!this.action() && !!this.actionName();
    });

    hasTooltip = computed(() => {
        return !!this.hint() || this.hasActionButton();
    });
}
