import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ip_info',
})
export class IpInfoPipe implements PipeTransform {
    public transform(url: string): string {
        if (url.includes('://')) {
            url = url.split('://')[1];
        }
        if (url.includes(':')) {
            // remove port - split by last occurrence of ":" ... just in case we have IPv6
            url = url.split(/:(?=[^:]+$)/)[0];
        } else {
            url = url.split('/')[0];
        }
        return url;
    }
}
