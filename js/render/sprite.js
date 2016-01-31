var Sprite = require('pixi.js/src/core/sprites/Sprite.js')
var Texture = require('pixi.js/src/core/textures/Texture.js')
var ticker = require('pixi.js/src/core/ticker')

var remove = false
if (!window.PIXI) {
    window.PIXI = {
        filters: {
            AbstractFilter: require('pixi.js/src/core/renderers/webgl/filters/AbstractFilter.js'),
        }
    }
    remove = true
}
var OutlineFilter = require('pixi-extra-filters/src/filters/outline/OutlineFilter.js');
if (remove) {
    delete window.PIXI
}

function AnimatedSprite(path, width, height, speed) {
    //Sprite.call(this, null);

    this.name = "";
    this.image = null;
    this.outline = null;
    this.imageData = null;

    this.width = width || 0;
    this.height = height || 0;

    this.dy = 0; //used for animations

    this.speed = speed || 100;
    this.frame = 0;

    this.position = 0;
    this.lastUpdate = 0;

    this.frames = {};
    this.ready = false;
    this.loading = false;

    this.pending = [];

    this._onload = null;
    this._path = null;

    if (path)
        this.load(path);


    this._currentTime = 0;

    return
    this.outlineFilter = new OutlineFilter(
            game.renderer.width, game.renderer.height,
            4, 0xFFFFFF)
}

// constructor
//AnimatedSprite.prototype = Object.create(Sprite.prototype);
AnimatedSprite.prototype.constructor = AnimatedSprite;
module.exports = AnimatedSprite

Object.defineProperties(AnimatedSprite.prototype, {
    onload: {
        set: function(callback) {
            this._onload = callback;
            if (this.ready)
                this._onload();
        },
    },
    // TODO outline thicknes
    outlineColor: {
        get: function() { return this.outlineFilter.color },
        set: function(val) { this.outlineFilter.color = val },
    },
    // on/off outline filter
    isOutline: {
        get: function() {
            return this.filters.indexOf(this.outlineFilter) != -1
        },
        set: function(val) {
            var idx = this.filters.indexOf(this.outlineFilter)
            if (val) {
                if (idx == -1) {
                    this.outlineFilter.viewWidth = game.renderer.width
                    this.outlineFilter.viewHeight = game.renderer.height

                    this.filters.push(this.outlineFilter)
                }
            } else {
                if (idx != -1) {
                    this.filters.splice(idx, 1)
                }
            }
        },
    },
})

AnimatedSprite.prototype.load = function(path) {
    if (this.loading || this._path == path)
        return;
    this._path = path;
    this.loading = true;
    this.image = loader.loadImage(path);
    loader.ready(()=> {
        if (this.width === 0)
            this.width = this.image.width;
        if (this.height === 0)
            this.height = this.image.height;

        this.makeOutline();
        this.ready = true;
        this.loading = false;

        var canvas = null;
        while ((canvas = this.pending.pop())) {
            this.renderIcon(canvas);
        }
        if (this._onload) {
            this._onload();
        }
    })
}
AnimatedSprite.prototype.makeOutline = function() {
    if (!this.image.width)
        return;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var w = this.image.width;
    var h = this.image.height;
    canvas.width = w;
    canvas.height = h;
    canvas.ctx = ctx;

    ctx.drawImage(this.image, 0, 0);
    this.imageData = ctx.getImageData(0, 0, w, h);

    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    this.outline = canvas;
}
AnimatedSprite.prototype.drawAlpha = function(p, alpha) {
    game.ctx.globalAlpha = alpha;
    this.draw(p);
    game.ctx.globalAlpha = 1;
}
AnimatedSprite.prototype.draw = function(p) {
    if (this.image.width === 0 || this.frame * this.width + this.width > this.image.width) {
        return;
    }
    // try {
    game.ctx.drawImage(
        this.image,
        this.frame * this.width,
        this.position * this.height,
        this.width,
        this.height,
        p.x,
        p.y + this.dy,
        this.width,
        this.height
    );
    // } catch(e) {
    //     console.log(
    //         this,
    //         this.frame * this.width,
    //         this.position * this.height,
    //         p.x,
    //         p.y
    //     );
    // }
}
AnimatedSprite.prototype.drawOutline = function(p) {
    if (!this.outline)
        return;
    game.ctx.globalAlpha = 0.4;
    var w = this.width;
    var h = this.height;
    game.ctx.drawImage(
        this.outline,
        this.width * this.frame,
        this.height * this.position,
        w, h,
        p.x, p.y,
        w, h
    );
    game.ctx.globalAlpha = 1;
}
AnimatedSprite.prototype.animate = function() {
    if (this.width == this.image.width)
        return;

    var now = Date.now()
    var deltaTime = now - this.lastUpdate
    if (deltaTime >= this.speed) {
        this.lastUpdate += deltaTime;
        this.frame++;
        if (this.frame * this.width >= this.image.width) {
            this.frame = 0;
        }
    }

    this._animate(deltaTime)
}

AnimatedSprite.prototype._animate = function(deltaTime) {
    var elapsed = this.speed * deltaTime;

    /*
    var elapsed = this.animationSpeed * deltaTime;

    if (this._durations !== null) {
        var lag = this._currentTime % 1 * this._durations[this.currentFrame];

        lag += elapsed / 60 * 1000;

        while (lag < 0) {
            this._currentTime--;
            lag += this._durations[this.currentFrame];
        }

        var sign = Math.sign(this.animationSpeed * deltaTime);
        this._currentTime = Math.floor(this._currentTime);

        while (lag >= this._durations[this.currentFrame]) {
            lag -= this._durations[this.currentFrame] * sign;
            this._currentTime += sign;
        }

        this._currentTime += lag / this._durations[this.currentFrame];
    } else {
        this._currentTime += elapsed;
    }

    if (this._currentTime < 0 && !this.loop) {
        this.gotoAndStop(0);

        if (this.onComplete) {
            this.onComplete();
        }
    } else if (this._currentTime >= this._textures.length && !this.loop) {
        this.gotoAndStop(this._textures.length - 1);

        if (this.onComplete) {
            this.onComplete();
        }
    } else {
        this._texture = this._textures[this.currentFrame];
    }
    */
}

AnimatedSprite.prototype.icon = function() {
    var canvas = document.createElement("canvas");
    if (this.ready) {
        this.renderIcon(canvas);
    } else {
        this.pending.push(canvas);
    }
    return canvas;
}
AnimatedSprite.prototype.renderIcon = function(canvas) {
    canvas.width = this.width;
    canvas.height = this.height;
    //try {
        canvas.getContext('2d').drawImage(
            this.image,
            0, 0, this.width, this.height,
            0, 0, this.width, this.height
        );
    //} catch(e) {
        //game.sendError("Cannot load " + this.name + " icon");
    //}
}

/*
function MovieClip(textures) {
    Sprite.call(this, textures[0] instanceof Texture ? textures[0] : textures[0].texture);

    this._durations = null;
    this.textures = textures;
    this.animationSpeed = 1;
    this.loop = true;
    this.onComplete = null;
    this._currentTime = 0;
    this.playing = false;
}

Object.defineProperties(MovieClip.prototype, {
    totalFrames: {
        get: function()
        {
            return this._textures.length;
        }
    },
    textures: {
        get: function ()
        {
            return this._textures;
        },
        set: function (value)
        {
            if(value[0] instanceof Texture)
            {
                this._textures = value;
                this._durations = null;
            }
            else
            {
                this._textures = [];
                this._durations = [];
                for(var i = 0; i < value.length; i++)
                {
                    this._textures.push(value[i].texture);
                    this._durations.push(value[i].time);
                }
            }
        }
    },
    currentFrame: {
        get: function ()
        {
            var currentFrame = Math.floor(this._currentTime) % this._textures.length;
            if (currentFrame < 0)
            {
                currentFrame += this._textures.length;
            }
            return currentFrame;
        }
    }

});

MovieClip.prototype.stop = function ()
{
    if(!this.playing)
    {
        return;
    }

    this.playing = false;
    ticker.shared.remove(this.update, this);
};

MovieClip.prototype.play = function ()
{
    if(this.playing)
    {
        return;
    }

    this.playing = true;
    ticker.shared.add(this.update, this);
};

MovieClip.prototype.gotoAndStop = function (frameNumber)
{
    this.stop();

    this._currentTime = frameNumber;

    this._texture = this._textures[this.currentFrame];
};

MovieClip.prototype.gotoAndPlay = function (frameNumber)
{
    this._currentTime = frameNumber;

    this.play();
};

MovieClip.prototype.update = function (deltaTime)
{
    var elapsed = this.animationSpeed * deltaTime;

    if (this._durations !== null)
    {
        var lag = this._currentTime % 1 * this._durations[this.currentFrame];

        lag += elapsed / 60 * 1000;

        while (lag < 0)
        {
            this._currentTime--;
            lag += this._durations[this.currentFrame];
        }

        var sign = Math.sign(this.animationSpeed * deltaTime);
        this._currentTime = Math.floor(this._currentTime);

        while (lag >= this._durations[this.currentFrame])
        {
            lag -= this._durations[this.currentFrame] * sign;
            this._currentTime += sign;
        }

        this._currentTime += lag / this._durations[this.currentFrame];
    }
    else
    {
        this._currentTime += elapsed;
    }

    if (this._currentTime < 0 && !this.loop)
    {
        this.gotoAndStop(0);

        if (this.onComplete)
        {
            this.onComplete();
        }
    }
    else if (this._currentTime >= this._textures.length && !this.loop)
    {
        this.gotoAndStop(this._textures.length - 1);

        if (this.onComplete)
        {
            this.onComplete();
        }
    }
    else
    {
        this._texture = this._textures[this.currentFrame];
    }

};

MovieClip.prototype.destroy = function ( )
{
    this.stop();
    Sprite.prototype.destroy.call(this);
};

MovieClip.fromFrames = function (frames)
{
    var textures = [];

    for (var i = 0; i < frames.length; ++i)
    {
        textures.push(new Texture.fromFrame(frames[i]));
    }

    return new MovieClip(textures);
};

MovieClip.fromImages = function (images)
{
    var textures = [];

    for (var i = 0; i < images.length; ++i)
    {
        textures.push(new Texture.fromImage(images[i]));
    }

    return new MovieClip(textures);
};
*/
