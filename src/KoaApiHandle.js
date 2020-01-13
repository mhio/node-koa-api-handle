const debug = require('debug')('mh:KoaApiHandle')
//let debug = debugl
const forEach = require('lodash.foreach')
const base62 = require('base62-random')
//const noop = function(){}

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

   * @descrtracking
   * @description `.tracking` provides a request and transaction ID's and a response time header.
   *              Attaches `request_id`, `trasaction_id`, `request_start`, `request_total`, to `ctx.state`
   * @param {object}         options                        - The options for the logger  
   * @param {boolean|string} options.transaction_trust      - Trust the clients `x-transaction-id` header. (true/false/'ip')
   * @param {array}          options.transaction_trust_ips  - List of IP's to trust the clients `x-transaction-id` header from.
   *                                                          e.g. localhosts are `['::ffff:127.0.0.1', '127.0.0.1', '::1']`
   */
  static tracking(options){
    let tx_trust = false
    let powered_by = 'handles'
    if ( options ) {
      if ( options.powered_by ) {
        powered_by = options.powered_by
      } 
      if ( options.transaction_trust === true ) {
        tx_trust = true
      }
      if ( options.transaction_trust === 'ip' ) {
        if (!options.transaction_trust_ips) {
          throw new Error('transaction_trust `ip` must have a list of ips')
        }
        if (!options.transaction_trust_ips.includes) {
          throw new Error('transaction_trust_ips must support `.includes`')
        }
        tx_trust = function checkTransactionTrust(ctx){
          debug(ctx.request.ip)
          if ( options.transaction_trust_ips.includes(ctx.request.ip) ) {
            return true
          }
          return false
        }
      } 
    }
    return async function tracking( ctx, next ){
      const request_time_start = Date.now()
      ctx.state.request_time_start = request_time_start
      
      const request_id = base62(18)
      ctx.state.request_id = request_id
      ctx.set('x-request-id', ctx.state.request_id)

      let transaction_id = null
      const incoming_trx_id = ctx.get('x-transaction-id')
      if ( !tx_trust || !incoming_trx_id ){
        transaction_id = request_id
      }
      else {
        if ( tx_trust === true ){
          debug('tracking true transaction id attached "%s"', incoming_trx_id)
          transaction_id = incoming_trx_id
        } else {
          if ( tx_trust(ctx) ) {
            debug('tracking fn true transaction id attached "%s"', incoming_trx_id)
            transaction_id = incoming_trx_id
          } else {
            debug('tracking transaction id defaulted', incoming_trx_id)
            transaction_id = ctx.state.request_id
          } 
        }
      }
      ctx.state.transaction_id = transaction_id
      ctx.set('x-transaction-id', ctx.state.transaction_id)

      ctx.set('x-powered-by', powered_by)

      debug('tracking - request', ctx.state.request_id, ctx.state.transaction_id, ctx.ip, ctx.state.request_time_start, ctx.method, ctx.url)
      await next()

      ctx.state.request_time_total = Date.now() - request_time_start  // eslint-disable-line require-atomic-updates  
      ctx.set('x-response-time', `${ctx.state.request_time_total}ms`)
      debug('tracking - response', ctx.state.request_id, ctx.state.transaction_id, ctx.ip, ctx.state.request_time_start, ctx.state.request_time_total, ctx.url)
    }
  }

  static get debug(){
    return debug
  }

  static enableDebug(){
    // debugl.enabled = true
    // debug = debugl
    return true
  }

  static disableDebug(){
    // debugl.enabled = false
    // debug = noop
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
