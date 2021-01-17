#!/usr/bin/env node

const Koa = require('koa')
const koaBody = require('koa-body')
const Router = require('@koa/router')
const fs = require('fs')

const app = new Koa()
const router = new Router()
app.use((ctx, next) => {
  ctx.set('Vary', 'Origin')
  ctx.set('Access-Control-Allow-Origin', ctx.get('origin'))
  ctx.set('Access-Control-Allow-Credentials', 'true')
  ctx.set('Access-Control-Allow-Methods', ctx.get('Access-Control-Request-Method') || ctx.method)
  return next()
})
app.use(router.routes()).use(router.allowedMethods())
app.listen(process.env.PORT || 8081)

const badService = Symbol()
const statuses = {
  200: {},
  204: { keeerId: null },
  401: { [badService]: true },
  402: { kredit: 0 },
}
const tokenRe = /^0{8}-0{4}-0{4}-0(?<status>\d{3})-(?<id>[0-9a-f]{12})$/i
const getUser = getToken => (ctx, next) => {
  const token = getToken(ctx)
  if (!token) return next()
  const match = token.match(tokenRe)
  if (!match) return next()
  const { status, id } = match.groups
  if (status === '400') return ctx.body = invalid
  if (status === '429') return ctx.body = { status: 429, message: '您的操作过于频繁，请稍候再试。', code: 'EABUSE' }
  if (status === '500') return ctx.status = 500
  const name = 'User ' + id
  const base = { avatar: 'https://keeer.net/img/logo/dark-square.jpg', nickname: name, keeerId: id, kredit: 1e6 }
  if (status in statuses) ctx.state.user = { ...base, ...statuses[status] }
  return next()
}
const getCookieUser = getUser(ctx => ctx.cookies.get('kas-account-token'))
const getParamUser = getUser(ctx => ctx.params.token)

const invalid = { status: 1, message: '非法请求', code: 'EINVALID_REQUEST' }
const unauthorized = { status: -2, message: '您尚未登录', code: 'EUNAUTHORIZED' }
const notfound = { status: 2, message: '这个帐号不存在。', code: 'ENOTFOUND' }

const index = fs.readFileSync(require.resolve('./index.html'))
router.get('/', ctx => {
  ctx.body = index
  ctx.set('Content-Type', 'text/html; charset=utf-8')
})
router.get('/api/user-information', getCookieUser, ctx => {
  ctx.body = ctx.state.user
    ? { status: 0, result: ctx.state.user }
    : unauthorized
})
router.get('/api/:token/kiuid', getParamUser, ctx => {
  ctx.body = ctx.state.user
    ? ctx.state.user[badService]
      ? ctx.throw(401)
      : { status: 0, result: ctx.params.token }
    : notfound
})
router.post('/api/pay', koaBody(), (ctx, next) => {
  if (!ctx.request.body || !ctx.request.body.identity) return ctx.body = invalid
  if (ctx.request.body.type !== 'kiuid') {
    console.log('/api/pay supports KIUID paying only currently')
    return ctx.body = invalid
  }
  ctx.state.token = ctx.request.body.identity
  return next()
}, getUser(ctx => ctx.state.token), ctx => {
  const amount = ctx.request.body.amount
  if (amount <= 0 || amount >= 1e5 || !Number.isInteger(amount)) {
    return ctx.body = { status: 3, code: 'EINVALID_AMOUNT' }
  }
  if (!ctx.state.user) return ctx.body = notfound
  if (ctx.state.user.kredit < amount) return ctx.body = { status: 4, message: '余额不足', code: 'EINSUFFICIENT_KREDIT' }
  return { status: 0 }
})
router.get('/api/idframe', getCookieUser, ctx => {
  ctx.body = ctx.state.user
    ? 'console.log(' + JSON.stringify(ctx.state.user).replace(/\//g, '\\u002F') + ')'
    : 'console.log(\'not logged in\')'
  ctx.set('Content-Type', 'application/javascript; charset=utf-8')
  ctx.set('Cache-Control', 'max-age=0')
})
