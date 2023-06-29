import { setupComponent } from '../src/setup';

import { NxOverlayModalComponent } from './overlay-modal.component';

const servers = [
    {
        name: 'serverONEname',
        ip: 'serverONEip'
    },
    {
        name: 'serverTWOname',
        ip: 'serverTWOip'
    },
    {
        name: 'serverTHREEname',
        ip: 'serverTHREEip'
    }
] as typeof NxOverlayModalComponent.prototype.servers;

const setupOverlayComponent = async (): ReturnType<typeof setupComponent<NxOverlayModalComponent>> => {
    NxOverlayModalComponent.prototype.servers = servers;
    const setup = await setupComponent(NxOverlayModalComponent);
    setup.component.servers = servers;
    return setup;
};

describe('NxOverlayModalComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupOverlayComponent();
        expect(component).toBeTruthy();
    });

    it('should load basic component', async () => {
        const { debugElement } = await setupOverlayComponent();
        const title = debugElement.nativeElement.querySelector('h2');
        expect(title.textContent.trim()).toBe('Server offline');
        const message = debugElement.nativeElement.querySelectorAll('span');
        expect(message.length).toBe(2);
        expect(message[1].textContent.trim()).toBe('Refresh');
    });

    xit('should show different servers', async () => {
        const { debugElement } = await setupOverlayComponent();
        const otherServerTitle = debugElement.nativeElement.querySelectorAll('p');
        expect(otherServerTitle.length).toBe(2);
        expect(otherServerTitle[1].textContent.trim())
            .toBe('You can try to connect to other servers in this system:');
        const serverNames = debugElement.nativeElement.querySelectorAll('span.server-name');
        expect(serverNames.length).toBe(servers.length);
        expect(serverNames[0].textContent.trim()).toBe(servers[0].name);
        expect(serverNames[1].textContent.trim()).toBe(servers[1].name);
        expect(serverNames[2].textContent.trim()).toBe(servers[2].name);
        const serverIp = debugElement.nativeElement.querySelectorAll('span.server-ip');
        expect(serverIp.length).toBe(servers.length);
        expect(serverIp[0].textContent.trim()).toBe(servers[0].ip);
        expect(serverIp[1].textContent.trim()).toBe(servers[1].ip);
        expect(serverIp[2].textContent.trim()).toBe(servers[2].ip);
        const serverUrls = debugElement.nativeElement.querySelectorAll('a');
        expect(serverUrls.length).toBe(servers.length);
        // expect(serverUrls[0].href).toBe(servers[0].url);
        // expect(serverUrls[1].href).toBe(servers[1].url);
        // expect(serverUrls[2].href).toBe(servers[2].url);
    });
});
