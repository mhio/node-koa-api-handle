/* global expect */
const supertest = require('supertest')
const http = require('http')
const Koa = require('koa')
const { Exception } = require('@mhio/exception')

const { KoaApiHandle } = require('../../src/KoaApiHandle')


describe('mh::test::int::KoaApiHandle', function(){

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

  it('should generate a koa notFound response', async function(){
    app.use(KoaApiHandle.notFound())
    let res = await request.get('/nonono')
    expect( res.status ).to.equal(404)
    expect( res.body ).to.containSubset({ error: { label: 'Not Found', details: '/nonono' }})
  })

  it('should handle a koa error', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.error())
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
      'x-request-id', 'x-transaction-id', 'x-powered-by', 'x-response-time'
    ])
  })

  it('should handle an incomingt x-transaction-id if trusted', async function(){
    let o = { ok: ()=> Promise.resolve('ok') }
    app.use(KoaApiHandle.tracking({ transaction_trust: true }))
    app.use(KoaApiHandle.response(o, 'ok'))
    let res = await request.get('/ok').set('x-transaction-id', 'wakka')
    expect( res.status ).to.equal(200)
    expect( res.body ).to.containSubset({ data: 'ok' })
    expect( res.headers ).to.contain.keys([
      'x-request-id', 'x-transaction-id', 'x-powered-by', 'x-response-time'
    ])
    expect( res.headers['x-transaction-id'] ).to.equal('wakka')
  })

  it('should handle a koa Exception', async function(){
    //app.on('error', KoaApiHandle.error())
    app.use(KoaApiHandle.error())
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( res.body ).to.containSubset({
      error: { 
        label: 'Request Error',
        message: 'oh no error',
        name: 'Exception'
      }
    })
  })

  it('should handle a koa Exception and send it to the logger', async function(){
    //app.on('error', KoaApiHandle.error())
    let test_msg
    let test_err
    // this could go horribly wrong if multiple tests accessed this endpoint
    app.use(KoaApiHandle.error({ logger: (msg, err)=> { test_msg = msg; test_err = err }}))
    app.use(ctx => {
      if ( ctx.request.url === '/error' ) throw new Exception('oh no error', { simple: 'error'} )
    })
    let res = await request.get('/error')
    expect( res.status ).to.equal(500)
    expect( test_msg ).to.equal('Error in [GET /error]')
    expect( test_err ).to.containSubset({
      label: 'Request Error',
      message: 'oh no error',
      name: 'Exception'
    })
  })
})
