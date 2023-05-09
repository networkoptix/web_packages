import {
    BasePortalOutlet,
    CdkPortalOutlet,
    ComponentPortal,
    Portal,
    TemplatePortal,
} from '@angular/cdk/portal';
import { Component, ComponentRef, EmbeddedViewRef, ViewChild } from '@angular/core';

@Component({
    selector: 'nx-tooltip-component',
    styleUrls: ['./tooltip.component.scss'],
    templateUrl: './tooltip.component.html',
})
export class NxTooltipComponent extends BasePortalOutlet {
    _text = '';
    tooltipClasses = { alternate: false, alternateSecondary: false };

    @ViewChild(CdkPortalOutlet) portalOutlet: CdkPortalOutlet;

    template: Portal<unknown>;

    attachTemplate(
        portal: TemplatePortal,
        alternateStyle = false,
        alternateSecondary = false,
    ): void {
        this.template = portal;
        this.tooltipClasses.alternate = alternateStyle;
        this.tooltipClasses.alternateSecondary = alternateSecondary;
    }

    attachText(text: string, alternateStyle = false, alternateSecondary = false): void {
        this._text = text;
        this.tooltipClasses.alternate = alternateStyle;
        this.tooltipClasses.alternateSecondary = alternateSecondary;
    }

    attachComponentPortal<T>(componentPortal: ComponentPortal<T>): ComponentRef<T> {
        return this.portalOutlet.attachComponentPortal(componentPortal);
    }

    attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
        return this.portalOutlet.attachTemplatePortal(portal);
    }
}
