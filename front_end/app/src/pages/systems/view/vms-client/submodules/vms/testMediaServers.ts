import TestCamera from './datatypes/TestCamera'
import MediaServer from './datatypes/MediaServer'
import { SimpleTimeRange } from './datatypes/ICamera'

const TEST_THUMBNAIL_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/54/Europa-moon.jpg'
const now = Date.now()
const DURATION = 12 * 31 * 24 * 60 * 60 * 1000
const TEST_ARCHIVE_RANGE = new SimpleTimeRange(now - DURATION, now)
const TEST_ARCHIVE = [ TEST_ARCHIVE_RANGE, ]

function generateGappedArchive (start, end, count) {
    const result = []
    const len = Math.round((end - start) / (count * 2))
    const gap = len
    for (let t = start; t <= end; t += len + gap) {
        result.push(new SimpleTimeRange(t, t + len))
    }
    if (result[result.length - 1].end > now) {
        result[result.length - 1] = new SimpleTimeRange(
            result[result.length - 1].start,
            now,
        )
    }
    return result
}

const TEST_GAPPED_ARCHIVE = generateGappedArchive(TEST_ARCHIVE_RANGE.start, TEST_ARCHIVE_RANGE.end, 20)

export const fakeMediaServerData: Array<MediaServer> = [
    {
        id: 'fake-media-server',
        name: 'No Gaps Media Server',
        url: 'http://fake.media-server.local',
        cameras: [
            new TestCamera(
                'full-featured-test-camera',
                'fake-media-server',
                'Full-featured test camera',
                'http://fake.media-server.local/full-featured-test-camera',
                'Recording',
                TEST_THUMBNAIL_URL,
                TEST_ARCHIVE_RANGE,
                TEST_ARCHIVE,
            ),
            new TestCamera(
                'live-no-archive-test-camera',
                'fake-media-server',
                'Live Recording test camera with no archive',
                'http://fake.media-server.local/live-no-archive-test-camera',
                'Recording',
                TEST_THUMBNAIL_URL,
            ),
            new TestCamera(
                'not-live-not-recording-test-camera-with-archive',
                'fake-media-server',
                'Not Live, not recording test camera with archive',
                'http://fake.media-server.local/not-live-not-recording-test-camera-with-archive',
                'Archive',
                undefined,
                TEST_ARCHIVE_RANGE,
                TEST_ARCHIVE,
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
    },
    {
        id: 'gapped-fake-media-server',
        name: 'Gapped Media Server',
        url: 'http://gapped-fake.media-server.local',
        cameras: [
            new TestCamera(
                'offline-gapped-test-camera',
                'gapped-fake-media-server',
                'Offline gapped test camera',
                'http://gapped.media-server.local/offline-gapped-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                TEST_ARCHIVE_RANGE,
                TEST_GAPPED_ARCHIVE,
            ),
            new TestCamera(
                'offline-twice-gapped-test-camera',
                'twice-gapped-fake-media-server',
                'Offline twice-gapped test camera',
                'http://gapped.media-server.local/offline-twice-gapped-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 20)
            ),
            new TestCamera(
                'offline-thrice-gapped-test-camera',
                'thrice-gapped-fake-media-server',
                'Offline thrice-gapped test camera',
                'http://gapped.media-server.local/offline-thrice-gapped-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 60)
            ),
            new TestCamera(
                'offline-thousand-chunks-test-camera',
                'thousand-chunks-fake-media-server',
                'Offline offline-thousand-chunks test camera',
                'http://gapped.media-server.local/offline-thousand-chunks-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 1e3)
            ),
            new TestCamera(
                'offline-ten-thousands-chunks-test-camera',
                'ten-thousands-chunks-fake-media-server',
                'Offline offline-ten-thousands-chunks test camera',
                'http://gapped.media-server.local/offline-ten-thousands-chunks-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 1e4)
            ),
            new TestCamera(
                'offline-100K-chunks-test-camera',
                '100K-chunks-fake-media-server',
                'Offline offline-100K-chunks test camera',
                'http://gapped.media-server.local/offline-100K-chunks-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 1e5)
            ),
            new TestCamera(
                'offline-200K-chunks-test-camera',
                '200K-chunks-fake-media-server',
                'Offline offline-200K-chunks test camera',
                'http://gapped.media-server.local/offline-200K-chunks-test-camera',
                'Offline',
                TEST_THUMBNAIL_URL,
                new SimpleTimeRange(now - DURATION * 2, now),
                generateGappedArchive(now - DURATION * 2, now, 2e5)
            ),
        ],
    }
]

export default fakeMediaServerData
