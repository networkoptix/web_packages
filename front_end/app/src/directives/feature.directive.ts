import {
    Directive,
    Input,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';

import { NxConfigService } from '@services/nx-config';
import { FeatureFlagType } from '@services/nx-config/base-config';

@Directive({
    selector: '[featureFlag]'
})
export class FeatureFlagDirective {
    @Input() featureFlag: boolean | FeatureFlagType | (boolean | FeatureFlagType)[];

    constructor(
        private vcr: ViewContainerRef,
        private tpl: TemplateRef<any>,
        private configService: NxConfigService
    ) {
    }

    ngOnInit() {
        if (this.configService.flagsEnabled(this.featureFlag)) {
            this.vcr.createEmbeddedView(this.tpl);
        }
    }
}
