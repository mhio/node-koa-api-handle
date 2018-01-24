const debug = require('debug')('mh:koa:HandlApi')
const forEach = require('lodash.foreach')
const base62 = require('base62-random')
const Promise = require('bluebird')

const { Message, MessageData, MessageError, Response } = require('@mhp/ApiResponse')


class HandleApiError extends Error {}


class HandleApi {

  // Default response handler in standard form.
  // If you pass in a `Response`, it will be passed to the client directly. 
  // If you pass in a `Message`, it will be passed to the client. 
  // Otherwise data will be turned into the normal `Response`/`Message` format. 
  static response(object, method){
    return Promise.coroutine(function* response( ctx, next ){
      let result = yield object[method](ctx, next)
      let response = null
      if ( result instanceof Response ){
        response = result
      }
      else if ( result instanceof Message ){
        response = new Response({ message: result }).json()
      }
      else {
        response = new Response({ message: new MessageData(result) }).json()
      }
      forEach(response.headers, (val, name)=> ctx.set(name, val))
      ctx.status = response._status
      ctx.type = 'json'
      ctx.body = response._message
    })
  }

  static notFound(){
    return function(ctx, next){ // eslint-disable-line no-unused-vars
      let message = new MessageError({
        label:    'Not Found',
        simple:   'Not Found',
        details:  ctx.url,
        id:       ctx._mh_id,
      })
      ctx.status = 404
      ctx.body = message
    }
  }

  static error(){
    return Promise.coroutine(function* error(ctx, next){ // eslint-disable-line no-unused-vars
      try {
        yield next()
      } catch (error) {
        debug('request', ctx.request)
        debug('api error', error)
        if ( process.env.NODE_ENV === 'production' ) delete error.stack
        if (!error.status) error.status = 500
        if (!error.label)  error.label = 'Request Error'
        if (!error.simple) error.simple = 'Request Error'
        if (!error.id)     error.id = base62(12)
        let message = new MessageError(error)
        ctx.status = error.status
        ctx.type = 'json'
        ctx.body = message
      }
    })
  }

}

module.exports = { HandleApi, HandleApiError }
