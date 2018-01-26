
const { KoaApiHandle } = require('../../src/KoaApiHandle')

describe('mh::test::unit::KoaApiHandle', function(){

  it('should load KoaApiHandle', function(){
    expect( KoaApiHandle ).to.be.ok    
  })
  
  it('should create a KoaApiHandle', function(){
    let fn = () => new KoaApiHandle()
    expect( fn ).to.throw('No class')
  })

})