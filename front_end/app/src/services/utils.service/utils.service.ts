import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';

@Injectable({
    providedIn: 'root'
})
export class NxUtilsService {
    constructor(
        private deviceService: DeviceDetectorService,
        @Inject(DOCUMENT) private document: Document,
    ) {
    }

    // TODO: In Angular13 branch when replacing exportCSV I modified file save too - this should go!
    public saveAs(data: BlobPart, filename: string, type: string): boolean | void {
        const a: HTMLAnchorElement = this.document.createElement('a');
        let objectUrl: string;
        let blob: Blob;

        data = JSON.stringify(data);

        if (this.deviceService.isDesktop()) {
            blob = new Blob([data], { type });
            objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
        } else {
            a.href = 'data:' + type + ';charset=UTF-8,' + encodeURIComponent(data);
        }

        a.download = filename;

        this.document.body.appendChild(a);

        // Safari in HM standalone does not work without timeout after appendChild, reason unclear
        setTimeout(() => {
            a.click();
            this.document.body.removeChild(a);
        });

        // revokeObjectURL breaks download on MSEdge and Firefox
        // URL.revokeObjectURL(objectUrl);
    }
}
