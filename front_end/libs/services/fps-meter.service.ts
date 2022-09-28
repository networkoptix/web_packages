import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FpsMeterService {
    protected _isInstalled: boolean = false;

    constructor(@Inject(DOCUMENT) private document: Document) {}

    public install(): void {
        if (!this._isInstalled) {
            this._install();
            this._isInstalled = true;
        }
    }

    protected _install(): void {
        // a guard against SSR failure
        if (typeof (this.document) === 'object') {
            const script = this.document.createElement('script');
            script.onload = () => {
                // @ts-expect-error
                const stats = new Stats();
                this.document.body.appendChild(stats.dom);

                const loop = () => {
                    stats.update();
                    requestAnimationFrame(loop);
                };
                requestAnimationFrame(loop);
            };
            script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
            this.document.head.appendChild(script);
        }
    }
}
