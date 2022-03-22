import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FpsMeterService {
    protected _isInstalled: boolean = false;

    public install() {
        if (!this._isInstalled) {
            this._install();
            this._isInstalled = true;
        }
    }

    protected _install() {
        // a guard against SSR failure
        if (typeof (document) === 'object') {
            const script = document.createElement('script');
            script.onload = () => {
                // @ts-ignore
                const stats = new Stats();
                document.body.appendChild(stats.dom);

                const loop = () => {
                    stats.update();
                    requestAnimationFrame(loop);
                };
                requestAnimationFrame(loop);
            };
            script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
            document.head.appendChild(script);
        }
    }
}
