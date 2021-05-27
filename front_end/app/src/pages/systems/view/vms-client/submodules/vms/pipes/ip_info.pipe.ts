import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ip_info'
})
export default class IpInfoPipe implements PipeTransform {
    public transform (url) {
        if (url.indexOf('://') !== -1) {
            url = url.split('://')[1];
        }
        if (url.indexOf(':') !== -1) {
            url = url.split(':')[0];
        } else {
            url = url.split('/')[0];
        }
        return url;
    }
}
