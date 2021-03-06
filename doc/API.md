<a name="KoaApiHandle"></a>

## KoaApiHandle
<p>Handle API requests and errors in Koa apps in a standard way.</p>

**Kind**: global class  

* [KoaApiHandle](#KoaApiHandle)
    * [.response(object, method)](#KoaApiHandle.response)
    * [.customResponse(object, method)](#KoaApiHandle.customResponse)
    * [.notFound()](#KoaApiHandle.notFound)
    * [.errors(options)](#KoaApiHandle.errors)
    * [.tracking(options)](#KoaApiHandle.tracking)


* * *

<a name="KoaApiHandle.response"></a>

### KoaApiHandle.response(object, method)
<p><code>.response</code> can handle all requests that come through Koa. This ensures standard
response format and handling. Pass it an object and the method used to handle the reponse</p>

**Kind**: static method of [<code>KoaApiHandle</code>](#KoaApiHandle)  
**Summary**: <p>Default API response handler</p>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | <p>The object contianing the request handler</p> |
| method | <code>string</code> | <p>The method name used to handle this request</p> |


* * *

<a name="KoaApiHandle.customResponse"></a>

### KoaApiHandle.customResponse(object, method)
<p><code>.customResponse</code> allows <code>ctx</code> to be set by the user. Pass it an object and the method used to handle the reponse</p>

**Kind**: static method of [<code>KoaApiHandle</code>](#KoaApiHandle)  
**Summary**: <p>Custom API response handler</p>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | <p>The object contianing the request handler</p> |
| method | <code>string</code> | <p>The method name used to handle this request</p> |


* * *

<a name="KoaApiHandle.notFound"></a>

### KoaApiHandle.notFound()
<p><code>.response</code> can handle all requests that come through Koa. This ensures standard response format and handling. Pass it an object and the method used to handle the reponse</p>

**Kind**: static method of [<code>KoaApiHandle</code>](#KoaApiHandle)  
**Summary**: <p>Default API 404/Not found handler</p>  

* * *

<a name="KoaApiHandle.errors"></a>

### KoaApiHandle.errors(options)
<p><code>.error</code> provides a default error handler. This ensures any errors are moved into a standard response format. Supports Exceptions from <code>@mhio/exception</code>.</p>

**Kind**: static method of [<code>KoaApiHandle</code>](#KoaApiHandle)  
**Summary**: <p>Default API 404/Not found handler</p>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | <p>The options for the logger</p> |
| options.logger | <code>object</code> | <p>The custom logger to use (<code>console</code> API)</p> |
| options.logger.error | <code>function</code> | <p>The custom log function to use</p> |
| options.logger_pass_args | <code>boolean</code> | <p>By default a preformatted <code>message</code> and the <code>error</code> object are passed in. This passes the Koa <code>ctx</code> instead of a message.</p> |
| options.logger_pass_object | <code>boolean</code> | <p>By default a preformatted <code>message</code> and the <code>error</code> object are passed in. This passes the jsonable object.</p> |
| options.send_full_errors | <code>boolean</code> | <p>Send complete original error out (usually api to api comms).</p> |
| options.allowed_errors | <code>object</code> | <p>Names of errors allowed out to users</p> |


* * *

<a name="KoaApiHandle.tracking"></a>

### KoaApiHandle.tracking(options)
<p><code>.tracking</code> provides a request and transaction ID's and a response time header.
Attaches <code>request_id</code>, <code>trasaction_id</code>, <code>request_start</code>, <code>request_total</code>, to <code>ctx.state</code></p>

**Kind**: static method of [<code>KoaApiHandle</code>](#KoaApiHandle)  
**Summary**: <p>Request tracking</p>  
**Descrtracking**:   

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | <p>The options for the logger</p> |
| options.transaction_trust | <code>boolean</code> \| <code>string</code> | <p>Trust the clients <code>x-transaction-id</code> header. (true/false/'ip')</p> |
| options.transaction_trust_ips | <code>array</code> | <p>List of IP's to trust the clients <code>x-transaction-id</code> header from. e.g. localhosts are <code>['::ffff:127.0.0.1', '127.0.0.1', '::1']</code></p> |


* * *

