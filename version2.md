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
To give it a try, add the following line to your Gemfile to get started:

``` ruby
gem "savon", github: "savonrb/savon", branch: "version2"
```


Client
------

The new client should be a lot simpler to use than the old one, because everything in Savon 2.0 is based on
a defined set of global and local options. To create a new client based on a WSDL document, you could set the
global `:wsdl` option by passing a Hash to the `Savon.client` "factory method". The client's constructor
accepts various [global options](#globals) which are specific to a service.

``` ruby
client = Savon.client(wsdl: "http://example.com?wsdl")
```

Along with the simple Hash-based interface, Savon also comes with an interface based on blocks. This should sound
familiar to you if you used version 1 before. If you're passing a block to the constructor, it is executed using the
[instance_eval with delegation](http://www.dcmanges.com/blog/ruby-dsls-instance-eval-with-delegation) pattern.
It's a smart, but ugly, but convenient little hack.

``` ruby
client = Savon.client do
  wsdl "http://example.com?wsdl"
end
```

The downside to this interface is, that it doesn't allow you to use instance variables inside the block.
You can only use local variables or call methods on your class. If you don't mind to type a few more
characters, you could accept an argument in your block and Savon will simply yield the global options
to it. That way, you can use as many instance variables as you like.

``` ruby
client = Savon.client do |globals|
  globals.wsdl "http://example.com?wsdl"
end
```

In case the service doesn't have a WSDL, you need to tell Savon about the SOAP endpoint and target namespace
of your service. Only with a WSDL, Savon can tell you about the SOAP operations available for the service.

``` ruby
client.operations  # => [:authenticate, :find_user]
```

The client was build to send SOAP messages, so let's do that.

``` ruby
response = client.call(:authenticate, message: { username: "luke", password: "secret" })
```

If you used Savon before, this should look familiar to you. But in contrast to the old client, the new
`#call` method does not provide the same interface as the old `#request` method. It's all about options,
so here's where you can use various [local options](#locals) that are specific to a request.

The `#call` method supports the same interface as the constructor. You can pass a simple Hash or
a block to use the instance_eval with delegation pattern.

``` ruby
response = client.call(:authenticate) do
  message username: "luke", password: "secret"
  convert_tags_to { |tag| tag.upcase }
end
```

You can also accept an argument in your block and Savon will yield the local options to it.

``` ruby
response = client.call(:authenticate) do |locals|
  locals.message username: "luke", password: "secret"
  locals.wsse_auth "luke", "secret", :digest
end
```

And that's it. The public API. Quite concise. But then of course, there are tons of options.


Globals
-------

Global options are passed to the client's constructor and are specific to a service.

Although they are called "global options", they really are local to a client instance. Savon version 1 was
based on a global `Savon.configure` method to store the configuration. While this was a popular concept
back then, adapted by tons of libraries, its problem is global state. I tried to fix that problem.

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

Changing the default affects both the Content-Type header:

``` ruby
{ "Content-Type" => "text/xml;charset=UTF-16" }
```

and the XML instruction:

``` xml
<?xml version="1.0" encoding="UTF-16"?>
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

Notice the `v1:authenticate` message tag in the generated request:

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
Savon.client(raise_errors: false)
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

**message:** You probably want to add some arguments to your request. For simple XML which can
easily be represented as a Hash, you can pass the SOAP message as a Hash. Savon uses [Gyoku](https://github.com/savonrb/gyoku)
to translate the Hash into XML.

``` ruby
client.call(:authenticate, message: { username: 'luke', password: 'secret' })
```

For more complex XML structures, you can pass any other object that is not a Hash and responds
to `#to_s` if you want to use a more specific tool to build your request.

``` ruby
class ServiceRequest

  def to_s
    builder = Builder::XmlMarkup.new
    builder.instruct!(:xml, encoding: "UTF-8")

    builder.person { |b|
      b.username("luke")
      b.password("secret")
    }

    builder
  end

end

client.call(:authenticate, message: ServiceRequest.new)
```

**message_tag:** You can change the name of the SOAP message tag. If you need to use this option,
please open an issue let me know why.

``` ruby
client.call(:authenticate, message_tag: :authenticationRequest)
```

This should be set by Savon if it has a WSDL. If it doesn't, it generates a message tag from the SOAP
operation name. Here's how the option changes the request.

``` xml
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tns="http://v1.example.com/">
  <env:Body>
    <tns:authenticationRequest></tns:authenticationRequest>
  </env:Body>
</env:Envelope>
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

**Savon::InvalidResponseError** is raised when you try to access the response header or body of a response
that is not a SOAP response as a Hash. If the response is not an XML document with an envelope, a header
and a body node, it's not accessible as a Hash.

``` ruby
def get_id_from_response(response)
  response.body[:return][:id]
rescue Savon::InvalidResponseError
  Logger.log "Invalid server response"
  raise
end
```


Response
--------

The response provides a few convenience methods for you to work with the XML in any way you want.

**#header** translates the response and returns the SOAP header as a Hash.

``` ruby
response.header  # => { token: "secret" }
```

**#body** translates the response and returns the SOAP body as a Hash.

``` ruby
response.body  # => { response: { success: true, name: "luke" } }
```

**#hash** translates the response and returns it as a Hash.

``` ruby
response.hash  # => { envelope: { header: { ... }, body: { ... } } }
```

Savon uses [Nori](http://rubygems.org/gems/nori) to translate the SOAP response XML to a Hash.
You can change how the response is translated through a couple of global and local options.
The following example shows the options available to configure Nori and their defaults.

``` ruby
client = Savon.client do
  # Savon defaults to strip namespaces from the response
  strip_namespaces true

  # Savon defaults to convert XML tags to snakecase Symbols
  convert_tags_to { |tag| tag.snakecase.to_sym }
end

client.call(:operation) do
  # Savon defaults to activate "advanced typecasting"
  advanced_typecasting true

  # Savon defaults to the Nokogiri parser
  response_parser :nokogiri
end
```

These options map to Nori's options and you can find more information about how they work in
the [README](https://github.com/savonrb/nori/blob/master/README.md).

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

`Savon::Model` can be used to model a class interface on top of a SOAP service. Extending any class
with this module will give you three class methods to configure the service model.

**.client** sets up the client instance used by the class.

Needs to be called before any other model class method to set up the Savon client with a `:wsdl` or
the `:endpoint` and `:namespace` of the service.

``` ruby
class User
  extend Savon::Model

  client wsdl: "http://example.com?wsdl"
  # or
  client endpoint: "http://example.com", namespace: "http://v1.example.com"
end
```

**.global** sets a global option to a given value.

If there are multiple arguments for an option (like an auth method requiering username and password),
you can pass those as separate arguments to the `.global` method instead of passing an Array.

``` ruby
class User
  extend Savon::Model

  client wsdl: "http://example.com?wsdl"

  global :open_timeout, 30
  global :basic_auth, "luke", "secret"
end
```

**.operations** defines class and instance methods for he given SOAP operations.

Use this method to specify which SOAP operations should be available through your service model.

``` ruby
class User
  extend Savon::Model

  client wsdl: "http://example.com?wsdl"

  global :open_timeout, 30
  global :basic_auth, "luke", "secret"

  operations :authenticate, :find_user

  def self.find_user(id)
    super(message: { id: id })
  end
end
```

For every SOAP operation, it creates both class and instance methods. All thesemethods call the
service with an optional Hash of local options and return a response.

``` ruby
# instance operations
user = User.new
response = user.authenticate(message: { username: "luke", secret: "secret" })

# class operations
response = User.find_user(1)
```

In the previous User class example, we're overwriting the `.find_user` operation and delegating to `super`
with a SOAP message Hash. You can do that both on the class and on the instance.


Changes
-------

A probably incomplete list of changes to help you migrate your application. Let me know if you think there's
something missing.

**Savon.config** was removed to better support concurrent usage and allow to use Savon in multiple different
configurations in a single project.

**Hooks** are no longer supported. The implementation was way too complex and still didn't properly solve the
problem of serving as a mock-helper for the [Savon::Spec](http://rubygems.org/gems/savon_spec) gem. If you used
them for any other purpose, please open an issue and we may find a better solution.

**Nori** was updated to remove global state. All Nori 2.0 options are now encapsulated and can be configured
through Savon's options. This allows to use Nori in multiple different configurations in a project that uses Savon.

**WSSE signature** was not covered with specs and has been removed. If anyone uses this and wants to provide a
properly tested implementation, please talk to me.

**response[]** the Hash-like read-access to the response was removed.

**Savon::SOAP::Fault** was renamed to `Savon::SOAPFault`.

**Savon::HTTP::Error** was renamed to `Savon::HTTPError`.

**Savon::SOAP::InvalidResponseError** was renamed to `Savon::InvalidResponseError`.


Roadmap
-------

If you think anything's missing, and there probably is, [please open an issue](https://github.com/savonrb/savon/issues).

**Savon::Spec** depends on hooks and does not work with the new interface. Maybe a lightweight integration server
could solve this problem in a better way.

**SSL client authentication** does not seem to work right now. Needs integration tests.

**NTLM authentication** probably does not work right now. Needs specs and integration tests.
