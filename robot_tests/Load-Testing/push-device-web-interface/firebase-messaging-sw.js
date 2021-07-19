// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If you do not serve/host your project using Firebase Hosting see https://firebase.google.com/docs/web/setup
importScripts('scripts/firebase-app.js');
importScripts('scripts/firebase-messaging.js');
// importScripts('/__/firebase/init.js');

var firebaseConfig = {
  apiKey: "AIzaSyA8bA6jCS4GnzmfGEg_I6mQyG5JIBKFrLI",
  authDomain: "nx-push-test.firebaseapp.com",
  databaseURL: "https://nx-push-test.firebaseio.com",
  projectId: "nx-push-test",
  storageBucket: "nx-push-test.appspot.com",
  messagingSenderId: "627461092708",
  appId: "1:627461092708:web:fe110dc40085e524bbf671"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Here is is the code snippet to initialize Firebase Messaging in the Service
 * Worker when your app is not hosted on Firebase Hosting.

 // [START initialize_firebase_in_sw]
 // Give the service worker access to Firebase Messaging.
 // Note that you can only use Firebase Messaging here, other Firebase libraries
 // are not available in the service worker.
 importScripts('https://www.gstatic.com/firebasejs/7.9.1/firebase-app.js');
 importScripts('https://www.gstatic.com/firebasejs/7.9.1/firebase-messaging.js');

 // Initialize the Firebase app in the service worker by passing in the
 // messagingSenderId.
 firebase.initializeApp({
   'messagingSenderId': 'YOUR-SENDER-ID'
 });

 // Retrieve an instance of Firebase Messaging so that it can handle background
 // messages.
 const messaging = firebase.messaging();
 // [END initialize_firebase_in_sw]
 **/


// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// [START background_handler]
messaging.setBackgroundMessageHandler(function(payload) {
  // console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/firebase-logo.png'
  };
  appendMessage(payload);

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});
// [END background_handler]
