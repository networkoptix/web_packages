// Firebase messaging service worker

// Get environment config
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



