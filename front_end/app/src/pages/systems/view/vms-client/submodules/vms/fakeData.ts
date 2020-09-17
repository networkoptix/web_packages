import Camera from './datatypes/Camera'
import MediaServer from './datatypes/MediaServer'


export const fakeMediaServerData: Array<MediaServer> = [
    {
        id: 'fake-media-server',
        name: 'Fake Media Server',
        url: 'http://fake.media-server.local',
        cameras: [
            new Camera(
                'full-featured-test-camera',
                'fake-media-server',
                'Full-featured test camera',
                'http://fake.media-server.local/full-featured-test-camera',
                'Recording',
                true
            ),
            new Camera(
                'live-no-archive-test-camera',
                'fake-media-server',
                'Live Recording test camera with no archive',
                'http://fake.media-server.local/live-no-archive-test-camera',
                'Recording',
                false
            ),
            new Camera(
                'not-live-not-recording-test-camera-with-archive',
                'fake-media-server',
                'Not Live, not recording test camera with archive',
                'http://fake.media-server.local/not-live-not-recording-test-camera-with-archive',
                'Archive',
                true,
            ),
            new Camera(
                'offline-test-camera-with-no-archive',
                'fake-media-server',
                'Offline test camera with no archive',
                'http://fake.media-server.local/offline-test-camera-with-no-archive',
                'Offline',
                false,
            ),
            new Camera(
                'live-not-recording-test-camera-with-no-archive',
                'fake-media-server',
                'Live, not recording test camera with no archive',
                'http://fake.media-server.local/live-not-recording-test-camera-with-no-archive',
                'Live',
                false,
            ),
        ]
    },
    {
        id: 'offline-fake-media-server',
        name: 'Offline Fake Media Server',
        url: 'http://offline-fake.media-server.local',
        cameras: [
        ]
    }
]

export default fakeMediaServerData
