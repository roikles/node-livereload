// Generated by CoffeeScript 1.8.0
(function() {
  var Server, defaultExclusions, defaultExts, defaultPort, fs, http, https, path, protocol_version, url, ws;

  fs = require('fs');

  path = require('path');

  ws = require('websocket.io');

  http = require('http');

  https = require('https');

  url = require('url');

  protocol_version = '1.6';

  defaultPort = 35729;

  defaultExts = ['html', 'css', 'js', 'png', 'gif', 'jpg', 'php', 'php5', 'py', 'rb', 'erb', 'coffee'];

  defaultExclusions = [/\\.git\//, /\\.svn\//, /\\.hg\//];

  Server = (function() {
    function Server(config) {
      var _base, _base1, _base2, _base3, _base4, _base5, _base6, _base7, _base8, _base9;
      this.config = config;
      if (this.config == null) {
        this.config = {};
      }
      if ((_base = this.config).version == null) {
        _base.version = protocol_version;
      }
      if ((_base1 = this.config).port == null) {
        _base1.port = defaultPort;
      }
      if ((_base2 = this.config).exts == null) {
        _base2.exts = [];
      }
      if ((_base3 = this.config).exclusions == null) {
        _base3.exclusions = [];
      }
      this.config.exts = this.config.exts.concat(defaultExts);
      this.config.exclusions = this.config.exclusions.concat(defaultExclusions);
      if ((_base4 = this.config).applyJSLive == null) {
        _base4.applyJSLive = false;
      }
      if ((_base5 = this.config).applyCSSLive == null) {
        _base5.applyCSSLive = true;
      }
      if ((_base6 = this.config).applyImgLive == null) {
        _base6.applyImgLive = true;
      }
      if ((_base7 = this.config).originalPath == null) {
        _base7.originalPath = '';
      }
      if ((_base8 = this.config).overrideURL == null) {
        _base8.overrideURL = '';
      }
      if ((_base9 = this.config).interval == null) {
        _base9.interval = 1000;
      }
      this.sockets = [];
    }

    Server.prototype.listen = function() {
      this.debug("LiveReload is waiting for browser to connect.");
      if (this.config.server) {
        this.config.server.listen(this.config.port);
        this.server = ws.attach(this.config.server);
      } else {
        this.server = ws.listen(this.config.port);
      }
      this.server.on('connection', this.onConnection.bind(this));
      return this.server.on('close', this.onClose.bind(this));
    };

    Server.prototype.onConnection = function(socket) {
      this.debug("Browser connected.");
      socket.send("!!ver:" + this.config.version);
      socket.on('message', (function(_this) {
        return function(message) {
          if (_this.config.debug) {
            return _this.debug("Browser URL: " + message);
          }
        };
      })(this));
      socket.on('error', (function(_this) {
        return function(err) {
          return _this.debug("Error in client socket: " + err);
        };
      })(this));
      return this.sockets.push(socket);
    };

    Server.prototype.onClose = function(socket) {
      return this.debug("Browser disconnected.");
    };

    Server.prototype.walkTree = function(dirname, callback) {
      var exclusions, exts, walk;
      exts = this.config.exts;
      exclusions = this.config.exclusions;
      walk = function(dirname) {
        return fs.readdir(dirname, function(err, files) {
          if (err) {
            return callback(err);
          }
          return files.forEach(function(file) {
            var exclusion, filename, _i, _len;
            filename = path.join(dirname, file);
            for (_i = 0, _len = exclusions.length; _i < _len; _i++) {
              exclusion = exclusions[_i];
              if (filename.match(exclusion)) {
                return;
              }
            }
            return fs.stat(filename, function(err, stats) {
              var ext, _j, _len1, _results;
              if (!err && stats.isDirectory()) {
                return walk(filename);
              } else {
                _results = [];
                for (_j = 0, _len1 = exts.length; _j < _len1; _j++) {
                  ext = exts[_j];
                  if (!(filename.match("\\." + ext + "$"))) {
                    continue;
                  }
                  callback(err, filename);
                  break;
                }
                return _results;
              }
            });
          });
        });
      };
      return walk(dirname, callback);
    };

    Server.prototype.watch = function(dirname) {
      if (typeof dirname === "string") {
        dirname = [dirname];
      }
      return dirname.forEach((function(_this) {
        return function(dir) {
          return _this.walkTree(dir, function(err, filename) {
            if (err) {
              throw err;
            }
            return fs.watchFile(filename, {
              interval: _this.config.interval
            }, function(curr, prev) {
              if (curr.mtime > prev.mtime) {
                return _this.refresh(filename);
              }
            });
          });
        };
      })(this));
    };

    Server.prototype.refresh = function(path) {
      var data, socket, _i, _len, _ref, _results;
      if (this.config.debug) {
        this.debug("Refresh: " + path);
      }
      data = JSON.stringify([
        'refresh', {
          path: path,
          apply_js_live: this.config.applyJSLive,
          apply_css_live: this.config.applyCSSLive,
          apply_img_live: this.config.applyImgLive,
          original_path: this.config.originalPath,
          override_url: this.config.overrideURL
        }
      ]);
      _ref = this.sockets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        socket = _ref[_i];
        _results.push(socket.send(data));
      }
      return _results;
    };

    Server.prototype.debug = function(str) {
      if (this.config.debug) {
        return console.log("" + str + "\n");
      }
    };

    return Server;

  })();

  exports.createServer = function(config) {
    var app, requestHandler, server;
    if (config == null) {
      config = {};
    }
    requestHandler = function(req, res) {
      if (url.parse(req.url).pathname === '/livereload.js') {
        res.writeHead(200, {
          'Content-Type': 'text/javascript'
        });
        return res.end(fs.readFileSync(__dirname + '/../ext/livereload.js'));
      }
    };
    if (config.https == null) {
      app = http.createServer(requestHandler);
    } else {
      app = https.createServer(config.https, requestHandler);
    }
    if (config.server == null) {
      config.server = app;
    }
    server = new Server(config);
    server.listen();
    return server;
  };

}).call(this);
