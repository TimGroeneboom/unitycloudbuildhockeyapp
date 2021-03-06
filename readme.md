# Unity Cloud Build To HockeyApp

A NodeJS application to automate binary deployments from Unity Cloud Build to HockeyApp together with a changelog of the latest commits to the repository

## App Flow

  1. Receive a webhook from Unity Cloud Build to notify a build is ready. 
  2. Get the build details from the JSON payload within the webhook.
  3. Download the app binary from the Unity Cloud Build API.
  4. Clone the git repository to get changelog
  5. Upload the app binary to HockeyApp together with the changelog

## Requirements

- Setup a Git repository
- Setup a [Unity Cloud Build](https://unity3d.com/services/cloud-build) account and project.
- Setup a [HockeyApp](https://hockeyapp.net/) account. HockeyApp will use the app package name to detemine which project to upload to.

## Installation

### Quick Installation ###
  <a href="https://heroku.com/deploy">
    <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
  </a>

  1. Press the button above to create a new Heroku app.
   
  2. Supply the required API keys for both Unity Cloud Build and HockeyApp.
 	- UCB API key can be obtained [here](https://build.cloud.unity3d.com/preferences/).
    - HockeyApp API key can be created [here](https://rink.hockeyapp.net/manage/auth_tokens). Be sure to create a key 'Upload' rights (e.g. anything above 'Read Only').
  
  3. Supply required credentials to clone the git repository
  
  4. Click `Deploy`.

### Manual Installation ###
  1. Clone this repository.

  2. On a terminal, navigate to the repository directory, and install dependencies with `npm install`.
  3. Add API keys to '.env' for both Unity Cloud Build, HockeyApp and git.
    * UCB API key can be obtained [here](https://build.cloud.unity3d.com/preferences/).
    * HockeyApp API key can be created [here](https://rink.hockeyapp.net/manage/auth_tokens). Be sure to create a key 'Upload' rights (e.g. anything above 'Read Only').

  4. Deploy.  

After deployment, setup the Unity Cloud Build webhook.
  * Within UCB, view your app. Click 'Notifications', then 'Add New' and enter your app URL with '/build' appended. E.g. 'http://[appurl]/build/'
  * Use a tool like [Request Bin](https://requestb.in/) to test web hooks from UCB, ontain the payload and test requests to '/build/'.

## Notes

- If you use Slack, integrate UCB and HockeyApp to be notified when a new build is ready and has been pused to HockeyApp. See screenshot above.
- You don't need to setup the app on HockeyApp, if you upload the binary it will automatically create a new app instance.
- Configure HockeyApp to automatically notify users after the binary has uploaded. See the 'notify' variable within the 'uploadToHockeyApp()' function. [HockeyApp API](https://support.hockeyapp.net/kb/api/api-versions#upload-version)

## Licenses

Copyright 2018 CodeFlow

Copyright 2017 Soupware

Copyright 2016 Nathan Brodbent

This software is licensed under [Apache License 2.0](http://choosealicense.com/licenses/apache-2.0/).
