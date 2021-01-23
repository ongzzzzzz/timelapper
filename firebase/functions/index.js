const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/* 
    on update realtime db
    or
    every midnight, gather all images and process, 
    post to youtube / store gdrive / send in discord / slack
    and then delete

    CAREFUL DONT TOO EXPENSIVE
*/

exports.dailyExportTimelapse = functions.pubsub.schedule().timeZone('Asia/Kuala_Lumpur').onRun(() => {
    
})