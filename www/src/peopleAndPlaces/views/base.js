
(function($, PP){

	PP.Views.Base = new JS.Class(PP.Observer, {
		player: null,
		paper: null,
		root: null,
		set: null,
		visible: false,
		inFocus: false,
		initialize: function (rootId, player) {
			this.callSuper();
			this.player = player;
			this.paper = Raphael(rootId, player.width, player.height);
			this.set = this.paper.set();
			this.root = $("#" + rootId);
			this.hide();
			this.initUI();
			if (!IsiPhoneOS) {
				this.initKeyboard();
			}
			return this;
		},
		initKeyboard: function () {
			/* to be overriden */
			return this;
		},
		initUI: function() {
			/* to be overriden */
			return this;
		},
		focus: function () {
			this.inFocus = true;
			this.publish("onFocus");
			return this;
		},
		blur: function () {
			this.inFocus = false;
			this.publish("onBlur");
			return this;
		},
		show: function () {
			this.visible = true;
			this.root.fadeIn(250);
			this.publish("onShow");
			return this;
		},
		hide: function (keepFocus) {
			console.log("hidding", this.root);
			this.visible = false;
			this.root.fadeOut(350);
			this.publish("onHide", [keepFocus]);
			return this;
		}
	});

})(jQuery, PocketPeople);


