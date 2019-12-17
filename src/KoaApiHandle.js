const debugl = require('debug')('mh:KoaApiHandle')
let debug = debugl
const forEach = require('lodash.foreach')
const base62 = require('base62-random')
const noop = function(){}

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
   * @description `.response` can handle all requests that come through Koa. This ensures standard
   *               response format and handling. Pass it an object and the method used to handle the reponse
   * @param {object} object - The object contianing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static response(object, method){
    return async function koaApiHandleApiResponse(ctx, next){
      let caller = (typeof object === 'function') ? object : object[method]
      let result = await caller(ctx, next)
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
      ctx.status = response._status // eslint-disable-line require-atomic-updates
      ctx.type = 'json' // eslint-disable-line require-atomic-updates
      ctx.body = response._message // eslint-disable-line require-atomic-updates
    }
  }

  /**
   * @summary Custom API response handler
   * @description `.customResponse` allows `ctx` to be set by the user. Pass it an object and the method used to handle the reponse
   * @param {object} object - The object contianing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static customResponse(object, method){
    return async function koaApiHandleApiResponse(ctx, next){
      let caller = (typeof object === 'function') ? object : object[method].bind(object)
      let result = await caller(ctx, next)
      ctx.body = result // eslint-disable-line require-atomic-updates
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
   * @param {object} options - The options for the logger  
   * @param {object} options.logger - The custom logger to use (`console` API)
   * @param {function} options.logger.error - The custom log function to use 
   * @param {boolean} options.logger_pass_args - By default a preformatted `message` and the `error` object are passed in. This passes the Koa `ctx` instead of a message.
   */
  static error(options){
    let logger = false
    let logger_pass_args = false
    if ( options ) {
      if ( options.logger ) {
        if (typeof options.logger === 'function') {
          logger = { error: options.logger }
        } else {
          logger = options.logger
        }
      }
      if ( options.logger_pass_args ) logger_pass_args = true
    }
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
        if ( logger ) {
          if ( logger_pass_args ) {
            logger.error(ctx, error)
          } else {
            let request_id = ctx.response.get('x-request-id')
            let transaction_id = ctx.response.get('x-transaction-id')
            let msg = `Error in [${ctx.request.method} ${ctx.request.path}]`
            if ( request_id ) msg += ` rid[${(request_id || '')}]`
            if ( transaction_id ) msg += ` tid[${(request_id || '')}]`
            logger.error(msg, error)
          }
        }
      }
    }
  }


  /**
   * @summary Request tracking
   * @description `.tracking` provides a request and transaction ID's and a response time header.
   * @param {object} options - The options for the logger  
   * @param {boolean} options.transaction_trust - Trust the clients `x-transaction-id` header.
   */
  static tracking(options){
    let trust = false
    if ( options ) {
      if ( options.transaction_trust === true ) trust = true
      //if ( options.transaction_trust === 'ip' )  
    }
    return async function tracking( ctx, next ){
      const start = Date.now()
      let request_id = base62(18)
      ctx.set('x-request-id', request_id)
      let incoming_trx_id = ctx.get('x-transaction-id')
      if ( incoming_trx_id === '' || !trust ){
        ctx.set('x-transaction-id', request_id)
      }
      else {
        debug('tracking transaction id attached "%s"', incoming_trx_id)
        if ( trust ){
          ctx.set('x-transaction-id', incoming_trx_id)
        }
      }
      ctx.set('x-powered-by', 'handles')
      debug('tracking request', request_id, ctx.ip, ctx.method, ctx.url)
      await next()
      const ms = Date.now() - start
      ctx.set('x-response-time', `${ms}ms`)
      debug('tracking response', ctx.get('x-request-id'), ms, ctx.url)
    }
  }

  static enableDebug(){
    debugl.enabled = true
    debug = debugl
    return true
  }
  static disableDebug(){
    debugl.enabled = false
    debug = noop
    return true
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
