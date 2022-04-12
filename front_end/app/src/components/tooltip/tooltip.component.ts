import {
    BasePortalOutlet,
    CdkPortalOutlet,
    ComponentPortal,
    Portal,
    TemplatePortal,
} from '@angular/cdk/portal';
import {
    Component,
    ComponentRef,
    EmbeddedViewRef,
    ViewChild,
} from '@angular/core';

@Component({
    selector: 'nx-tooltip-component',
    styleUrls: ['./tooltip.component.scss'],
    templateUrl: './tooltip.component.html',
})
export class NxTooltipComponent extends BasePortalOutlet {
    _text = '';

    @ViewChild(CdkPortalOutlet) portalOutlet: CdkPortalOutlet;

    template: Portal<any>;

    attachTemplate(portal: TemplatePortal): void {
        this.template = portal;
    }

    attachText(text: string): void {
        this._text = text;
    }

    attachComponentPortal<T>(componentPortal: ComponentPortal<any>): ComponentRef<T> {
        return this.portalOutlet.attachComponentPortal(componentPortal);
    }

    attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
        return this.portalOutlet.attachTemplatePortal(portal);
    }
}
