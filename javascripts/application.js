function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

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

  if (document.location.toString().indexOf("#") == -1 && readCookie("savon-animate") === null) {
    var $nav      = $("nav"),
        $navList  = $nav.find("ol"),
        navHeight = $nav.height();

    $navList.hide();
    $nav.css({ "height": 5, "padding-top": 0, "padding-bottom": 0 });

    createCookie("savon-animate", "true", 7);

    window.setTimeout(function() {
      $nav.animate({ height: navHeight, paddingTop: 20, paddingBottom: 10 }, 1500, "easeInOutCubic");
      $navList.show();
    }, 1000);
  }

});
