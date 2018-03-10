const debug = require('debug')('mh:KoaApiHandle')
const forEach = require('lodash.foreach')
const base62 = require('base62-random')

const { Exception } = require('@mhio/exception')
const { 
  Message,
  MessageData,
  MessageError,
  ApiResponse
} = require('@mhio/api-response')


class KoaApiHandleException extends Exception {}


/** 
  Handle API requests and errors in Koa apps in a standard way. 
*/
class KoaApiHandle {

  /**
   * @summary Default API response handler
   * @description `.response` can handle all requests that come through Koa. This ensures standard response format and handling. Pass it an object and the method used to handle the reponse
   * @param {object} object - The object contianing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static response(object, method){
    return async function koaApiHandleApiResponse(ctx, next){
      let result = await object[method](ctx, next)
      let response = null
      if ( result instanceof ApiResponse ){
        response = result
      }
      else if ( result instanceof Message ){
        response = new ApiResponse({ type: 'json', message: result })
      }
      else {
        response = new ApiResponse({ type: 'json', message: new MessageData(result) })
      }
      forEach(response.headers, (val, name)=> ctx.set(name, val))
      ctx.status = response._status
      ctx.type = 'json'
      ctx.body = response._message
    }
  }

  /**
   * @summary Default API 404/Not found handler
   * @description `.response` can handle all requests that come through Koa. This ensures standard response format and handling. Pass it an object and the method used to handle the reponse
   */
  static notFound(){
    return async function koaApiHandleNotFound( ctx, next ){ // eslint-disable-line no-unused-vars
      let message = new MessageError({
        label:    'Not Found',
        simple:   `${ctx.url} not found`,
        details:  ctx.url,
        id:       ctx._mh_id,
      })
      ctx.status = 404
      ctx.body = message
    }
  }

  /**
   * @summary Default API 404/Not found handler
   * @description `.error` provides a default error handler. This ensures any errors are moved into a standard response format. Supports Exceptions from `@mhio/exception`.
   */
  static error(){
    return async function koaApiHandleError( ctx, next ){
      try {
        await next()
      } catch (error) {
        debug('request', ctx.request)
        debug('api error', error)
        if ( process.env.NODE_ENV === 'production' ) delete error.stack
        if (!error.status) error.status = 500
        if (!error.label)  error.label = 'Request Error'
        if (!error.simple) error.simple = 'Request Error'
        if (!error.id)     error.id = 'e-'+base62(12)
        let message = new MessageError(error)
        ctx.status = error.status
        ctx.type = 'json'
        ctx.body = message
      }
    }
  }

  constructor(){
    throw new KoaApiHandleException('No class instances for you!')
  }

}

module.exports = {
  KoaApiHandle,
  KoaApiHandleException,

  // Dependencies
  Message,
  MessageData,
  MessageError,
  ApiResponse
}
