import debugr from 'debug'
import { KoaGenericHandle } from '@mhio/koa-generic-handle'
import { 
  Message,
  MessageData,
  MessageError,
  ApiResponse
 } from '@mhio/api-response'

const debug = debugr('mhio:KoaApiHandle')
const { getRandomBase62String } = KoaGenericHandle

/** 
  Handle API requests and errors in Koa apps in a standard way. 
*/
export class KoaApiHandle extends KoaGenericHandle {

  /**
   * @summary Default API response handler
   * @description `.response` can handle all requests that come through Koa. This ensures standard
   *               response format and handling. Pass it an object and the method used to handle the response
   * @param {object} object - The object containing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static response(object, method){
    if (!object) {
      throw new Error('response handler requires an argument')
    }
    if (!method && typeof object !== 'function') {
      throw new Error('response handler requires function')
    }
    if (object && method  && typeof object[method] !== 'function') {
      throw new Error('response handler requires function')
    }
    const caller = (object && method) ? object[method].bind(object) : object
    return async function koaApiHandleResponse(ctx, next){
      const result = await caller(ctx, next)
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
   * @summary Default API response bind handler
   * @description `.response` can handle all requests that come through Koa. This ensures standard
   *               response format and handling. Pass it an object and the method used to handle the response
   * @param {object} object - The object containing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static responseBind(object, method){
    if (!object) {
      throw new Error('response handler requires an argument')
    }
    if (!method) {
      throw new Error('response handler requires a method argument')
    }
    if (object && method && typeof object[method] !== 'function') {
      throw new Error('response handler requires function')
    }
    return this.response(object[method].bind(object))
  }

  /**
   * @summary Custom API response handler
   * @description `.customResponse` allows `ctx` to be set by the user. Pass it an object and the method used to handle the response
   * @param {object} object - The object containing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static customResponse(object, method){
    if (!object) {
      throw new Error('response handler requires an argument')
    }
    if (!method && typeof object !== 'function') {
      throw new Error('response handler requires function')
    }
    if (object && method  && typeof object[method] !== 'function') {
      throw new Error('response handler requires function')
    }
    const caller = (object && method) ? object[method].bind(object) : object
    return async function koaApiHandleCustomerResponse(ctx, next){
      const result = await caller(ctx, next)
      ctx.body = result // eslint-disable-line require-atomic-updates
    }
  }

  /**
   * @summary Custom API response bind handler
   * @description `.customResponse` allows `ctx` to be set by the user. Pass it an object and the method used to handle the response
   * @param {object} object - The object containing the request handler
   * @param {string} method - The method name used to handle this request
   */
  static customResponseBind(object, method){
    if (!object) {
      throw new Error('response handler requires an argument')
    }
    if (!method) {
      throw new Error('response handler requires a method argument')
    }
    if (object && method && typeof object[method] !== 'function') {
      throw new Error('response handler requires function')
    }
    return this.customResponse(object[method].bind(object))
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
    let logger_pass_object = true
    let send_full_errors = false
    let default_error_message = 'There was a problem processing your request'
    let allowed_errors = {
      PayloadTooLargeError: true, // From bodyParser limits
    }
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
      if ( options.allowed_errors ) allowed_errors = { ...allowed_errors, ...options.allowed_errors }
      if ( options.default_error_message ) default_error_message = options.default_error_message
    }
    return async function koaApiHandleError( ctx, next ){
      try {
        await next()
      } catch (error) {
        debug('request', ctx.request)
        debug('api error', error)
        if (!error.id) error.id = `e-${getRandomBase62String(12)}`
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
        if (send_full_errors || allowed_errors[error.name]) {
          for (let field in error) {
            response_error[field] = error[field]
          }
          response_error.message = error.message
        } 
        if (send_full_errors) {
          // maybe need a deep clones that includes all stack/messages for embedded errors
          response_error.stack = error.stack
        }
        response_error.id = error.id
        response_error.name = (error.name) ? error.name : 'Error'
        response_error.status = (error.status) ? error.status : 500
        response_error.label = (error.label) ? error.label : 'Request Error'
        response_error.simple = (error.simple) ? error.simple : default_error_message
        if (!response_error.message) response_error.message = error.simple
        const message = new MessageError(response_error)
        ctx.status = response_error.status
        ctx.type = 'json'
        ctx.body = message
      }
    }
  }

  static get debug(){
    return debug
  }

  constructor(){
    throw new Error('No class instances for you!')
  }

}
