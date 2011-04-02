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

	$("nav a").bind("click", function(event) {
		var $anchor = $(this);

    history.pushState({ path: this.path }, "", this.href);
		$("html, body").stop().animate({
			scrollTop: $($anchor.attr("href")).offset().top - 30
		}, 500, "easeInOutCubic");

    return false;
	});

	$("#stage h2").bind("click", function(event) {
		var $anchor = $(this);

    history.pushState({ path: this.path }, "", "/");
		$("html, body").stop().animate({
			scrollTop: 0
		}, 500, "easeInOutCubic");

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
