import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    Output,
    Signal,
    signal,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { MenuItem, MenuItemsFactoryCallback } from '@components/context-menu/context-menu.types';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { VideoPlayerModule } from '@components/video-player/video-player.module';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { LayoutItem } from '@services/system-api.types';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';

const {
    layouts: {
        overlay: { quickActions: quickActionsLang },
    },
} = staticLang;

enum OverlayActionType {
    CLOSE = 'close',
}

const ROTATION_TO_TEXT = {
    '0': '0°',
    '90': '90°',
    '-180': '180°',
    '-90': '270°',
};

type OverlayActions = {
    [key in keyof OverlayActionType]: (item?: LayoutItem) => void;
};

type MenuIcon = {
    icon: string;
    tooltip: string;
    class$$?: Signal<boolean>;
    toggle?: () => void;
};

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-item-overlay',
    templateUrl: 'layout-grid-item-overlay.component.html',
    styleUrls: ['layout-grid-item-overlay.component.scss'],
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
        WebGLTimelineModule,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
    ],
})
export class NxLayoutGridItemOverlayComponent {
    @Input() item: LayoutItem;
    @Input() node: BaseResourceNode;
    @Input() showRemove: boolean;
    @Input() hide: boolean;
    @Input() fullScreenTarget: HTMLElement;
    @Input() actions: OverlayActions;

    @Output() removeItem = new EventEmitter<LayoutItem>();

    protected readonly staticLang = staticLang;
    protected readonly icons = icons;
    protected readonly JSON = JSON;
    protected readonly ResourceType = ResourceType;

    showInfo$$ = signal(false);
    statusText$$ = signal('');
    isFullscreen$$ = signal(false);

    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullscreen$$.set(this.document.fullscreenElement === this.fullScreenTarget);
    }

    CAMERA_QUICK_ACTIONS: MenuIcon[] = [
        { icon: 'ptz.svg', tooltip: quickActionsLang.ptz },
        { icon: 'fisheye.svg', tooltip: quickActionsLang.fisheye },
        { icon: 'motion.svg', tooltip: quickActionsLang.motion },
        { icon: 'object.svg', tooltip: quickActionsLang.object },
        { icon: 'zoom_window.svg', tooltip: quickActionsLang.zoomWindow },
        {
            icon: 'info.svg',
            tooltip: quickActionsLang.info,
            class$$: this.showInfo$$,
            toggle: () => this.showInfo$$.set(!this.showInfo$$()),
        },
        { icon: 'rotate.svg', tooltip: quickActionsLang.rotate },
        { icon: 'screenshot.svg', tooltip: quickActionsLang.screenshot },
    ];

    ACTIONS = {
        fullscreenOn: () => {
            this.fullScreenTarget.requestFullscreen({
                navigationUI: 'hide',
            });
        },
        fullscreenOff: () => {
            this.document.exitFullscreen();
        },
    };

    menuItemsByType: Partial<
        Record<ResourceType, MenuItem<ResourceNode>[] | MenuItemsFactoryCallback<ResourceNode>>
    > = {
        [ResourceType.CAMERA]: [
            {
                id: 'maximize',
                name: 'Maximize Item',
                action: ($event, node) => this.ACTIONS.fullscreenOn(),
            },
            {
                name: 'divider',
            },
            {
                id: 'rotate',
                name: 'Rotate to',
                subMenu: (node: ResourceNode) => {
                    if (!assertResourceOfType.camera(node)) {
                        return null;
                    }
                    const rotation = this.item.rotation;
                    return Object.entries(ROTATION_TO_TEXT).map(
                        ([rotationString, rotationName]: [string, string]) => ({
                            id: rotationString,
                            name: rotationName,
                            checked: rotation === parseInt(rotationString),
                            action: ($event, node) => alert('not supported yet'),
                        }),
                    );
                },
            },
        ].filter(Boolean),
        [ResourceType.SERVER]: [
            {
                id: 'maximize',
                name: 'Maximize Item',
                action: ($event, node) => this.ACTIONS.fullscreenOn(),
            },
        ].filter(Boolean),
    };

    constructor(@Inject(DOCUMENT) public document: Document, public ref: ElementRef<HTMLElement>) {}

    ngOnChanges(changes: NgChanges<NxLayoutGridItemOverlayComponent>): void {
        if ('node' in changes && changes.node.currentValue !== changes.node.previousValue) {
            if (assertResourceOfType.camera(changes.node.currentValue)) {
                this.statusText$$.set(changes.node.currentValue.details.status);
            }
        }
    }
}
