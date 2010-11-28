
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

	/**
	 * Panel for showing generic notifications
	 * @constructor
	 */
	Views.Notifications = new JS.Class(PP.Views.Base, {
		initialize: function(rootId, player) {
			this.callSuper(rootId, player);
		},
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			function GlowEffect(x, y, size, speed, paper) {
				var w = 295 * size,
					h = 295 * size,
					centerX = x - (w/2),
					centerY = y - (h/2);

				Raphael.el.glowEffectTurn = function (timespan, clockwise) {
					var degrees = 360 * ((clockwise) ? 1 : -1);

					this.animate({
						"rotation": degrees
					}, timespan, function(){
						this.attr({
							"rotation": 0
						});
						this.glowEffectTurn(timespan, clockwise);
						return this;
					});
					return this;
				};
				Raphael.el.dim = function (opacity) {
					this.attr({
						"opacity": opacity
					});
					return this;
				};
				this.burstA = paper
						.image("images/glow/burstA.png", centerX, centerY, w, h)
						.dim(0.6);
				this.burstB = paper
						.image("images/glow/burstB.png", centerX, centerY, w, h)
						.dim(0.6);
				this.burstC = paper
						.image("images/glow/burstB.png", centerX, centerY, w, h)
						.dim(0.6);

				this.stop = function() {
					this.burstA.stop();
					this.burstB.stop();
					this.burstC.stop();
				};
				this.turn = function () {
					this.burstA.glowEffectTurn(70000/speed, false);
					this.burstB.glowEffectTurn(50000/speed, true);
					this.burstC.glowEffectTurn(110000/speed, false);
				};

//				this.glow = paper
//					.image("images/glow/glow.png", x, y, w, h);
			}


			this.set.background = paper
				.rect(0, 0, 960, 540, 0).attr({
					opacity: 0.4,
					fill: "#000"
				});
			this.set.backgroundImage = paper
				.image("images/highlight.png", 0, 0, 960, 540, 0)

			this.set.glowEffect = new GlowEffect(310, 155, 0.9, 0.7, paper);

			this.set.icon = paper
				.image("", 250, 80, 130, 130, 0);

			this.set.details = $("<div class='ppPanel'></div>").css({
				color: "#fff",
				top: "80px",
				left: "400px",
				width: "400px"
			}).appendTo(this.root);

			this.set.title = $("<h2>title</h2>")
				.css({
					"font-size": "26px",
					"margin": "0px 0px 15px 0px"
				})
				.appendTo(this.set.details);

			this.set.message = $("<div>descr</div>")
				.css({
					"font-size": "18px",
					"margin": "0px 0px 15px 0px"
				})
				.appendTo(this.set.details);

			this.set.btnOk = $("<button>Ok</button>")
				.css({
					"font-size": "18px"
				})
				.click(function () {
					view.hide();
				})
				.appendTo(this.set.details);

			this.set.push(
					this.set.icon,
					this.set.background,
					this.set.backgroundImage);

		},
		notify: function(iconHash, title, message, btnOkLabel) {
			var player = this.player,
				icon,
				iconURL;
			console.log("iconHash: ", iconHash);
			icon = player.world.inventory.get(iconHash);
			iconURL = player.urlMapper.image(icon.url, icon.parent.id);
			this.set.icon.attr({
				src: iconURL
			});
			this.set.title.html(title || "");
			this.set.message.html(message || "");
			this.set.btnOk.html(btnOkLabel || "");
			return this;
		},
		initKeyboard : function () {
			var self = this;
			$(document).keyup(function(e) {
				if (!e.isPropagationStopped()) {
					if (e.which == 27) {
						console.log(self);
						if (self.inFocus) {
							self.hide();
							e.stopPropagation();
						}
					}
				}
			});
			return this;
		},
		hide: function () {
			if (this.set.glowEffect) this.set.glowEffect.stop();
			this.callSuper();
		},
		show: function () {
			this.callSuper();
			this.visible = true;
			this.set.details.css({
				"margin-top": -50,
				"opacity": 0
			})
			this.set.glowEffect.turn();
			this.root.fadeIn(150);
			this.set.details
				.animate({
					"margin-top": 0,
					"opacity": 1
				}, 500);
			this.publish("onShow");
			return this;
		}
	});



})(jQuery, PocketPeople);


