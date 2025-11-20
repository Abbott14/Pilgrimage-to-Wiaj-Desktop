'use strict';

function FlowAudio() {

  // Chrome since v92 has a hard limit of 40 MediaPlayer objects
  // after that it prevents audio from playing
  // this is a map of url to howler objects
  var howlers = {};

  // max number of active howlers
  var MAX_POOL_SIZE = 32;

  // use a single howler for preview sounds
  // so that we don't fill the pool with previews
  // when previewing lots of audio files
  var previewHowler = null;
  var previewUrl = null;
  var previewId = 0;

  // whether all game audio is paused
  var paused = false;

  // use WaveSurfer to get frequency data from an audio file
  this.getAudioFrequencyData = function(url, callback) {
    var ws = WaveSurfer.create({container:'#waveform'});
    ws.once('decode', (duration) => { 
      callback(duration, ws.exportPeaks()[0]);
      ws.destroy();
      callback = null;
    }); 
    ws.load(url);
  }

  // preload an audio file so that it's ready to play 
  this.preload = function(url) {
    //console.warn("preloading sound:"+url);
    let howler = new Howl({src: [url], preload: true});
    howlers[url] = howler;
  }

  // play a one shot sound from the interface, not used for game play
  this.preview = function({url, volume, position, pan, startCallback}={}) {
    //console.log("previewing sound:"+url+" volume:"+volume+" position:"+position+" pan:"+pan+ " previewId:"+previewId);
    if (position == null || isNaN(position) || position < 0) {
      position = 0;
    }
    volume = normalizeVolume(volume);
    pan = normalizePan(pan);

    if (previewHowler) {
      if (previewUrl == url) {
        //console.log("previewing same sound, restarting...");
        // just restart the same sound and return
        // use html5 so that it's ready to play immediately 
        previewHowler.stop(previewId);
        previewHowler.stereo(pan);
        previewHowler.volume(volume);
        previewHowler.seek(position);
        previewHowler.off();
        previewId = previewHowler.play(); 
        if (startCallback) {
          previewHowler.once('play', function () {
            //console.log("preview sound started...");
            startCallback(previewId);
          });
        }
        return;
      } else {
        //console.log("previewing different sound, stopping current preview...");
        // if it's a different sound, then stop the current preview sound
        previewHowler.unload();
        previewHowler.off();
      }
    }
    // create a new howler & play it
    // use html5 so that it's ready to play immediately 
    //console.log("creating new preview sound...");
    previewHowler = new Howl({src: [url], volume: volume, loop: false, html: true});
    previewHowler.stereo(pan);  
    previewHowler.volume(volume);
    previewId = previewHowler.play();
    if (startCallback) {
      previewHowler.once('play', function() {
        //console.log("preview sound started...");
        startCallback(previewId);
      });
    }
    previewUrl = url;
  }

  // stop the preview sound
  this.stopPreview = function() {
    if (previewHowler) {
      previewHowler.stop();
    }
  }

  this.previewVolume = function(volume) {
    if (previewHowler) {
      previewHowler.volume(volume);
    }
  }

  this.previewPan = function(pan) {
    if (previewHowler) {
      previewHowler.stereo(pan);
    }
  }

  // legacy play function called by engine 1.4860 and earlier
  // All sounds in Honeydew and newer (even old blocks) will use the new play2 function directly
  this.play = function(url, volume, loop, force, doneCallback) {
    //console.warn("using legacy audio mapping to play sound:"+url+" volume:"+volume+" loop:"+loop+" force:"+force);

    // legacy sounds are never overlapped
    if (howlers[url]) {
      howlers[url].stop();
    }
    return this.play2({url, volume, loop, force, doneCallback, position: 0, pan: 0, html: true, overlap: false, soundId: -1, nopause: false});
  }

  // create, load and play new music or unpause existing sound
  // url: the url of the sound to play
  // volume: the volume to play the sound at
  // loop: whether to loop the sound
  // force: whether to force the sound to play even if game is paused
  // doneCallback: a function to call when the sound is done playing
  // startCallback: a function to call when the sound starts playing
  // position: the position in the sound to start playing from
  // pan: the L/R position of the sound
  // html: whether to play the sound in html5 or not
  // overlap: whether to allow overlapping howlers
  // soundId: the id of a paused sound to restart
  // nopause: whether the sound can be paused
  this.play2 = function({url, volume, loop, force, doneCallback, startCallback, position, pan, html, overlap, soundId, nopause=false}={}) {
    //console.warn("play sound URL:"+url+" soundId:"+soundId+" position:"+position+" volume:"+volume+" loop:"+loop+" force:"+force+" pan:"+pan+" html:"+html+" overlap:"+overlap+" nopause:"+nopause);
    let howler = null;
    if (position == null || isNaN(position) || position < 0) {
      position = 0;
    }
    volume = normalizeVolume(volume);
    pan = normalizePan(pan);

    if (howlers[url]) {
      howler = howlers[url];
      //console.warn("howler already created..."+url);
    } else {
      // create a new howler
      //console.warn("howler not created..."+url);
      var totalSounds = Object.keys(howlers).length;
      //console.warn("total howlers:"+totalSounds);

      // if we've reached the max pool size, then we need to replace an existing howler
      if (totalSounds >= MAX_POOL_SIZE) {
        console.warn("Audio Pool Overflow...");
        var slotFound = null;
        for (var key in howlers) {
          var slot = howlers[key];
          if (!slot.playing(slot.soundId)) {
            slotFound = key;
            //console.log("replace slot for:"+key+" sound id not playing:"+slot.soundId);
            slot.stop(slot.soundId);
            slot.off();
            slot.unload();
            break;
          }
        }
        if (slotFound == null) {
          console.error("Sorry, no open audio slots!");
          return;
        }
        delete howlers[slotFound];
      }

      // create a new Howl object
      howler = new Howl({
        src: [url],
        html5: html,
        volume: volume,
        loop: loop,
        //onend: function() { //console.log('Finished!'); }
        onplayerror: function(id, err) { 
          console.error('PLAY error, cant play '+id+' err:'+err); 

          // this will be buffered until we get a touch event
          // which will unlock it, but only play on unlock once
          if (!howler.waitingUnlock) {
            howler.once('unlock', function() {
              //console.error('Buffered audio unlocked, playing...'); 
              //console.warn("play: new howler..."+url);
              howler.volume(volume);
              howler.loop(loop);
              howler.stereo(pan);
              soundId = howler.play();

              // adding the listeners after calling play seems to work?
              if (startCallback) {
                howler.once('play', function() {
                  startCallback(soundId);
                });
              }
              if (doneCallback) { 
                howler.once('end', doneCallback);
              }
            });
            howler.waitingUnlock = true;
          }
        },
        onloaderror: function(id, err) { 
          console.error('LOAD error, cant play '+id+' err:'+err); 
        },
      });

      howlers[url] = howler;
    }
    if (force) {
      howler.mute(false);
    }

    if (nopause) {
      howler.fl_nopause = true;
    }

    // if we have a soundId, then we're restarting a playing or paused sound
    if (soundId > -1) {
      //console.warn("play: restarting howlerData..."+url);
      // if we're playing (or played it through), then restart it
      howler.volume(volume);
      howler.loop(loop);

      // if we're not paused, then seek to the position
      // otherwise, the sound will resume from where it left off
      if (howler.playing(soundId)) {

        // stop the sound so that the startCallback is triggered
        howler.stop(soundId);
        howler.seek(position, soundId);
      }
      howler.stereo(pan);
      howler.play(soundId);
    } else {

      if (!overlap) {
        // stop any other sounds that are playing
        howler.stop();
      }
      //console.warn("play: new howler..."+url);
      howler.volume(volume);
      howler.loop(loop);
      howler.stereo(pan);

      // if we are not overlapping sounds, but have a paused channel,
      // then we should just restart the paused channel instead of 
      // creating a new one
      if (!overlap) {
        // find the paused channel
        var restarted = false;
        for (var channel in howler._sounds) {
          if (howler._sounds[channel]._paused) {
            // restart the paused channel
            soundId = howler.play(howler._sounds[channel]._id);
            restarted = true;
            break;
          }
        }
        // if we didn't find a paused channel, then we need to create a new one
        if (!restarted) {
          soundId = howler.play();
        }
      } else {
        soundId = howler.play();
      }

      // this is unreliable unless we wait for the play event
      howler.once('play', function() {
        if (position > 0 && soundId > 0) {
          // only seek the position in the new channel
          // we may have multiple channels with a starting offset
          //console.warn("play: seeking position:"+position+" soundId:"+soundId);
          howler.seek(position, soundId);
        }
      });
    }

    // adding the listeners after calling play seems to work?
    if (startCallback) {
      howler.once('play', function() {
        startCallback(soundId);
      });
    }
    if (doneCallback) { 
      howler.once('end', doneCallback);
    }
  };

  // pause sound
  this.pause = function(url, soundId) {
    //console.warn("pause sound URL:"+url);
    var howler = howlers[url];
    if (!howler) {
      //console.warn("pause howler URL:"+url+" not playing, can't pause won't pause!");
      return;
    }
    if (soundId > 0) {
      howler.pause(soundId);
    } else {
      // if soundId is negative, then pause all sounds
      howler.pause();
    }
  }

  // fade, stop and dispose existing music
  this.stop = function(url, soundId) {
    //console.warn("stop sound URL:"+url+" soundId:"+soundId);

    var howler = howlers[url];
    if (!howler) {
      //console.warn("stop sound URL:"+url+" not playing, can't stop won't stop!");
      return;
    }

    // stop the sound
    if (soundId > 0) {
      howler.stop(soundId);
    } else {
      // stop all sounds if soundId is negative
      howler.stop();
    }

    // unregister any event listeners
    howler.off();
  };

  this.volume = function(url, value, soundId) {
    var howler = howlers[url];
    if (!howler) {
      console.warn("adjusting volume for sound that doesn't exist! - "+url);
      return;
    }
    if (soundId > 0) {
      howler.volume(normalizeVolume(value), soundId);
    } else {
      // if soundId is negative, then adjust the volume for all sounds
      // legacy sounds are not associated with a soundId
      howler.volume(normalizeVolume(value));
    }
  };

  this.pan = function(url, value, soundId) {
    var howler = howlers[url];
    if (!howler) {
      console.warn("adjusting pan for sound that doesn't exist! - "+url);
      return;
    }
    if (soundId > 0) {
      howler.stereo(normalizePan(value), soundId);
    } else {
      // if soundId is negative, then adjust the pan for all sounds
      howler.stereo(normalizePan(value));
    }
  };

  this.pauseAll = function() {
    //console.warn("pause all audio");
    var url;
    for (url in howlers) {
      let howler = howlers[url];
      if (!howler.fl_nopause) {
        howler.pause();
      }
    }
    paused = true;
  };

  this.stopAll = function() {
    //console.warn("stop all audio");
    Howler.stop();
    paused = false;
  };

  this.resumeAll = function() {
    //console.warn("resume all paused audio");
    var url;
    for (url in howlers) {
      let howler = howlers[url];

      // we may have some sounds that are not paused, due to runWhenPaused == true
      if (!howler.playing() && howler.seek() > 0) {
        //console.log("resume paused howler:"+url+" seek:"+howler.seek());
        howler.seek(howler.seek());
        howler.play();
      }
    }
    paused = false;
  };

  function normalizeVolume(volume) {
    if (isNaN(volume) || volume < 0) {
      return 0;
    }
    if (volume > 1) {
      return 1;
    } 
    return volume;
  }

  function normalizePan(pan) {
    if (isNaN(pan)) {
      return 0;
    }
    if (pan < -1) {
      return -1;
    }
    if (pan > 1) {
      return 1;
    }
    return pan;
  }
};

