/*jslint node:true nomen:true white:true eqeq:true */
'use strict';

/** deps */
var path = require('path'),
	fs = require('fs'),
	processor = require('stylus'),
	Cache = require('connect/lib/cache'),
	cache = new Cache();

/**
 * Configures stylus layer.
 * @type {Function}
 */
module.exports = function(options) {
	var files = options.stylesheets.files,
		envDev = 'development' == process.env.NODE_ENV;

	// removes all leading slashs if any
	files = files.map(function(entry) {
		return ('/' == entry.charAt('/') ? entry.slice(1) : entry);
	});

	function respond(res, entry, cacheHeader) {
		res.setHeader('Content-Type', 'text/css');
		res.setHeader('X-Cache', cacheHeader);
		res.send(200, entry[0]);
	}

	/**
	 * The actual Stylus layer, invoked for each request hit.
	 * Compiles a Stylus file into a CSS file.
	 *
	 * This is meant to be used with cache busting.
	 */
	return function stylus(req, res, next) {
		var baseUrl = req.baseUrl.slice(1),
			url = req.url.slice(1),
			entry;

		if (-1 != files.indexOf(url)) {
			// cache hit!
			if (!envDev && (entry = cache.get(baseUrl))) {
				respond(res, entry, 'HIT');
				return;
			}

			// cache miss
			var filename = path.join(options.root, url).replace(/\.css$/, '.styl');
			fs.readFile(filename, 'utf8', function(err, content) {
				if (err) {
					next(500);
					return;
				}

				processor.render(content, { filename: filename }, function(err, content) {
					if (err) {
						next(500);
						return;
					}

					entry = cache.add(baseUrl);
					entry.push(content);
					respond(res, entry, 'MISS');
				});
			});
		}
		else {
			next(null, req, res);
		}
	};
};
