// Initialise .env config.
require("dotenv").config();

// Options
var options = {
	port: process.env.PORT || 80, // Heroku port or 80.
	unityAPIBase: "https://build-api.cloud.unity3d.com", // URI (e.g. href) recieved in web hook payload.
	unityCloudAPIKey: process.env.UNITYCLOUD_KEY,
	hockeyappAPIUpload: "https://rink.hockeyapp.net/api/2/apps/upload",
	hockeyappAPIKey: process.env.HOCKEYAPP_KEY,
	repoURL : process.env.GIT_URL,
	repoUser : process.env.GIT_USER,
	repoPass : process.env.GIT_PASS,
	repoBranch : process.env.GIT_BRANCH,
	entries : process.env.GIT_ENTRIES,
	notify : process.env.HOCKEYAPP_SEND_NOTIFICATION,
	teams : process.env.TEAMS
};

// Imports
var path = require("path"),
	fs = require("fs"),
	express = require("express"),
	app = express(),
	http = require("http"),
	https = require("https"),
	server = http.Server(app),
	bodyParser = require("body-parser"),
	najax = require("najax"),
	FormData = require("form-data"),
	url = require("url"),
	gitlog = require("./gitlog");

// Run Server
server.listen( options.port, function(){
	console.log("listening on *:" + options.port );
});

// Configure Express
app.use("/public", express.static("public"));

// parse application/json
// app.use(bodyParser.json()); // Parse all
var jsonParser = bodyParser.json();

app.get("/", function(req, res){
	res.sendFile( __dirname + "/index.html" );
});

// POST /api/users gets JSON bodies 
app.post("/build", jsonParser, function (req, res) {
	if (!req.body) return res.sendStatus(400);
    
	// 1. Get Build API URL
	var buildAPIURL = req.body.links.api_self.href;
	if( !buildAPIURL ) {
		// URL not available.
		res.setHeader("Content-Type", "application/json");
		res.send({
			error: true,
			message: "No build link from Unity Cloud Build webhook"
		});
	} else {
		// URL not available.
		res.setHeader("Content-Type", "application/json");
		res.send({
			error: false,
			message: "Process begun for project '" + req.body.projectName + "' platform '" + req.body.buildTargetName + "'."
		});
	}

	// 2. Grab binary URL from Unity Cloud API
	getBuildDetails( buildAPIURL );
});

function getBuildDetails( buildAPIURL ){
	console.log("1. getBuildDetails: start");

	najax({ 
		url: options.unityAPIBase + buildAPIURL,
		type: "GET", 
		headers: {
			"Authorization": "Basic " + options.unityCloudAPIKey
		},
		success: function(data){

			var parsedData = JSON.parse(data);
			// console.log( data.links.download_primary.href );

			console.log("1. getBuildDetails: finished");

			// 3. Download binary.
			downloadBinary( parsedData );

		},
		error: function(error){
			console.log(error);
		}
	});
}

function downloadBinary( data ){
    
	var parsed = url.parse( data.links.download_primary.href );
	var filename = path.basename( parsed.pathname );
	var binaryURL = data.links.download_primary.href;

	console.log("2. downloadBinary: start");
	console.log("   " + binaryURL);
	console.log("   " + filename);

	deleteFile( filename );
    
	https.get( binaryURL, (res) => {
		// console.log('statusCode: ', res.statusCode);
		// console.log('headers: ', res.headers);

		var writeStream = fs.createWriteStream(filename, {"flags": "a"});

		var len = parseInt(res.headers["content-length"], 10);
		var cur = 0;
		var total = len / 1048576; //1048576 - bytes in  1Megabyte

		res.on("data", (chunk) => {
        
			cur += chunk.length;
			writeStream.write(chunk, "binary");

			console.log("Downloading " + (100.0 * cur / len).toFixed(2) + "%, Downloaded: " + (cur / 1048576).toFixed(2) + " mb, Total: " + total.toFixed(2) + " mb");
		});

		res.on("end", () => {

			console.log("2. downloadBinary: finished");
			writeStream.end();

		});

		writeStream.on("finish", () => {

			// console.log("2. downloadBinary: file finished");          
			uploadToHockeyApp( data, filename );
		});

	}).on("error", (e) => {
		console.error(e);
	});
}

function uploadToHockeyApp( data, filename )
{
	console.log("3. get gitlog");

	gitlog.getLog( 
		options.repoURL, 
		options.repoUser, 
		options.repoPass, 
		options.repoBranch,
		options.entries,
		data.lastBuiltRevision,
		function(log){
			console.log("4. uploadToHockeyApp: start");
			// console.log("readfile: " + filename);
		
			var readable = fs.createReadStream( filename );
			readable.on("error", () => {
				console.log("Error reading binary file for upload to HockeyApp");
			});
        
			// HockeyApp properties
			var HOCKEY_APP_HOST = "rink.hockeyapp.net";
			var HOCKEY_APP_PATH = "/api/2/apps/upload/";
			var HOCKEY_APP_PROTOCOL = "https:";
        
			var notes = "Automated release triggered from Unity Cloud Build.\n"
                + "Commit ID: " + data.lastBuiltRevision + "\n"
                + "Build Target Name: " + data.buildTargetName;

			if( log.length > 0 ){
				notes += "\n\n" + "<b>Recent Changes:</b>" + "\n";
				for(var i = 0; i < log.length; i++){
					notes += "\n" + log[i].author + " : " + log[i].date + "\n" + log[i].message + "\n";
				}
			}

			// Create FormData
			var form = new FormData();
			form.append("status", 2);
			// form.append('mandatory', MANDATORY_TYPE[options.mandatory]);
			form.append("notes", notes);
			form.append("notes_type", 0);
			form.append("notify", options.notify == "true" ? "1" : "0");
			form.append("ipa", readable);

			if( options.teams != "0")
				form.append("teams", options.teams );
        
			var req = form.submit({
				host: HOCKEY_APP_HOST,
				path: HOCKEY_APP_PATH,
				protocol: HOCKEY_APP_PROTOCOL,
				headers: {
					"Accept": "application/json",
					"X-HockeyAppToken": options.hockeyappAPIKey
				}
			}, function (err, res) {
				if (err) {
					console.log(err);
				}
        
				if (res.statusCode !== 200 && res.statusCode !== 201) {
					console.log("Uploading failed with status " + res.statusCode);
					console.log(res);
					return;
				}

				res.on("end", () => {
					console.log("5. uploadToHockeyApp: finished");

					deleteFile( filename );
				});
			});
            
			// Track upload progress.
			// console.log( req );
			var len = parseInt( req.getHeader( "content-length" ), 10);
			var cur = 0;
			var total = len / 1048576; //1048576 - bytes in  1Megabyte
        
			req.on("data", (chunk) => {
				cur += chunk.length;
				console.log("Downloading " + (100.0 * cur / len).toFixed(2) + "%, Downloaded: " + (cur / 1048576).toFixed(2) + " mb, Total: " + total.toFixed(2) + " mb");
			});   
		});
}

// Delete file, used to clear up any binary downloaded.
function deleteFile( filename ){
	fs.exists(filename, function(exists) { 
		if (exists) { 
			// Delete File.
			fs.unlink( filename );
		} 
	}); 
}