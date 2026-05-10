interface RequestConfig {
  url?: string
  baseUrl?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  timeout?: number
  silent?: boolean
  retry?: number
  retryDelay?: number
}

interface InstanceDefaults {
  baseUrl: string
  header: Record<string, string>
  timeout: number
  silent: boolean
  retry: number
  retryDelay: number
}

interface WxRequestRes {
  statusCode: number
  data: any
  header: Record<string, string>
  cookies?: string[]
}

interface Interceptors {
  request: ((config: RequestConfig) => RequestConfig | Promise<RequestConfig>)[]
  response: ((res: any) => any | Promise<any>)[]
}

interface HttpInstance {
  defaults: InstanceDefaults
  interceptors: Interceptors
  request: (options: RequestConfig) => Promise<any>
  get: (url: string, data?: any, config?: Partial<RequestConfig>) => Promise<any>
  post: (url: string, data?: any, config?: Partial<RequestConfig>) => Promise<any>
  put: (url: string, data?: any, config?: Partial<RequestConfig>) => Promise<any>
  delete: (url: string, data?: any, config?: Partial<RequestConfig>) => Promise<any>
}

let _loadingCount = 0

function _showLoading(): void {
  if (_loadingCount === 0) {
    wx.showLoading({ title: '加载中', mask: true })
  }
  _loadingCount++
}

function _hideLoading(): void {
  _loadingCount = Math.max(0, _loadingCount - 1)
  if (_loadingCount === 0) {
    wx.hideLoading()
  }
}

function _runChain(chain: Function[], value: any): Promise<any> {
  let p = Promise.resolve(value)
  for (let i = 0; i < chain.length; i++) {
    p = p.then(chain[i] as (v: any) => any)
  }
  return p
}

function _delay(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function _wxRequest(config: RequestConfig): Promise<WxRequestRes> {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: config.url || '',
      method: config.method || 'GET',
      data: config.data,
      header: config.header || {},
      timeout: config.timeout || 15000,
      success: function (res) {
        resolve(res as WxRequestRes)
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

function create(baseConfig?: Partial<RequestConfig>): HttpInstance {
  baseConfig = baseConfig || {}

  const cfg: Partial<RequestConfig> = baseConfig || {}

  const instance: HttpInstance = {
    defaults: {
      baseUrl: cfg.baseUrl || '',
      header: cfg.header || {},
      timeout: cfg.timeout || 15000,
      silent: cfg.silent || false,
      retry: cfg.retry !== undefined ? cfg.retry : 0,
      retryDelay: cfg.retryDelay || 1000
    },
    interceptors: {
      request: [],
      response: []
    },
    request: function (): Promise<any> { return Promise.resolve() },
    get: function (): Promise<any> { return Promise.resolve() },
    post: function (): Promise<any> { return Promise.resolve() },
    put: function (): Promise<any> { return Promise.resolve() },
    delete: function (): Promise<any> { return Promise.resolve() }
  }

  // 内置 loading 拦截器
  instance.interceptors.request.push(function (config: RequestConfig) {
    if (!config.silent) _showLoading()
    return config
  })

  // 内置 auth 拦截器
  instance.interceptors.request.push(function (config: RequestConfig) {
    try {
      const token = wx.getStorageSync('auth_token')
      if (token) {
        config.header = config.header || {}
        config.header['Authorization'] = 'Bearer ' + token
      }
    } catch (e) { /* ignore */ }
    return config
  })

  // 内置 response 成功/错误拦截器
  instance.interceptors.response.push(function (res: any) {
    if (res._config && !res._config.silent) _hideLoading()

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data
    }

    const msg = (res.data && res.data.message) || '请求失败 (' + res.statusCode + ')'
    if (!res._config || !res._config.silent) {
      wx.showToast({ title: msg, icon: 'none' })
    }
    return Promise.reject({ statusCode: res.statusCode, message: msg, data: res.data, _loadingHandled: true })
  })

  function request(options: RequestConfig): Promise<any> {
    const config: RequestConfig = {
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
      .then(function (finalConfig: any) {
        return _doRequest(finalConfig, 0)
      })
  }

  function _doRequest(config: RequestConfig, attempt: number): Promise<any> {
    return _wxRequest(config)
      .then(function (res: WxRequestRes) {
        (res as any)._config = config
        return _runChain(instance.interceptors.response, res)
      })
      .catch(function (err: any) {
        if (config.retry && attempt < config.retry) {
          const backoff = config.retryDelay * Math.pow(2, attempt)
          return _delay(backoff).then(function () {
            return _doRequest(config, attempt + 1)
          })
        }
        if (!config.silent && !(err && err._loadingHandled)) {
          _hideLoading()
          wx.showToast({ title: '网络请求失败', icon: 'none' })
        }
        return Promise.reject(err)
      })
  }

  instance.request = request

  instance.get = function (url: string, data?: any, config?: Partial<RequestConfig>) {
    return request(Object.assign({ url: url, method: 'GET', data: data }, config))
  }

  instance.post = function (url: string, data?: any, config?: Partial<RequestConfig>) {
    return request(Object.assign({ url: url, method: 'POST', data: data }, config))
  }

  instance.put = function (url: string, data?: any, config?: Partial<RequestConfig>) {
    return request(Object.assign({ url: url, method: 'PUT', data: data }, config))
  }

  instance.delete = function (url: string, data?: any, config?: Partial<RequestConfig>) {
    return request(Object.assign({ url: url, method: 'DELETE', data: data }, config))
  }

  return instance
}

export = { create: create }
