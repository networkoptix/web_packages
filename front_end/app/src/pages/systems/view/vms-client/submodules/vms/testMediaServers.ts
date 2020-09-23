import TestCamera from './datatypes/TestCamera'
import MediaServer from './datatypes/MediaServer'

const TEST_THUMBNAIL_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/54/Europa-moon.jpg'
const now = Date.now()
const DURATION = 12 * 31 * 24 * 60 * 60 * 1000
const TEST_ARCHIVE_RANGE = {
    start: now - DURATION,
    end: now,
}

export const fakeMediaServerData: Array<MediaServer> = [
    {
        id: 'fake-media-server',
        name: 'Fake Media Server',
        url: 'http://fake.media-server.local',
        cameras: [
            new TestCamera(
                'full-featured-test-camera',
                'fake-media-server',
                'Full-featured test camera',
                'http://fake.media-server.local/full-featured-test-camera',
                'Recording',
                TEST_ARCHIVE_RANGE,
                TEST_THUMBNAIL_URL,
            ),
            new TestCamera(
                'live-no-archive-test-camera',
                'fake-media-server',
                'Live Recording test camera with no archive',
                'http://fake.media-server.local/live-no-archive-test-camera',
                'Recording',
                undefined,
                TEST_THUMBNAIL_URL,
            ),
            new TestCamera(
                'not-live-not-recording-test-camera-with-archive',
                'fake-media-server',
                'Not Live, not recording test camera with archive',
                'http://fake.media-server.local/not-live-not-recording-test-camera-with-archive',
                'Archive',
                TEST_ARCHIVE_RANGE,
            ),
            new TestCamera(
                'offline-test-camera-with-no-archive',
                'fake-media-server',
                'Offline test camera with no archive',
                'http://fake.media-server.local/offline-test-camera-with-no-archive',
                'Offline',
            ),
            new TestCamera(
                'live-not-recording-test-camera-with-no-archive',
                'fake-media-server',
                'Live, not recording test camera with no archive',
                'http://fake.media-server.local/live-not-recording-test-camera-with-no-archive',
                'Live',
                undefined,
                TEST_THUMBNAIL_URL,
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
