function getByPath(obj, path) {
  var match = path.match(/^([^[.]+)/)
  if (!match) return undefined
  var val = obj[match[1]]
  var rest = path.slice(match[0].length)

  while (rest && val != null) {
    var arrMatch = rest.match(/^\[(\d+)\]/)
    var dotMatch = rest.match(/^\.([^[.]+)/)
    if (arrMatch) {
      val = val[parseInt(arrMatch[1])]
      rest = rest.slice(arrMatch[0].length)
    } else if (dotMatch) {
      val = val[dotMatch[1]]
      rest = rest.slice(dotMatch[0].length)
    } else {
      break
    }
  }
  return val
}

function smartSetData(ctx, data, callback) {
  var patch = {}
  var hasChange = false

  for (var key in data) {
    var newVal = data[key]
    var oldVal = key.indexOf('.') !== -1 || key.indexOf('[') !== -1
      ? getByPath(ctx.data, key)
      : ctx.data[key]

    if (oldVal !== newVal) {
      patch[key] = newVal
      hasChange = true
    }
  }

  if (hasChange) {
    ctx.setData(patch, callback)
  } else if (callback) {
    callback()
  }
}

function createBatcher(ctx, delay) {
  var pending = null
  var timer = null

  return function batch(data, callback) {
    pending = Object.assign(pending || {}, data)
    if (timer) return
    timer = setTimeout(function () {
      var payload = pending
      pending = null
      timer = null
      ctx.setData(payload, callback)
    }, delay || 16)
  }
}

module.exports = {
  smartSetData: smartSetData,
  createBatcher: createBatcher
}
