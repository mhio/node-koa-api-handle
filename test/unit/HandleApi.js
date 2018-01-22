const { HandleApi } = require('../../src/HandleApi')

describe('mh::test::unit::HandleApi', function(){

  it('should load HandleApi', function(){
    expect( HandleApi ).to.be.ok    
  })
  
  it('should create a HandleApi', function(){
    expect( new HandleApi() ).to.be.ok
  })

})
