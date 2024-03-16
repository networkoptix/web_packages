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
import { ParsedLayoutItem, PlaceholderState } from '@components/layout-grid/layout-grid.types';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxVideoPlayerComponent } from '@components/video-player/video-player.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-item-placeholder-template-legacy',
    templateUrl: 'layout-grid-item-placeholder-template-legacy.component.html',
    styleUrls: ['layout-grid-item-placeholder-template-legacy.component.scss'],
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
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridItemPlaceholderTemplateLegacyComponent {
    @Input() placeholderIcon: string;
    @Input() placeholderMessage: string;
    @Input() placeholderAdditionalMessage: Translatable;
    @Input() renderConfig: ParsedLayoutItem['renderConfig'];
    @Input() action: (() => void) | undefined;
    @Input() notSupported: boolean;
    @Input() hasAction: boolean;

    readonly PLACEHOLDER_STATE = PlaceholderState;
}
