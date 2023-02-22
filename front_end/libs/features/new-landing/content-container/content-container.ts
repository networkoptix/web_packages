import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

import { NxLandingService } from '../landing.service';

interface blockData {
    title: string;
    content: string;
    svg: string;
    url?: string;
    externalLink?: boolean;
}

interface dataInput {
    header1: string;
    header2: string;
    firstSectionData: blockData[];
    secondSectionData: blockData[];
    cardData: blockData[];
}

@Component({
    selector: 'nx-content-container',
    templateUrl: './content-container.component.html',
    styleUrls: ['./content-container.component.scss'],
})
export class NxContentContainerComponent implements AfterViewInit {
    @ViewChild('content') contentStartRef: ElementRef;
    @Input() screenWidth: number;
    // Dummy Data
    @Input() data: dataInput = {
        header1: 'Expand Your Setup',
        header2: 'Additional Features',
        firstSectionData: [
            {
                title: 'Connect to your systems from anywhere',
                content: 'Login to your VMS from anywhere, anytime, on any device. /n No need to set up VPN tunnel or do port forwarding. We automatically find the best way to connect to your servers – direct, nat traversal or through our proxies.',
                url: '',
                externalLink: true,
                svg: 'camera'
            },
            {
                title: 'Simple user management',
                content: 'Invite new users to the systems by email.\nUsers will get an invite link and be able to create an account.\n\nEach user can have access to an unliminted number of \nsystems with the same credentials. Users can see the list of all accessible systems on one screen.',
                url: '/docs/developers/knowledgebase',
                svg: 'knowledgebase'
            },
            {
                title: 'Access the system in the browser',
                content: 'Access the main system capabilities in the browser.\nView live and recorded videos, set up storage drives, activate licenses, enable recordings,\n\naccess system settings and view health report using the browser.',
                url: '',
                svg: 'desktop'
            }
        ],
        secondSectionData: [
            {
                title: 'Viewing live and archive video',
                content: 's with the same credentials.\n \n Users can see the list of all accessible systems on one screen.',
                url: '',
                externalLink: true,
                svg: 'camera'
            },
            {
                title: 'Simple user management',
                content: 'Invite new users to the systems by email. \n Users will get an invite link and be able to create an account.\n \n Each user can have access to an unliminted number of \nsystems with the same credentials. Users can see the list of all accessible systems on one screen.',
                url: 'ss',
                svg: 'camera'
            }
        ],
        cardData: [
            {
                title: 'Cameras & recording settings',
                content: 'Basic recording settings without schedule.',
                url: 'ss',
                svg: 'camera'
            },
            {
                title: 'Simple user management',
                content: 'All core system settings, including security.',
                url: 'ss',
                svg: 'camera'
            },
            {
                title: 'API documentation',
                content: 'Different software version and a test tool.',
                url: '',
                svg: 'camera'
            },
            {
                title: 'Universal remote connectivity',
                content: 'You can open and login any system in the desktop client with one click.',
                url: '[oizz',
                svg: 'camera'
            }
            // {
            //     title   : 'Cameras & recording settings',
            //     content : 'Basic recording settings without schedule.',
            //     url     : 'ss',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'Simple user management',
            //     content : 'All core system settings, including security.',
            //     url     : 'ss',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'API documentation',
            //     content : ' with  methods, with support of different software version and a test tool.Full documentation for all API methods, with support of different software version and a test tool.',
            //     url     : '',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'Universal remote connectivity',
            //     content : 'You can open and login any system in the desktop client with one click.',
            //     url     : '[oizz',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'Cameras & recording settings',
            //     content : 'Basic recording settings without schedule.',
            //     url     : 'ss',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'Simple user management',
            //     content : 'All core system settings, including security.',
            //     url     : 'ss',
            //     svg     : 'camera'
            // },
            // {
            //     title   : 'API documentation',
            //     content : ' with support of different software version and a test tool. Full documenntation for all API methodsnt software version and a test tool.',
            //     url     : '',
            //     svg     : 'camera'
            // }
        ]
    };

    constructor(public landingService: NxLandingService) {

    }

    determineBlockType(type: 'small' | 'wide'): 'small' | 'wide' | 'adaptive' {
        if (this.screenWidth > 769) {
            return type;
        }
        return 'adaptive';
    }

    ngAfterViewInit(): void {
        this.landingService.contentStartRef = this.contentStartRef;
    }
}
