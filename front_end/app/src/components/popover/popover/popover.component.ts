import {
    BasePortalOutlet,
    CdkPortalOutlet,
    ComponentPortal,
    Portal,
    TemplatePortal
} from '@angular/cdk/portal';
import {
    Component,
    ComponentRef,
    EmbeddedViewRef,
    ViewChild
} from '@angular/core';

/**
 * Internal component that wraps user-provided popover content.
 */
@Component({
    selector: 'nx-popover',
    templateUrl: './popover.component.html',
    styleUrls: ['./popover.component.scss']
})
export class NxPopoverComponent extends BasePortalOutlet {
    @ViewChild(CdkPortalOutlet) portalOutlet: CdkPortalOutlet;

    template: Portal<any>;

    attachComponentPortal<T>(componentPortal: ComponentPortal<any>): ComponentRef<T> {
        return this.portalOutlet.attachComponentPortal(componentPortal);
    }

    attachTemplate(portal: TemplatePortal): void {
        this.template = portal;
    }

    attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
        // return this.template.attachTemplatePortal(portal);
        return this.portalOutlet.attachTemplatePortal(portal);
    }
}
