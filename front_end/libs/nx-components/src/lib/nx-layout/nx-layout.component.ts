/* eslint-disable @angular-eslint/no-host-metadata-property */
import { CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EffectRef,
    HostListener,
    Output,
    TemplateRef,
    ViewContainerRef,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    model,
    signal,
    untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { clamp } from 'lodash-es';

import { BaseComponent } from '../base-component';
import { generateCssVariableName } from '../theme-provider/color-generator';
import { toggleModalEventName, toggleSecondaryMenuEventName } from '../theme-provider/events';

@Component({
    selector: 'nx-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule, PortalModule],
    templateUrl: './nx-layout.component.html',
    styleUrl: './nx-layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'this.class()',
        '[style.--secondary-menu-width]': 'this.secondaryMenuWidth()',
        '[style.--drawer-width]': 'this.drawerWidth()',
        '[style.--notifications-width]': 'this.notificationsWidth()',
        '[style.--notification-offset]': 'this.notificationOffset()',
        '[style.--secondary-menu-overlay-width]': 'this.secondaryMenuOverlayWidth()',
        '[style.--min-column-size]': 'this.minColumnPx() + "px"',
        '[style.--clamped-size]': 'this.clampedWidth()',
        '[style.--hover-menu-size]': 'this.hoverMenuWidth()',
        '[style.--column-span-main]': 'this.columnSpanMain()',
    },
})
export class NxLayoutComponent extends BaseComponent {
    static rootLayout: NxLayoutComponent | undefined;
    static DEFAULT_SIZE = 336;
    static layoutTypes = ['cards', 'clamped', 'full', 'wrapper'] as const;
    static columnSpans = ['-1', '4', '3'] as const;
    static configureLayout = (
        clampSize: (typeof NxLayoutComponent.clampedSizes)[number],
    ): EffectRef | undefined => {
        if (NxLayoutComponent.rootLayout) {
            const rootLayout = NxLayoutComponent.rootLayout;
            return effect(
                cleanup => {
                    rootLayout.clampedSize.set(clampSize);
                    return cleanup(() => {
                        rootLayout.clampedSize.set(1000000);
                    });
                },
                { allowSignalWrites: true },
            );
        }
        return undefined;
    };
    static clampedSizes = [720, 1024, 1440, 1800, 1000000] as const;
    protected minColumnPx = input(360);
    public overlayAsideOverride = input(false);
    protected asideOpen = model(false);
    protected hoverMenuOpen = model(false);
    public secondaryMenuSize = model(NxLayoutComponent.DEFAULT_SIZE);
    public drawerSize = model(NxLayoutComponent.DEFAULT_SIZE);
    public notificationsSize = model(NxLayoutComponent.DEFAULT_SIZE);
    protected hoverMenuSize = model(NxLayoutComponent.DEFAULT_SIZE);
    public drawerOpen = model(false);
    public showProjectedSecondaryMenu = model(true);
    public layoutType = model('cards' as (typeof NxLayoutComponent.layoutTypes)[number]);
    public clampedSize = model(1000000 as (typeof NxLayoutComponent.clampedSizes)[number]);
    public modal = model(false);
    public forceTop = input(false, { transform: booleanAttribute });
    public secondaryMenuModalOpen = model(false);
    public collapsible = model(true);
    public asideResizable = model(true);
    // TODO: Add event type for configuring and resetting the view
    public columnSpanMain = model<(typeof NxLayoutComponent.columnSpans)[number]>('-1');

    readonly isStoryBook = window.IS_STORYBOOK;

    protected width = signal(this.elRef.nativeElement.offsetWidth);

    protected overlayAside = computed(
        () =>
            this.overlayAsideOverride() ||
            this.width() - this.secondaryMenuSize() < this.minColumnPx() * 2.5,
    );

    protected showAsideOnGrid = computed(() => !this.overlayAside() && this.asideOpen());

    protected templateClasses = computed(() => ({
        'top-menu':
            this.forceTop() || this.width() < 96 + this.clampedMenuWidth() + this.drawerSize(),
        [this.layoutType()]: true,
    }));

    asideExpanded = computed(() =>
        this.asideOpen()
            ? !this.drawerOpen() && !this.rightDrawerPortal()
            : this.secondaryMenuModalOpen(),
    );

    protected class = computed(() => {
        return {
            'overlay-aside': this.overlayAside(),
            'aside-open': this.asideExpanded(),
            'drawer-open':
                (this.drawerOpen() || this.rightDrawerPortal()) && !this.secondaryMenuModalOpen(),
            'show-modal-overlay': this.showModalOverlay(),
            'show-secondary-modal-overlay': this.secondaryMenuModalOpen(),
            ...this.templateClasses(),
        };
    });

    protected clampedMenuWidth = computed(() =>
        clamp(this.secondaryMenuSize(), 248, Math.max(648, this.width() / 2)),
    );

    protected secondaryMenuOverlayWidth = computed(() => `${this.clampedMenuWidth()}px`);

    protected drawerWidth = computed(
        () =>
            this.customModalWidth() ||
            `${clamp(this.drawerSize(), 248, Math.max(648, this.width() / 2))}px`,
    );

    @Output() drawerWidthChange = toObservable(this.drawerWidth);

    protected notificationOffset = computed(() => (this.drawerOpen() ? this.drawerWidth() : '0px'));

    protected notificationsWidth = computed(
        () => `${clamp(this.notificationsSize(), 248, Math.max(648, this.width() / 2))}px`,
    );

    protected secondaryMenuWidth = computed(() => {
        if ((this.showAsideOnGrid() || this.secondaryMenuModalOpen()) && !this.drawerOpen()) {
            return this.secondaryMenuOverlayWidth();
        }
        return '0px';
    });

    protected customModalWidth = signal<string | undefined>(undefined);

    protected hoverMenuWidth = computed(() => `${this.hoverMenuSize()}px`);

    protected clampedWidth = computed(() => `${this.clampedSize()}px`);

    protected mockContent = computed(() =>
        Array(this.layoutType() === 'cards' ? 100 : 20)
            .fill(0)
            .map((_, i) => `Content ${this.layoutType()} ${i + 1}`),
    );

    protected mockMessages = signal(['Initial Message']);

    @HostListener('window:resize') protected onResize(): void {
        this.width.set(this.elRef.nativeElement.offsetWidth);
    }

    ngAfterViewInit(): void {
        this.onResize();
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        window.addEventListener(toggleSecondaryMenuEventName, ({ detail }) => {
            const openState = this.secondaryMenuModalOpen();
            if (detail !== openState) {
                this.secondaryMenuModalOpen.update(open => !open);
            }
        });

        window.addEventListener(
            toggleModalEventName,
            ({ detail: { open, width, collapsible } }) => {
                const drawerOpen = this.drawerOpen();
                this.customModalWidth.set(width);
                this.collapsible.set(collapsible);
                if (open !== drawerOpen) {
                    this.drawerOpen.set(!drawerOpen);
                    this.modal.set(!drawerOpen);
                }
            },
        );
    }

    toggleOverlay = (): void => {
        if (this.secondaryMenuModalOpen()) {
            this.toggleSecondaryModal();
        } else {
            this.toggleDrawer();
        }
    };

    override variablesDeclaration = computed(() => ({
        '--overlay-color': generateCssVariableName('core', 'dark1'),
        '--body-bg': generateCssVariableName('core', 'dark1'),
        '--menu-bg': generateCssVariableName('core', 'dark2'),
        '--hover-menu-bg': generateCssVariableName('core', 'dark3', 3),
        '--notification-bg': generateCssVariableName('brand', 'dark10', 10),
        '--menu-border': generateCssVariableName('core', 'dark5'),
    }));

    toggleMenu = (): void => {
        const drawerOpen = this.drawerOpen();
        const menuOpen = this.secondaryMenuModalOpen();
        const width = this.width();

        if (width < 648 && (drawerOpen || menuOpen)) {
            this.drawerOpen.set(false);
            this.secondaryMenuModalOpen.set(false);
            this.mockMessages.update(messages => [
                ...messages,
                `${menuOpen ? 'Menu' : 'Drawer'} is closed`,
            ]);
            return;
        }
        const menuShown = menuOpen && !drawerOpen;

        if (drawerOpen) {
            this.drawerOpen.set(false);
        }

        if (menuShown) {
            this.hoverMenuOpen.set(false);
        }

        this.secondaryMenuModalOpen.set(!menuShown);
        this.mockMessages.update(messages => [
            ...messages,
            `Menu is ${!menuShown ? 'open' : 'closed'}`,
        ]);
    };

    previousSecondarySize = 0;

    toggleSecondaryModal = (modalSize = NxLayoutComponent.DEFAULT_SIZE): void => {
        this.secondaryMenuModalOpen.update(openState => {
            if (openState) {
                this.secondaryMenuSize.set(this.previousSecondarySize);
            } else {
                this.previousSecondarySize = untracked(this.secondaryMenuSize);
                this.secondaryMenuSize.set(modalSize);
            }
            return !openState;
        });
    };

    toggleProjectedSecondaryMenu = (): void => {
        this.asideOpen.update(show => !show);
    };

    showModalOverlay = computed(() => this.modal() && this.drawerOpen() && this.width() > 648);

    toggleDrawer = (modal = false): void => {
        const drawerOpen = this.drawerOpen();
        const asideOpen = this.asideOpen();
        this.modal.set(modal);
        if (drawerOpen && modal && !this.modal()) {
            this.mockMessages.update(messages => [
                ...messages,
                'Drawer was closed and modal was opened',
            ]);
            return;
        }

        this.drawerOpen.set(!drawerOpen);
        const newMessages = [`Drawer is ${this.drawerOpen() ? 'open' : 'closed'}`];

        if (asideOpen) {
            if (!drawerOpen) {
                newMessages.push(
                    'Menu is open but hidden due to drawer, will reopen when drawer is closed',
                );
            } else {
                newMessages.push('Menu was hidden but is now visible again since drawer is closed');
            }
        }
        this.mockMessages.update(messages => [...messages, ...newMessages]);
    };

    toggleHoverMenu = (targetState?: boolean): void => {
        if (targetState !== undefined) {
            this.hoverMenuOpen.set(targetState);
            return;
        }

        this.hoverMenuOpen.update(openState => !openState);
    };

    removeMessage = (index: number): void => {
        this.mockMessages.update(messages => [...messages].filter((_, i) => i !== index));
    };

    autoHideEffect = effect(() => {
        if (!this.isStoryBook) {
            return;
        }
        const removeInterval = setInterval(() => this.removeMessage(0), 5000);
        return () => clearInterval(removeInterval);
    });

    resizeSecondaryMenu = (event: CdkDragMove<unknown>): void => {
        this.secondaryMenuSize.set(event.pointerPosition.x - 96);
    };

    resizeDrawer = (event: CdkDragMove<unknown>): void => {
        this.drawerSize.set(window.innerWidth - event.pointerPosition.x);
    };

    protected secondaryMenuPortal = signal<TemplatePortal<unknown> | null>(null);
    protected rightDrawerPortal = signal<TemplatePortal<unknown> | null>(null);

    protected viewContainerRef = inject(ViewContainerRef);

    protected sizeHistory = {
        left: new Map<unknown, number>(),
        right: new Map<unknown, number>(),
    } as const;

    activatedRoute = inject(ActivatedRoute);

    useSecondaryMenu = (
        template: TemplateRef<unknown>,
        collapsible = true,
        rightPanel = false,
        resizable = true,
        size = NxLayoutComponent.DEFAULT_SIZE,
    ): (() => void) => {
        const portalSignal = rightPanel ? this.rightDrawerPortal : this.secondaryMenuPortal;
        const sizeSignal = rightPanel ? this.drawerSize : this.secondaryMenuSize;
        const sizeHistory = rightPanel ? this.sizeHistory.right : this.sizeHistory.left;
        portalSignal.set(new TemplatePortal(template, this.viewContainerRef));
        const firstComponent = (
            snapshot: ActivatedRouteSnapshot | null = this.activatedRoute.snapshot.firstChild,
        ): ActivatedRouteSnapshot['component'] => {
            if (!snapshot) {
                return null;
            }
            if (snapshot.component) {
                return snapshot.component;
            }
            if (snapshot.firstChild) {
                return firstComponent(snapshot.firstChild);
            }
            return null;
        };

        const componentClass = firstComponent();

        const asideOpen = rightPanel ? untracked(this.asideOpen) : false;
        if (!rightPanel) {
            this.collapsible.set(collapsible);
        }
        this.asideOpen.set(!rightPanel);
        untracked(() => this.asideResizable.set(resizable));
        const previousSize = componentClass ? sizeHistory.get(componentClass) : null;
        sizeSignal.set(previousSize || size);
        const initialSize = untracked(sizeSignal);
        return () => {
            portalSignal.set(null);
            this.asideOpen.set(asideOpen);
            if (componentClass) {
                sizeHistory.set(componentClass, untracked(sizeSignal));
            }
            sizeSignal.set(initialSize);
            this.asideResizable.set(true);
        };
    };

    constructor() {
        super();
        NxLayoutComponent.rootLayout ||= this;
    }
}
