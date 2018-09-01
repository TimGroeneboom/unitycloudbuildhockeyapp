
module.exports = 
{
	getLog : function(url, user, pass, branch, entries, commitID, callback){
		var repoPath = "unitycloudhockeyapp";
        
		var fs = require("fs-extra");
		var shell = require("shelljs");
		var os = require("os");
		var dir = os.tmpdir() + "/" + repoPath;

		console.log(dir);

		if (!fs.existsSync(dir)){
			shell.mkdir("-p", dir);
		}

		var git = require("simple-git/promise")(dir);

		const remote = `https://${user}:${pass}@${url}`;

		git.checkIsRepo()
			.then( isRepo =>{
				if( !isRepo ){
					console.log("Cloning to " + repoPath);
					git.clone(remote, "../" + repoPath)
						.then(() =>{
							console.log("   Finished!");
							checkout();
						} ).catch( err => console.log(err) );
			
				}else{
					checkout();
				}
			});

		function checkout(){
			console.log("Switching to branch " + branch);
			git.checkout(branch)
				.then(()=>{
					console.log("   Finished!");
					pull();
				}).catch( err => console.log(err) );
		}

		function pull(){
			console.log("Pulling...");
			git.pull()
				.then(()=>{
					console.log("   Finished!");
					getLog();
				}).catch( err => console.log(err) );
		}

		function getLog(){
			console.log("Getting log...");
			git.log()
				.then( log =>{
					var returnLog = [];

					var index = 0;
					var found = false;

					log.all.forEach(element => {
						if( element.hash == commitID ){
							index = log.all.indexOf(element);
							found = true;
						}
					});

					if( found ){
						var i = index;
						var end = index+entries;
						if( end > log.all.length)
							end = log.all.length;
			
						for(i; i < end; i++){
							var element = log.all[i];
			
							returnLog.push({
								"hash" : element.hash,
								"date" : element.date,
								"message" : element.message
							});
						}
					}else{
						console.log("commit id not found in repository");
					}

					console.log("   Finished!");

					callback(returnLog);
				}).catch(err => console.log(err));
		}
	}
};
