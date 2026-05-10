var _loadingCount = 0

function _showLoading() {
  if (_loadingCount === 0) {
    wx.showLoading({ title: '加载中', mask: true })
  }
  _loadingCount++
}

function _hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1)
  if (_loadingCount === 0) {
    wx.hideLoading()
  }
}

function _runChain(chain, value) {
  var p = Promise.resolve(value)
  for (var i = 0; i < chain.length; i++) {
    p = p.then(chain[i])
  }
  return p
}

function _delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function _wxRequest(config) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: config.url,
      method: config.method || 'GET',
      data: config.data,
      header: config.header || {},
      timeout: config.timeout || 15000,
      success: function (res) {
        resolve(res)
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

function create(baseConfig) {
  baseConfig = baseConfig || {}

  var instance = {
    defaults: {
      baseUrl: baseConfig.baseUrl || '',
      header: baseConfig.header || {},
      timeout: baseConfig.timeout || 15000,
      retry: baseConfig.retry || 0,
      retryDelay: baseConfig.retryDelay || 1000
    },

    interceptors: {
      request: [],
      response: []
    }
  }

  // 内置 loading 拦截器
  instance.interceptors.request.push(function (config) {
    if (!config.silent) _showLoading()
    return config
  })

  // 内置 auth 拦截器
  instance.interceptors.request.push(function (config) {
    try {
      var token = wx.getStorageSync('auth_token')
      if (token) {
        config.header = config.header || {}
        config.header['Authorization'] = 'Bearer ' + token
      }
    } catch (e) { /* ignore */ }
    return config
  })

  // 内置 response 成功/错误拦截器
  instance.interceptors.response.push(function (res) {
    if (res._config && !res._config.silent) _hideLoading()

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data
    }

    var msg = (res.data && res.data.message) || '请求失败 (' + res.statusCode + ')'
    if (!res._config || !res._config.silent) {
      wx.showToast({ title: msg, icon: 'none' })
    }
    return Promise.reject({ statusCode: res.statusCode, message: msg, data: res.data })
  })

  function request(options) {
    var config = {
      url: instance.defaults.baseUrl + (options.url || ''),
      method: options.method || 'GET',
      data: options.data,
      header: Object.assign({}, instance.defaults.header, options.header),
      timeout: options.timeout || instance.defaults.timeout,
      silent: options.silent || false,
      retry: options.retry !== undefined ? options.retry : instance.defaults.retry,
      retryDelay: options.retryDelay || instance.defaults.retryDelay
    }

    return _runChain(instance.interceptors.request, config)
      .then(function (finalConfig) {
        return _doRequest(finalConfig, 0)
      })
  }

  function _doRequest(config, attempt) {
    return _wxRequest(config)
      .then(function (res) {
        res._config = config
        return _runChain(instance.interceptors.response, res)
      })
      .catch(function (err) {
        if (config.retry && attempt < config.retry) {
          var backoff = config.retryDelay * Math.pow(2, attempt)
          return _delay(backoff).then(function () {
            return _doRequest(config, attempt + 1)
          })
        }
        if (!config.silent) {
          _hideLoading()
          wx.showToast({ title: '网络请求失败', icon: 'none' })
        }
        return Promise.reject(err)
      })
  }

  instance.request = request

  instance.get = function (url, data, config) {
    return request(Object.assign({ url: url, method: 'GET', data: data }, config))
  }

  instance.post = function (url, data, config) {
    return request(Object.assign({ url: url, method: 'POST', data: data }, config))
  }

  instance.put = function (url, data, config) {
    return request(Object.assign({ url: url, method: 'PUT', data: data }, config))
  }

  instance.delete = function (url, data, config) {
    return request(Object.assign({ url: url, method: 'DELETE', data: data }, config))
  }

  return instance
}

module.exports = { create: create }
