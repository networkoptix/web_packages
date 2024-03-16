import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class FpsMeterService {
    protected _isInstalled: boolean = false;

    public install(): void {
        if (!this._isInstalled) {
            this._install();
            this._isInstalled = true;
        }
    }

    protected _install(): void {
        // a guard against SSR failure
        if (typeof document === 'object') {
            const script = document.createElement('script');
            script.onload = () => {
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
