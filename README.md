# How to set up Eye2Eye

### 1. Fork or Clone Eye2Eye into a new Public GitHub Account

Enterprise GitHub accounts don't work for Render (the hosting service).

### 2. Deploy Eye2Eye to Render

Go to render.com and create a free Web Service and connect the GitHub repository to the web service.

### 3. Connect to Eye2Eye

Navigate to Eye2Eye by using the link provided once Render is set up.

## URL Navigation

In order for users to be connected to the correct service at the same time, all URLs must be the same. For example, users connected to eye2eye.onrender.com/0 and eye2eye.onrender.com/one-camera/200 will not be able to interact with each other.

### Two Camera Tool

Navigate to the onrender.com URL and add /0 to the end for all users if you want audio panning disabled or /1 if you want audio panning enabled.

The default URL directs you to this page with audio panning enabled.

### One Camera Tool with Delay

Navigate to the onrender.com URL and add "/one-camera/{the delay amount you want in ms}"

For example, if you want 200 ms of added delay, the url should look something like this: eye2eye.onrender.com/one-camera/200

Remember that all users must have the same delay setting so that the URL will be the same for all users.

## Setting up cameras

To switch cameras, click on the camera feed that you want to switch at the bottom of the screen and select the camera feed that you want to replace it with. Select Help if you are having trouble with deciding which camera should be used for which feed.

## Setting up audio

To change the audio output device, click on the Settings button.

## Toggling chat

Toggle the chat box by clicking on the chat button.
