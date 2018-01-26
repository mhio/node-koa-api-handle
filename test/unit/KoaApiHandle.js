const { KoaApiHandle } = require('../../src/KoaApiHandle')

describe('mh::test::unit::KoaApiHandle', function(){

  it('should load KoaApiHandle', function(){
    expect( KoaApiHandle ).to.be.ok    
  })
  
  it('should create a KoaApiHandle', function(){
    expect( new KoaApiHandle() ).to.be.ok
  })

})