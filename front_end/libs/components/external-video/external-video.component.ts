import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { nxConfig } from '@app/services/nx-config/config';

@Component({
    selector: 'nx-external-video',
    templateUrl: 'external-video.component.html',
    styleUrls: ['external-video.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxExternalVideoComponent implements OnInit {
    @Input('src') videoSrc: string = '';
    src;

    constructor(private sanitizer: DomSanitizer) {}

    private FormatSrc(link) {
        for (const videoType in nxConfig.integration.embedInfo) {
            const videoRegex = link.match(nxConfig.integration.embedInfo[videoType].regex);
            if (videoRegex?.[1]) {
                return `${nxConfig.integration.embedInfo[videoType].link}${videoRegex[1]}`;
            }
        }
        return undefined;
    }

    ngOnInit(): void {
        this.src = this.sanitizeLink(this.FormatSrc(this.videoSrc));
    }

    sanitizeLink(link) {
        return link ? this.sanitizer.bypassSecurityTrustResourceUrl(link) : '';
    }
}
