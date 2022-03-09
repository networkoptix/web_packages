import { ChangeDetectorRef } from '@angular/core';

import { registerWidget } from '@components/dynamic-widget/register-widget';

export interface WidgetSize {
    name: string,
    value: {
        cols: number,
        rows: number
    }
}
/**
 * These are the static properties required on widgets derived from the FirstPartyWidget
 */
abstract class BaseFirstPartyWidget {
    static IDENTIFIER: string;
    static NAME: string;
    static SIZES: WidgetSize[];
    static SELECTED_SIZE: number;
    static BASE_CONFIG: Record<any, any>;
}

/**
 * This is the interface used from rendering the widgets and also for saving to json or cloud
 */
export interface WidgetCard {
    identifier: typeof BaseFirstPartyWidget.IDENTIFIER,
    title: typeof BaseFirstPartyWidget.NAME,
    sizes: typeof BaseFirstPartyWidget.SIZES,
    size: WidgetSize,
    config: typeof BaseFirstPartyWidget.BASE_CONFIG,
    editMode?: boolean
}

/**
 * Base class from which all first party widgets should be derived.
 *
 * Important: For widget to be available the registerWidget static method must be called.
 *
 * Example NxHealthMonitorWidgetComponent.registerWidget()
 */
export class FirstPartyWidget extends BaseFirstPartyWidget {
    card: WidgetCard;
    saveSettings: (editMode?: boolean) => Promise<void>;
    showAction: (action?) => any;
    #staticProperties: typeof FirstPartyWidget;

    get staticProperties() {
        this.#staticProperties ||= (this.constructor as typeof FirstPartyWidget);
        return this.#staticProperties;
    }

    isSelected(identifier) {
        return identifier === this.staticProperties.IDENTIFIER;
    }

    /**
     * Handles triggering change detection when widget is initialized. Any code normally run on the ngOnInit lifecycle should use update instead.
     */
    update() {
        this.cd.detectChanges();
    }

    /**
     * This must be called on component classes derived from FirstPartyWidget to make the widget available within dashboards
     *
     * Example NxHealthMonitorWidgetComponent.registerWidget()
     */
    static registerWidget = registerWidget;

    /**
     * Serializes the widget for use in either rendering or for saving to json or cloud
     *
     * @param widget FirstPartyWidget
     * @returns WidgetCard
     */
    static getConfig(widget: typeof FirstPartyWidget) {
        const sizes = widget.SIZES.map(({ name, value }) => ({ name: `${widget.NAME} (${name})`, value }));
        const selected = widget.SELECTED_SIZE || 0;
        const last = sizes.length - 1;
        const selectedIndex = Math.min(Math.max(0, selected), last);
        return {
            identifier: widget.IDENTIFIER,
            title: widget.NAME,
            sizes: sizes,
            size: sizes[selectedIndex],
            config: widget.BASE_CONFIG || {}
        } as WidgetCard;
    }

    constructor(public cd: ChangeDetectorRef) {
        super();
    }
}
