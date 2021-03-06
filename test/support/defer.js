/**!
 * koa-generic-session - test/support/defer.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */
var koa = require('koa');
var http = require('http');
var session = require('../../');
var Store = require('./store');

var app = koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

app.use(function*(next) {
  try {
    yield next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = err.message;
  }
});

var store = new Store();
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session',
  },
  defer: true,
  store: store,
  reconnectTimeout: 100
}));

// will ignore repeat session
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session'
  },
  defer: true
}));

app.use(function *controllers() {
  switch (this.request.url) {
  case '/favicon.ico':
    this.staus = 404;
    break;
  case '/wrongpath':
    this.body = this.session ? 'has session' : 'no session';
    break;
  case '/session/rewrite':
    this.session = {foo: 'bar'};
    this.body = yield this.session;
    break;
  case '/session/notuse':
    nosession(this);
    break;
  case '/session/get':
    yield get(this);
    break;
  case '/session/nothing':
    yield nothing(this);
    break;
  case '/session/remove':
    yield remove(this);
    break;
  case '/session/httponly':
    yield switchHttpOnly(this);
    break;
  case '/session/regenerate':
    yield regenerate(this);
    break;
  case '/session/regenerateWithData':
    var session = yield this.session;
    session.foo = 'bar';
    session = yield regenerate(this);
    this.body = { foo : session.foo, hasSession: session !== undefined };
    break;
  default:
    yield other(this);
  }
});

function nosession(ctx) {
  ctx.body = ctx._session !== undefined ? 'has session' : 'no session';
}

function *nothing(ctx) {
  ctx.body = (yield ctx.session).count;
}

function *get(ctx) {
  var session = yield ctx.session;
  session = yield ctx.session;
  session.count = session.count || 0;
  session.count++;
  ctx.body = session.count;
}

function *remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

function *switchHttpOnly(ctx) {
  var session = yield ctx.session;
  var httpOnly = session.cookie.httpOnly;
  session.cookie.httpOnly = !httpOnly;
  ctx.body = 'httpOnly: ' + !httpOnly;
}

function *other(ctx) {
  ctx.body = ctx.session ? 'has session' : 'no session';
}

function *regenerate(ctx) {
  var session = yield ctx.regenerateSession();
  session.data = 'foo';
  ctx.body = ctx.sessionId;
  return session;
}

// app.listen(7001)
var app = module.exports = http.createServer(app.callback());
app.store = store;
