import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { VideoPlayerModule } from '@components/video-player/video-player.module';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
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
        VideoPlayerModule,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridItemPlaceholderTemplateComponent {
    @Input() placeholderIcon: string;
    @Input() placeholderMessage: string;
    @Input() placeholderAdditionalMessage: Translatable;
}
