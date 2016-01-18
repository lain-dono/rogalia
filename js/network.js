'use strict'

var util = require('./util.js')

module.exports = function Network() {
    /*jshint validthis:true */

    this.proto = "ws://";
    this.host = "rogalik.tatrix.org";
    this.port = 49000;
    if (window.location.protocol == "https:") {
        this.proto = "wss://";
        this.port = 49443;
    }


    var override = document.location.search.match(/server=([^&]+)/);
    if (override) {
        override = override[1].split(":");
        this.host = override[0] || this.host;
        this.port = override[1] || this.port;
    }

    this.addr = this.host + ":" + this.port;

    this.data = null;
    this.socket = null;

    this.queue = [];

    this.run = function() {
        this.socket = new WebSocket(this.proto + this.addr);
        this.socket.binaryType = "arraybuffer";
        this.socket.onopen = function() {
            game.setStage("login");
        };

        function onDisconnect() {
            window.onerror = null;
            if (game.chat)
                game.chat.addMessage({From: "[Rogalik]", Body: "Disconnected"});
            game.exit("Disconnected. Try again later.");
        }

        // if (e.wasClean)
        this.socket.onclose = onDisconnect;

        this.socket.onerror = function(error) {
	    console.log(error);
            onDisconnect();
        };
        this.socket.onmessage = onmessage.bind(this);
    };

    this.disconnect = function() {
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }
    };

    function onmessage(message) {
        var decompressed = util.decompress(message.data);
        var data = JSON.parse(decompressed);
        this.data = data;
        if(this.sendStart && data.Ok) {
            game.ping = Date.now() - this.sendStart;
            if (game.controller.system && game.controller.system.panel.visible) {
                game.controller.system.ping.textContent = "Ping: " + game.ping + "ms";
            }
            this.sendStart = 0;
        }

        if (game.debug.network.length)
            console.log("Server data len: ", message.data.byteLength);

        if (game.debug.network.data)
            console.log(data);

        if (data.Error) {
            game.controller.showError(data.Error);
            return;
        }

        game.stage.sync(data);

        if (this.queue.length === 0)
            return;

        if (data.Ok) {
            var callback = this.queue.shift();
            var result = callback(data);
            if (result instanceof Function)
                this.queue.push(result);
        }
    }

    this.shutdown = function() {
        this.socket.onclose = null;
        this.socket.close();
    };

    this.send = function(command, args, callback) {
        args = args || {};
        args.Command = command;

        // if (game.stage.name == "main")
        //     args.Fps = game.controller.system.fps.currentFps();

        this.sendStart = Date.now();
        this.socket.send(JSON.stringify(args));

        if (callback)
            this.queue.push(callback);
    };

    //for debug
    this.sendRaw = function(cmd) {
        this.socket.send(JSON.stringify(cmd));
    };
}
