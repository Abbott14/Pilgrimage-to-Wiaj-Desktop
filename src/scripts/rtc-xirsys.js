'use strict';

function RtcXirsys() {

    this.connections = {};

    var bandwidthOut = 0;
    var bandwidthIn = 0;
    var candidateQueue = {};

    var logging = false;

    var gameEl = document.getElementById('builder');

    /**
     * handle incoming WS/signal messages
     */
    this.onSocketMessage = function(event) {
        console.log("%c >> incoming signal event:"+JSON.stringify(event), "color:#ff40ff");

        // forward event message to engine
        if (event.type) {
            gameEl.onWebsocketMsg(JSON.stringify(event));
        }

        if (!event.message) {
            console.log("%c no message to process", "color:#ff40ff");
            return;
        }

        var sender = event.publisher;

        switch(event.message.data.type) {
            case "offer":
                console.log("%c <-- offer in", "color:#ff40ff");
                var desc = new RTCSessionDescription(event.message.data);

                // create if needed 
                if (!this.connections[sender]) {
                    var pc = this.createNewPeerConnection(sender);
                } else {
                    // if this connection already exists, check to
                    // see if it has a local description. If it's missing
                    // then this was probably created by an incoming candidate
                    // (candidates can arrive before an offer) 
                    if (this.connections[sender].pc.localDescription) {
                        console.warn("got offer for existing sender:"+sender);
                        if (sender < rtcPubNub.localUsername) {
                            console.log("%c peer overrides my offer", "color:#ff40ff");
                            var pc = this.createNewPeerConnection(sender);
                        } else {
                            console.log("%c I'm ignoring peer offer", "color:#ff40ff");
                            return;
                        }
                    } else {
                        // its fine
                        var pc = this.connections[sender].pc;
                    }
                }
                pc.setRemoteDescription(desc);
                this.drainCandidates(sender);
                var obj = this;
                pc.createAnswer().then(function(answerDesc){
                    obj.onCreateAnswer(answerDesc, sender);
                });
                break;
            case "answer":
                console.log("%c <-- answer in", "color:#ff40ff");
                var desc = new RTCSessionDescription(event.message.data);
                this.connections[sender].pc.setRemoteDescription(desc);
                this.drainCandidates(sender);
                break;
            case "candidate":
                console.log("%c <-- candidate in", "color:#ff40ff");
                console.info("candidate", JSON.stringify(event.message.data.candidate));
                var candidate = new RTCIceCandidate(event.message.data);

                // cannot add candidates (on chrome) unless there is a
                // remote description on the rtc connection
                if (!this.connections[sender] || !defined(this.connections[sender].pc.remoteDescription)) {
                    console.log("%c connection to '"+sender+"' not ready, queue incoming candidate", "color:#ff40ff");
                    console.log("%c"+this.connections[sender], "color:#ff40ff");

                    //push candidate onto queue...
                    if (!candidateQueue[sender]) {
                        candidateQueue[sender] = [];
                    }
                    candidateQueue[sender].push(candidate);
                    return;
                } else {
                    var pc = this.connections[sender].pc;
                }
                this.connections[sender].pc.addIceCandidate(candidate);
        }
    };

    /**
     * when a remote description is set, add any pending candidates
     */
    this.drainCandidates = function(peer) {
        //logBandwidth();
        if (!candidateQueue[peer]) {
            console.log("%c candidate queue empty", "color:#ff40ff");
            return;
        }
        console.log("%c draining candidate queue", "color:#ff40ff");
        for (var i = 0; i < candidateQueue[peer].length; i++) {
            this.connections[peer].pc.addIceCandidate(candidateQueue[peer][i]);
            console.log("%c draining candidate queue - "+candidateQueue[peer][i], "color:#ff40ff");
        }
        candidateQueue[peer] = [];
    }

    /**
     * initiate a p2p connection
     */
    this.callPeer = function(peer) {
        console.log("%c calling peer:"+peer, "color:#ff40ff");

        if (this.connections.hasOwnProperty(peer)) {
            console.warn("Connection initiated, not calling!");
            return;
        }
        var pc = this.createNewPeerConnection(peer);

        // TCP semantics by default
        // var tcpDataChannel = pc.createDataChannel("tcp"); 

        // UDP semantics
        // var udpDataChannel = pc.createDataChannel("udp", {ordered:false, maxRetransmits:0}); 
        
        // partial reliability
        var sctpDataChannel = pc.createDataChannel("sctp", {ordered:false, maxRetransmits:2}); 

        //this.connections[peer].tcp = tcpDataChannel;
        //this.connections[peer].udp = udpDataChannel;
        this.connections[peer].sctp = sctpDataChannel;

        //this.setDataChannelHandlers(tcpDataChannel, peer);
        //this.setDataChannelHandlers(udpDataChannel, peer);
        this.setDataChannelHandlers(sctpDataChannel, peer);

        var obj = this;
        pc.createOffer().then(function(desc) {
            obj.onCreateOffer(desc, peer);
        }).catch(function(reason) {
            console.error("Cannot create offer:"+reason);
        });;
    };

    /**
     * set ICE info
     */
    this.setICE = function(ice) {
        this.iceServers = {iceServers: ice, iceTransportPolicy:"all", iceCandidatePoolSize: "0"};
        console.log("%c set ICE:"+JSON.stringify({"iceServers":ice}), "color:#ff40ff");
    };

    /**
     * inialize ice server params and initiate p2p
     */
    this.connectPeer = function(user) {
        console.log("%c peer connect user:"+user, "color:#ff40ff");
        this.callPeer(user);
        console.log("%c peer called", "color:#ff40ff");
    };

    /**
     * offer create handler
     */
    this.onCreateOffer = function(description, peer) {
        console.log("%c new offer created", "color:#ff40ff");
        this.connections[peer].pc.setLocalDescription(description);
        var pkt = {type: "offer", from:rtcPubNub.localUsername, data:description};
        rtcPubNub.publish(pkt, peer);
        console.log("%c --> offer sent to "+peer, "color:#ff40ff");
    };

    /**
     * answer create handler
     */
    this.onCreateAnswer = function(description, peer) {
        console.log("%c new answer created", "color:#ff40ff");
        this.connections[peer].pc.setLocalDescription(description);
        var pkt = {type: "answer", from:rtcPubNub.localUsername, data:description};
        rtcPubNub.publish(pkt, peer);
        console.log("%c --> answer sent to "+peer, "color:#ff40ff");
    };

    /**
     * when we get an ICE candidate, forward to our peer
     */
    this.onIceCandidate = function(evt, peer) {
        if (evt.candidate) {
            const c = parseCandidate(evt.candidate.candidate);
            console.info("candidate component:", c.component,
               "type:", c.type,
               "foundation:", c.foundation,
               "protocol:", c.protocol,
               "address:", c.address,
               "port:", c.port,
               "priority:", formatPriority(c.priority));
        }
        var candidate = evt.candidate;
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
        // If the event's candidate property is null, ICE gathering has finished.
        if (candidate != null && peer != null) {
            var cPkt = {
                type: "candidate",
                sdpMLineIndex: candidate.sdpMLineIndex,
                sdpMid: candidate.sdpMid,
                candidate: candidate.candidate
            };
            console.log("%c --> candidate sent to "+peer+":"+JSON.stringify(candidate.candidate), "color:#ff40ff");
            rtcPubNub.publish({type:"candidate", from:rtcPubNub.localUsername, data:cPkt}, peer);
        } else {
            console.info("ICE gathering complete for "+peer);   
        }
    };
    
    this.gatheringStateChange = function(event) {
        //if (pc.iceGatheringState !== 'complete') {
        //    return;
        //}
        console.warn("GATHERING STATE CHANGE:"+JSON.stringify(event));
    }

    /**
     * install data channel handlers
     */
    this.setDataChannelHandlers = function(dc, peer) {
        var obj = this;
        dc.onmessage = function(event) {
            obj.onDataMessage(event, peer);
        }
        dc.onopen = function(event) {
            obj.onDataChannelOpen(event, peer);
        }
        console.log("%c data channel handlers in place", "color:#ff40ff");
    };

    /**
     * p2p connection complete, notify engine
     */
    this.onDataChannelOpen = function(event, peer) {
        console.log("%c data channel open from:"+peer, "color:#ff40ff");
        gameEl.onPeerConnect(peer);
    };

    /**
     * got message from peer
     */
    this.onDataMessage = function(event, peer) {
        bandwidthIn += event.data.length;
        var text = btoa(event.data);
        //console.log("%c data message in:"+event.data+"/"+text+" from:"+peer, "color:#ff40ff");
        gameEl.onPeerMsg(text, peer);
    };

    /**
     * send a message to all peers
     */
    this.broadcastP2P = function(msg, reliable) {
        var binary = atob(unescape(msg));
        //console.log("%c broadcasting p2p msg: ["+msg.length+" bytes]", "color:#ff40ff");
        bandwidthOut += msg.length;

        for (const [key, value] of Object.entries(this.connections)) {
            //console.log("%c broadcast to peer:"+key, "color:#ff40ff");

            /*
            if (reliable) {
                value.tcp.send(binary);
            } else {
                value.udp.send(binary);
            }*/
            if (value.sctp && value.sctp.readyState == "open") {
              value.sctp.send(binary);
            } else {
              if (value.sctp) {
                console.warn("SKIP broadcast to peer:"+key+" in state:"+value.sctp.readyState);
              } else {
                console.warn("SKIP broadcast to peer:"+key+" missing sctp");
              }
            }
        };
    }

    /**
     * send a message to one peer
     */
    this.sendP2P = function(msg, peer, reliable) {
        var binary = atob(unescape(msg));
        console.log("%c sending p2p msg:"+msg+"/"+msg, "color:#ff40ff");
        var sent = false;
        for (const [key, value] of Object.entries(this.connections)) {
            if (key == peer) {
                console.log("%c sending to peer:"+key, "color:#ff40ff");
                /*
                if (reliable) {
                    value.tcp.send(binary);
                } else {
                    value.udp.send(binary);
                }
	Error: Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'
    at Object.<anonymous> (rtc-xirsys.js:303)
    at Function.each (jquery-1.8.3.min.js:2)
    at RtcXirsys.sendP2P (rtc-xirsys.js:293)
    at Function.openfl_external_ExternalInterface.call (Flowlab-debug.js?v=138:146397)
    at server_PeerController.sendSerializedPeerMsg (Flowlab-debug.js?v=138:157016)
    at server_PeerController.sendPeerMsg (Flowlab-debug.js?v=138:157006)
    at server_MultiplayerController.send (Flowlab-debug.js?v=138:156232)
    at util_NetworkRegistry.sendNodeValue (Flowlab-debug.js?v=138:176877)
    at util_NetworkRegistry.syncAllNodes (Flowlab-debug.js?v=138:176893)
    at server_Host.syncAllShared (Flowlab-debug.js?v=138:155800)
                */
                value.sctp.send(binary);
                sent = true;
                return false; // break out of loop
            }
        };
        if (!sent) {
            console.log("%c peer connection not found for:"+peer, "color:#ff40ff");
        }
    }


    /**
     * data channel was created
     */
    this.onDataChannel = function(evt, peer) {
        console.log("%c data channel created OK", "color:#ff40ff");
        var dataChannel = evt.channel;
        var keys = Object.keys(this.connections);
        var comp;
        var localDescription;
        var remoteDescription;
        for(var i = 0; i < keys.length; i++) {
            comp = this.connections[keys[i]];
            if(evt.currentTarget.localDescription.sdp == comp.pc.localDescription.sdp) {
                if (dataChannel.label == "tcp") {
                    comp.tcp = dataChannel;
                } else if (dataChannel.label == "udp") {
                    comp.udp = dataChannel;
                } else if (dataChannel.label == "sctp") {
                    comp.sctp = dataChannel;
                } else {
                    console.error("unknown dc label:"+dataChannel.label);
                }
            }
        }
        this.setDataChannelHandlers(dataChannel, peer);
    };

    /**
     * create a new RTCPeerConnection object
     */
    this.createNewPeerConnection = function(username){
        console.log("%c create new peer connection with:"+username, "color:#ff40ff");
    
        var pc = new RTCPeerConnection(this.iceServers);

        var obj = this;
        pc.ondatachannel = function(event) {
            obj.onDataChannel(event, username);
        };
        pc.onicecandidate = function(event) {
            obj.onIceCandidate(event, username);
        }
        pc.ongatheringstatechange = obj.gatheringStateChange;

        pc.oniceconnectionstatechange = function(evt){ 
            console.log("%c ice connection state ", evt), "color:#ff40ff"; 
            if (pc.iceConnectionState === "failed" ||
                pc.iceConnectionState === "disconnected" ||
                pc.iceConnectionState === "closed") {

                //delete obj.connections[username];
                
                // connection was closed
                if (pc.iceConnectionState == "closed") {
                    console.error("p2p CLOSED connection to:"+username);
                    gameEl.onPeerConnectFailed(username);
                    updateConnectionStatus("Connection closed", false);
                    obj.checkConnections();
                }

                // Handle the failure
                console.warn("Bad ICE connection state:"+pc.iceConnectionState);
                if (pc.iceConnectionState == "disconnected") {
                    console.error("p2p disconnected from:"+username);
                    gameEl.onPeerDisconnect(username);
                    updateConnectionStatus("Connection failed", false);
                    obj.checkConnections();
                }

                // we were not able to connect at all
                if (pc.iceConnectionState == "failed") {
                    console.error("p2p failed to connect to:"+username);
                    gameEl.onPeerConnectFailed(username);
                    updateConnectionStatus("Failed to connect", false);
                    obj.checkConnections();
                }
            } else {
                updateConnectionStatus("Connected", true);
                console.info("Good ICE connection state:"+pc.iceConnectionState+" for peer:"+username);
            }
        };
        this.connections[username] = {pc: pc, tcp:null, udp:null, sctp:null};
        return pc;
    };

    this.checkConnections = function(){
        var connected = false;
        for (const [key, value] of Object.entries(this.connections)) {
            if (value.sctp && value.sctp.readyState == "open") {
                // we have at least one good connection
                connected = true;
            }
        };
        if (!connected) {
            updateConnectionStatus("Disconnected", false);
        }
    }

    this.disconnect = function() {
        console.warn("shut down p2p connections");
        for (const [key, value] of Object.entries(this.connections)) {
            console.warn("close connection to:"+key);
            value.pc.close();
        };
        rtcPubNub.disconnect();        
        updateConnectionStatus("Disabled", false);
    }

    function defined(v){
        if (typeof v === "undefined") {
            // no variable "v" is defined in the current scope
            // *or* some variable v exists and has been assigned the value undefined
            return false;
        } else {
            // some variable (global or local) "v" is defined in the current scope
            // *and* it contains a value other than undefined
            return true;
        }
    }
    
    // Parse a candidate:foo string into an object, for easier use by other methods.
    // https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/trickle-ice/js/main.js
    function parseCandidate(text) {
        const candidateStr = 'candidate:';
        const pos = text.indexOf(candidateStr) + candidateStr.length;
        let [foundation, component, protocol, priority, address, port, , type] =
            text.substr(pos).split(' ');
        return {
            'component': component,
            'type': type,
            'foundation': foundation,
            'protocol': protocol,
            'address': address,
            'port': port,
            'priority': priority
        };
    }
    
    // Parse the uint32 PRIORITY field into its constituent parts from RFC 5245,
    // type preference, local preference, and (256 - component ID).
    // ex: 126 | 32252 | 255 (126 is host preference, 255 is component ID 1)
    // https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/trickle-ice/js/main.js
    function formatPriority(priority) {
        return [
            priority >> 24,
            (priority >> 8) & 0xFFFF,
            priority & 0xFF
        ].join(' | ');
    }

    function updateConnectionStatus(msg, connected) {
        console.log("connection status from xirsys:"+msg);
        displayConnectionStatus(msg, connected ? 1:2);
        //$("#connect_icon").removeClass(); 
        //$("#connect_icon").css("color", color);
        //$("#connect_icon").addClass("fas");
        //$("#connect_icon").addClass(icon);
        //$("#connect_status").text(text);
    }

    function logBandwidth() {
        if (logging) {
            return;
        }
        logging = true;
        setInterval(function(){
            bandwidthOut = bandwidthOut * 8; // bytes to bits
            bandwidthOut = bandwidthOut / 1024; // bits to kilobits
            bandwidthIn  = bandwidthIn * 8;
            bandwidthIn  = bandwidthIn / 1024;
            console.log("%c bandwidth out:"+bandwidthOut+" kbps  in:"+bandwidthIn+" kbps", "color:#ff40ff");
            bandwidthOut = 0;
            bandwidthIn = 0;
        }, 1000);
    }
};

