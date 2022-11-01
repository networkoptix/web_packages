// Firebase messaging service worker
importScripts('/static/scripts/vendor/firebase-app.js');
importScripts('/static/scripts/vendor/firebase-messaging.js');

const queue = [];
let messaging;

const getSettings = new Promise((resolve, reject) => {
    fetch('/api/utils/settings').then(
        function (response) {
            if (response.status === 200) {
                response.json().then(function (data) {
                    // Initialize the Firebase app in the service worker by passing in the messagingSenderId.
                    firebase.initializeApp({
                        'messagingSenderId': data.pushConfig.messagingSenderId,
                        'projectId': data.pushConfig.projectId,
                        'appId': data.pushConfig.appId,
                        'apiKey': data.pushConfig.apiKey
                    });

                    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
                    messaging = firebase.messaging();
                    while (queue.length) {
                        messaging.onPush(queue.shift());
                    }

                    resolve();
                });
            } else {
                reject(response.status);
            }
        }
    );
});

self.addEventListener('push', function (event) {
    if (!messaging) {
        queue.push(event);
        event.waitUntil(getSettings);
    }
});
