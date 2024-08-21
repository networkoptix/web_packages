/* eslint-disable @angular-eslint/no-host-metadata-property */
import { CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EffectRef,
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
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationStart, Router } from '@angular/router';
import { clamp } from 'lodash-es';
import {
    fromEvent,
    map,
    merge,
    of,
    timer,
    switchMap,
    startWith,
    combineLatest,
    distinctUntilChanged,
    filter,
    shareReplay,
    tap,
    Subject,
} from 'rxjs';

import { BaseComponent } from '../base-component';
import { NxClickElsewhereDirective } from '../directives/nx-click-elsewhere.directive';
import { generateCssVariableName } from '../theme-provider/color-generator';
import { toggleModalEventName, toggleSecondaryMenuEventName } from '../theme-provider/events';

interface LayoutConfig {
    /**
     * The maximum width of main content section.
     */
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    clampSize?: (typeof NxLayoutComponent.clampedSizes)[number];
    /**
     * Whether the content should be centered when clamped.
     */
    center?: boolean;
    /**
     * The view identifier for the layout. Used for preserving panel sizes.
     *
     * View identifier string could be used to maintain the size for a specific panel type,
     * specific feature, or specific view.
     *
     * If not provided the view identifier will be determined by the first component in the route.
     */
    viewIdentifier?: string;
}

@Component({
    selector: 'nx-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule, PortalModule, NxClickElsewhereDirective],
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
    static configureLayout = ({
        clampSize = 1000000,
        center = false,
        viewIdentifier = '',
    }: LayoutConfig): EffectRef | undefined => {
        if (NxLayoutComponent.rootLayout) {
            const rootLayout = NxLayoutComponent.rootLayout;
            return effect(
                cleanup => {
                    rootLayout.clampedSize.set(clampSize);
                    rootLayout.centered.set(center);
                    rootLayout.viewIdentifier.set(viewIdentifier);
                    return cleanup(() => {
                        rootLayout.clampedSize.set(1000000);
                        rootLayout.centered.set(false);
                        rootLayout.viewIdentifier.set('');
                    });
                },
                { allowSignalWrites: true },
            );
        }
        return undefined;
    };
    static clampedSizes = [720, 1_024, 1_200, 1_440, 1_800, 1_000_000] as const;
    protected minColumnPx = input(216);
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
    public centered = model(false);
    public modal = model(false);
    public forceTop = input(false, { transform: booleanAttribute });
    public secondaryMenuModalOpen = model(false);
    public collapsible = model(true);
    public asideResizable = model(true);
    // TODO: Add event type for configuring and resetting the view
    public columnSpanMain = model<(typeof NxLayoutComponent.columnSpans)[number]>('-1');
    public resizing = model(false);
    public viewIdentifier = model('');
    public closeOnContentClick = model(true);

    readonly isStoryBook = window.IS_STORYBOOK;

    protected width = signal(this.elRef.nativeElement.offsetWidth);

    protected overlayAside = computed(
        () =>
            this.overlayAsideOverride() ||
            this.width() - this.clampedSecondaryMenuWidth()() < this.minColumnPx() * 2.5,
    );

    protected showAsideOnGrid = computed(() => !this.overlayAside() && this.asideOpen());

    protected showTopMenu = computed(() => {
        const width = this.width();
        const minPadding = 96;
        const leftPanelSize = this.asideExpanded() ? this.clampedSecondaryMenuWidth()() : 0;
        const rightPanelSize =
            !this.secondaryMenuModalOpen() && (this.drawerOpen() || this.rightDrawerPortal())
                ? this.clampedRightPanelSize()()
                : 0;

        return (
            width < 648 ||
            width + minPadding <
                leftPanelSize + rightPanelSize + Math.max(this.spaceForContent(), 432)
        );
    });

    private router = inject(Router);

    skipNextNotifier = new Subject<void>();

    skipNext = toSignal(
        this.skipNextNotifier.pipe(
            switchMap(() =>
                timer(100).pipe(
                    map(() => false),
                    startWith(true),
                ),
            ),
        ),
    );

    public navigateNotifier$ = combineLatest([
        toObservable(this.showTopMenu),
        toObservable(this.forceTop),
        toObservable(this.asideOpen),
    ]).pipe(
        map(([showTopMenu, forceTop, asideOpen]) => asideOpen && (showTopMenu || forceTop)),
        distinctUntilChanged(),
        filter(showTopMenu => showTopMenu),
        switchMap(() => this.router.events),
        filter((event): event is NavigationStart => {
            if (event instanceof NavigationStart) {
                const current = new URL(this.router.url, window.location.origin).pathname;
                const next = new URL(event.url, window.location.origin).pathname;
                return current !== next;
            }
            return false;
        }),
        tap(() => {
            if (this.skipNext()) {
                return;
            }
            this.asideOpen.set(false);
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    protected templateClasses = computed(() => ({
        centered: this.centered(),
        'top-menu': this.forceTop() || this.showTopMenu(),
        [this.layoutType()]: true,
    }));

    private canFitBothPanels = computed(() => {
        const totalWidth = this.width();
        const leftPanelWidth = this.clampedSecondaryMenuWidth()();
        const rightPanelWidth = this.clampedRightPanelSize()();
        return totalWidth - leftPanelWidth - rightPanelWidth > this.spaceForContent();
    });

    asideExpanded = computed(() =>
        this.asideOpen()
            ? this.canFitBothPanels() || (!this.drawerOpen() && !this.rightDrawerPortal())
            : this.secondaryMenuModalOpen(),
    );

    protected class = computed(() => {
        return {
            'overlay-aside': this.overlayAside(),
            'aside-open': this.asideExpanded() || this.secondaryMenuModalOpen(),
            'drawer-open':
                (this.drawerOpen() || this.rightDrawerPortal()) && !this.secondaryMenuModalOpen(),
            'show-modal-overlay': this.showModalOverlay(),
            'show-secondary-modal-overlay': this.secondaryMenuModalOpen(),
            'resizing-panel': this.resizing(),
            'can-fit-both-panels': this.canFitBothPanels(),
            ...this.templateClasses(),
        };
    });

    private availableWidth = computed(() => {
        const gap = 48;
        const menuWidth = 72;
        return this.width() - menuWidth - gap;
    });

    private spaceForContent = computed(() => {
        const gap = 48;
        const columnSize = this.minColumnPx() + gap;
        const availableColumns = this.availableWidth() / columnSize;
        const minContentColumns = clamp(availableColumns - 2, 1, 6);
        return Math.min(minContentColumns * columnSize, this.clampedSize());
    });

    protected maxPanelWidth = computed(() => {
        const availableForPanels = this.availableWidth() - this.spaceForContent();

        return availableForPanels / 2;
    });

    protected clampedSecondaryMenuWidth = computed(
        () =>
            (singleOpen = false) =>
                clamp(this.secondaryMenuSize(), 248, this.maxPanelWidth() * (singleOpen ? 1 : 2)),
    );

    protected secondaryMenuOverlayWidth = computed(
        () =>
            `${(() => {
                if (this.overlayAside()) {
                    return clamp(this.secondaryMenuSize(), 248, this.width() - 144);
                }

                return this.clampedSecondaryMenuWidth()(
                    !(!this.drawerOpen() || !this.canFitBothPanels()),
                );
            })()}px`,
    );

    private clampedRightPanelSize = computed(
        () =>
            (singleOpen = false) =>
                clamp(this.drawerSize(), 248, this.maxPanelWidth() * (singleOpen ? 1 : 2)),
    );

    protected drawerWidth = computed(
        () =>
            this.customModalWidth() ||
            `${this.clampedRightPanelSize()(!(!this.asideExpanded() || !this.canFitBothPanels()))}px`,
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

    ngAfterViewInit(): void {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        window.addEventListener(toggleSecondaryMenuEventName, ({ detail }) => {
            const openState = this.secondaryMenuModalOpen();
            if (detail !== openState) {
                this.secondaryMenuSize.set(this.previousSecondarySize);
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
        if (this.secondaryMenuModalOpen()) {
            return this.toggleSecondaryModal();
        }
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
        this.resizing.set(true);
        const size = event.pointerPosition.x - 96;
        const drawerOpen = this.drawerOpen() || this.rightDrawerPortal();
        const rightDrawerSize = this.clampedRightPanelSize()(!drawerOpen);
        const maxPanelWidth = this.maxPanelWidth();
        const unusedRightSpace = drawerOpen ? maxPanelWidth - rightDrawerSize : maxPanelWidth;
        const maxAvailableWidth = drawerOpen ? maxPanelWidth + unusedRightSpace : Infinity;
        this.secondaryMenuSize.set(Math.min(size, maxAvailableWidth));

        const viewIdentifies = this.getViewIdentifier();

        if (viewIdentifies) {
            this.sizeHistory.left.set(viewIdentifies, this.secondaryMenuSize());
        }
    };

    resizeDrawer = (event: CdkDragMove<unknown>): void => {
        this.resizing.set(true);
        const size = window.innerWidth - event.pointerPosition.x;
        const leftPanelOpen = this.asideExpanded();
        const secondaryMenuSize = this.clampedSecondaryMenuWidth()(!leftPanelOpen);
        const maxPanelWidth = this.maxPanelWidth();
        const unusedLeftSpace = leftPanelOpen ? maxPanelWidth - secondaryMenuSize : maxPanelWidth;
        const maxAvailableWidth = leftPanelOpen ? maxPanelWidth + unusedLeftSpace : Infinity;
        this.drawerSize.set(Math.min(size, maxAvailableWidth));

        const viewIdentifier = this.getViewIdentifier();
        if (viewIdentifier) {
            this.sizeHistory.right.set(viewIdentifier, this.drawerSize());
        }
    };

    protected secondaryMenuPortal = signal<TemplatePortal<unknown> | null>(null);
    protected rightDrawerPortal = signal<TemplatePortal<unknown> | null>(null);

    protected viewContainerRef = inject(ViewContainerRef);

    protected sizeHistory = {
        left: new Map<unknown, number>(),
        right: new Map<unknown, number>(),
    } as const;

    activatedRoute = inject(ActivatedRoute);

    firstComponent = (
        snapshot: ActivatedRouteSnapshot | null = this.activatedRoute.snapshot.firstChild,
    ): ActivatedRouteSnapshot['component'] => {
        if (!snapshot) {
            return null;
        }
        if (snapshot.component) {
            return snapshot.component;
        }
        if (snapshot.firstChild) {
            return this.firstComponent(snapshot.firstChild);
        }
        return null;
    };

    protected getViewIdentifier = (): string => {
        const viewIdentifier = this.viewIdentifier();

        if (viewIdentifier) {
            return viewIdentifier;
        }

        const firstComponent = this.firstComponent();

        if (firstComponent) {
            return firstComponent.name;
        }

        return '';
    };

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
        const topMenu = this.forceTop() || this.showTopMenu();

        const viewIdentifier = this.getViewIdentifier();

        const asideOpen = rightPanel ? untracked(this.asideOpen) : false;
        if (!rightPanel) {
            this.collapsible.set(collapsible);
        }
        this.asideOpen.update(open => !topMenu && (open || !rightPanel));
        untracked(() => this.asideResizable.set(resizable));
        const previousSize = viewIdentifier ? sizeHistory.get(viewIdentifier) : null;
        sizeSignal.set(previousSize || size);
        const initialSize = untracked(sizeSignal);
        return () => {
            portalSignal.set(null);
            this.asideOpen.set(asideOpen);
            sizeSignal.set(initialSize);
            this.asideResizable.set(true);
        };
    };

    constructor() {
        super();
        NxLayoutComponent.rootLayout ||= this;
        fromEvent(window, 'resize')
            .pipe(
                switchMap(() => merge(of(true), timer(100).pipe(map(() => false)))),
                startWith(true),
            )
            .subscribe(resizing => {
                this.resizing.set(resizing);
                this.width.set(window.document.body.offsetWidth);
            });
    }
}
