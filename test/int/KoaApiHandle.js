/* global expect */
import supertest from 'supertest'
import http from 'http'
import Koa from 'koa'
import { Writable } from 'node:stream'
import { Exception } from '@mhio/exception'
import pino from 'pino'

import { KoaApiHandle } from '../../src/index.js'


export class MemoryStream extends Writable {
  logs = []
  _write(chunk, _, next){
    this.logs.push(JSON.parse(chunk.toString()))
    next()
  }
}

describe('mhio::test::int::KoaApiHandle', function(){

  let app = null
  let server = null
  let request

  beforeEach(function(done){
    app = new Koa()
    server = http.createServer(app.callback()).listen(done)
    request = supertest(server)
  })

  afterEach(function(done){
    server.close(done)
  })

  it('should generate a koa response', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.have.property('data').and.equal('ok')
  })

  it('should generate a koa response for a plain function', async function(){
    let o = ()=> Promise.resolve('ok')
    app.use(KoaApiHandle.response(o))
    let res = await request.get('/ok')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.have.property('data').and.equal('ok')
  })

  it('should generate a customResponse for an object', async function(){
    let o = {
      ok: () => {
        return Promise.resolve('ok')
      }
    } 
    app.use(KoaApiHandle.customResponse(o, 'ok'))
    let res = await request.get('/ok')
    expect( res.status ).to.equal(200)
    expect( res.headers['content-type'] ).to.eql('text/plain; charset=utf-8')
    expect( res.text ).to.equal('ok')
    expect( res.body ).to.eql({})
  })

  it('should generate a customResponse for a plain function', async function(){
    let o = () => {
      return Promise.resolve('ok')
    }
    app.use(KoaApiHandle.customResponse(o))
    let res = await request.get('/ok')
    expect( res.status ).to.equal(200)
    expect( res.text ).to.equal('ok')
    expect( res.body ).to.eql({})
  })

  it('should generate a koa notFound response', async function(){
    app.use(KoaApiHandle.notFound())
    let res = await request.get('/nonono')
    expect( res.status ).to.equal(404)
    expect( res.body ).to.containSubset({ error: { label: 'Not Found', details: '/nonono' }})
  })

  it('should handle a koa error', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.errors())
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Error('error')
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( res.body ).to.containSubset({ error: { label: 'Request Error' }})
  })

  it('should handle koa tracking', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.tracking())
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.containSubset({ data: 'ok' })
    expect( res.headers ).to.contain.keys([
      'x-request-id', 'x-transaction-id', 'x-response-time'
    ])
  })

  it('should handle an incoming x-transaction-id if trusted', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.tracking({ transaction_trust: true }))
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok').set('x-transaction-id', 'wakka')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.containSubset({ data: 'ok' })
    expect( res.headers ).to.contain.keys([
      'x-request-id', 'x-transaction-id', 'x-response-time'
    ])
    expect( res.headers['x-transaction-id'] ).to.equal('wakka')
  })

  it('should handle an incoming x-transaction-id if ip is trusted', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.tracking({ transaction_trust: 'ip', transaction_trust_ips: ['::ffff:127.0.0.1', '127.0.0.1', '::1'] }))
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok').set('x-transaction-id', 'wakka')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.containSubset({ data: 'ok' })
    expect( res.headers ).to.contain.keys([
      'x-request-id', 'x-transaction-id', 'x-response-time'
    ])
    expect( res.headers['x-transaction-id'] ).to.equal('wakka')
  })
  it('should handle an incoming x-transaction-id if ip is not trusted', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.tracking({ transaction_trust: 'ip', transaction_trust_ips: ['8.8.8.8'] }))
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok').set('x-transaction-id', 'wakka')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.containSubset({ data: 'ok' })
    expect( res.headers ).to.contain.keys([
      'x-request-id', 'x-transaction-id', 'x-response-time'
    ])
    expect( res.headers['x-transaction-id'] ).to.not.equal('wakka')
    expect( res.headers['x-transaction-id'] ).to.match(/^\w{18}$/)
  })
  it('should fail if `ip` and no trusted ips supplied', async function(){
    let fn = () => app.use(KoaApiHandle.tracking({ transaction_trust: 'ip' }))
    expect(fn).to.throw('must have a list')
  })
  it('should fail if `ip` and no trusted ips supplied', async function(){
    let fn = () => app.use(KoaApiHandle.tracking({ transaction_trust: 'ip', transaction_trust_ips: true }))
    expect(fn).to.throw('support `.includes`')
  })

  it('should handle a koa Exception', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.errors())
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( res.body ).to.containSubset({
      error: { 
        label: 'Request Error',
        message: 'error',
        name: 'Exception',
        simple: 'error',
      }
    })
  })

  it('should handle an allowed koa error with extra fields', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.errors({ allowed_errors: { Exception } }))
    app.use(() => {
      const err = new Exception('oh no error', { simple: 'error'} )
      err.something = 'something'
      throw err
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( res.body ).to.containSubset({
      error: { 
        label: 'Request Error',
        message: 'oh no error',
        name: 'Exception',
        simple: 'error',
        something: 'something',
      }
    })
  })

  it('should send stack if send full errors is on', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.errors({ send_full_errors: true }))
    app.use(() => {
      const err = new Exception('oh no error', { simple: 'error'} )
      err.something = 'something'
      throw err
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( res.body ).to.containSubset({
      error: {
        label: 'Request Error',
        message: 'oh no error',
        name: 'Exception',
        simple: 'error',
        something: 'something',
        stack: (val) => /^Exception: /.exec(val),
      }
    })
  })

  it('should handle a koa Exception and send the original to the pino logger', async function(){
    //app.on('error', KoaApiHandle.error())
    let mem = new MemoryStream()
    let logger = pino(mem)
    // this could go horribly wrong if multiple tests accessed this endpoint
    app.use(KoaApiHandle.errors({ logger }))
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( mem.logs[0].msg ).to.equal('Error in [GET /error]')

    expect( mem.logs[0].message ).to.equal('oh no error')
    // expect( mem.logs[0].name ).to.equal('Exception')
    expect( mem.logs[0].status ).to.be.undefined
    expect( mem.logs[0].error.simple ).to.equal('error')
  })

  it('should handle a koa Exception and send it to the logger console API', async function(){
    let mem = new MemoryStream()
    let logger = pino(mem)
    // this could go horribly wrong if multiple tests accessed this endpoint
    app.use(KoaApiHandle.errors({ logger }))
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( mem.logs[0].msg ).to.equal('Error in [GET /error]')
    
    expect( mem.logs[0].error.message ).to.equal('oh no error')
    expect( mem.logs[0].error.status ).to.be.undefined
    expect( mem.logs[0].error.simple ).to.equal('error')

    expect( res.body.error.label ).to.equal('Request Error')
    expect( res.body.error.message ).to.equal('error')
    expect( res.body.error.name ).to.equal('Exception')
    expect( res.body.error.status ).to.equal(500)
    expect( res.body.error.simple ).to.equal('error')
  })

  it('should handle a koa Exception and send the plain ctx object  to the logger', async function(){
    //app.on('error', KoaApiHandle.error())
    let test_ctx
    let test_err
    // this could go horribly wrong if multiple tests accessed this endpoint
    app.use(KoaApiHandle.errors({
      logger: (ctx, err)=> { test_ctx = ctx; test_err = err },
      logger_pass_args: true,
    }))
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( test_ctx ).to.containSubset({
      originalUrl: '/error',
      method: 'GET',
    })
    expect( test_err.message ).to.equal('oh no error')
    expect( test_err.name ).to.equal('Exception')
    expect( test_err.status ).to.be.undefined
    expect( test_err.simple ).to.equal('error')
  })


  describe('logging', function(){
    it('should run a logger', async function(){
      let mem = new MemoryStream()
      let logger = pino(mem)
      app.use(KoaApiHandle.logging({ logger }))
      app.use(ctx => ctx.body = 'response')
      await request.get('/request')
      expect(mem.logs[0]).to.containSubset({
        req: {
          headers: {},
          method: 'GET',
          url: '/request',
        },
        res: {
          headers: {},
          statusCode: 200,
        }
      })
    })
    it('should run a logger on error', async function(){
      let mem = new MemoryStream()
      let logger = pino(mem)
      app.use(KoaApiHandle.logging({ logger }))
      app.use(() => { let err = new Error('nope'); err.code = 'wat'; throw err })
      await request.get('/error')
      expect(mem.logs[0]).to.containSubset({
        err: { message: 'nope', code: 'wat' },
        reqId: 1,
      })
    })
  })
  
  describe('poweredBy', function(){
    it('should include a default', async function(){
      app.use(KoaApiHandle.poweredBy())
      const res = await request.get('/error')
      expect(res.headers).to.containSubset({ 'x-powered-by': 'handles' })
    })
    it('should include a default', async function(){
      app.use(KoaApiHandle.poweredBy('test'))
      const res = await request.get('/error')
      expect(res.headers).to.containSubset({ 'x-powered-by': 'test' })
    })
  })
})
