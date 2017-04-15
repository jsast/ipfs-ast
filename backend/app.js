'use strict';

const path = require('path');
const http = require('http');

const middlewares = require('koa-middlewares');
const router = require('koa-router')();
const Koa = require('koa');
const views = require('koa-views');

const config = require('./config');

const node = require('./controllers/node');

let app = new Koa();

// ignore favicon

app.use(middlewares.favicon());

// response time header

app.use(middlewares.rt());

// static file server

app.use(middlewares.staticCache(path.join(__dirname, 'public'), {
  buffer: !config.debug,
  maxAge: config.debug ? 0 : 60 * 60 * 24 * 7 // one week
}));
app.use(middlewares.bodyParser());

// logging

if (config.debug && process.env.NODE_ENV !== 'test') {
  app.use(middlewares.logger());
}

// views

app.use(views(__dirname + '/views', {
  map: {
    html: 'handlebars'
  }
}));

// router

router.get('/view/:hash', node.get);
router.get('/download/:hash', node.download);

app.use(router.routes()).use(router.allowedMethods());

app = module.exports = http.createServer(app.callback());

if (!module.parent) {
  app.listen(config.port);
  console.log('$ open http://127.0.0.1:' + config.port);
}
