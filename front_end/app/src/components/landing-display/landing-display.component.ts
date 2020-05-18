import {
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxCloudApiService }        from '../../services/nx-cloud-api';

@Component({
    selector  : 'landing-display-component',
    template  : `
         <div [innerHTML]="myTemplate"></div>`,
    styleUrls : ['landing-display.component.scss']
})

export class NxLandingDisplayComponent implements OnInit {
    CONFIG: IConfig;
    myTemplate: string;

    constructor(
        private apiService: NxCloudApiService
    ) {}

    ngOnInit() {
        this.apiService
            .getStaticLanding()
            .toPromise()
            .then((result) => {
                this.myTemplate = result;
            });
    }
}
