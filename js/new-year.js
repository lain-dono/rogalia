'use strict'

var cnf = require('./config.js')
var config = cnf.config

module.exports = function Snow() {
    var W = game.screen.width;
    var H = game.screen.height;

    var mp = 25; //max particles
    var particles = [];
    for(var i = 0; i < mp; i++) {
	particles.push({
	    x: Math.random()*W,
	    y: Math.random()*H,
	    r: Math.random()*4+1,
	    d: Math.random()*mp
	});
    }

    var shit = loader.loadImage("shit.png");

    this.draw = function() {
        if (!config.graphics.snowflakes)
            return;
        var ctx = game.ctx;
	ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
	ctx.beginPath();
        particles.forEach(function(p) {
            var x = p.x + game.camera.x;
            var y = p.y + game.camera.y;
            if ("Vomit" in game.player.Effects) {
                ctx.drawImage(shit, x, y);
            } else {
	        ctx.moveTo(x, y);
	        ctx.arc(x, y, p.r, 0, Math.PI*2, true);
            }
	});
	ctx.fill();
    };

    var angle = 0;
    this.update = function() {
        if (!config.graphics.snowflakes)
            return;
        W = game.screen.width;
        H = game.screen.height;

	angle += 0.01;
        particles.forEach(function(p, i) {
	    p.y += Math.cos(angle+p.d) + 1 + p.r/2;
	    p.x += Math.sin(angle) * 2;

	    if(p.x > W+5 || p.x < -5 || p.y > H) {
		if(i%3 > 0) {
		    particles[i] = {x: Math.random()*W, y: -10, r: p.r, d: p.d};
		} else {
		    if(Math.sin(angle) > 0) {
			particles[i] = {x: -5, y: Math.random()*H, r: p.r, d: p.d};
		    } else {
			particles[i] = {x: W+5, y: Math.random()*H, r: p.r, d: p.d};
		    }
		}
	    }
	});
    };
}
