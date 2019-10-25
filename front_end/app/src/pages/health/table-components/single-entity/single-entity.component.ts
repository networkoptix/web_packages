import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NxConfigService }                                from '../../../../services/nx-config';
import { NxUtilsService }                                 from '../../../../services/utils.service';

@Component({
    selector     : 'nx-single-entity',
    templateUrl  : './single-entity.component.html',
    styleUrls    : ['./single-entity.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSingleEntityComponent {
    @Input() params: any;
    @Input() entity: any;

    CONFIG: any = {};

    constructor(private configService: NxConfigService,
                private utilsService: NxUtilsService) {
        this.CONFIG = this.configService.getConfig();
    }
}
