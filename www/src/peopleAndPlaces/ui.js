
(function($, PP){

	var Model = PP.Model;

	PP.PaperObject = new JS.Class(PP.Observer, {
		player: null,
		paper: null,
		set: null,
		view: null,
		x: 0,
		y: 0,
		initialize: function (view, x, y) {
			this.callSuper();
			this.x = x || 0;
			this.y = y || 0;
			this.view = view;
			this.player = view.player;
			this.paper = view.paper;
			this.set = this.paper.set();
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
		initUI: function () {
			/* to be overriden */
			return this;
		},
		show: function () {
			console.log(this.set.length);
			if (!this.visible) {
				this.set.length && this.set
					.attr({
						opacity: 0
					})
					.show()
					.animate({
						opacity: 1
					}, 300);
				this.visible = true;
			}
			this.visible = true;
			return this;
		},
		hide: function () {
			this.set.hide();
			this.visible = false;
			return this;
		},
		destroy: function() {
			this.set.remove();
		}
	});

	PP.StatusBar = new JS.Class(PP.PaperObject, {
		initUI: function () {
			var set = this.set,
				paper = this.paper;
			set.background = paper
				.image("images/statusBar-Background.png", 0, 0, 960, 111, 0);
			set.iconBg = paper
				.rect(10, 10, 86, 86, 22)
				.attr({
					"fill": "#000"
				});
			set.icon = paper
				.image("", 13, 13, 80, 80);
			set.title = paper
				.text(110, 27, "")
				.attr({
					"fill": "#fff",
					"font-size": "24px",
					"text-anchor": "start"
				});
			set.description = paper
				.text(110, 52, "")
				.attr({
					"fill": "#fff",
					"font-size": "16px",
					"text-anchor": "start"
				});
			set.push(
				set.background,
				set.iconBg,
				set.icon,
				set.title,
				set.description
			);
			return this;
		},
		placeMark: function(mark) {
			var self = this,
				set = this.set,
				paper = this.paper,
				location,
				icon,
				iconURL;

			if (mark) {
				iconURL = player.world.inventory.get(mark.icon).url;
				icon = player.urlMapper.image(iconURL, player.timeline.current.location.setId) || "";
				if (mark.markType === "destination") {
					location = new Model.Location(mark.destination, self.player.world);
					icon = player.urlMapper.image(location.board.icon, location.setId);
				} else if (mark.markType === "macro") {
				} else if (mark.markType === "character") {
				}
				set.icon.attr("src", icon);
				set.title.attr("text", mark.title);
				set.description.attr("text", "");
			}
			return this;
		},
		refresh: function() {
			var set = this.set,
				paper = this.paper,
				location = this.player.timeline.current.location;
			if (location) {
				var iconURL = player.world.inventory.get(location.board.icon).url;
				set.icon.attr("src", player.urlMapper.image(iconURL, location.setId));
				set.title.attr("text", location.title());
				set.description.attr("text", location.board.description);
			}
			return this;
		}
	});

	PP.Highlight = new JS.Class(PP.PaperObject, {
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
			set.background = paper
				.image("images/highlight.png", 0, 0, 960, 540, 0)
				.hide()
				.click(function () {
					self.hide();
					self.view.statusBar.hide();
				})
				.insertAfter(this.view.set.background);
			set.push(set.background);
			return this;
		}
	});

	PP.ActingCharacter = new JS.Class(PP.PaperObject, {
		character: null,
		mark: null,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
			this.set.imgPose = paper
				.image("", 0, 0, 0, 0)
				.attr({
					"cursor": "pointer"
				});

			set.push(set.imgPose);
			return this;
		},
		place: function () {
			var self = this,
				player = this.player,
				paper = this.paper,
				location = this.player.timeline.current.location,
				set = this.set,
				imgPoseURL,
				imgPose,
				pose,
				mark,
				x,
				y,
				width,
				height;
			this.character = player.timeline.current.character;
			pose = this.character.poses.get("standing");
			imgPoseURL = player.urlMapper.image(pose.image, location.setId);
			mark = this.mark = location.mark;
			player.views.board.actionArrow.place(mark, mark, 0, -250, 0, -250).hide();
			height = 400 * mark.z;
			width = 200 * mark.z;
			x = 960 * mark.x - (width / 2);
			y = 540 * mark.y - height;
			this.set.imgPose.attr({
				"src": imgPoseURL,
				"x": x,
				"y": y,
				"width": width,
				"height": height
			}).click(function () {
				var board = player.views.board
				board.statusBar.refresh().show();
				board.highlight.show();
			});
			return this;
		}
	});

	// todo: refactor: should be initialized with mark (with infered board and view from board)... not mark+view
	PP.ActingArtefact = new JS.Class(PP.PaperObject, {
		artefact: null,
		mark: null,
		initialize: function(mark, view) {
			this.callSuper(view);
			this.mark = mark;
			//todo: could this be simplified by having artefact already loading in the mark
			// like this:  artefact = this.mark.artefact
			this.artefact = this.player.world.inventory.get(mark.artefact);
		},
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
			this.set.imgPose = paper
				.image("", 0, 0, 0, 0)
				.attr({
					"cursor": "pointer"
				});
			set.push(set.imgPose);
			return this;
		},
		place: function () {
			var self = this,
				player = this.player,
				paper = this.paper,
				location = this.player.timeline.current.location,
				set = this.set,
				imgPoseURL,
				imgPose,
				pose,
				board = player.views.board,
				mark = this.mark,
				x,
				y,
				width,
				height;
			pose = this.artefact.poses.get(mark.pose);
			imgPoseURL = player.urlMapper.image(pose.image, this.artefact.parent.id);
			height = 200 * mark.z;
			width = 200 * mark.z;
			x = 960 * mark.x - (width / 2);
			y = 540 * mark.y - height;
			this.set.imgPose.attr({
				"src": imgPoseURL,
				"x": x,
				"y": y,
				"width": width,
				"height": height
			}).insertAfter(board.set.background);
			return this;
		}
	});


	PP.MarkSet = new JS.Class(PP.PaperObject, {
		marks: null,
		smallMarks: null,
		artefacts: null,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				player = this.player;

			this.marks = paper.set();
			this.smallMarks = paper.set();
			this.artefacts = new JS.Hash();

			set.push(set.background);
			return this;
		},
		unHook: function() {
			var board = this.player.views.board;
			this.marks.hide();
			board.actionArrow.place(board.character.mark, board.character.mark, 0, -250, 0, -250, function() {
				board.actionArrow.hide();
			});
		},
		place: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				player = this.player,
				location = player.timeline.current.location,
				boardView = player.views.board,
				board = location.board;

			this.marks.remove();
			this.smallMarks.remove();

			this.artefacts.forEach(function(artefact){
				console.log("artefact: ", artefact.value);
				artefact.value.destroy();
			});
			board.marks.forEachValue(function(mark) {
				var icon,
					iconURL,
					iconURLSmall,
					imgMarkSmall,
					imgMark,
					OSSizeRatio = 1,
					iconOffsetX = 0,
					iconOffsetY = 0;
				if (IsiPhone || IsiPod) OSSizeRatio = 1.5;
				if (mark.markType === "destination") {
					var destination = new Model.Location(mark.destination, self.player.world);
					icon = player.world.inventory.get(destination.board.icon);
					if (icon) {
						iconURL = icon.url;
						var destinationIcon = player.urlMapper.image(iconURL, destination.setId);
						iconURL = destinationIcon || "images/icon-walk.png";
						iconURLSmall = "images/icon-arrow-dot.png";
						imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
						imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
					} else {
						console.error("Icon reference not found: ", destination.board.icon);
					}
				} else if (mark.markType === "character") {
					iconURL = "images/icon-walk.png";
					iconURLSmall = "images/icon-character-small.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-40*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else if (mark.markType === "artefact") {
					var artefact = player.world.inventory.get(mark.artefact);
					console.log("artefact: ", artefact, player.world);
					iconURL = player.world.inventory.get(artefact.icon).url;
					var artefactIcon = player.urlMapper.image(iconURL, artefact.parent.id);
					console.log("artefactIcon: ", artefactIcon);
					var actingArtefact = new PP.ActingArtefact(mark, this.player.views.board).place();
					self.artefacts.store(mark.id, actingArtefact);
					iconURL = artefactIcon || "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else if (mark.markType === "macro") {
					iconURL = "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else {
					iconURL = "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					if (mark.icon) {
						iconURL = player.world.inventory.get(mark.icon).url;
						iconURL = player.urlMapper.image(iconURL, location.setId);
					}
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				}
				imgMark.attr({
					"cursor": "pointer"
				});
				imgMarkSmall.attr({
					"cursor": "pointer"
				});
				imgMarkSmall.mouseover(function(e){
					var characterMark = boardView.character.mark;
					self.marks.hide();
					imgMark.show();
					self.hoveredMark = mark;
					boardView.actionArrow.show().place(characterMark, mark, iconOffsetX, iconOffsetY, 0, -250);
				});
				imgMark.click(function(e){
					if (mark.markType === "destination") {
						console.log("mark: ", mark, mark.destination);
						player.controller.run("goToLocation", {path: mark.destination});
					} else if (mark.markType === "character") {
						var path = location.setId + "/" + location.boardId + "#" + mark.id;
						self.unHook();
						player.controller.run("goToLocation", {path: path});
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					} else if (mark.markType === "macro") {
						self.unHook();
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					} else {
						self.unHook();
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					}

				});
				self.marks.push(imgMark);
				self.smallMarks.push(imgMarkSmall);
			});
		}
	});

	PP.ActionArrow = new JS.Class(PP.PaperObject, {
		ui: null,
		shadowOffset: 5,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				path = "M0 0L0 0",
				arrow,
				arrow2,
				shadow,
				tip,
				label,
				labelShadow;
			arrow = set.arrow = paper
				.path(path)
				.hide()
				.insertAfter(this.view.highlight.set.background)
				.attr({
					"stroke": "#fff",
					"stroke-linecap": "round",
					"stroke-width": 8
				});

			shadow = set.shadow = paper
				.path(path)
				.hide()
				.insertBefore(arrow)
				.attr({
					"stroke": "#000",
					"opacity": 0,
					"stroke-linecap": "round",
					"stroke-width": 12
				});

			tip = set.tip = paper
				.image("images/icon-selected.png", 0, 0, 100, 100)
				.hide()
				.insertAfter(arrow);

			labelShadow = set.labelShadow = paper
				.text("", 0, 0)
				.hide()
				.insertAfter(tip)
				.attr({
					"fill": "#000",
					"font-size": "18px",
					"text-anchor": "middle",
					"opacity": 0.5
				});
			label = set.label = paper
				.text("", 0, 0)
				.hide()
				.insertAfter(labelShadow)
				.attr({
					"fill": "#fff",
					"font-size": "18px",
					"text-anchor": "middle"
				});

			set.push(arrow);
			set.push(shadow);
			set.push(label);
			set.push(labelShadow);
			set.push(tip);
			return this;
		},
		place: function (sourceMark, targetMark,  targetOffsetX, targetOffsetY, sourceOffsetX, sourceOffsetY, onPlacedCallback) {
			var set = this.set,
				x = 0,
				y = 0,
				x2 = 0,
				y2 = 0,
				path,
				pathShadow,
				title;
			if (sourceMark && targetMark) {
				x = targetMark.x * 960 + (targetOffsetX * targetMark.z || 1);
				y = targetMark.y * 540 + (targetOffsetY * targetMark.z || 1);
				x2 = sourceMark.x * 960 + (sourceOffsetX * sourceMark.z);
				y2 = sourceMark.y * 540 + (sourceOffsetY * sourceMark.z);
				path = "M" + x + " " + y + "L" + x2 + " " + y2;
				pathShadow = "M" + x + " " + (y + this.shadowOffset) + "L" + x2 + " " + (y2 + this.shadowOffset);
				title = targetMark.title;
				set.arrow.animate({
					path: path
				}, 200);
				set.shadow.animate({
					path: pathShadow
				}, 200);
				set.label.attr({
					"text": title,
					"x": x,
					"y": y + 60
				});
				set.labelShadow.attr({
					"text": title,
					"x": x - 1,
					"y": y + 62
				});
				set.tip.animate({
					x: x - 50,
					y: y - 50
				}, 200, function() {
					if (onPlacedCallback) onPlacedCallback();
				});
			}
			return this;
		}
	});
	PP.InventoryBar = new JS.Class(PP.PaperObject, {
		character: null,
		itemsPerPage: 5,
		iconsSize: 50,
		iconsInterval: 15,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;

			return this;
		},
		databind: function(character) {
			this.character = character || null;
			this.refresh();
			return this;
		},
		refresh: function () {
			var self = this,
				paper = this.paper,
				set = this.set,
				inventory = this.character.inventory,
				inventoryItem,
				count,
				x,
				y,
				icon,
				width,
				height;

			set.remove();

			inventory = this.character && this.character.inventory;

			if (inventory) {
				if (inventory.length > 0) {
					height = this.iconsSize + 20;
					width = ((inventory.length) * (self.iconsSize + self.iconsInterval)) - self.iconsInterval + 20;
					set.background = paper
						.rect(self.x, self.y, width, height, 10)
						.attr({
							"fill": "#000",
							"opacity": 0.6
						});
					set.push(set.background);
				}
				count = 0;
				inventory.forEach(function (item) {
					var x, y, artefact = item.value;

					count = count + 1;
					x = self.x + ((count-1) * (self.iconsSize + self.iconsInterval)) + 10;
					y = self.y + 10;
					var iconURL = player.world.inventory.get(artefact.icon).url;
					icon = self.player.urlMapper.image(iconURL, artefact.parent.id);

					inventoryItem = paper
						.image(icon, x, y, self.iconsSize, self.iconsSize)
						.attr({
							"cursor": "pointer"
						})
							.mouseover(function () {
								this.attr({
									scale: 1.05,
									rotation: 5,
									x: this.attr("x") + 3,
									y: this.attr("y") - 3
								});
								showTooltip(artefact.title, x, y);
							})
							.mouseout(function () {
								this.attr({
									scale: 1,
									rotation: 0,
									x: this.attr("x") - 3,
									y: this.attr("y") + 3
								});
								hideTooltip();
							})
							.click(function () {
								self.player.views.notifications
										.notify(artefact.icon, artefact.title, artefact.description, "Close")
										.show();
							});
					set.push(inventoryItem);
				});
				var tooltip = paper.text("", 0, 0)
						.attr({
							fill: "#fff",
							"font-size": "16px",
							"text-anchor": "middle"
						}).hide();
				function showTooltip(label, x, y) {
					tooltip.attr({
						text: label,
						x: x + 30,
						y: y - 15
					}).show();
				}
				function hideTooltip() {
					tooltip.hide();
				}
			};

			return this;
		}
	});

})(jQuery, PocketPeople);


