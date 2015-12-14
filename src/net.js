var d3 = require('d3')

// http://bl.ocks.org/tmcw/4494715
module.exports.jsonp = function (url, callback) {
  function rand () {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    var c = ''
    var i = -1
    while (++i < 15) c += chars.charAt(Math.floor(Math.random() * 52))
    return c
  }

  function create (url) {
    var e = url.match(/callback=(\w+)/)
    var c = e ? e[1] : rand()
    window[c] = function (data) {
      callback(data)
      delete window[c]
      script.remove()
    }
    return c
  }

  var cb = create(url)
  var script = d3.select('head')
      .append('script')
      .attr('type', 'text/javascript')
      .attr('src', url.replace(/(\{|%7B)callback(\{|%7D)/, cb))
}

module.exports.get = function get (url, callback, options) {
  options = options || {
    method: 'GET',
    data: null,
    responseType: 'text'
  }
  var Request = window.XMLHttpRequest
  // from d3.js
  if (global.XDomainRequest &&
    !('withCredentials' in Request) &&
    /^(http(s)?:)?\/\//.test(url)) Request = global.XDomainRequest

  var req = new Request()
  req.open(options.method, url, true)

  function respond () {
    var status = req.status
    var r = options.responseType === 'arraybuffer' ? req.response : req.responseText
    if (!status && r || status >= 200 && status < 300 || status === 304) {
      callback(req)
    } else {
      callback(null)
    }
  }

  'onload' in req
    ? req.onload = req.onerror = respond
    : req.onreadystatechange = function () { req.readyState > 3 && respond() }

  req.onprogress = function () {}

  req.responseType = options.responseType // 'arraybuffer'
  if (options.data) {
    req.setRequestHeader('Content-type', 'application/json')
    // req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    req.setRequestHeader('Accept', '*')
  }
  req.send(options.data)
  return req
}
