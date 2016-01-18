'use strict'

var Stage = require('./stage.js')
var Character = require('../character.js')
var Entity = require('../entity.js')
var cnf = require('../config.js')

Stage.add(loadingStage);
window.loadingStage = loadingStage

function loadingStage(data) {
    /*jshint validthis:true */

    game.addEventListeners();

    var forceUpdate = ("Version" in data);
    ["Version", "Recipes", "EntitiesTemplates"].forEach(function(key) {
        if (forceUpdate) {
            localStorage.setItem(key, JSON.stringify(data[key]));
        } else {
            data[key] = JSON.parse(localStorage.getItem(key));
        }
    });
    Character.skillLvls = data.SkillLvls;
    Character.initSprites();
    game.map.init(data.Bioms, data.Map);
    //for [*add item]
    Entity.init(data.EntitiesTemplates);
    Entity.recipes = data.Recipes;
    Entity.metaGroups = data.MetaGroups;
    game.initTime(data.Time, data.Tick);

    this.sync = function(data) {
        //TODO: don't send them!
        // ignore non init packets
        if (!("Location" in data))
            return;
        game.setTime(data.Time);
        loader.ready(function() {
            Entity.sync(data.Entities);
            Character.sync(data.Players);
            Character.sync(data.Mobs);
            Character.sync(data.NPCs);
            game.map.sync(data.Location);

            var wait = setInterval(function() {
                if (!game.map.ready)
                    return;
                var ready = game.entities.every(function(e) {
                    return e.sprite.ready;
                });

                if (!ready)
                    return;

                clearInterval(wait);
                game.setStage("main", data);
            }, 100);
        });
    };

    this.draw = function() {
        game.ctx.clear();
        game.ctx.fillStyle = "#fff";
        game.forceDrawStrokedText(
            game.loader.status,
            cnf.CELL_SIZE,
            cnf.CELL_SIZE
        );
    };
}
