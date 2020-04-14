const debug = require('debug')('mh:KoaApiHandle')
const base62 = require('base62-random')
const _clone = require('lodash.clone')
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
      for ( let { val, name } in response.headers ) {
        ctx.set(name, val)
      }
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


  static error (options) {
    console.warn('KoaApiHandle.error is deprecated, use KoaApiHandle.errors')
    return this.errors(options)
  }
  /**
   * @summary Default API 404/Not found handler
   * @description `.error` provides a default error handler. This ensures any errors are moved into a standard response format. Supports Exceptions from `@mhio/exception`.
   * @param {object} options - The options for the logger  
   * @param {object} options.logger - The custom logger to use (`console` API)
   * @param {function} options.logger.error - The custom log function to use 
   * @param {boolean} options.logger_pass_args - By default a preformatted `message` and the `error` object are passed in. This passes the Koa `ctx` instead of a message.
   * @param {boolean} options.logger_pass_object - By default a preformatted `message` and the `error` object are passed in. This passes the jsonable object.
   * @param {boolean} options.send_full_errors - Send complete original error out (usually api to api comms).
   * @param {object} options.allowed_errors - Names of errors allowed out to users
   */
  static errors (options) {
    let loggerFn = console.error
    let logger_pass_args = false
    let logger_pass_object = false
    let send_full_errors = false
    let default_error_message = 'There was a problem processing your request'
    let allowed_errors = {}
    if ( options ) {
      if ( options.logger ) {
        if (typeof options.logger === 'function') {
          loggerFn = options.logger
        } else {
          loggerFn = options.logger.error.bind(options.logger)
        }
      }
      if ( options.logger_pass_args ) logger_pass_args = true
      if ( options.logger_pass_object ) logger_pass_object = true
      if ( options.send_full_errors ) send_full_errors = true
      if ( options.allowed_errors ) allowed_errors = options.allowed_errors
      if ( options.default_error_message ) default_error_message = options.default_error_message
    }
    return async function koaApiHandleError( ctx, next ){
      try {
        await next()
      } catch (error) {
        debug('request', ctx.request)
        debug('api error', error)
        if (!error.id) error.id = 'e-'+base62(12)
        if ( loggerFn ) {
          const request_id = ctx.response.get('x-request-id')
          const transaction_id = ctx.response.get('x-transaction-id')
          try {
            if ( logger_pass_args ) {
              loggerFn(ctx, error)
            }
            else if ( logger_pass_object ) {
              let msg = `Error in [${ctx.request.method} ${ctx.request.path}]`
              if ( request_id ) msg += ` rid[${(request_id || '')}]`
              if ( transaction_id ) msg += ` tid[${(request_id || '')}]`
              loggerFn({ msg, message: `${error.message}`, stack: `${error.stack}`, error })
            }
            else {
              let msg = `Error in [${ctx.request.method} ${ctx.request.path}]`
              if ( request_id ) msg += ` rid[${(request_id || '')}]`
              if ( transaction_id ) msg += ` tid[${(request_id || '')}]`
              loggerFn(msg, error)
            }
          }
          catch (logging_error) {
            console.error('error logging error %s', request_id, logging_error, error)
          }
        }
        let response_error = {}
        if (send_full_errors) {
          response_error = _clone(error)
        } 
        else {
          if (allowed_errors[error.name]) {
            response_error = _clone(error)
            if (process.env.NODE_ENV === 'production') delete response_error.stack
          }
        }
        response_error.id = error.id
        response_error.name = (error.name) ? error.name : 'Error'
        response_error.status = (error.status) ? error.status : 500
        response_error.label = (error.label) ? error.label : 'Request Error'
        response_error.simple = (error.simple) ? error.simple : default_error_message
        response_error.message = (!response_error.message) ? error.simple : default_error_message
        const message = new MessageError(response_error)
        ctx.status = response_error.status
        ctx.type = 'json'
        ctx.body = message
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
    if ( options ) {
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
      const request_time_start = ctx.state.request_time_start = Date.now()
      
      const request_id = ctx.req.id = ctx.state.request_id = base62(18)
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

      debug('tracking - request', ctx.state.request_id, ctx.state.transaction_id, ctx.ip, ctx.state.request_time_start, ctx.method, ctx.url)
      await next()

      ctx.state.request_time_total = Date.now() - request_time_start  // eslint-disable-line require-atomic-updates  
      ctx.set('x-response-time', `${ctx.state.request_time_total}ms`)
      debug('tracking - response', ctx.state.request_id, ctx.state.transaction_id, ctx.ip, ctx.state.request_time_start, ctx.state.request_time_total, ctx.url)
    }
  }

  static poweredBy(powered_by = 'handles'){
    return async function poweredBy(ctx, next){
      ctx.set('x-powered-by', powered_by)
      await next()
    }
  }
 
  static logging(options = {}){
    const { mapHttpRequest, mapHttpResponse } = require('pino-std-serializers')
    const logger = (options.logger) ? options.logger : console
    const log_level = (options.log_level) ? options.log_level : 'info'
    if (typeof logger[log_level] !== 'function') {
      throw Error(`KoaApiHandle.logging logger['log_level'] is not a function: ${typeof logger.info}`)
    }
    return async function logging(ctx, next){
      let outer_error
      try {
        ctx.log = logger
        await next()
      }
      catch (error) {
        outer_error = error
        throw error
      } 
      finally {
        const log_obj = {
          ...mapHttpRequest(ctx.req),
          ...mapHttpResponse(ctx.res),
        }
        if (outer_error) log_obj.error = outer_error
        logger[log_level](log_obj)
      }
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
