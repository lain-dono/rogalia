import {toScreen} from './point.js'

var k = Math.sqrt(2)
var PI = Math.PI

function isoInit(ctx, x, y) {
    ctx.save()

    if (ctx.lineWidth < 2) {
        ctx.lineWidth = 2
    }

    var p = toScreen({x: x, y: y})
    ctx.translate(p.x, p.y)
    ctx.scale(1, 0.5)
    ctx.rotate(PI / 4)
}

export function strokeRect(ctx, x, y, w, h) {
    isoInit(ctx, x, y)
    ctx.strokeRect(0, 0, w * k, h * k)
    ctx.restore()
}
export function fillRect(ctx, x, y, w, h) {
    isoInit(ctx, x, y)
    ctx.fillRect(0, 0, w * k, h * k)
    ctx.restore()
}
export function fillCircle(ctx, x, y, r) {
    isoInit(ctx, x, y)
    ctx.beginPath()
    ctx.arc(0, 0, r * k, 0, PI * 2)
    ctx.fill()
    ctx.restore()
}
export function strokeCircle(ctx, x, y, r) {
    isoInit(ctx, x, y)
    ctx.beginPath()
    ctx.arc(0, 0, r * k, 0, PI * 2)
    ctx.stroke()
    ctx.restore()
}
export function fillStrokedCircle(ctx, x, y, r) {
    fillCircle(ctx, x, y, r)
    strokeCircle(ctx, x, y, r)
}
export function fillStrokedRect(ctx, x, y, w, h) {
    fillRect(ctx, x, y, w, h)
    strokeRect(ctx, x, y, w, h)
}
