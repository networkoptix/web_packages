import { generateServers } from './mocks/servers-mocks';
import { parseServers } from './parse-servers';

describe('parseServers', () => {
    it('should parse servers correctly', () => {
        const servers = [...generateServers(5)];

        const aspectRatio = 16 / 9;

        const expected = servers.reduce(
            (servers, server) => ({
                ...servers,
                [server.id]: {
                    id: server.id,
                    type: 'server',
                    name: server.name,
                    details: {
                        ...server,
                        status: server.status.toLowerCase(),
                        online: server.status === 'Online',
                        resourceType: 'Server',
                    },
                    aspectRatio,
                },
            }),
            {},
        );

        const result = parseServers(servers, aspectRatio);

        expect(result).toEqual(expected);
    });
});
