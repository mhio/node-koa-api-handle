
const { KoaApiHandle } = require('../../src/KoaApiHandle')
const Koa = require('koa')

describe('mh::test::int::KoaApiHandle', function(){

  let app = null

  beforeEach(function(){
    app = new Koa()
  })

  it('should generate a koa response', function(){
    app.use(KoaApiHandle.notFound())
    expect()  
  })

  it('should generate a koa notFound response', function(){
    app.use(KoaApiHandle.notFound())
    expect()  
  })

  it('should handle a koa error', function(){
    app.on('error', KoaApiHandle.error())
    expect()
  })

})