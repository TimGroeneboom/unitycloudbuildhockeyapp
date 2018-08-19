
module.exports = 
{
   getLog : function(url, user, pass, branch, entries, commitID, callback)
   {
        var repoPath = 'tmp';
        
        var fs = require('fs-extra');
        var shell = require('shelljs');

        if (!fs.existsSync(repoPath))
        {
            shell.mkdir('-p', repoPath);
        }else
        {
            fs.removeSync(repoPath);
            shell.mkdir('-p', repoPath);
        }

        var git = require('simple-git')(repoPath);

        const remote = `https://${user}:${pass}@${url}`;

        console.log("Cloning to " + repoPath);
        git.clone(remote, "../" + repoPath)
            .exec(() =>
            {
                console.log("   Finished!");
                fetch();
            } );

        function fetch()
        {
            console.log("Fetching...");
            git.fetch()
                .exec(()=>
                {
                    console.log("   Finished!");
                    console.log("Switching to branch " + branch);
                    git.checkout(branch)
                        .exec(()=>
                        {
                            console.log("   Finished!");
                            pull();
                        });
                });
        }

	    function pull()
        {
            console.log("Pulling...");
            git.pull()
                .exec(()=>
                {
                    console.log("   Finished!");
                    getLog();
                });
        }

        function getLog()
        {
            console.log("Getting log...")
            git.log([], function(err, log)
            {
                var returnLog = [];

                var index = 0;
                var found = false;

                log.all.forEach(element => 
                {
                    if( element.hash == commitID )
                    {
                        index = log.all.indexOf(element);
                        found = true;
                    }
                });

	            var i = index;
	            var end = index+entries
	            if( end > log.all.length)
	                end = log.all.length;
	
	            for(i; i < end; i++)
	            {
	                var element = log.all[i];
	
	                returnLog.push({
	                    "hash" : element.hash,
	                    "date" : element.date,
	                    "message" : element.message
	                });
                }

                console.log("   Finished!");

                fs.removeSync(repoPath);
                
                callback(returnLog);
            });
        }
   }
};
