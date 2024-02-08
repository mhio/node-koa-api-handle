/* global expect */

import { KoaApiHandle } from '../../src/KoaApiHandle.js'
const noop = function(){}
const o = { noop }

describe('mhio::test::unit::KoaApiHandle', function(){

  it('should load KoaApiHandle', function(){
    expect( KoaApiHandle ).to.be.ok    
  })
  
  it('should not create a KoaApiHandle', function(){
    let fn = () => new KoaApiHandle()
    expect( fn ).to.throw('No class')
  })

  it('should return a response function', function(){
    expect( KoaApiHandle.response(noop) ).to.be.a('function')
  })
  it('should return a response object.function', function(){
    expect( KoaApiHandle.response(o,'noop') ).to.be.a('function')
  })

  it('should return a customResponse function', function(){
    expect( KoaApiHandle.customResponse(noop) ).to.be.a('function')
  })
  it('should return a customResponse object.function', function(){
    expect( KoaApiHandle.customResponse(o,'noop') ).to.be.a('function')
  })
  
  it('should return a customResponse function', async function(){
    let handler = KoaApiHandle.customResponse(()=> Promise.resolve('one'))
    let ctx = {}
    await handler(ctx)
    expect( ctx.body ).to.equal('one')
  })

  it('should return a notFound function', function(){
    expect( KoaApiHandle.notFound() ).to.be.a('function')
  })

  it('should return an error function', function(){
    expect( KoaApiHandle.errors() ).to.be.a('function')
  })

  it('should return an error function', function(){
    expect( KoaApiHandle.tracking() ).to.be.a('function')
  })

})
