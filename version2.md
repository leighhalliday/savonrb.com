---
title: Version 2
layout: default
---

Getting started
---------------

As explained in [this blog post](http://savonrb.com/2012/06/30/milestones.html), Savon's public interface
needs to change in order to support refactorings and new features. I dropped the initial plan to add the
new interface to an upcoming 1.x release. Instead, I pushed the [version2 branch](https://github.com/savonrb/savon/tree/version2)
up at Github, so you can follow the progress and there's also [issue 332](https://github.com/savonrb/savon/issues/332)
for you to discuss the changes.

The new interface is not feature-complete yet, but I would really appreciate your feedback!  
To give it a try, add the following line to your Gemfile:

``` ruby
gem "savon", github: "savonrb/savon", branch: "version2"
```


Client
------

The new client works a little bit different than the current one. Here's how you would instantiate a new
client and point it to a remote WSDL document.

``` ruby
client = Savon.client(wsdl: "http://example.com?wsdl")
```

You can inspect the service and ask Savon which operations it contains:

``` ruby
client.operations  # => [:authenticate]
```

And that's basically it. Of course there's also a method for calling a SOAP operation, but let's first
take a look at the global options available to configure the client. These options are not global in
the way `Savon.config` was. Instead, they are scoped to a client instance.


Globals
-------

Global options are passed to the client's initializer and belong to a particular client instance.

Savon accepts a local or remote WSDL document.

``` ruby
Savon.client(wsdl: "http://example.com?wsdl")
Savon.client(wsdl: "/Users/me/project/service.wsdl")
```

Setting the SOAP endpoint and target namespace allows requests without a WSDL document.

``` ruby
Savon.client(endpoint: "http://example.com", namespace: "http://v1.example.com")
```

The default namespace identifier is `:wsdl`.

``` ruby
Savon.client(namespace_identifier: :ins0)
```

You can use a proxy server.

``` ruby
Savon.client(proxy: "http://example.org")
```

Set HTTP headers.

``` ruby
Savon.client(headers: { "Authentication" => "secret" })
```

Specify both the open and read timeout (in seconds).

``` ruby
Savon.client(open_timeout: 5, read_timeout: 5)
```

Change the default encoding from "UTF-8" to whatever you prefer.  
Affects both the CONTENT-TYPE header and the XML instruction tag.

``` ruby
Savon.client(encoding: "UTF-16")
```

You can set a global SOAP header.

``` ruby
Savon.client(soap_header: { "Authentication" => "top-secret" })
```

As long as your WSDL does not contain any import, Savon should know whether or not to qualify elements.
If you need to use this option, please open an issue and make sure to add your WSDL for debugging.

``` ruby
Savon.client(element_form_default: :qualified)  # or :unqualified
```

Savon defaults to use `:env` as the namespace identifier for the SOAP envelope. If that doesn't work  
for you, I would like to know why. So please open an issue and make sure to add your WSDL for debugging

``` ruby
Savon.client(env_namespace: :soapenv)
```

Changes the SOAP version.

``` ruby
Savon.client(soap_version: 2)  # or 1
```

By default, Savon does not raise SOAP fault and HTTP errors, but you can change that.

``` ruby
Savon.client(raise_errors: true)
```

Savon instructs Nori to strip any namespace identifiers from the response.

``` ruby
Savon.client(strip_namespaces: false)
```

It also instructs Nori to convert any XML tag from the response to a snakecase String.
You can specify a custom `Proc` or any object that responds to `#call`.

``` ruby
Savon.client(convert_tags_to: lambda { |key| key.upcase })
```

Any object that responds to `#log` can be used to replace the default logger.

``` ruby
Savon.client(logger: Rails.logger)
```

You can format the log output for debugging purposes.

``` ruby
Savon.client(pretty_print_xml: true)
```

Savon supports HTTP basic authentication.

``` ruby
Savon.client(basic_auth: ["luke", "secret"])
```

And HTTP digest authentication.

``` ruby
Savon.client(digest_auth: ["lea", "top-secret"])
```

As well as WSSE basic/digest auth.

``` ruby
Savon.client(wsse_auth: ["lea", "top-secret"])
Savon.client(wsse_auth: ["lea", "top-secret", :digest])
```

And activate WSSE timestamp auth:

``` ruby
Savon.client(wsse_timestamp: true)
```

Savon comes with a nice set of specs that cover both
[global and local options](https://github.com/savonrb/savon/blob/version2/spec/integration/options_spec.rb).


Operations
----------

To execute a SOAP request, you can ask Savon for an operation and call it with a message to send:

``` ruby
message = { username: 'luke', password: 'secret' }
response = client.call(:authenticate, message: message)
```

In this example, `:authenticate` is the name of the SOAP operation and the `message` Hash is what was formerly
known as the SOAP `body` Hash. The reason to change the naming is related to the SOAP request and the fact that
the former "body" never really influenced the entire SOAP body.

The operations `#call` method also accepts a certain set of request-specific options called `locals`.


Locals
------

Local options are passed to the client's `#call` method and belong to a particular request.

As you've seen, you can specify the SOAP message to send as a Hash or a String or XML.

``` ruby
client.call(:authenticate, message: { username: 'luke', password: 'secret' })
client.call(:authenticate, message: "<username>luke</username><password>secret</password>")
```

You can also change the name of the SOAP message tag.

``` ruby
client.call(:authenticate, message_tag: :doAuthenticate)
```

The SOAPAction HTTP header.

``` ruby
client.call(:authenticate, soap_action: "urn:Authenticate")
```

And if you need to, you can even send completely custom XML.

``` ruby
client.call(:authenticate, xml: "<envelope><body></body></envelope>")
```

Savon by default instructs Nori to use "advanced typecasting" to convert XML values like
"true" to `TrueClass`, dates to date objects, etc.

``` ruby
client.call(:authenticate, advanced_typecasting: false)
```

Savon uses Nori's Nokogiri parser by default. It ships with a REXML parser as an alternative.
If you need to switch to REXML, please open an issue and describe the problem you have with
the Nokogiri parser.

``` ruby
client.call(:authenticate, response_parser: :rexml)
```

Savon comes with a nice set of specs that cover both
[global and local options](https://github.com/savonrb/savon/blob/version2/spec/integration/options_spec.rb).


Response
--------

The response should work like it ever did with one exception. I removed the `#[]` method,
so you might change to use the `#body` method instead.


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
