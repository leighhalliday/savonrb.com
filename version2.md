---
title: Version 2
layout: version2
---

Version 2
---------

As I tried to explain in [this blog post](/2012/06/30/milestones.html), Savon's public interface needs to
change in order to allow future refactorings and new features. I dropped the initial plan to add the new
interface to an upcoming 1.x release. Instead, I pushed the [version2 branch](https://github.com/savonrb/savon/tree/version2)
up to Github, so everyone can follow the progress. I'm also updating [issue 332](https://github.com/savonrb/savon/issues/332)
when there are new changes to be tried out.

The new interface is not yet feature-complete, but I would really appreciate your feedback!  
To give it a try, add the following line to your Gemfile:

``` ruby
gem "savon", github: "savonrb/savon", branch: "version2"
```


Client
------

The new client should be a lot simpler to use than the old one. It only accepts a Hash of global options (globals).
To create a new client backed by a WSDL document, you pass it the URL of a remote WSDL or the path to a local WSDL
on the file system.

``` ruby
client = Savon.client(wsdl: "http://example.com?wsdl")
client = Savon.client(wsdl: "/Users/me/project/service.wsdl")
```

In case the service doesn't offer a WSDL, you need to tell Savon about the SOAP endpoint and target namespace
of your service. You can also use these options to overwrite these values on your WSDL.

If you used Savon version 1 before, this should look familiar to you. But in contrast to the old client,
which was configured via a block and various method calls, the new client only knows about options. Every
possible configuration available for version 1 should be present as an option on the new interface. If you're
missing any features, [please open an issue](https://github.com/savonrb/savon/issues).

Savon knows two types of options. Global options (globals), which are specific to a service and local
options (locals), which are specific to a single request.

Although they are called "global options", they really are local to a client instance. Savon version 1 based
on the concept of a global `Savon.configure` method to store the configuration. While this was a popular concept
back then, probably introduced by RSpec?, and adapted by a lot of other libraries, the problem is that it
introduces global state. Version 2 should work much better in multi-threaded environments.

``` ruby
# create a new client
client = Savon.client(globals)

# call a SOAP operation
response = client.call(:authenticate, locals)
```

Sending SOAP requests can be this simple. This is the basic interface of the new client. If you look at the
variable names passed into the two methods, you can see that globals are passed to the client's constructor
and locals are passed when calling a SOAP operation.

If you passed Savon a WSDL, it can tell you about the SOAP operations available for the service.

``` ruby
client.operations  # => [:authenticate, :find_user]
```

And that's it. The public API. Quite concise. But then of course, there are a lot of options.


Globals
-------

Global options are passed to the client's constructor and are specific to a service.

**wsdl:** Savon accepts either a local or remote WSDL document which it uses to extract information like
the SOAP endpoint and target namespace of the service.

``` ruby
Savon.client(wsdl: "http://example.com?wsdl")
Savon.client(wsdl: "/Users/me/project/service.wsdl")
```

**endpoint and namespace:** In case your service doesn't offer a WSDL, you need to tell Savon about the
SOAP endpoint and target namespace of the service.

``` ruby
Savon.client(endpoint: "http://example.com", namespace: "http://v1.example.com")
```

The target namespace is used to namespace the SOAP message. In a WSDL, the target namespace is defined on the
`wsdl:definitions` (root) node, along with the service's name and namespace declarations.

``` xml
<wsdl:definitions
  name="AuthenticationWebServiceImplService"
  targetNamespace="http://v1_0.ws.auth.order.example.com/"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/">
```

The SOAP endpoint is the URL at which your service accepts SOAP requests. It is usually defined at the bottom
of a WSDL, as the `location` attribute of a `soap:address` node.

``` xml
  <wsdl:service name="AuthenticationWebServiceImplService">
    <wsdl:port binding="tns:AuthenticationWebServiceImplServiceSoapBinding" name="AuthenticationWebServiceImplPort">
      <soap:address location="http://example.com/validation/1.0/AuthenticationService" />
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>
```

You can also use these options to overwrite these values in a WDSL document in case you need to.

**encoding:** Savon defaults to UTF-8.

``` ruby
Savon.client(encoding: "UTF-16")
```

**soap_version:** Defaults to SOAP 1.1. Can be set to SOAP 1.2 to use a different SOAP endpoint.

``` ruby
Savon.client(soap_version: 2)
```

**env_namespace:** Savon defaults to use `:env` as the namespace identifier for the SOAP envelope.
If that doesn't work  for you, I would like to know why. So please open an issue and make sure to
add your WSDL for debugging.

``` ruby
Savon.client(env_namespace: :soapenv)
```

This is how the request's `envelope` looks like after changing the namespace identifier:

``` xml
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
```

**namespace_identifier:** Should be extracted from the WSDL. If it doesn't have a WSDL, Savon
falls back to `:wsdl`. No idea why anyone would need to use this option.

``` ruby
Savon.client(namespace_identifier: :v1)
```

Pay attention to the `v1:authenticate` message tag in the generated request:

``` xml
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v1="http://v1.example.com/">
  <env:Body>
    <v1:authenticate></v1:authenticate>
  </env:Body>
</env:Envelope>
```

**proxy:** You can specify a proxy server to use.

``` ruby
Savon.client(proxy: "http://example.org")
```

**headers:** Additional HTTP headers for the request.

``` ruby
Savon.client(headers: { "Authentication" => "secret" })
```

**timeouts:** Both open and read timeout can be set (in seconds).

``` ruby
Savon.client(open_timeout: 5, read_timeout: 5)
```

**soap_header:** If you need to add custom XML to the SOAP header, you can use this option.
This might be useful for setting a global authentication token or any other kind of metadata.

``` ruby
Savon.client(soap_header: { "Token" => "secret" })
```

This is the header created for the options:

``` xml
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v1="http://v1.example.com/">
  <env:Header>
    <Token>secret</Token>
  </env:Header>
</env:Envelope>
```

**element_form_default:** Savon should extract whether to qualify elements from the WSDL.
If there is no WSDL, Savon defaults to `:unqualified`.

If you specified a WSDL but still need to use this option, please open an issue and make sure to
add your WSDL for debugging. Savon currently does not support WSDL imports, so in case your service
imports its type definitions from another file, the `element_form_default` value might be wrong.

``` ruby
Savon.client(element_form_default: :qualified)
```

**raise_errors:** By default, Savon raises SOAP fault and HTTP errors. You can disable both errors
and query the response instead.

``` ruby
Savon.client(raise_errors: true)
```

**strip_namespaces:** Savon configures [Nori](https://github.com/savonrb/nori) to strip any namespace
identifiers from the response. If that causes problems for you, you can disable this behavior.

``` ruby
Savon.client(strip_namespaces: false)
```

Here's how the response Hash would look like if namespaces were not stripped from the response:

``` ruby
response.hash["soap:envelope"]["soap:body"]["ns2:authenticate_response"]
```

**convert_tags_to:** Savon also instructs [Nori](https://github.com/savonrb/nori) to convert any
XML tag from the response to a snakecase Symbol.

This is why accessing the response as a Hash looks natural:

``` ruby
response.body[:user_response][:id]
```

You can specify your own `Proc` or any object that responds to `#call`. It is called for every XML
tag and simply has to return the converted tag.

``` ruby
Savon.client(convert_tags_to: lambda { |key| key.snakecase.upcase })
```

You can have it your very own way.

``` ruby
response.body["USER_RESPONSE"]["ID"]
```

**logger:** Savon logs to `$stdout` using Ruby's default Logger. Can be replaced by any object
that responds to `#log`.

``` ruby
Savon.client(logger: Rails.logger)
```

**pretty_print_xml:** Pretty print the request and response XML in your logs for debugging purposes.

``` ruby
Savon.client(pretty_print_xml: true)
```

**basic_auth:** Savon supports HTTP basic authentication.

``` ruby
Savon.client(basic_auth: ["luke", "secret"])
```

**wsse_auth:** And HTTP digest authentication.

``` ruby
Savon.client(digest_auth: ["lea", "top-secret"])
```

**wsse_auth:** As well as WSSE basic/digest auth.

``` ruby
Savon.client(wsse_auth: ["lea", "top-secret"])
Savon.client(wsse_auth: ["lea", "top-secret", :digest])
```

**wsse_timestamp:** And activate WSSE timestamp auth.

``` ruby
Savon.client(wsse_timestamp: true)
```


Requests
--------

To execute a SOAP request, you can ask Savon for an operation and call it with a message to send.

``` ruby
message = { username: 'luke', password: 'secret' }
response = client.call(:authenticate, message: message)
```

In this example, the Symbol `:authenticate` is the name of the SOAP operation and the `message` Hash is what
was known as the SOAP `body` Hash in version 1. The reason to change the naming is related to the SOAP request
and the fact that the former "body" never really influenced the entire SOAP body.

If Savon has a WSDL, it verifies whether your service actually contains the operation you're trying to call
and raises an `ArgumentError` in case it doesn't exist.

The operations `#call` method also accepts a few local options.


Locals
------

Local options are passed to the client's `#call` method and are specific to a single request.

**message:** You probably want to add some arguments to your request. The SOAP message can be a Hash which
Savon translates via [Gyoku](https://github.com/savonrb/gyoku) or an XML String.

``` ruby
client.call(:authenticate, message: { username: 'luke', password: 'secret' })
client.call(:authenticate, message: "<username>luke</username><password>secret</password>")
```

**message_tag:** You can change the name of the SOAP message tag. If you need to use this option,
please open an issue let me know why.

``` ruby
client.call(:authenticate, message_tag: :doAuthenticate)
```

**soap_action:** You might need to set this if you don't have a WSDL. Otherwise, Savon should set the proper
SOAPAction HTTP header for you. If it doesn't, please open an issue and add the WSDL of your service.

``` ruby
client.call(:authenticate, soap_action: "urn:Authenticate")
```

**xml:** If you need to, you can even shortcut Savon's Builder and send your very own XML.

``` ruby
client.call(:authenticate, xml: "<envelope><body></body></envelope>")
```

**advanced_typecasting:** Savon by default instructs [Nori](https://github.com/savonrb/nori) to use its
"advanced typecasting" to convert XML values like `"true"` to `TrueClass`, dates to date objects, etc.

``` ruby
client.call(:authenticate, advanced_typecasting: false)
```

**response_parser:** Savon defaults to [Nori's](https://github.com/savonrb/nori) Nokogiri parser.
Nori ships with a REXML parser as an alternative. If you need to switch to REXML, please open an issue
and describe the problem you have with the Nokogiri parser.

``` ruby
client.call(:authenticate, response_parser: :rexml)
```


Errors
------

**Savon::Error** is the base class for all other Savon errors. This allows you to either rescue a specific
error like `Savon::SOAPFault` or rescue `Savon::Error` to catch them all.

**Savon::SOAPFault** is raised when the server returns a SOAP fault error. The error object contains the
[HTTPI](https://github.com/savonrb/httpi) response for you to further investigate what went wrong.

``` ruby
def authenticate(credentials)
  client.call(:authenticate, message: credentials)
rescue Savon::SOAPFault => error
  Logger.log error.http.code
  raise
end
```

The example above rescues from SOAP faults, logs the HTTP response code and re-raises the SOAP fault.
You can also translate the SOAP fault response into a Hash.

``` ruby
def authenticate(credentials)
  client.call(:authenticate, message: credentials)
rescue Savon::SOAPFault => error
  fault_code = error.to_hash[:fault][:faultcode]
  raise CustomError, fault_code
end
```

**Savon::HTTPError** is raised when Savon considers the HTTP response to be not successful. You can rescue
this error and access the [HTTPI](https://github.com/savonrb/httpi) response for investigation.

``` ruby
def authenticate(credentials)
  client.call(:authenticate, message: credentials)
rescue Savon::HTTPError => error
  Logger.log error.http.code
  raise
end
```

The example rescues from HTTP errors, logs the HTTP response code and re-raises the error.


Response
--------

The new response is missing the `#[]` method, but apart from that, it works exactly like it always did.

**#header** translates and returns the SOAP header as a Hash.

``` ruby
response.header  # => { token: "secret" }
```

**#body** translates and returns the SOAP body as a Hash.

``` ruby
response.body  # => { response: { success: true, name: "luke" } }
```

**#to_xml** returns the raw SOAP response.

``` ruby
response.to_xml  # => "<response><success>true</success><name>luke</name></response>"
```

**#doc** returns the SOAP response as a [Nokogiri](http://nokogiri.org/) document.

``` ruby
response.doc  # => #<Nokogiri::XML::Document:0x1017b4268 ...
```

**#xpath** delegates to [Nokogiri's xpath method](http://nokogiri.org/Nokogiri/XML/Node.html#method-i-xpath).

``` ruby
response.xpath("//v1:authenticateResponse/return/success").first.inner_text.should == "true"
```

**#http** returns the [HTTPI](https://github.com/savonrb/httpi) response.

``` ruby
response.http  # => #<HTTPI::Response:0x1017b4268 ...
```

In case you disabled the global `:raise_errors` option, you can ask the response for its state.

``` ruby
response.success?     # => false
response.soap_fault?  # => true
response.http_error?  # => false
```

Model
-----

`Savon::Model` was simplified and refactored to work with the new interface.

``` ruby
class AuthService
  extend Savon::Model

  # initialize the client with a :wsdl or the :endpoint and :namespace
  client wsdl: "http://example.com?wsdl"

  # define additional global options
  global :open_timeout, 30
  global :basic_auth, "luke", "secret"

  # define the operations of your model
  operations :authenticate
end
```

The `.client` method must be called to properly setup the client. Additional global options can be
set using the `.global` method and `.operations` (formerly known as `.actions`) is used to create
the class and instance methods of your model.

Both class and instance methods accept a Hash of local options, call the operation and return a response.

``` ruby
# instance operations
service = AuthService.new
response = service.authenticate(message: { username: "luke", secret: "secret" })

# class operations
response = AuthService.authenticate(message: { username: "luke", secret: "secret" })
```

Operation methods can be overwritten to simplify the interface. Remember to call `super` to execute the request.

{% highlight ruby %}
class User
  extend Savon::Model

  client wsdl: "http://example.com?wsdl"
  operations :get_user, :get_all_users

  def get_user(id)
    response = super(message: { user_id: id })
    response.body[:get_user_response][:return]
  end

end
{% endhighlight %}


Changes
-------

A probably incomplete list of changes to help you migrate your application.


### Removals

* The new interface does not use `Savon.config` as it introduced global state.
* Hooks are no longer supported. We need to find a simpler solution for this problem.
* The new `Savon::Response` does not have a `#[]` method. Use the `#body` method instead.

### Simplified the object hierarchy

* Instead of raising a `Savon::SOAP::Fault`, the new interface raises a `Savon::SOAPFault`.
* Instead of raising a `Savon::HTTP::Error`, the new interface raises a `Savon::HTTPError`.
* Instead of raising a `Savon::SOAP::InvalidResponseError`, the new interface raises a `Savon::InvalidResponseError`.


Roadmap
-------

Here is a list of things that still need to be addressed:

* `Savon::Spec` depends on hooks and does not work with the new interface
* WSSE signature was not covered by specs and has been removed
* SSL client and NTLM auth are currently not supported

This list may be far from complete, so please let me know if there's anything missing.  
Thanks in advance!
