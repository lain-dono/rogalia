'use strict'

var config = require('./config.js').config
var Settings = require('./ui/settings.js')

//TODO: make playlist shuffle
module.exports = function Sound() {
    /*jshint validthis:true */

    var self = this;
    var soundDir = "assets/sound/";
    var musicDir = "assets/music/";
    var tracksNum = 14;
    var firstTrackId = 1;
    var trackId = firstTrackId;

    var lastTrackLsKey = "last-track";
    function loadLastTrack() {
        return +localStorage.getItem(lastTrackLsKey) || firstTrackId;
    }

    function saveLastTrack() {
        localStorage.setItem(lastTrackLsKey, trackId);
    }

    var volume = 0.3;
    var currentTrack = null;
    var nextTrack = null;

    this.track = null;
    this.sounds = {};

    var sounds = ["beep", "chop", "lvl-up", "eat", "xp", "heal", "hit", "punch"];
    sounds.forEach(function(name) {
        var audio =  new Audio(soundDir + name + ".ogg");
        self.sounds[name] = audio;
    });

    var mute = document.getElementById("mute");
    mute.onclick = function() {
        Settings.toggle("settings.sound.playMusic");
        if (!Settings.instance)
            self.toggleMusic();
    };

    function updateMute() {
        if (config.sound.playMusic) {
            mute.classList.add("unmute");
        } else {
            mute.classList.remove("unmute");
        }
    }

    this.init = function() {
        trackId = loadLastTrack();
        if (document.location.hash.indexOf("mute") != -1) {
            config.sound.playMusic = false;
            config.sound.playSound = false;
        } else {
            //TODO: remove after settings update
            var enabled = localStorage.getItem("settings.sound.playMusic");
            if (typeof enabled == "string")
                config.sound.playMusic =  (enabled == "true");
        }

        updateMute();

        this.playMusic();
    };

    this.playMusic = function() {
        if (!config.sound.playMusic)
            return;
        nextTrack = loadTrack(trackId);
        playNextTrack();
    };

    this.stopMusic = function() {
        if (currentTrack)
            currentTrack.pause();
    };

    function loadTrack(trackId) {
        return new Audio(musicDir + trackId + ".webm");
    }

    function playNextTrack() {
        currentTrack = nextTrack;
        playTrack(currentTrack);
        loadNextTrack();
    }

    // TODO: make user controls?
    // for cli usage
    this.playNextTrack = function() {
        currentTrack.pause();
        playNextTrack();
    };

    function playTrack(track) {
        track.volume = volume;
        track.play();

        // track.addEventListener("ended", this.playNextTrack.bind(this));
        //BUGGED; see https://code.google.com/p/chromium/issues/detail?id=157543

        function next() {
            if (this.duration - this.currentTime < 1) {
                this.removeEventListener("timeupdate", next);
                playNextTrack();
            }
        }

        track.addEventListener("timeupdate", next);
        saveLastTrack();
    }

    function loadNextTrack() {
        if (++trackId > tracksNum) {
            trackId = firstTrackId;
        }
        nextTrack = loadTrack(trackId);
    }

    this.toggleMusic = function() {
        updateMute();
        if (!currentTrack) {
            self.playMusic();
            return;
        }
        if (currentTrack.paused) {
            currentTrack.play();
        } else {
            currentTrack.pause();
        }
    };

    this.playSound = function(name, repeat) {
        if (!config.sound.playSound)
            return;
        this.stopSound(name);
        var sound = this.sounds[name];
        if (!sound) {
            console.warn("Sound " + name + " not found");
            return;
        }
        sound.onloadeddata = function() {
            sound.currentTime = 0;
            sound.play();
        };
        sound.load();
        if (repeat !== undefined) {
            repeat = repeat || 1000;
            sound.repeat = setTimeout(this.playSound.bind(this, name, repeat), repeat);
        }
    };

    this.stopSound = function(name) {
        var sound = this.sounds[name];
        if (!sound)
            return;
        sound.pause();
        if (sound.repeat) {
            clearTimeout(sound.repeat);
            sound.repeat = null;
        }
    };

    this.init();
}
