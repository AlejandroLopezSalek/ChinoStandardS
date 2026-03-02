const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Use this in your .env file:');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');
console.log('Use this public key in your client-side code:');
console.log(vapidKeys.publicKey);
