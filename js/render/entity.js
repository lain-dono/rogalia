import {Point, toScreen} from './point.js'
import * as iso from './iso.js'

export function drawCenter(ctx, p) {
    ctx.fillStyle = 'magenta'
    ctx.fillRect(p.x, p.y, 3, 3)
}

export function fillClaim(ctx, w, h, x, y, isCreator) {
    var color = isCreator ? '255,255,255' : '255,0,0'
    ctx.fillStyle = 'rgba(' + color + ', 0.3)'
    iso.fillRect(ctx, x, y, w, h)
}
export function strokeClaim(ctx, w, h, x, y, isCreator) {
    var color = isCreator ? '255,255,255' : '255,0,0'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(' + color + ', 0.7)'
    iso.strokeRect(ctx, x, y, w, h)
    ctx.lineWidth = 1
}

function roundBox(val, by) {
    return (val - by / 2) | 0
}

export function fillStrokedBox(ctx, isRound, x, y, w, h, radius, color) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#fff'
    ctx.fillStyle = color
    if (isRound) {
        iso.fillStrokedCircle(ctx, x, y, radius)
    } else {
        iso.fillStrokedRect(ctx, roundBox(x, w), roundBox(y, h), w, h)
    }
    ctx.restore()
}

export function fillBox(ctx, isRound, x, y, w, h, radius, color) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = color
    if (isRound) {
        iso.fillCircle(ctx, x, y, radius)
    } else {
        iso.fillRect(ctx, roundBox(x, w), roundBox(y, h), w, h)
    }
    ctx.restore()
}
