import { Component, Input } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-support',
    templateUrl : 'support.component.html',
    styleUrls   : ['support.component.scss']
})
export class NxSupportComponent {
    @Input() supportHeading: string = 'Special Support';
    @Input() supportBody: string = 'Take advantage of our tools. They can help you create code faster and easier. Take advantage of our tools. They can help you create code faster and easier. Take advantage of our tools. They can help you create code faster and easier.';
    @Input() forumText: string = 'Support Page & Dev Forum';
    @Input() forumLink: string = '/developers/';
    @Input() forumLead: string = 'There are over 1000 topics on the forum';
    @Input() backgroundColor: string = 'blue';
    @Input() backgroundImage: string = 'https://www.networkoptix.com/wp-content/uploads/2018/10/World-MAP.png'
};
