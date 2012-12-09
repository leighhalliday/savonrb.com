---
title: Version 2
layout: default
---

Getting started
---------------

As explained in [this blog post](http://savonrb.com/2012/06/30/milestones.html), Savon's public interface
needs to change in order to support refactorings and new features. I pushed the [version2 branch](https://github.com/savonrb/savon/tree/version2)
up at Github a few days ago, so you can follow the progress and there's also [issue 332](https://github.com/savonrb/savon/issues/332) for you to
discuss the changes.

The new interface is not feature-complete yet, but I would really appreciate your feedback!  
To give it a try, add the following line to your Gemfile:

``` ruby
gem "savon", :github => "savonrb/savon", :branch => "version2"
```


The Client
----------

The new client works a little bit different than the current one. Here's how you would instantiate a new
client and point it to a remote WSDL document.

``` ruby
client = Savon.new_client(wsdl: "http://example.com?wsdl")
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
Savon.new_client(wsdl: "http://example.com?wsdl")
Savon.new_client(wsdl: "/Users/me/project/service.wsdl")
```

Setting the SOAP endpoint and target namespace allows requests without a WSDL document.

``` ruby
Savon.new_client(endpoint: "http://example.com", namespace: "http://v1.example.com")
```

The default namespace identifier is `:wsdl`.

``` ruby
Savon.new_client(namespace_identifier: :ins0)
```

You can use a proxy server.

``` ruby
Savon.new_client(proxy: "http://example.org")
```

Set HTTP headers.

``` ruby
Savon.new_client(headers: { "Authentication" => "secret" })
```

Specify both the open and read timeout (in seconds).

``` ruby
Savon.new_client(open_timeout: 5, read_timeout: 5)
```

Change the default encoding from "UTF-8" to whatever you prefer.  
Affects both the CONTENT-TYPE header and the XML instruction tag.

``` ruby
Savon.new_client(encoding: "UTF-16")
```

You can set a global SOAP header.

``` ruby
Savon.new_client(soap_header: { "Authentication" => "top-secret" })
```

As long as your WSDL does not contain any import, Savon should know whether or not to qualify elements.
If you need to use this option, please open an issue and make sure to add your WSDL for debugging.

``` ruby
Savon.new_client(element_form_default: :qualified)  # or :unqualified
```

Savon defaults to use `:env` as the namespace identifier for the SOAP envelope. If that doesn't work  
for you, I would like to know why. So please open an issue and make sure to add your WSDL for debugging

``` ruby
Savon.new_client(env_namespace: :soapenv)
```

Changes the SOAP version.

``` ruby
Savon.new_client(soap_version: 2)  # or 1
```

By default, Savon does not raise SOAP fault and HTTP errors, but you can change that.

``` ruby
Savon.new_client(raise_errors: true)
```

Any object that responds to `#log` can be used to replace the default logger.

``` ruby
Savon.new_client(logger: Rails.logger)
```

You can pimp the log output for debugging purposes.

``` ruby
Savon.new_client(pretty_print_xml: true)
```

Savon supports HTTP basic authentication.

``` ruby
Savon.new_client(basic_auth: ["luke", "secret"])
```

And HTTP digest authentication.

``` ruby
Savon.new_client(digest_auth: ["lea", "top-secret"])
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

Savon comes with a nice set of specs that cover both
[global and local options](https://github.com/savonrb/savon/blob/version2/spec/integration/options_spec.rb).


Response
--------

The response should work like it ever did with one exception. I removed the `#[]` method,
so you might change to use the `#body` method instead.


Changes
-------

A probably incomplete list of changes to help you migrate your application.


### Naming

* The SOAP `body` Hash is called `message` in the new interface.

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

* `Savon::Model` currently still used the "old" client
* `Savon::Spec` does not work with the new interface
* SSL, WSSE and NTLM authentication are currently not supported

This list may be far from complete, so please let me know if there's anything missing.  
Thanks in advance!
