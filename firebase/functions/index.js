const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

let rtdb = admin.database();
let storage = admin.storage().bucket('gs://esp8266-f2775.appspot.com');
const UUID = require("uuid-v4");

const fs = require('fs');
const os = require('os');
const path = require('path');

// const ffmpegPath = require('ffmpeg-static');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

/* 
    on update realtime db
    or
    every midnight, gather all images and process, 
    post to youtube / store gdrive / send in discord / slack
    and then delete

    CAREFUL DONT TOO EXPENSIVE
*/

//https://stackoverflow.com/questions/27908312/can-you-get-the-timestamp-from-a-firebase-array-key
function decode(id) {
    id = id.substring(0,8);
    var timestamp = 0;
    for (var i=0; i < id.length; i++) {
        var c = id.charAt(i);
        timestamp = timestamp * 64 + "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".indexOf(c);
    }
    return timestamp;
}


// create a directory
// save all base64 img to that directory, filename is timestamp
// use ffmpeg to convert them to mp4 and save in firebase storage
// clear the nodes, delete directory


exports.dailyExportTimelapse = functions.pubsub.schedule('every day 00:00').timeZone('Asia/Kuala_Lumpur')
.onRun(async (context) => {
	
	console.log('export start');

	// get all data
	let snapshot = (await rtdb.ref('esp32-cam').once('value')).val();

	if (!Object.keys(snapshot).length) return console.log('no images taken for timelapse!')

	// snapshot is now key => val, epochTime => base64
	Object.keys(snapshot).forEach(key => {
		snapshot[ decode(key) ] = snapshot[ key ];
		delete snapshot[ key ];
	})

	console.log(`finish getting ${Object.keys(snapshot).length} imgs`)
	// console.log(snapshot);

	// get tmpdir (functions only allow temp writes)
	let tmpdir = os.tmpdir();

	//this gt catcat?
	Object.keys(snapshot).sort((x, y) => x - y)
	// save all base64 img to that directory, filename is sorted by timestamp
	.forEach((key, idx) => {
		//https://stackoverflow.com/questions/6926016/nodejs-saving-a-base64-encoded-image-to-disk

		// the image is urlencoded
		var base64String = decodeURIComponent(snapshot[key].photo)		
		var data = base64String.replace(/^data:image\/\w+;base64,/, "");

		let buffer = Buffer.from(data, "base64");
		fs.writeFile( path.join(tmpdir, `frame${idx}.jpg`) , buffer, (err) => { 
			if (err) console.error(err) 
		});
		// fs.writeFile(`tmp/frame${idx}.jpg`, base64Data, 'base64', console.error);

		/*
		https://dev.to/dnature/convert-a-base64-data-into-an-image-in-node-js-3f88
		https://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
		*/
	})

	console.log('finish saving imgs to fs')

	let outputDir = path.join(tmpdir, 'out.mp4');

	// use ffmpeg to convert them to mp4 
	const { stdout, stderr } = await exec(`ffmpeg -framerate 24 -i  ${path.join(tmpdir, 'frame%d.jpg')} -c:v libx264 -crf 17 -pix_fmt yuv420p ${outputDir}`);
	
	if (stderr) console.error(`ffmpeg-error: ${stderr}`);	console.log(`ffmpeg-log: ${stdout}`);

	console.log('done ffmpeging')

	// save in firebase storage
	let uuid = UUID()
	let storageUpload = await storage.upload(outputDir, {
        destination: `timelapper-${new Date().toISOString().split('T')[0]}.mp4`,
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: uuid
            }
        }
    })

	console.log('finish uploading')

	let file = storageUpload[0];
	let url = "https://firebasestorage.googleapis.com/v0/b/" + 'esp8266-f2775.appspot.com' + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid
	

	// fs.rmdirSync('tmp', { recursive: true });
	fs.readdir(tmpdir, (err, files) => {
		if (err) throw err;
	
		for (const file of files) {
			fs.unlink(path.join(tmpdir, file), err => {
				if (err) throw err;
			});
		}
	});

	// rtdb.ref('esp32-cam').set({});

	console.log('finish deleting temp imgs')

	// broadcsast url here
	
	console.log(`done with url: ${url}`)

	// return console.log(`done with url: ${url}`)
	return rtdb.ref('esp32-cam').remove()

	// add subtitles?
	// clear the nodes, delete directory
})



exports.exportTimelapse = functions.database.ref('/test')
.onWrite(async (change, ctx) => {

	console.log('export start');

	// get all data
	let snapshot = (await rtdb.ref('esp32-cam').once('value')).val();

	if (!Object.keys(snapshot).length) return console.log('no images taken for timelapse!')

	// snapshot is now key => val, epochTime => base64
	Object.keys(snapshot).forEach(key => {
		snapshot[ decode(key) ] = snapshot[ key ];
		delete snapshot[ key ];
	})

	console.log(`finish getting ${Object.keys(snapshot).length} imgs`)
	// console.log(snapshot);

	// get tmpdir (functions only allow temp writes)
	let tmpdir = os.tmpdir();

	//this gt catcat?
	Object.keys(snapshot).sort((x, y) => x - y)
	// save all base64 img to that directory, filename is sorted by timestamp
	.forEach((key, idx) => {
		//https://stackoverflow.com/questions/6926016/nodejs-saving-a-base64-encoded-image-to-disk

		// the image is urlencoded
		var base64String = decodeURIComponent(snapshot[key].photo)		
		var data = base64String.replace(/^data:image\/\w+;base64,/, "");

		let buffer = Buffer.from(data, "base64");
		fs.writeFile( path.join(tmpdir, `frame${idx}.jpg`) , buffer, (err) => { 
			if (err) console.error(err) 
		});
		// fs.writeFile(`tmp/frame${idx}.jpg`, base64Data, 'base64', console.error);

		/*
		https://dev.to/dnature/convert-a-base64-data-into-an-image-in-node-js-3f88
		https://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
		*/
	})

	console.log('finish saving imgs to fs')

	let outputDir = path.join(tmpdir, 'out.mp4');

	// use ffmpeg to convert them to mp4 
	const { stdout, stderr } = await exec(`ffmpeg -framerate 24 -i  ${path.join(tmpdir, 'frame%d.jpg')} -c:v libx264 -crf 17 -pix_fmt yuv420p ${outputDir}`);
	
	if (stderr) console.error(`ffmpeg-error: ${stderr}`);	console.log(`ffmpeg-log: ${stdout}`);

	console.log('done ffmpeging')

	// save in firebase storage
	let uuid = UUID()
	let storageUpload = await storage.upload(outputDir, {
        destination: `timelapper-${new Date().toISOString().split('T')[0]}.mp4`,
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: uuid
            }
        }
    })

	console.log('finish uploading')

	let file = storageUpload[0];
	let url = "https://firebasestorage.googleapis.com/v0/b/" + 'esp8266-f2775.appspot.com' + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid
	

	// fs.rmdirSync('tmp', { recursive: true });
	fs.readdir(tmpdir, (err, files) => {
		if (err) throw err;
	
		for (const file of files) {
			fs.unlink(path.join(tmpdir, file), err => {
				if (err) throw err;
			});
		}
	});

	// rtdb.ref('esp32-cam').set({});

	console.log('finish deleting temp imgs')

	// broadcsast url here
	
	console.log(`done with url: ${url}`)

	// return console.log(`done with url: ${url}`)
	return rtdb.ref('esp32-cam').remove()

	// add subtitles?
	// clear the nodes, delete directory
})
