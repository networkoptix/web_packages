import {
    BasePortalOutlet,
    CdkPortalOutlet,
    ComponentPortal,
    Portal,
    PortalModule,
    TemplatePortal,
} from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, ComponentRef, EmbeddedViewRef, ViewChild } from '@angular/core';

@Component({
    selector: 'nx-tooltip-component',
    styleUrls: ['./tooltip.component.scss'],
    templateUrl: './tooltip.component.html',
    standalone: true,
    imports: [CommonModule, PortalModule],
})
export class NxTooltipComponent extends BasePortalOutlet {
    _text = '';
    tooltipClasses = {
        alternate: false,
        alternateSecondary: false,
        forceDark: false,
        forceLight: false,
    };

    @ViewChild(CdkPortalOutlet) portalOutlet: CdkPortalOutlet;

    template: Portal<unknown>;

    attachTemplate(
        portal: TemplatePortal,
        alternateStyle = false,
        alternateSecondary = false,
        forceDark = false,
        forceLight = false,
    ): void {
        this.template = portal;
        this.tooltipClasses.alternate = alternateStyle;
        this.tooltipClasses.alternateSecondary = alternateSecondary;
        this.tooltipClasses.forceDark = forceDark;
        this.tooltipClasses.forceLight = forceLight;
    }

    attachText(
        text: string,
        alternateStyle = false,
        alternateSecondary = false,
        forceDark = false,
        forceLight = false,
    ): void {
        this._text = text;
        this.tooltipClasses.alternate = alternateStyle;
        this.tooltipClasses.alternateSecondary = alternateSecondary;
        this.tooltipClasses.forceDark = forceDark;
        this.tooltipClasses.forceLight = forceLight;
    }

    attachComponentPortal<T>(componentPortal: ComponentPortal<T>): ComponentRef<T> {
        return this.portalOutlet.attachComponentPortal(componentPortal);
    }

    attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
        return this.portalOutlet.attachTemplatePortal(portal);
    }
}
