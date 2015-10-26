//http://bl.ocks.org/tmcw/4494715
module.exports.jsonp = function (url, callback) {
  function rand() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      c = '', i = -1;
    while (++i < 15) c += chars.charAt(Math.floor(Math.random() * 52));
    return c;
  }

  function create(url) {
    var e = url.match(/callback=(\w+)/),
      c = e ? e[1] : rand();
    window[c] = function(data) {
      callback(data);
      delete window[c];
      script.remove();
    };
    return c;
  }

  var cb = create(url),
    script = d3.select('head')
    .append('script')
    .attr('type', 'text/javascript')
    .attr('src', url.replace(/(\{|%7B)callback(\{|%7D)/, cb));
};

module.exports.get = function get(url, callback, options) {
  options = options || {
    method: 'GET',
    data: null,
    responseType: 'text'
  };
  lastCall = { url: url, callback: callback };
  var request = XMLHttpRequest;
  // from d3.js
  if (global.XDomainRequest
      && !("withCredentials" in request)
      && /^(http(s)?:)?\/\//.test(url)) request = XDomainRequest;

  var req = new request();
  req.open(options.method, url, true);


  function respond() {
    var status = req.status, result;
    var r = options.responseType === 'arraybuffer' ? req.response: req.responseText;
    if (!status && r || status >= 200 && status < 300 || status === 304) {
      callback(req);
    } else {
      callback(null);
    }
  }

  "onload" in req
    ? req.onload = req.onerror = respond
    : req.onreadystatechange = function() { req.readyState > 3 && respond(); };

  req.onprogress = function() {};

  req.responseType = options.responseType; //'arraybuffer';
  if (options.data) {
    req.setRequestHeader("Content-type", "application/json");
    //req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    req.setRequestHeader("Accept", "*");
  }
  req.send(options.data);
  return req;
}
