function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function renderIcon(text, size, options) {
  const { bgColor, textColor, fontFamily, fontSizeRatio, bold, shape } = options

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)

  ctx.fillStyle = bgColor
  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (shape === 'rounded') {
    roundRect(ctx, 0, 0, size, size, size * 0.18)
    ctx.fill()
  } else {
    ctx.fillRect(0, 0, size, size)
  }

  const fontSize = Math.floor(size * fontSizeRatio)
  const weight = bold ? 'bold' : 'normal'
  ctx.font = `${weight} ${fontSize}px "${fontFamily}"`
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2 + size * 0.02)

  return canvas
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
}

export async function canvasToArrayBuffer(canvas) {
  const blob = await canvasToBlob(canvas)
  return blob.arrayBuffer()
}

export async function createIco(text, options) {
  const sizes = [256, 128, 48, 32, 16]
  const pngBuffers = []

  for (const size of sizes) {
    const canvas = renderIcon(text, size, options)
    const buf = await canvasToArrayBuffer(canvas)
    pngBuffers.push(buf)
  }

  const numImages = pngBuffers.length
  const headerSize = 6
  const entrySize = 16
  const dataStart = headerSize + entrySize * numImages

  let totalSize = dataStart
  for (const buf of pngBuffers) totalSize += buf.byteLength

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, numImages, true)

  let offset = dataStart
  for (let i = 0; i < numImages; i++) {
    const s = sizes[i]
    const png = pngBuffers[i]
    const pos = headerSize + i * entrySize

    view.setUint8(pos, s >= 256 ? 0 : s)
    view.setUint8(pos + 1, s >= 256 ? 0 : s)
    view.setUint8(pos + 2, 0)
    view.setUint8(pos + 3, 0)
    view.setUint16(pos + 4, 1, true)
    view.setUint16(pos + 6, 32, true)
    view.setUint32(pos + 8, png.byteLength, true)
    view.setUint32(pos + 12, offset, true)

    bytes.set(new Uint8Array(png), offset)
    offset += png.byteLength
  }

  return buffer
}
