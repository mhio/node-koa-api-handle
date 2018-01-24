'use strict';

var _bluebird = require('bluebird');

const debug = require('debug')('mh:koa:HandlApi');
const forEach = require('lodash.foreach');
const base62 = require('base62-random');
const Promise = require('bluebird');

const { Exception } = require('@mhp/Exception');
const { Message, MessageData, MessageError, Response } = require('@mhp/ApiResponse');

class HandleApiException extends Exception {}

class HandleApi {

  // Default response handler in standard form.
  // If you pass in a `Response`, it will be passed to the client directly. 
  // If you pass in a `Message`, it will be passed to the client. 
  // Otherwise data will be turned into the normal `Response`/`Message` format. 
  static response(object, method) {
    return (0, _bluebird.coroutine)(function* () {
      let result = yield object[method](ctx, next);
      let response = null;
      if (result instanceof Response) {
        response = result;
      } else if (result instanceof Message) {
        response = new Response({ message: result }).json();
      } else {
        response = new Response({ message: new MessageData(result) }).json();
      }
      forEach(response.headers, function (val, name) {
        return ctx.set(name, val);
      });
      ctx.status = response._status;
      ctx.type = 'json';
      ctx.body = response._message;
    })();
  }

  static notFound() {
    return function (ctx, next) {
      // eslint-disable-line no-unused-vars
      let message = new MessageError({
        label: 'Not Found',
        simple: 'Not Found',
        details: ctx.url,
        id: ctx._mh_id
      });
      ctx.status = 404;
      ctx.body = message;
    };
  }

  static error() {
    return (0, _bluebird.coroutine)(function* () {
      try {
        yield next();
      } catch (error) {
        debug('request', ctx.request);
        debug('api error', error);
        if (process.env.NODE_ENV === 'production') delete error.stack;
        if (!error.status) error.status = 500;
        if (!error.label) error.label = 'Request Error';
        if (!error.simple) error.simple = 'Request Error';
        if (!error.id) error.id = base62(12);
        let message = new MessageError(error);
        ctx.status = error.status;
        ctx.type = 'json';
        ctx.body = message;
      }
    })();
  }

}

module.exports = { HandleApi, HandleApiException };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9IYW5kbGVBcGkuanMiXSwibmFtZXMiOlsiZGVidWciLCJyZXF1aXJlIiwiZm9yRWFjaCIsImJhc2U2MiIsIlByb21pc2UiLCJFeGNlcHRpb24iLCJNZXNzYWdlIiwiTWVzc2FnZURhdGEiLCJNZXNzYWdlRXJyb3IiLCJSZXNwb25zZSIsIkhhbmRsZUFwaUV4Y2VwdGlvbiIsIkhhbmRsZUFwaSIsInJlc3BvbnNlIiwib2JqZWN0IiwibWV0aG9kIiwicmVzdWx0IiwiY3R4IiwibmV4dCIsIm1lc3NhZ2UiLCJqc29uIiwiaGVhZGVycyIsInZhbCIsIm5hbWUiLCJzZXQiLCJzdGF0dXMiLCJfc3RhdHVzIiwidHlwZSIsImJvZHkiLCJfbWVzc2FnZSIsIm5vdEZvdW5kIiwibGFiZWwiLCJzaW1wbGUiLCJkZXRhaWxzIiwidXJsIiwiaWQiLCJfbWhfaWQiLCJlcnJvciIsInJlcXVlc3QiLCJwcm9jZXNzIiwiZW52IiwiTk9ERV9FTlYiLCJzdGFjayIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxNQUFNQSxRQUFRQyxRQUFRLE9BQVIsRUFBaUIsaUJBQWpCLENBQWQ7QUFDQSxNQUFNQyxVQUFVRCxRQUFRLGdCQUFSLENBQWhCO0FBQ0EsTUFBTUUsU0FBU0YsUUFBUSxlQUFSLENBQWY7QUFDQSxNQUFNRyxVQUFVSCxRQUFRLFVBQVIsQ0FBaEI7O0FBRUEsTUFBTSxFQUFFSSxTQUFGLEtBQWdCSixRQUFRLGdCQUFSLENBQXRCO0FBQ0EsTUFBTSxFQUFFSyxPQUFGLEVBQVdDLFdBQVgsRUFBd0JDLFlBQXhCLEVBQXNDQyxRQUF0QyxLQUFtRFIsUUFBUSxrQkFBUixDQUF6RDs7QUFHQSxNQUFNUyxrQkFBTixTQUFpQ0wsU0FBakMsQ0FBMkM7O0FBRzNDLE1BQU1NLFNBQU4sQ0FBZ0I7O0FBRWQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFhQyxRQUFiLENBQXNCQyxNQUF0QixFQUE4QkMsTUFBOUIsRUFBcUM7QUFBQTtBQUNuQyxVQUFJQyxTQUFTLE1BQU1GLE9BQU9DLE1BQVAsRUFBZUUsR0FBZixFQUFvQkMsSUFBcEIsQ0FBbkI7QUFDQSxVQUFJTCxXQUFXLElBQWY7QUFDQSxVQUFLRyxrQkFBa0JOLFFBQXZCLEVBQWlDO0FBQy9CRyxtQkFBV0csTUFBWDtBQUNELE9BRkQsTUFHSyxJQUFLQSxrQkFBa0JULE9BQXZCLEVBQWdDO0FBQ25DTSxtQkFBVyxJQUFJSCxRQUFKLENBQWEsRUFBRVMsU0FBU0gsTUFBWCxFQUFiLEVBQWtDSSxJQUFsQyxFQUFYO0FBQ0QsT0FGSSxNQUdBO0FBQ0hQLG1CQUFXLElBQUlILFFBQUosQ0FBYSxFQUFFUyxTQUFTLElBQUlYLFdBQUosQ0FBZ0JRLE1BQWhCLENBQVgsRUFBYixFQUFtREksSUFBbkQsRUFBWDtBQUNEO0FBQ0RqQixjQUFRVSxTQUFTUSxPQUFqQixFQUEwQixVQUFDQyxHQUFELEVBQU1DLElBQU47QUFBQSxlQUFjTixJQUFJTyxHQUFKLENBQVFELElBQVIsRUFBY0QsR0FBZCxDQUFkO0FBQUEsT0FBMUI7QUFDQUwsVUFBSVEsTUFBSixHQUFhWixTQUFTYSxPQUF0QjtBQUNBVCxVQUFJVSxJQUFKLEdBQVcsTUFBWDtBQUNBVixVQUFJVyxJQUFKLEdBQVdmLFNBQVNnQixRQUFwQjtBQWZtQztBQWdCcEM7O0FBRUQsU0FBT0MsUUFBUCxHQUFpQjtBQUNmLFdBQU8sVUFBU2IsR0FBVCxFQUFjQyxJQUFkLEVBQW1CO0FBQUU7QUFDMUIsVUFBSUMsVUFBVSxJQUFJVixZQUFKLENBQWlCO0FBQzdCc0IsZUFBVSxXQURtQjtBQUU3QkMsZ0JBQVUsV0FGbUI7QUFHN0JDLGlCQUFVaEIsSUFBSWlCLEdBSGU7QUFJN0JDLFlBQVVsQixJQUFJbUI7QUFKZSxPQUFqQixDQUFkO0FBTUFuQixVQUFJUSxNQUFKLEdBQWEsR0FBYjtBQUNBUixVQUFJVyxJQUFKLEdBQVdULE9BQVg7QUFDRCxLQVREO0FBVUQ7O0FBRUQsU0FBYWtCLEtBQWIsR0FBb0I7QUFBQTtBQUNsQixVQUFJO0FBQ0YsY0FBTW5CLE1BQU47QUFDRCxPQUZELENBRUUsT0FBT21CLEtBQVAsRUFBYztBQUNkcEMsY0FBTSxTQUFOLEVBQWlCZ0IsSUFBSXFCLE9BQXJCO0FBQ0FyQyxjQUFNLFdBQU4sRUFBbUJvQyxLQUFuQjtBQUNBLFlBQUtFLFFBQVFDLEdBQVIsQ0FBWUMsUUFBWixLQUF5QixZQUE5QixFQUE2QyxPQUFPSixNQUFNSyxLQUFiO0FBQzdDLFlBQUksQ0FBQ0wsTUFBTVosTUFBWCxFQUFtQlksTUFBTVosTUFBTixHQUFlLEdBQWY7QUFDbkIsWUFBSSxDQUFDWSxNQUFNTixLQUFYLEVBQW1CTSxNQUFNTixLQUFOLEdBQWMsZUFBZDtBQUNuQixZQUFJLENBQUNNLE1BQU1MLE1BQVgsRUFBbUJLLE1BQU1MLE1BQU4sR0FBZSxlQUFmO0FBQ25CLFlBQUksQ0FBQ0ssTUFBTUYsRUFBWCxFQUFtQkUsTUFBTUYsRUFBTixHQUFXL0IsT0FBTyxFQUFQLENBQVg7QUFDbkIsWUFBSWUsVUFBVSxJQUFJVixZQUFKLENBQWlCNEIsS0FBakIsQ0FBZDtBQUNBcEIsWUFBSVEsTUFBSixHQUFhWSxNQUFNWixNQUFuQjtBQUNBUixZQUFJVSxJQUFKLEdBQVcsTUFBWDtBQUNBVixZQUFJVyxJQUFKLEdBQVdULE9BQVg7QUFDRDtBQWZpQjtBQWdCbkI7O0FBckRhOztBQXlEaEJ3QixPQUFPQyxPQUFQLEdBQWlCLEVBQUVoQyxTQUFGLEVBQWFELGtCQUFiLEVBQWpCIiwiZmlsZSI6IkhhbmRsZUFwaS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnbWg6a29hOkhhbmRsQXBpJylcbmNvbnN0IGZvckVhY2ggPSByZXF1aXJlKCdsb2Rhc2guZm9yZWFjaCcpXG5jb25zdCBiYXNlNjIgPSByZXF1aXJlKCdiYXNlNjItcmFuZG9tJylcbmNvbnN0IFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpXG5cbmNvbnN0IHsgRXhjZXB0aW9uIH0gPSByZXF1aXJlKCdAbWhwL0V4Y2VwdGlvbicpXG5jb25zdCB7IE1lc3NhZ2UsIE1lc3NhZ2VEYXRhLCBNZXNzYWdlRXJyb3IsIFJlc3BvbnNlIH0gPSByZXF1aXJlKCdAbWhwL0FwaVJlc3BvbnNlJylcblxuXG5jbGFzcyBIYW5kbGVBcGlFeGNlcHRpb24gZXh0ZW5kcyBFeGNlcHRpb24ge31cblxuXG5jbGFzcyBIYW5kbGVBcGkge1xuXG4gIC8vIERlZmF1bHQgcmVzcG9uc2UgaGFuZGxlciBpbiBzdGFuZGFyZCBmb3JtLlxuICAvLyBJZiB5b3UgcGFzcyBpbiBhIGBSZXNwb25zZWAsIGl0IHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBjbGllbnQgZGlyZWN0bHkuIFxuICAvLyBJZiB5b3UgcGFzcyBpbiBhIGBNZXNzYWdlYCwgaXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGNsaWVudC4gXG4gIC8vIE90aGVyd2lzZSBkYXRhIHdpbGwgYmUgdHVybmVkIGludG8gdGhlIG5vcm1hbCBgUmVzcG9uc2VgL2BNZXNzYWdlYCBmb3JtYXQuIFxuICBzdGF0aWMgYXN5bmMgcmVzcG9uc2Uob2JqZWN0LCBtZXRob2Qpe1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCBvYmplY3RbbWV0aG9kXShjdHgsIG5leHQpXG4gICAgbGV0IHJlc3BvbnNlID0gbnVsbFxuICAgIGlmICggcmVzdWx0IGluc3RhbmNlb2YgUmVzcG9uc2UgKXtcbiAgICAgIHJlc3BvbnNlID0gcmVzdWx0XG4gICAgfVxuICAgIGVsc2UgaWYgKCByZXN1bHQgaW5zdGFuY2VvZiBNZXNzYWdlICl7XG4gICAgICByZXNwb25zZSA9IG5ldyBSZXNwb25zZSh7IG1lc3NhZ2U6IHJlc3VsdCB9KS5qc29uKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXNwb25zZSA9IG5ldyBSZXNwb25zZSh7IG1lc3NhZ2U6IG5ldyBNZXNzYWdlRGF0YShyZXN1bHQpIH0pLmpzb24oKVxuICAgIH1cbiAgICBmb3JFYWNoKHJlc3BvbnNlLmhlYWRlcnMsICh2YWwsIG5hbWUpPT4gY3R4LnNldChuYW1lLCB2YWwpKVxuICAgIGN0eC5zdGF0dXMgPSByZXNwb25zZS5fc3RhdHVzXG4gICAgY3R4LnR5cGUgPSAnanNvbidcbiAgICBjdHguYm9keSA9IHJlc3BvbnNlLl9tZXNzYWdlXG4gIH1cblxuICBzdGF0aWMgbm90Rm91bmQoKXtcbiAgICByZXR1cm4gZnVuY3Rpb24oY3R4LCBuZXh0KXsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFyc1xuICAgICAgbGV0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZUVycm9yKHtcbiAgICAgICAgbGFiZWw6ICAgICdOb3QgRm91bmQnLFxuICAgICAgICBzaW1wbGU6ICAgJ05vdCBGb3VuZCcsXG4gICAgICAgIGRldGFpbHM6ICBjdHgudXJsLFxuICAgICAgICBpZDogICAgICAgY3R4Ll9taF9pZCxcbiAgICAgIH0pXG4gICAgICBjdHguc3RhdHVzID0gNDA0XG4gICAgICBjdHguYm9keSA9IG1lc3NhZ2VcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgZXJyb3IoKXtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgbmV4dCgpXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGRlYnVnKCdyZXF1ZXN0JywgY3R4LnJlcXVlc3QpXG4gICAgICBkZWJ1ZygnYXBpIGVycm9yJywgZXJyb3IpXG4gICAgICBpZiAoIHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgKSBkZWxldGUgZXJyb3Iuc3RhY2tcbiAgICAgIGlmICghZXJyb3Iuc3RhdHVzKSBlcnJvci5zdGF0dXMgPSA1MDBcbiAgICAgIGlmICghZXJyb3IubGFiZWwpICBlcnJvci5sYWJlbCA9ICdSZXF1ZXN0IEVycm9yJ1xuICAgICAgaWYgKCFlcnJvci5zaW1wbGUpIGVycm9yLnNpbXBsZSA9ICdSZXF1ZXN0IEVycm9yJ1xuICAgICAgaWYgKCFlcnJvci5pZCkgICAgIGVycm9yLmlkID0gYmFzZTYyKDEyKVxuICAgICAgbGV0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZUVycm9yKGVycm9yKVxuICAgICAgY3R4LnN0YXR1cyA9IGVycm9yLnN0YXR1c1xuICAgICAgY3R4LnR5cGUgPSAnanNvbidcbiAgICAgIGN0eC5ib2R5ID0gbWVzc2FnZVxuICAgIH1cbiAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBIYW5kbGVBcGksIEhhbmRsZUFwaUV4Y2VwdGlvbiB9XG4iXX0=