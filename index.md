---
title: Getting started
layout: default
---

Installation & Resources
------------------------

Savon is available through [Rubygems](http://rubygems.org/gems/savon) and can be installed via:

{% highlight bash %}
$ gem install savon
{% endhighlight %}

[The code](http://github.com/rubiii/savon) is hosted on Github,
[RDoc Documentation](http://rubydoc.info/gems/savon/frames) is provided by RubyDoc.info  
and there's a [Mailing list](https://groups.google.com/forum/#!forum/savonrb) at Google Groups.


Setting up the client
---------------------

[`Savon::Client`](http://github.com/rubiii/savon/blob/master/lib/savon/client.rb) is the
interface to your SOAP service. The easiest way to get started is to use a local or remote
WSDL document.

{% highlight ruby %}
client = Savon::Client.new do
  wsdl.document = "http://service.example.com?wsdl"
end
{% endhighlight %}

`Savon::Client.new` accepts a block inside which you can access local variables and even public
methods from your own class, but instance variables won't work. If you want to know why that is,
I'd recommend reading about
[instance_eval with delegation](http://www.dcmanges.com/blog/ruby-dsls-instance-eval-with-delegation).

If you don't like this behaviour or if it's creating a problem for you, you can accept arguments
in your block to specify which objects you would like to receive and Savon will yield those instead
of instance evaluating the block. The block accepts 1-3 arguments and yields the following objects.

    [wsdl, http, wsse]

These objects provide methods for setting up the client. In order to use the wsdl and http object,
you can specify two (of the three possible) arguments.

{% highlight ruby %}
client = Savon::Client.new do |wsdl, http|
  wsdl.document = "http://service.example.com?wsdl"
  http.proxy = "http://proxy.example.com"
end
{% endhighlight %}

You can also access them through methods of your client instance.

{% highlight ruby %}
client.wsse.credentials "username", "password"
{% endhighlight %}

### (Not) using a WSDL

You can instantiate a client with or without needing a (local or remote) WSDL document. Using a
WSDL is a little easier because Savon can parse the WSDL for the target namespace, endpoint and
available SOAP actions. But the (remote) WSDL has to be downloaded and parsed once for every
client and so comes with a performance penalty.

To use a local WSDL, you specify the path to the file instead of the remote location.

{% highlight ruby %}
client = Savon::Client.new do
  wsdl.document = File.expand_path("../wsdl/ebay.xml", __FILE__)
end
{% endhighlight %}

With the client set up, you can now see what Savon knows about your service through methods offered
by [`Savon::WSDL::Document`](http://github.com/rubiii/savon/blob/master/lib/savon/wsdl/document.rb) (wsdl).
It's not too much, but it can save you some code.

{% highlight ruby %}
# the target namespace
client.wsdl.namespace     # => "http://v1.example.com"

# the SOAP endpoint
client.wsdl.endpoint      # => "http://service.example.com"

# available SOAP actions
client.wsdl.soap_actions  # => [:create_user, :get_user, :get_all_users]

# the raw document
client.wsdl.to_xml        # => "<wsdl:definitions name=\"AuthenticationService\" ..."
{% endhighlight %}

Your service probably uses (lower)CamelCase names for actions and params, but Savon maps those to
snake_case Symbols for you.

To use Savon without a WSDL, you initialize a client by setting the SOAP endpoint and target namespace.

{% highlight ruby %}
client = Savon::Client.new do
  wsdl.endpoint = "http://service.example.com"
  wsdl.namespace = "http://v1.example.com"
end
{% endhighlight %}

It's up to you.

### Preparing for HTTP

Savon uses [HTTPI](http://rubygems.org/gems/httpi) to execute GET requests for WSDL documents and
POST requests for SOAP requests. HTTPI is an interface to HTTP libraries like Curl and Net::HTTP.

The library comes with a request object called
[`HTTPI::Request`](http://github.com/rubiii/httpi/blob/master/lib/httpi/request.rb) (http)
which you can access through the client. I'm only going to document a few interesting details about
it and point you to the documentation for HTTPI for additional information.

SOAPAction is an HTTP header information required by legacy services. If present, the header
value must have double quotes surrounding the URI-reference (SOAP 1.1. spec, section 6.1.1).
Here's how you would set/overwrite the SOAPAction header in case you need to.

{% highlight ruby %}
client.http.headers["SOAPAction"] = '"urn:example#service"'
{% endhighlight %}

If your service relies on cookies to handle sessions, you can grab the cookie from the
[`HTTPI::Response`](http://github.com/rubiii/httpi/blob/master/lib/httpi/response.rb) and set it
for subsequent requests.

{% highlight ruby %}
client.http.headers["Cookie"] = response.http.headers["Set-Cookie"]
{% endhighlight %}

### WSSE authentication

Savon comes with [`Savon::WSSE`](http://github.com/rubiii/savon/blob/master/lib/savon/wsse.rb) (wsse)
for you to use wsse:UsernameToken authentication.

{% highlight ruby %}
client.wsse.credentials "username", "password"
{% endhighlight %}

Or wsse:UsernameToken digest authentication.

{% highlight ruby %}
client.wsse.credentials "username", "password", :digest
{% endhighlight %}

Or wsse:Timestamp authentication.

{% highlight ruby %}
client.wsse.timestamp = true
{% endhighlight %}

By setting `#timestamp` to `true`, the wsu:Created is set to `Time.now` and wsu:Expires is set to
`Time.now + 60`. You can also specify your own values manually.

{% highlight ruby %}
client.wsse.created_at = Time.now
client.wsse.expires_at = Time.now + 60
{% endhighlight %}

`Savon::WSSE` is based on an
[autovivificating Hash](http://stackoverflow.com/questions/1503671/ruby-hash-autovivification-facets).
So if you need to add custom tags, you can add them.

{% highlight ruby %}
client.wsse["wsse:Security"]["wsse:UsernameToken"] = { "Organization" => "ACME" }
{% endhighlight %}

When generating the XML for the request, this Hash will be merged with another Hash containing all the
default tags and values. This way you might digg into some code, but then you can even overwrite the
default values.


Executing SOAP requests
-----------------------

Now for the fun part. To execute SOAP requests, you use the `Savon::Client#request` method. Here's a
very basic example of executing a SOAP request to a `get_all_users` action.

{% highlight ruby %}
response = client.request :get_all_users
{% endhighlight %}

This single argument (the name of the SOAP action to call) works in different ways depending on whether
you're using a WSDL document. If you do, Savon will parse the WSDL document for available SOAP actions
and convert their names to snake_case Symbols for you.

Savon converts snake_case_symbols to lowerCamelCase like this:

{% highlight ruby %}
:get_all_users.to_s.lower_camelcase  # => "getAllUsers"
:get_pdf.to_s.lower_camelcase        # => "getPdf"
{% endhighlight %}

This convention might not work for you if your service requires CamelCase method names or methods with
UPPERCASE acronyms. But don't worry. If you pass in a String instead of a Symbol, Savon will not convert
the argument. The difference between Symbols and String identifiers is one of Savon's convention.

{% highlight ruby %}
response = client.request "GetPDF"
{% endhighlight %}

The argument(s) passed to the `#request` method will affect the SOAP input tag inside the SOAP request.  
To make sure you know what this means, here's an example for a simple request:

{% highlight xml %}
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <env:Body>
    <getAllUsers />  <!-- the SOAP input tag -->
  </env:Body>
</env:Envelope>
{% endhighlight %}

Now if you need the input tag to be namespaced `<wsdl:getAllUsers />`, you pass two arguments
to the `#request` method. The first (a Symbol) will be used for the namespace and the second
(a Symbol or String) will be the SOAP action to call:

{% highlight ruby %}
response = client.request :wsdl, :get_all_users
{% endhighlight %}

You may also need to bind XML attributes to the input tag. In this case, you pass a Hash of
attributes following to the name of your SOAP action and the optional namespace.

{% highlight ruby %}
response = client.request :wsdl, "GetPDF", :id => 1
{% endhighlight %}

These arguments result in the following input tag.

{% highlight xml %}
<wsdl:GetPDF id="1" />
{% endhighlight %}

### Wrestling with SOAP

To interact with your service, you probably need to specify some SOAP-specific options.
The `#request` method is the second important method to accept a block and lets you access the
following objects.

    [soap, wsdl, http, wsse]

Notice, that the list is almost the same as the one for `Savon::Client.new`. Except now, there is an
additional object called soap. In contrast to the other three objects, the soap object is tied to single
requests.

[`Savon::SOAP::XML`](http://github.com/rubiii/savon/blob/master/lib/savon/soap/xml.rb) (soap) can only be
accessed inside this block and Savon creates a new soap object for every request.

Savon by default expects your services to be based on SOAP 1.1. For SOAP 1.2 services, you can set the
SOAP version per request.

{% highlight ruby %}
response = client.request :get_user do
  soap.version = 2
end
{% endhighlight %}

If you don't pass a namespace to the `#request` method, Savon will attach the target namespaces to
`"xmlns:wsdl"`. If you pass a namespace, Savon will use it instead of the default.

{% highlight ruby %}
client.request :v1, :get_user
{% endhighlight %}

{% highlight xml %}
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:v1="http://v1.example.com">
  <env:Body>
    <v1:GetUser>
  </env:Body>
</env:Envelope>
{% endhighlight %}

You can always set namespaces and overwrite namespaces. They're stored as a Hash.

{% highlight ruby %}
# setting a namespace
soap.namespaces["xmlns:g2"] = "http://g2.example.com"

# overwriting "xmlns:wsdl"
soap.namespaces["xmlns:wsdl"] = "http://ns.example.com"
{% endhighlight %}

### A little interaction

To call the `get_user` action of a service and pass the ID of the user to return, you can use
a Hash for the SOAP body.

{% highlight ruby %}
response = client.request :get_user do
  soap.body = { :id => 1 }
end
{% endhighlight %}

If you only need to send a single value or if you like to create a more advanced object to build
the SOAP body, you can pass any object that's not a Hash and responds to `to_s`.

{% highlight ruby %}
response = client.request :get_user_by_id do
  soap.body = 1
end
{% endhighlight %}

As you already saw before, Savon is based on a few conventions to make the experience of having to
work with SOAP and XML as pleasant as possible. The Hash is translated to XML using
[Gyoku](http://rubygems.org/gems/gyoku) which is based on the same conventions.

{% highlight ruby %}
soap.body = {
  :first_name => "The",
  :last_name  => "Hoff",
  "FAME"      => ["Knight Rider", "Baywatch"]
}
{% endhighlight %}

As with the SOAP action, Symbol keys will be converted to lowerCamelCase and String keys won't be
touched. The previous example generates the following XML.

{% highlight xml %}
<env:Envelope
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:wsdl="http://v1.example.com">
  <env:Body>
    <wsdl:CreateUser>
      <firstName>The</firstName>
      <lastName>Hoff</lastName>
      <FAME>Knight Rider</FAME>
      <FAME>Baywatch</FAME>
    </wsdl:CreateUser>
  </env:Body>
</env:Envelope>
{% endhighlight %}

Some services actually require the XML elements to be in a specific order. If you don't use Ruby 1.9
(and you should), you can not be sure about the order of Hash elements and have to specify the correct
order using an Array under a special `:order!` key.

{% highlight ruby %}
{ :last_name => "Hoff", :first_name => "The", :order! => [:first_name, :last_name] }
{% endhighlight %}

This will make sure, that the lastName tag follows the firstName.

Assigning arguments to XML tags using a Hash is even more difficult. It requires another Hash under
an `:attributes!` key containing a key matching the XML tag and the Hash of attributes to add.

{% highlight ruby %}
{ :city => nil, :attributes! => { :city => { "xsi:nil" => true } } }
{% endhighlight %}

This example will be translated to the following XML.

{% highlight xml %}
<city xsi:nil="true"></city>
{% endhighlight %}

I would not recommend using a Hash for the SOAP body if you need to create complex XML structures,
because there are better alternatives. One of them is to pass a block to the `Savon::SOAP::XML#xml`
method. Savon will then yield a `Builder::XmlMarkup` instance for you to use.

{% highlight ruby %}
soap.xml do |xml|
  xml.firstName("The")
  xml.lastName("Hoff")
end
{% endhighlight %}

Last but not least, you can also create and use a simple String (created with Builder or any another tool):

{% highlight ruby %}
soap.body = "<firstName>The</firstName><lastName>Hoff</lastName>"
{% endhighlight %}

Besides the body element, SOAP requests can also contain a header with additional information.
Savon sees this header as just another Hash following the same conventions as the SOAP body Hash.

{% highlight ruby %}
soap.header = { "SecretKey" => "secret" }
{% endhighlight %}

If you're sure that none of these options work for you, you can completely customize the XML to be used
for the SOAP request.

{% highlight ruby %}
soap.xml = "<custom><soap>request</soap></custom>"
{% endhighlight %}

Please take a look at the examples for some hands-on exercise.


Handling the response
---------------------

`Savon::Client#request` returns a
[`Savon::SOAP::Response`](http://github.com/rubiii/savon/blob/master/lib/savon/soap/response.rb).
Everything's really just a Hash.

{% highlight ruby %}
response.to_hash  # => { :response => { :success => true, :name => "John" } }
{% endhighlight %}

Alright, sometimes it's XML.

{% highlight ruby %}
response.to_xml  # => "<response><success>true</success><name>John</name></response>"
{% endhighlight %}

The response also contains the [`HTTPI::Response`](http://github.com/rubiii/httpi/blob/master/lib/httpi/response.rb)
which (obviously) contains information about the HTTP response.

{% highlight ruby %}
response.http  # => #<HTTPI::Response:0x1017b4268 ...
{% endhighlight %}

### In case of an emergency

By default, Savon raises both `Savon::SOAP::Fault` and `Savon::HTTP::Error` when encountering these
kind of errors.

{% highlight ruby %}
begin
  client.request :get_all_users
rescue Savon::SOAP::Fault => fault
  log fault.to_s
end
{% endhighlight %}

Both errors inherit from `Savon::Error`, so you can catch both very easily.

{% highlight ruby %}
begin
  client.request :get_all_users
rescue Savon::Error => error
  log error.to_s
end
{% endhighlight %}

You can change the default of raising errors and if you did, you can still ask the response to check
whether the request was successful.

{% highlight ruby %}
response.success?     # => false
response.soap_fault?  # => true
response.http_error?  # => false
{% endhighlight %}

And you can access the error objects themselves.

{% highlight ruby %}
response.soap_fault  # => Savon::SOAP::Fault
response.http_error  # => Savon::HTTP::Error
{% endhighlight %}

Please notice, that these methods always return an error object, even if no error exists. To check if
an error occured, you can either ask the response or the error objects.

{% highlight ruby %}
response.soap_fault.present?  # => true
response.http_error.present?  # => false
{% endhighlight %}


Global configuration
--------------------

By default, Savon logs each SOAP request and response to STDOUT using a log level of :debug.

{% highlight ruby %}
Savon.configure do |config|
  config.log = false            # disable logging
  config.log_level = :info      # changing the log level
  config.logger = Rails.logger  # using the Rails logger
end
{% endhighlight %}

If you don't like to rescue errors, here's how you can tell Savon to not raise them:

{% highlight ruby %}
Savon.configure do |config|
  config.raise_errors = false  # do not raise SOAP faults and HTTP errors
end
{% endhighlight %}

And changing the default SOAP version of 1.1 to 1.2 is also fairly easy:

{% highlight ruby %}
Savon.configure do |config|
  config.soap_version = 2  # use SOAP 1.2
end
{% endhighlight %}


Additional resources
--------------------

**Are you stuck?**

Then you're probably looking for someone to help. The [Mailing list](https://groups.google.com/forum/#!forum/savonrb)
is a good place to search for useful information and ask questions. Please make sure to post your
questions to the Mailing list instead of sending private messages so others can benefit from these
information.

**Did you run into a problem?**

So you think something's not working like it's supposed to? Or do you need a feature that Savon
doesn't support? Take a look at the [open issues](https://github.com/rubiii/savon/issues)
over own Github to see if this has already been reported. If it has not been reported yet,
please open an issue and make sure to leave useful information to debug the problem.

**Anything missing in this guide?**

Please [fork this guide](https://github.com/rubiii/savonrb.com) on Github and help to improve it!

**Do you want to help out?**

* Answer questions on the [Mailing list](https://groups.google.com/forum/#!forum/savonrb) or
  [Stack Overflow](http://stackoverflow.com/search?q=ruby+soap)
* Improve the documentation by writing an article or tutorial
* You could also help out with [open issues](https://github.com/rubiii/savon/issues)
* Or [test patches](https://github.com/rubiii/savon/pulls) and provide your feedback

**Are you looking for updates?**

If you're on Twitter, make sure to follow [@savonrb](http://twitter.com/savonrb) for updates
on bug fixes, new features and releases.


Ecosystem & alternatives
------------------------

* [Savon::Model](http://rubygems.org/gems/savon_model) creates SOAP service oriented models
* [Savon::Spec](http://rubygems.org/gems/savon_spec) helps you test your SOAP requests

If you feel like there's no way Savon will fit your needs, you should take a look at  
[The Ruby Toolbox](http://ruby-toolbox.com/categories/soap.html) to find an alternative.
