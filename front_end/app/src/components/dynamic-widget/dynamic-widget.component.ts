import { Component, ComponentFactoryResolver, ViewChild, ViewContainerRef, Input, Output, EventEmitter } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Observable } from 'rxjs';

import { WidgetCard, FirstPartyWidget } from '@components/widgets/helper-classes';

import { WIDGETS } from './register-widget';

/**
 * Dynamically renders widgets and handles tracking registered widgets.
 */
@UntilDestroy()
@Component({
    selector: 'nx-dynamic-widget',
    templateUrl: './dynamic-widget.component.html',
    styleUrls: ['./dynamic-widget.component.scss']
})
export class NxDynamicWidgetComponent {
    @Output() syncChanges = new EventEmitter();
    @Output() openAction = new EventEmitter();
    @Input() card: WidgetCard;
    @Input() updated$: Observable<any>;
    componentInstance: FirstPartyWidget;

    #staticProperties: typeof NxDynamicWidgetComponent;

    /**
     * Wrapper to dynamically get static properties. Might remove if we don't end up extending this component for third party widgets.
     */
    get staticProperties() {
        this.#staticProperties ||= (this.constructor as typeof NxDynamicWidgetComponent);
        return this.#staticProperties;
    }

    /**
     * Shared list of registered widgets. Do add a widget call the registerWidget static method on the widget component which extends FirstPartyWidget.
     *
     * Example NxHealthMonitorWidgetComponent.registerWidget()
     */
    static WIDGETS: typeof FirstPartyWidget[] = WIDGETS;

    /**
     * Returns class for dynamic widget identifier if one exists.
     * @param identifier string
     * @returns FirstPartyWidget Class
     */
    static findWidget = identifier => {
        return NxDynamicWidgetComponent.WIDGETS.find(({ IDENTIFIER }) => IDENTIFIER === identifier);
    };

    static getFirstPartyWidgetConfigs = () => NxDynamicWidgetComponent.WIDGETS.map(FirstPartyWidget.getConfig);

    @ViewChild('widgetTarget', { read: ViewContainerRef }) widgetTarget: ViewContainerRef;

    /**
     * Dynamically resolves and renders widget based on the WidgetCard identifier.
     */
    initializeWidget(): void {
        const component = NxDynamicWidgetComponent.findWidget(this.card.identifier);
        const dynamicComponentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
        this.componentInstance = this.widgetTarget.createComponent(dynamicComponentFactory).instance;
        this.card.editMode = this.card.editMode || !Object.entries(this.card.config).length;
        this.componentInstance.card = this.card;
        if (this.card.identifier !== 'third-party') {
            this.componentInstance.card.sizes = component.SIZES.map(({ name, value }) => ({ name: `${component.NAME} (${name})`, value }));
        }
        this.componentInstance.saveSettings = this.saveSettings;
        this.componentInstance.showAction = this.showAction;
        this.componentInstance.update();
    }

    saveSettings = async (editMode = false): Promise<void> => {
        this.syncChanges.emit();
        this.card.editMode = editMode;
    };

    showAction = action => this.openAction.emit(action);

    ngAfterViewInit(): void {
        this.initializeWidget();
    }

    constructor(
        private componentFactoryResolver: ComponentFactoryResolver
    ) {}
}
