$(function() {

  var url = document.location.toString();
  var $lists = $("nav ol ol");

	var handler = function(event) {
		var anchor = "#" + this.href.split("#")[1];

    history.pushState({ path: this.path }, "", this.href);
		$("html, body").stop().animate({ scrollTop: $(anchor).offset().top }, 500, "easeInOutCubic");

    return false;
	}

  if (history.pushState !== undefined) {
    if (url.indexOf("examples.html") > -1) {
      $($lists[1]).find("a").bind("click", handler);
    } else {
      $($lists[0]).find("a").bind("click", handler);
    }
  }

  $("#stage h2").bind("click", function(event) {
    var $anchor = $(this),
        top = document.location.toString().split("#")[0];

    if (history.pushState !== undefined) {
      history.pushState({ path: this.path }, "", top);
      $("html, body").stop().animate({ scrollTop: 0 }, 500, "easeInOutCubic");
    } else {
      document.location = top;
    }

    return false;
  });

});
