// XXX speed hack
var random = Math.random
var sin = Math.sin
var cos = Math.cos
var PI = Math.PI

export function Snow(W, H) {
    var mp = 25 //max particles
    this.particles = []
    for(var i = 0; i < mp; i++) {
        this.particles.push({
            x: Math.random()*W,
            y: Math.random()*H,
            r: Math.random()*4+1,
            d: Math.random()*mp
        })
    }

    this.shit = loader.loadImage('shit.png')
    this.angle = 0
}

Snow.prototype.drawShit = function(ctx, camera) {
    var shit = this.shit
    var particles = this.particles
    for (var i = 0, l = particles.length; i < l; i++) {
        var p = particles[i]
        ctx.drawImage(shit, p.x + camera.x, p.y + camera.y)
    }
}

Snow.prototype.drawSnow = function(ctx, camera) {
    var particles = this.particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.beginPath()
    for (var i = 0, l = particles.length; i < l; i++) {
        var p = particles[i]
        var x = p.x + camera.x
        var y = p.y + camera.y
        ctx.moveTo(x, y)
        ctx.arc(x, y, p.r, 0, PI*2, true)
    }
    ctx.fill()
}

Snow.prototype.update = function(W, H) {
    this.angle += 0.01

    var particles = this.particles
    var angle = this.angle
    for (var i = 0, l = particles.length; i < l; i++) {
        var p = particles[i]
        p.y += cos(angle+p.d) + 1 + p.r/2
        p.x += sin(angle) * 2

        if(p.x > W+5 || p.x < -5 || p.y > H) {
            if(i%3 > 0) {
                p.x = random() * W
                p.y = -10
            } else {
                if(sin(angle) > 0) {
                    p.x = -5
                    p.y = random()*H
                } else {
                    p.x = W+5
                    p.y = random()*H
                }
            }
        }
    }
}
