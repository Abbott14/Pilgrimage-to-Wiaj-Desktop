'use strict';

function RtcPubNub() {

  this.localUser = "[missing]";
  
  var gameId;
  var shardLimit;
  var pubnub;
  var currentShard;
  var currentShardOccupants = [];

  // shards are bundled together in a group
  var channelGroup;

  // pubnub retries
  var retryDelay = 1000;
  var channelGroupQueries = 0;
  var MaxChannelGroupQueries = 4;

  function rtcLog(msg) {
    console.info("%c "+msg, 'background:#02232B; color:#ccc');
  }

  rtcLog("RtcPubNub Created");

  /**
   * connect to the signal service
   */
  this.signalConnect = function(gid, sl, lu) {
    channelGroup = 'game'+gid;

    rtcLog("connecting to signal service with uuid:"+lu);
    var instance = this;
    gameId = gid;
    shardLimit = sl;
    instance.localUser = lu;

    pubnub = new PubNub({
      publishKey : 'pub-c-da93855d-a9a3-4072-af1c-87bda2a13e77',
      subscribeKey : 'sub-c-398dd765-9e12-4116-8594-5b1e39622b32',
      uuid: instance.localUser
    });

    pubnub.addListener({

      // Handle on connect status event
      status: function(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") {
          rtcLog(JSON.stringify(statusEvent));
          rtcLog("shard connection complete:"+JSON.stringify(statusEvent.subscribedChannels));
          instance.getPeers();
        }
      },

      // Handle messages
      message: function(msg) {
        // don't process our own messages
        if (msg.publisher != instance.localUser) {
          rtcXirsys.onSocketMessage(msg);
        } else {
          rtcLog("skip processing our own message");
        }
      },

      // Handle presence events
      presence: function(presenceEvent) {
        // handle presence
        rtcLog("PRESENCE"+JSON.stringify(presenceEvent));

        // we don't care about ourselves joining or leaving
        if (presenceEvent.uuid != instance.localUser) {
          if (presenceEvent.action == "leave") {
            console.warn("removing connection for leaving user:"+presenceEvent.uuid);
            delete rtcXirsys.connections[presenceEvent.uuid];
          }
          rtcXirsys.onSocketMessage({type:presenceEvent.action, from:presenceEvent.uuid});
        }
      }
    });      

    this.queryChannelGroup();
  }; 

  this.disconnect = function() {
    console.warn("shut down signal communication");
    pubnub.unsubscribeAll(); 
    pubnub.stop(); 
  }

  this.getPeers = function() {
    rtcLog("getPeers called - currentShardOccupants"+JSON.stringify(currentShardOccupants));
    
    //$("#connect_icon").css("color", "#58b158");

    // XXX this this unreliable - returns an empty list even when the 
    // initial shard query shows a populated shard. Try using the 
    // the population from the shard search (occupants prop) to populate
    // the peers event instead of the hereNow call 
    pubnub.hereNow(
    {
        channels: [currentShard], 
        includeUUIDs: true,
        includeState: true
    },
    function (status, response) {
      // handle status, response
      if (isOK(status, response)) {
        rtcLog("getPeers response:"+JSON.stringify(response)); 
        var listedOccupants = response.channels[currentShard].occupants;

        // de-dupe
        var a = listedOccupants.concat(currentShardOccupants);
        for(var i=0; i<a.length; ++i) {
          for(var j=i+1; j<a.length; ++j) {
            if(a[i].uuid == a[j].uuid) {
              a.splice(j--, 1);
            }
          }
        }
        rtcXirsys.onSocketMessage({type:"peers", from:"_sys_", peers: a});
      }
    }
    );
  }

  /**
   * publish a message to the entire shard by default
   * if a peer is provided, publish to that peer's 
   * channel instead
   */
  this.publish = function(msg, peer) {
    var channel = currentShard;
    if (peer) {
        rtcLog("publish msg to peer channel:"+peer);
        channel = peer;
    }
    var publishConfig = {
      channel: channel,
      message: msg 
    };
    pubnub.publish(publishConfig, function(status, response) {
      if (isOK(status, response)) {
        rtcLog("publish:"+JSON.stringify(msg));
      }
    })
  }

  /**
   * get state of all shards
   */
  this.queryChannelGroup = function(){

    rtcLog("get shard states for "+channelGroup);
    channelGroupQueries++;
    rtcLog("query #"+channelGroupQueries);
    if (channelGroupQueries > MaxChannelGroupQueries) {
        console.error("FATAL - channel group query failed");
        return;
    }

    var instance = this;
    pubnub.hereNow({
      channelGroups: [channelGroup],
      includeUUIDs: true,
      includeState: true
    },
    function (status, response) {
      // handle status, response
      //rtcLog("status:"+JSON.stringify(status));
      if (isOK(status, response)) {
        rtcLog(JSON.stringify(response));
        if (response.totalChannels == 0) {
          rtcLog("No active shards create one.");
          instance.createShard(0);
        } else {
          rtcLog("Shards available, select best one");

          // order the search
          var shardIds = Object.keys(response.channels);
          shardIds.sort();

          var searched = 0;
          var joined = false;

          for (var index in shardIds) {

            var shard = response.channels[shardIds[index]];
            rtcLog(shardIds[index] + shard);

            // join the first open shard we find
            if (shard.occupancy < shardLimit) {
              // track which peers are in this shard - this seems like a 
              // reliable way to get the actual connected peers
              instance.joinShard(shard);

              let gameEl = document.getElementById("builder");
              gameEl.shardInfo("joined - "+shardIds[index]);
              joined = true;
            }
            searched++;
          }

          if (!joined) {
            instance.createShard(searched);
          }
        }
      } else {
        console.warn("Channel group query failed!");
        setTimeout(instance.queryChannelGroup, retryDelay);
      }
    });
  };

  /**
   * create a new shard if none are available
   * XXX - we can get into a bad state if two peers create the same shard
   * at the "same time".  Even if one side gets a presence update, if it's
   * not the connection initiator peer, then no p2p connection will get made
   * - maybe add some an addition manual join signal after creating a shard?
   */
  this.createShard = function(shardId) {
    var instance = this;
    var shard = 'game'+gameId+'-'+shardId;
    rtcLog("create shard:"+shard);
    pubnub.channelGroups.addChannels(
      {
        channels: [shard],
        channelGroup: channelGroup
      },
      function (status, response) {
        if (isOK(status, response)) {
          rtcLog("new shard created ok");
          //rtcLog("status:"+JSON.stringify(status));
          //rtcLog(JSON.stringify(response));
          instance.joinShard({name:shard, occupants:[]});
          let gameEl = document.getElementById("builder");
          gameEl.shardInfo("created - "+shard);
        }
      }
    ); 
  };

  /**
   * create a new shard if none are available
   */
  this.joinShard = function(shard) {
    var instance = this;
    currentShard = shard.name;
    currentShardOccupants = shard.occupants;
    rtcLog("join shard:"+shard.name+" and private channel:"+instance.localUser);
    pubnub.subscribe({
      channels: [instance.localUser, shard.name],
      withPresence: true
    });
  };

  /**
   * validate response and log error
   */
  function isOK(status, response) {
    if (!status.error) {
      return true;
    } else {
      console.error(status);
      console.error(JSON.stringify(response));
      console.log("pubnub connect failed");
      displayConnectionStatus(status);
      //$("#connect_icon").removeClass(); 
      //$("#connect_icon").css("color", "#ec6952");
      //$("#connect_icon").addClass("fas");
      //$("#connect_icon").addClass("fa-exclamation-triangle");
      //$("#connect_status").text("No Signal");
      return false;
    }
  }
};

