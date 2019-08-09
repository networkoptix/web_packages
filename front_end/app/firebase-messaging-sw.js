// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/4.8.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/4.8.1/firebase-messaging.js');

fetch('/api/utils/settings')
    .then(
        function (response) {
          if (response.status === 200) {
            response.json().then(function (data) {
              // Initialize the Firebase app in the service worker by passing in the messagingSenderId.
              firebase.initializeApp({
                'messagingSenderId': data.pushConfig.messagingSenderId
              });

              // Retrieve an instance of Firebase Messaging so that it can handle background messages.
              const messaging = firebase.messaging();
            });
          }
        }
    );



