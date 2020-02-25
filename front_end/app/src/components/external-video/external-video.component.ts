import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NxConfigService } from '../../services/nx-config';

@Component({
    selector: 'nx-external-video',
    templateUrl: 'external-video.component.html',
    styleUrls: [ 'external-video.component.scss' ]
})
export class NxExternalVideoComponent implements OnInit {
    @Input('src') videoSrc: string;
    CONFIG: any;
    src: any;

    constructor(private sanitizer: DomSanitizer,
                config: NxConfigService) {
        this.CONFIG = config.getConfig();
    }

    private FormatSrc(link) {
        for (const videoType in this.CONFIG.integration.embedInfo) {
            const videoRegex = link.match(this.CONFIG.integration.embedInfo[videoType].regex);
            if (videoRegex && videoRegex[1]) {
                return `${this.CONFIG.integration.embedInfo[videoType].link}${videoRegex[1]}`;
            }
        }
        return undefined;
    }

    ngOnInit() {
        this.src = this.sanitizeLink(this.FormatSrc(this.videoSrc));
    }

    sanitizeLink(link) {
        return link ? this.sanitizer.bypassSecurityTrustResourceUrl(link) : '';
    }
}
