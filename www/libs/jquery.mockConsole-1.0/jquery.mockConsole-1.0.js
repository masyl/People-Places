/*
	Function jQuery.mockConsole

	If not console object is found, enables a mock console to prevent console call from breaking the prod environment

	Version:
		1.1

	Author:
		Mathieu Sylvain 2010 (mathieu@ti-coco.com)

	Contribute:
		Michel Gratton 2010 (michel.gratton@nadrox.com)
		
	Parameters:

		config - configuration. Simple provide callback function with matching names to override the consoles behavior
*/

;(function($) {
    $.mockConsole = function(config) {
        var c = function() {};
        var mcConsole = {
                assert: c,
                clear: c,
                count: c,
                debug: c,
                dir: c,
                dirxml: c,
                error: c,
                group: c,
                groupCollapsed: c,
                groupEnd: c,
                info: c,
                log: c,
                profile: c,
                profileEnd: c,
                time: c,
                timeEnd: c,
                trace: c,
                warn: c
            };
        $.extend(mcConsole, config);
        if(typeof(window.console) === "undefined"){ // || ($.browser.msie && typeof(console) === "undefined")) {
            // mocking full console!
            window.console = mcConsole;
        } else {
            for(fn in mcConsole){
                if(mcConsole.hasOwnProperty(fn)) {
                    if(typeof window.console[fn] === "undefined") {
                        //mocking few functions.. but console is available :)
                        window.console[fn] = mcConsole[fn];
                    }
                }
            }
        }
    }();
})(jQuery);