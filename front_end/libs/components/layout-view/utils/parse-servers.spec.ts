import { ServerStatus } from '@services/system.service/camera-manager/camera-manager-types';

import { generateServers } from './mocks/servers-mocks';
import { parseServers, getServerStatus } from './parse-servers';

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
                        status: getServerStatus(server.status),
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

    describe('getServerStatus', () => {
        it.each`
            status                     | expected
            ${'Online'}                | ${ServerStatus.Online}
            ${'Offline'}               | ${ServerStatus.Offline}
            ${'Unauthorized'}          | ${ServerStatus.Unauthorized}
            ${'Incompatible'}          | ${ServerStatus.Incompatible}
            ${'MismatchedCertificate'} | ${ServerStatus.Incompatible}
            ${''}                      | ${ServerStatus.Incompatible}
        `('should return status: "$expected" for API status: "$status"', ({ status, expected }) => {
            expect(getServerStatus(status)).toBe(expected);
        });
        it('should ignore status case', () => {
            expect(getServerStatus('Online')).toBe(ServerStatus.Online);
            expect(getServerStatus('online')).toBe(ServerStatus.Online);
            expect(getServerStatus('ONLINE')).toBe(ServerStatus.Online);
        });
    });
});
