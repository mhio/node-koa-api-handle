import { expect, use } from 'chai'
//import chaiFs from 'chai-fs')
import chaiSubset from 'chai-subset'
//import chaiAsPromised from 'chai-as-promised')

global.expect = expect
//use(chaiFs)
use(chaiSubset)
//use(chaiAsPromised)

if ( process.env.NODE_ENV === undefined ) {
  process.env.NODE_ENV = 'test'
}
