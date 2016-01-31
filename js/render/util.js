export function drawStrokedText(ctx, text, x, y, strokeStyle) {
    var lineJoin = ctx.lineJoin
    ctx.strokeStyle = strokeStyle || '#333'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)
    ctx.lineWidth = 1
    ctx.lineJoin = lineJoin
}

export function imageToCanvas(image, canvas) {
    canvas = canvas || document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    var ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    return ctx
}

export function canvasToImage(canvas) {
    var image = new Image()
    image.src = canvas.toDataURL('image/png')
    return image
}
