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

exports.exportTimelapse = functions.database.ref('/test')
.onWrite(async (change, ctx) => {
	// create a directory
    // https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
    // if (!fs.existsSync('tmp')){
    //     fs.mkdirSync('tmp');
    // }

	console.log('export start');

	// get all data
	let snapshot = (await rtdb.ref('esp32-cam').once('value')).val();

	// snapshot is now key => val, epochTime => base64
	Object.keys(snapshot).forEach(key => {
		snapshot[ decode(key) ] = snapshot[ key ];
		delete snapshot[ key ];
	})

	console.log(`finish getting ${Object.keys(snapshot).length} imgs`)
	// console.log(snapshot);

	let tmpdir = os.tmpdir();

	//this gt catcat?
	Object.keys(snapshot).sort((x, y) => x - y)
	// save all base64 img to that directory, filename is sorted by timestamp
	.forEach((key, idx) => {
		//https://stackoverflow.com/questions/6926016/nodejs-saving-a-base64-encoded-image-to-disk

		// same base64 to disk
		var base64String = snapshot[key].photo.replace(/^data:image\/jpg;base64,/, "");

		let buffer = Buffer.from(base64String, "base64");
		fs.writeFile( path.join(tmpdir, `frame${idx}.jpg`) , buffer, console.log );
		// fs.writeFile(`tmp/frame${idx}.jpg`, base64Data, 'base64', console.error);

		/*
		https://dev.to/dnature/convert-a-base64-data-into-an-image-in-node-js-3f88
		https://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
		*/
	})

	console.log('finish saving imgs to fs')

	let outputDir = path.join(tmpdir, 'out.mp4');

	// use ffmpeg to convert them to mp4 
	const { stdout, stderr } = await exec(`ffmpeg -r 1/1 -i  ${path.join(tmpdir, 'frame%d.jpg')} -c:v libx264 -vf fps=25 -pix_fmt yuv420p ${outputDir}`);
	
	if (stderr) console.error(`ffmpeg-error: ${stderr}`);	console.log(`ffmpeg-log: ${stdout}`);

	console.log('done ffmpeging')

	// save in firebase storage
	let uuid = UUID()
	let storageUpload = await storage.upload(outputDir, {
        destination: `timelapper-${new Date().toISOString().split('T')[0]}`,
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: uuid
            }
        }
    })

	console.log('finish uploading')

	let file = storageUpload[0];
	let url = "https://firebasestorage.googleapis.com/v0/b/" + 'esp8266-f2775.appspot.com' + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid
	
	// return rtdb.ref('esp32-cam').remove()

	// fs.rmdirSync('tmp', { recursive: true });
	fs.readdir('tmp', (err, files) => {
		if (err) throw err;
	
		for (const file of files) {
			fs.unlink(path.join('tmp', file), err => {
				if (err) throw err;
			});
		}
	});

	console.log('finish deleting')

	return console.log(`done with url: ${url}`)
	// add subtitles?
	// clear the nodes, delete directory
})
