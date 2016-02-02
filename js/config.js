module.exports.CELL_SIZE = 32
module.exports.FONT_SIZE = 14
export var DEFAULT_CLIENT_WIDTH = 1280
export var DEFAULT_CLIENT_HEIGHT = 720
export var LOBBY_X = 85
export var LOBBY_Y = 15

// global
for(var k in module.exports) { 
   if (module.exports.hasOwnProperty(k)) {
       window[k] = module.exports[k];
   }
}

export var config = {
    character: {
        pathfinding: function() { return game.player.Settings.Pathfinding; },
        hideHelmet: function() { return game.player.Style.HideHelmet; },
    },
    ui: {
        language: function() {
            return game.lang == "ru";
        },
        hp: true,
        name: true,
        npc: true,
        simpleFonts: false,
        allowSelfSelection: false,
        showMeterValues: true,
        chatAttached: true,
        chatBalloons: true,
        showAttackRadius: true,
        fillClaim: false,
        strokeClaim: true,
        chatNotifications: false,
    },
    graphics: {
        // low: false,
        fullscreen: false,
        autoHighlightDoors: false,
        snowflakes: true,
        centerScreen: true,
    },
    sound: {
        playSound: true,
        playMusic: true,
        jukebox: true,
    },
};

export var debug = {
    map: {
        world: true,
        darkness: false,
        simpleDarkness: false,
        ray: false,
        grid: false,
        position: false,
    },
    player: {
        box: false,
        position: false,
        path: false,
    },
    entity: {
        box: false,
        position: false,
        logOnClick: false,
    },
    network: {
        length: false,
        data: false,
    },
};
