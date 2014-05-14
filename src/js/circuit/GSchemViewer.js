/**
 * GSchemViewer.js
 * Michael Marques / DrYerzinia / KD0WGV
 * 09-05-2013
 * r8
 *
 * This is a simple script for parsing and displaying .sch
 * files from gEDA in an HTML5 environment.
 */

define(function(){
	
	function GSV(canvas, attach) {

		this.construct(canvas, attach);

	}

	GSV.prototype.construct = function(canvas, attach){

		this.canvas = canvas;
		this.current_angle = 0;
		this.current_mirror = false;

		this.embedded = {};
		this.external = {};

		this.txt = [];
		this.pins = [];
		this.nets = [];
		this.components = [];

		this.junctions = {};
		this.no_connection = {};

		this.external.total = 0;
		this.external.loaded = 0;
		this.external.ready;

		if(attach){

			this.ctx = canvas.getContext('2d');

			this.buffer_layer = document.createElement('canvas');
			this.buffer_layer.width = this.canvas.width;
			this.buffer_layer.height = this.canvas.height;

			this.buffer_ctx = this.buffer_layer.getContext('2d');

			this.last_time = 0;
			this.end_time = 0;

			this.init_handlers();
		}

	};

	GSV.prototype.resize = function(){

		this.buffer_layer.width = this.canvas.width;
		this.buffer_layer.height = this.canvas.height;

	};

	GSV.prototype.init_handlers = function(){

		this.clicking = false;
		
		this.mouse_x = this.canvas.width/2;
		this.mouse_y = this.canvas.height/2;

		if(window.addEventListener){
			document.addEventListener("mouseup", function(t){return function(e){if(e.which == 1) t.clicking = false;};}(this), false);
		} else document.attachEvent("mouseup", function(t){return function(e){if(e.which == 1) t.clicking = false;};}(this));
		this.canvas.onmousedown = function(t){return function(e){if(e.which == 1) t.clicking = true;};}(this);
		this.canvas.onkeydown = function(t){return function(e){t.update_key(e);};}(this);

		this.canvas.onmousemove = function(t){return function(e){	
			if(t.clicking)
				t.update_mouse_drag(t.mouse_x-e.pageX, t.mouse_y-e.pageY);		
			t.mouse_x = e.pageX;
			t.mouse_y = e.pageY;
		};}(this);
		
		if(window.addEventListener){
			this.canvas.addEventListener("mousewheel", function(t){return function(e){t.wheel(e);};}(this), false);
		        this.canvas.addEventListener('DOMMouseScroll', function(t){return function(e){t.wheel(e);};}(this), false);
		} else this.canvas.attachEvent("onmousewheel", function(t){return function(e){t.wheel(e);};}(this));

	};

	GSV.what_color = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
		'#00FF00', '#00FF00', '#FFFF00', '#00FF00', '#00FF00', '#00FF00', '#00FF00',
		'#00FF00', '#00FF00', '#00FF00', '#00FF00', '#00FF00', '#00FF00', '#00FF00',
		'#00FF00', '#FFFF00', '#00FF00', '#00FF00'];

	GSV.setSymbolLocation = function(location){
		GSV.symbolLocation = location;
	};

	// Parameter of path to search for symbols
	GSV.symbolLocation = '';

	GSV.draw_line = function(ctx, x1, y1, x2, y2, color){

		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = color;
		ctx.closePath();
		ctx.stroke();

	};

	// Net object prototype
	GSV.prototype.Net = function(x1, x2, y1, y2, color){

		this.x1 = x1;
		this.x2 = x2;
		this.y1 = y1;
		this.y2 = y2;
		this.color = color;

	};

	GSV.prototype.Net.prototype.render = function(ctx){

		GSV.draw_line(ctx, this.x1, this.y1, this.x2, this.y2, GSV.what_color[this.color]);

	};

	// Component Object Prototype
		GSV.prototype.Component = function(gsv, x, y, selectable, angle, mirror, basename){

		this.gsv = gsv;
		this.x = x;
		this.y = y;
		this.selectable = selectable;
		this.angle = angle;
		this.mirror = mirror;
		this.basename = basename;

		this.parts = [];
		this.txt = [];

	};

	GSV.prototype.Component.prototype.render = function(ctx){

		var p, base, c, comp, t;

		for(p = 0; p < this.parts.length; p++) this.parts[p].render(ctx);

		if(this.basename.replace(/\.|-/g,'_') in this.gsv.external){	// TODO: Think of better way for external to be accesible

			base = this.gsv.external[this.basename.replace(/\.|-/g,'_')];	

			for(t = 0; t < this.txt.length; t++) this.txt[t].render(ctx);

			// Render external components shifted to their appropriate
			// positions
			for(c = 0; c < base.components.length; c++){
				comp = base.components[c];
				ctx.save();
				ctx.translate(this.x, this.y);
				if(this.mirror == 1){
					ctx.scale(-1, 1);
					this.gsv.current_mirror = !this.gsv.current_mirror;
				}
				ctx.rotate(this.angle*Math.PI/180);
				this.gsv.current_angle += this.angle;
				comp.render(ctx);
				this.gsv.current_angle -= this.angle;
				if(this.mirror == 1) this.gsv.current_mirror = !this.gsv.current_mirror;
				ctx.restore();
			}
					
		} else {
			for(t = 0; t < this.txt.length; t++) this.txt[t].render(ctx);
			if(this.basename.length < 8 || (this.basename.substr(0,8) != 'EMBEDDED'))
				console.log('Could not find external symbol: ' + this.basename.replace(/\.|-/g,'_'));
		}

	};

	// Pin Object Prototype
	GSV.prototype.Pin = function(x1, y1, x2, y2, color, pintype, whichend){

		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		this.color = color;
		this.pintype = pintype;
		this.whichend = whichend;
		this.txt = [];

	};

	GSV.prototype.Pin.prototype.render = function(ctx){

		GSV.draw_line(ctx, this.x1, this.y1, this.x2, this.y2, GSV.what_color[this.color]);
		
		for(var t = 0; t < this.txt.length; t++) this.txt[t].render(ctx);

	};

	// Text Object Prototype
	GSV.prototype.Text = function(gsv, x, y, color, size, visibility, show_name, angle, alignment, num_lines){

		this.gsv = gsv;
		this.x = x;
		this.y = y;
		this.color = color;
		this.size = size;
		this.visibility = visibility;
		this.show_name = show_name;
		this.angle = angle;
		this.alignment = alignment;
		this.num_lines = num_lines;
		this.strings = [];

	};

	GSV.prototype.Text.prototype.render = function(ctx){

		if(this.visibility == 0) return;

		var s, str, adjust_y;

		for(s = 0; s < this.strings.length; s++){

			str = this.strings[s];
			
			if(str){
		
				if(this.show_name == 1) str = str.split('=')[1];
				else if(this.show_name == 2) str = str.split('=')[0];
			
				align = 'start';
			
				switch(this.alignment){
					case 0:
					case 2:
						align = 'start';
						break;
					case 6:
					case 8:
						align = 'end';
						break;
				}
			
				adjust_y = 0;
			
				if(this.angle == 180){
					if(align == 'start') align = 'end';
					else if(align == 'end') align = 'start';
			
					if(this.alignment == 0 || this.alignment == 6) adjust_y = 130;
				} else {
					if(this.alignment == 2 || this.alignment == 8) adjust_y = 250;
				}
				if(this.gsv.fs != this.size){
					ctx.font = Math.floor(this.size*14.0)+'pt Arial, Helvetica, sans-serif';
					this.gsv.fs = this.size;
				}
				ctx.save();
				ctx.translate(this.x, this.y-adjust_y-s*250);
				// Correct for origin change
				if(this.gsv.current_mirror && this.gsv.current_angle == 0){
					ctx.scale(-1, -1);
					if(align == 'start') align = 'end';
					else align = 'start';
				} else ctx.scale(1,-1);
				if(this.angle != 0 && this.angle != 180) ctx.rotate(Math.PI*this.angle/-180);
				else if(this.gsv.current_angle == 180){
					if(align == 'start') align = 'end';
					else align = 'start';
					ctx.rotate(Math.PI*-1*this.gsv.current_angle/-180);
				}
				ctx.textAlign = align;
				ctx.fillStyle = GSV.what_color[this.color];
				ctx.fillText(str, 0, 0);
				ctx.restore();
			}

		}

	};

	// Box Object Prototype
	GSV.prototype.Box = function(x, y, width, height, color, line_width, capstyle, dashstyle, dashlength, dashspace, filltype, fillwidth, angle1, pitch1, angle2, pitch2){

		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.line_width = line_width;
		this.capstyle = capstyle;
		this.dashstyle = dashstyle;
		this.dashlength = dashlength;
		this.dashspace = dashspace;
		this.filltype = filltype;
		this.fillwidth = fillwidth;
		this.angle1 = angle1;
		this.pitch1 = pitch1;
		this.angle2 = angle2;
		this.pitch2 = pitch2;

	};

	GSV.prototype.Box.prototype.render = function(ctx){

		ctx.beginPath();
		ctx.rect(this.x, this.y, this.width, this.height);
		ctx.strokeStyle = GSV.what_color[this.color];
		ctx.closePath();
		ctx.stroke();

	};

	// Circle Object Prototype
	GSV.prototype.Circle = function(x, y, radius, color, width, capstyle, dashstyle, dashlength, dashspace, filltype, fillwidth, angle1, pitch1, angle2, pitch2){

		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.width = width;
		this.capstyle = capstyle;
		this.dashstyle = dashstyle;
		this.dashlength = dashlength;
		this.dashspace = dashspace;
		this.filltype = filltype;
		this.fillwidth = fillwidth;
		this.angle1 = angle1;
		this.pitch1 = pitch1;
		this.angle2 = angle2;
		this.pitch2 = pitch2;

	};

	GSV.prototype.Circle.prototype.render = function(ctx){

		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
		ctx.strokeStyle = GSV.what_color[this.color];
		ctx.closePath();
		ctx.stroke();

	};

	GSV.prototype.Arc = function(gsv, x, y, radius, startangle, sweepangle, color, width, capstyle, dashstyle, dashlength, dashspace){

		this.gsv = gsv;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.startangle = startangle;
		this.sweepangle = sweepangle;
		this.color = color;

	};

	GSV.prototype.Arc.prototype.render = function(ctx){

		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, (Math.PI*this.startangle/180.0), (Math.PI*(this.startangle+this.sweepangle)/180.0), false); 
		ctx.strokeStyle = GSV.what_color[this.color];
		ctx.stroke();
		ctx.closePath();

	};

	// Line Object Prototype
	GSV.prototype.Line = function(x1, y1, x2, y2, color, width, capstyle, dashstyle, dashlength, dashspace){

		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		this.color = color;
		this.width = width;
		this.capstyle = capstyle;
		this.dashstyle = dashstyle;
		this.dashlength = dashlength;
		this.dashspace = dashspace;

	};

	GSV.prototype.Line.prototype.render = function(ctx){

		GSV.draw_line(ctx, this.x1, this.y1, this.x2, this.y2, GSV.what_color[this.color]);

	};

	// Path Object Prototype
	GSV.prototype.Path = function(color, width, capstyle, dashstyle, dashlength, dashspace, filltype, fillwidth, angle1, pitch1, angle2, pitch2, numlines){

		this.color = color;
		this.width = width;
		this.capstyle = capstyle;
		this.dashstyle = dashstyle;
		this.dashlength = dashlength;
		this.dashspace = dashspace;
		this.filltype = filltype;
		this.fillwidth = fillwidth;
		this.angle1 = angle1;
		this.pitch1 = pitch1;
		this.angle2 = angle2;
		this.pitch2 = pitch2;
		this.numlines = numlines;
		this.segments = [];

	};

	GSV.prototype.Path.prototype.render = function(ctx){

		var s, seg;

		for(s = 0; s < this.segments.length; s++){
			seg = this.segments[s];

			if(seg.type == 'M'){
				ctx.beginPath();
				ctx.moveTo(seg.x, seg.y);
			} else if(seg.type == 'L'){
				ctx.lineTo(seg.x, seg.y);
			} else if(seg.type == 'z'){
				ctx.closePath();
				ctx.fillStyle = GSV.what_color[this.color];
				ctx.fill();
			}
		}
	};


	// Functions for finding junction and pin intersections
	GSV.is_on = function(a, b, c){

		var withinv;

		if(a.x != b.x) withinv = GSV.within(a.x, c.x, b.x);
		else withinv = GSV.within(a.y, c.y, b.y);

		return (GSV.collinear(a, b, c) && withinv);

	};

	// Inclusive of a and b
	GSV.is_on_i = function(a, b, c){

		var withinv;

		if(a.x != b.x) withinv = GSV.within_i(a.x, c.x, b.x);
		else withinv = GSV.within_i(a.y, c.y, b.y);

		return (GSV.collinear(a, b, c) && withinv);

	};

	GSV.collinear = function(a, b, c){
		return (((b.x - a.x) * (c.y - a.y)) == ((c.x - a.x) * (b.y - a.y)));
	};

	GSV.within = function(p, q, r){
		return (((p < q)&&(q < r)) || ((r < q)&&(q < p)));
	};

	GSV.within_i = function(p, q, r){
		return (((p <= q)&&(q <= r)) || ((r <= q)&&(q <= p)));
	};

	// Find bound of schematic for centering
	GSV.prototype.schem_bounds = function(schem, x1, y1, x2, y2){
		if('xmax' in schem){
			if(schem.xmax < x1) schem.xmax = x1;
		} else schem.xmax = x1;
		if(schem.xmax < x2) schem.xmax = x2;
		if('xmin' in schem){
			if(schem.xmin > x1) schem.xmin = x1;
		} else schem.xmin = x1;
		if(schem.xmin > x2) schem.xmin = x2;
		if('ymax' in schem){
			if(schem.ymax < y1) schem.ymax = y1;
		} else schem.ymax = y1;
		if(schem.ymax < y2) schem.ymax = y2;
		if('ymin' in schem){
			if(schem.ymin > y1) schem.ymin = y1;
		} else schem.ymin = y1;
		if(schem.ymin > y2) schem.ymin = y2;
	};

	GSV.prototype.parse_data = function(gsv, sch_data, ready){

		var	sch_lines = sch_data.split('\n'),
			current_obj = null,
			current_sub_obj = null,
			current_path = null,
			squar_paren	= false,
			curly_paren	= false,
			path_count	= 0,
			attribute	= 0,
			current_txt = null,
			l, n, line, net,
			n_dat, n2_dat,
			num_lines, new_obj,
			x, y, width, height,
			x1, x2, y1, y2,
			basename,
			matches1, matches2,
			p1, pin1, nc_flag, pin_out,
			xd, yd,
			new_sym_req;

		for(l = 0; l < sch_lines.length; l++){

			line = sch_lines[l];
			n_dat = line.split(' ');

			type = line[0];

			if(attribute != 0){

				current_txt.strings.push(line);
				attribute--;

			} else if(type == '{'){

				curly_paren = true;

			} else if(type == '}'){

				curly_paren = false;

			} else if(type == '['){

				current_obj.parts = [];		
				squar_paren = true;

			} else if(type == ']'){

				squar_paren = false;

			} else if(type == 'H'){

				numlines = parseInt(n_dat[13]);
				path_count = numlines;

				new_obj = new this.Path(parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]), parseInt(n_dat[7]), 
					parseInt(n_dat[8]), parseInt(n_dat[9]), parseInt(n_dat[10]), parseInt(n_dat[11]),
					parseInt(n_dat[12]), numlines);

				if(squar_paren)	current_obj.parts.push(new_obj);
				else this.parts.push(new_obj);

				current_path = new_obj;

			} else if(type == 'z'){

				new_obj = {
					'type':'z',
				};

				current_path.segments.push(new_obj);

				path_count--;

			} else if(type == 'M'){

				n2_dat = n_dat[1].split(',');

				new_obj = {
					'type':'M',
					'x':parseInt(n2_dat[0]),
					'y':parseInt(n2_dat[1])
				};

				current_path.segments.push(new_obj);

				path_count--;

			} else if(type == 'L' && path_count > 0){

				n2_dat = n_dat[1].split(',');

				new_obj = {
					'type':'L',
					'x':parseInt(n2_dat[0]),
					'y':parseInt(n2_dat[1])
				}

				current_path.segments.push(new_obj);

				path_count--;

			} else if(type == 'L'){

				new_obj = new this.Line(parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]), parseInt(n_dat[7]),
					parseInt(n_dat[8]), parseInt(n_dat[9]), parseInt(n_dat[10]));

				if(squar_paren)	current_obj.parts.push(new_obj);
				else this.components.push(new_obj);

			} else if(type == 'A'){

				new_obj = new this.Arc(gsv, parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]), parseInt(n_dat[7]),
					parseInt(n_dat[8]), parseInt(n_dat[9]), parseInt(n_dat[10]), parseInt(n_dat[11]));

				if(squar_paren)	current_obj.parts.push(new_obj);
				else this.components.push(new_obj);

			} else if(type == 'V'){

				new_obj = new this.Circle(parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]), parseInt(n_dat[7]),
					parseInt(n_dat[8]), parseInt(n_dat[9]), parseInt(n_dat[10]), parseInt(n_dat[11]),
					parseInt(n_dat[12]), parseInt(n_dat[13]), parseInt(n_dat[14]), parseInt(n_dat[15]));

				if(squar_paren)	current_obj.parts.push(new_obj);
				else this.components.push(new_obj);

			} else if(type == 'B'){

				x	= parseInt(n_dat[1]);
				y	= parseInt(n_dat[2]);
				width	= parseInt(n_dat[3]);
				height	= parseInt(n_dat[4]);

				this.schem_bounds(this, x, y, x+width, y+height);

				new_obj = new this.Box(x, y, width, height, parseInt(n_dat[5]), parseInt(n_dat[6]),
					parseInt(n_dat[7]), parseInt(n_dat[8]), parseInt(n_dat[9]), parseInt(n_dat[10]),
					parseInt(n_dat[11]), parseInt(n_dat[12]), parseInt(n_dat[13]), parseInt(n_dat[14]),
					parseInt(n_dat[15]), parseInt(n_dat[16]));

				if(squar_paren)	current_obj.parts.push(new_obj);
				else this.components.push(new_obj);

			} else if(type == 'T'){

				num_lines = parseInt(n_dat[9]);

				new_obj = new this.Text(gsv, parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]),
					parseInt(n_dat[7]), parseInt(n_dat[8]), num_lines);

				attribute = num_lines;
				current_txt = new_obj;

				if(squar_paren && curly_paren) current_sub_obj.txt.push(new_obj);
				else if(squar_paren || curly_paren) current_obj.txt.push(new_obj);
				else this.txt.push(new_obj);

			} else if(type == 'P'){

				new_obj = new this.Pin(parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), parseInt(n_dat[6]), parseInt(n_dat[7]));

				this.pins.push(new_obj);
				
				if(squar_paren){
					current_obj.parts.push(new_obj);
					current_sub_obj = new_obj;
				} else {
					this.components.push(new_obj);
					current_obj = new_obj;
				}

			} else if(type == 'C'){

				basename = n_dat[6];

				new_obj = new this.Component(gsv, parseInt(n_dat[1]), parseInt(n_dat[2]), parseInt(n_dat[3]),
					parseInt(n_dat[4]), parseInt(n_dat[5]), basename);

				this.components.push(new_obj);
				current_obj = new_obj;

				if(basename.length > 8 && basename.substr(0,8) == 'EMBEDDED') {
					this.embedded[basename.substr(8, basename.length).replace(/\.|-/g,'_')] = new_obj;

				} else {	// Load external symbols

					if(!(basename.replace(/\.|-/g,'_') in this.external)){
					
						this.external[basename.replace(/\.|-/g,'_')] = true;
						this.external.total++;

						new_sym_req = new XMLHttpRequest();
						new_sym_req.open('GET', GSV.symbolLocation+basename);
						new_sym_req.responseType = 'text';

						new_sym_req.onload = function(basename, gsv_in){ return function(){
						
							var gsv = new GSV(gsv_in.canvas, false);

							gsv.parse_data(gsv_in, this.response, function(){

								delete gsv.embedded;
								delete gsv.external;
													
								delete gsv.pins;
								delete gsv.nets;

								delete gsv.junctions;
								delete gsv.no_connection;
							
								delete gsv.offsetx;
								delete gsv.offsety;
							
								gsv_in.external[basename.replace(/\.|-/g,'_')] = gsv;
							
								gsv_in.external.loaded++;
							
								if(gsv_in.external.total == gsv_in.external.loaded && 'ready' in gsv_in.external){
							
									gsv_in.external.loaded--;
									gsv_in.external.ready();
							
								}
							});
						
						};}(basename, this);

						new_sym_req.send();

					}			
				}
			} else if(type == 'N'){

				x1		= parseInt(n_dat[1]);
				y1		= parseInt(n_dat[2]);
				x2		= parseInt(n_dat[3]);
				y2		= parseInt(n_dat[4]);

				this.schem_bounds(this, x1, y1, x2, y2);

				new_obj = new this.Net(x1, x2, y1, y2,  parseInt(n_dat[5]));

				matches1 = 0;
				matches2 = 0;

				// Find Net junctions and add yellow dots
				for(n = 0; n < this.nets.length; n++){

					net = this.nets[n];

					// Check for matching points and increment if we have 2 matches we need a yellow dot
					if((new_obj.x1 == net.x1 && new_obj.y1 == net.y1)||(new_obj.x1 == net.x2 && new_obj.y1 == net.y2)) matches1++;
					if((new_obj.x2 == net.x2 && new_obj.y2 == net.y2)||(new_obj.x2 == net.x1 && new_obj.y2 == net.y1)) matches2++;

					// Check for a point intersecting a line, if we find one we need a yellow dot
					if(GSV.is_on({'x':net.x1, 'y':net.y1}, {'x':net.x2, 'y':net.y2}, {'x':new_obj.x1, 'y':new_obj.y1}))
						this.junctions[new_obj.x1 + '-' + new_obj.y1] = {
							'x':new_obj.x1,
							'y':new_obj.y1
						};
					if(GSV.is_on({'x':net.x1, 'y':net.y1}, {'x':net.x2, 'y':net.y2}, {'x':new_obj.x2, 'y':new_obj.y2}))
						this.junctions[new_obj.x2 + '-' + new_obj.y2] = {
							'x':new_obj.x2,
							'y':new_obj.y2
						};


					if(GSV.is_on({'x':new_obj.x1, 'y':new_obj.y1}, {'x':new_obj.x2, 'y':new_obj.y2}, {'x':net.x1, 'y':net.y1}))
						this.junctions[net.x1 + '-' + net.y1] = {
							'x':net.x1,
							'y':net.y1
						};
					if(GSV.is_on({'x':new_obj.x1, 'y':new_obj.y1}, {'x':new_obj.x2, 'y':new_obj.y2}, {'x':net.x2,'y': net.y2}))
						this.junctions[net.x2 + '-' + net.y2] = {
							'x':net.x2,
							'y':net.y2
						};
		
				}
				
				if(matches1 > 1){
					this.junctions[new_obj.x1 + '-' + new_obj.y1] = {
						'x':new_obj.x1,
						'y':new_obj.y1
					};
				}

				if(matches2 > 1){
					this.junctions[new_obj.x2 + '-' + new_obj.y2] = {
						'x':new_obj.x2,
						'y':new_obj.y2
					};
				}

				this.nets.push(new_obj);
				current_obj = new_obj;

			}
		}

		// Find unconnected pins and add markers
		for(p1 = 0; p1 < this.pins.length; p1++){

			pin1 = this.pins[p1];
			nc_flag = true;
			
			if(pin1.whichend == 0) pin_out = {'x':pin1.x1, 'y':pin1.y1};
			else pin_out = {'x':pin1.x2, 'y':pin1.y2};
			
			for(n = 0; n < this.nets.length; n++){

				net = this.nets[n];

				// Check for a point intersecting a line, if we dont find one we need a red square
				if(GSV.is_on_i({'x':net.x1, 'y':net.y1}, {'x':net.x2, 'y':net.y2}, {'x':pin_out.x, 'y':pin_out.y})){
					nc_flag = false;
					break;
				}

			}
			
			if(nc_flag) this.no_connection[pin_out.x + '-' + pin_out.y] = {'x':pin_out.x,'y':pin_out.y};

		}

		// Reference ready callback in external
		this.external.ready = ready;

		xd = this.xmax-this.xmin;
		yd = this.ymax-this.ymin;

		// Add some extra space on sides of schematic
		this.xmin -= xd/20;
		this.xmax += xd/20;
		this.ymin -= yd/20;
		this.ymax += yd/20;

		xd = this.xmax-this.xmin;
		yd = this.ymax-this.ymin;

		// Center the schematic
		if(this.canvas.width/xd > this.canvas.height/yd){

			this.xmin -= ((this.canvas.width-(this.canvas.height/yd*xd))/2)*(yd/this.canvas.height);
			this.xmax += ((this.canvas.width-(this.canvas.height/yd*xd))/2)*(yd/this.canvas.height);

		} else {

			this.ymin -= ((this.canvas.height-(this.canvas.width/xd*yd))/2)*(xd/this.canvas.width);
			this.ymax += ((this.canvas.height-(this.canvas.width/xd*yd))/2)*(xd/this.canvas.width);

		}

		this.offsetx = this.xmin;
		this.offsety = this.ymin;

		this.scale = 1.0;

		// Check to see if we can fire ready callback to
		// indicate schematic has loaded fully
		if(this.external.total == this.external.loaded){
			delete this.external.ready;
			ready();
		}

	};

	GSV.prototype.wheel = function(e) {

		var	ev = window.event || e,
			d,
			elem = this.canvas,
			doc = elem && elem.ownerDocument,
			docElem = doc.documentElement,
			box = elem.getBoundingClientRect(),
			off = {
				top: box.top  + (window.pageYOffset || docElem.scrollTop)  - (docElem.clientTop  || 0),
				left: box.left + (window.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
			};

		if(ev.stopPropagation) ev.stopPropagation();
		if(ev.preventDefault) ev.preventDefault();
		ev.returnValue = false;

		d = Math.max(-1, Math.min(1, (ev.wheelDelta || -ev.detail)));

		this.update_mouse_scroll(this.mouse_x-off.left, this.mouse_y-off.top, d);

	};

	// Key event handler
	GSV.prototype.update_key = function(e){

		var	xd = (this.xmax-this.xmin)/this.scale,
			yd = (this.ymax-this.ymin)/this.scale,
			which = e.which, prevent = true;

		switch(which){
			case 38: // Down
				this.offsety -= yd/10;
				break;
			case 37: // Left
				this.offsetx += xd/10;
				break;
			case 39: // Right
				this.offsetx -= xd/10;
				break;
			case 40: // Up
				this.offsety += yd/10;
				break;
			case 90: // Z : Zoom in
				this.offsety += (yd-(yd/1.1))/2;
				this.offsetx += (xd-(xd/1.1))/2;
				this.scale *= 1.1;
				break;
			case 88: // X : Zoom out
				this.offsety += (yd-(yd*1.1))/2;
				this.offsetx += (xd-(xd*1.1))/2;
				this.scale *= 0.9;
				break;
			default:
				prevent = false;
				break;
		}

		if(prevent){
			if(e.stopPropagation) e.stopPropagation();
			if(e.preventDefault) e.preventDefault();
			e.returnValue = false;
		}

		this.render();

	};

	// Drag event handler
	GSV.prototype.update_mouse_drag = function(x, y){

		this.offsety -= y/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);
		this.offsetx += x/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);

		this.render();

	};

	// Scroll event handler
	GSV.prototype.update_mouse_scroll = function(x, y, s){

		if(s > 0){ // Zoom in
			this.offsety += (((this.canvas.height-(this.canvas.height/1.1))/2)*((this.canvas.height-y)/this.canvas.height*2))/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);
			this.offsetx += (((this.canvas.width-(this.canvas.width/1.1))/2)*(2-((this.canvas.width-x)/this.canvas.width*2)))/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);
			this.scale *= 1.1;
		} else { // Zoom out
			this.offsety += (((this.canvas.height-(this.canvas.height*1.1))/2)*((this.canvas.height-y)/this.canvas.height*2))/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);
			this.offsetx += (((this.canvas.width-(this.canvas.width*1.1))/2)*(2-((this.canvas.width-x)/this.canvas.width*2)))/(Math.min(this.canvas.width/(this.xmax-this.xmin), this.canvas.height/(this.ymax-this.ymin))*this.scale);
			this.scale /= 1.1;
		}

		this.render();

	};

	// Render the schematic
	GSV.prototype.render = function(force, timeout){

		var	cur_time = (new Date()).getTime(),
		// Calculate canvas width and height
			xd, yd,
		// Calculate how much we need to scale based on size of the
		// schematic vs canvas size and how zoomed in we are
			scalef,
		// Iterator
			i,
		// Iterator helper
			it,
		// timer
			t = this;

		// Limit refresh rate to 30 FPS, wait 10 millis for screen refresh
		if((Math.abs(cur_time-this.last_time) > 33 && Math.abs(cur_time-this.end_time) > 11) || force){
			this.last_time = cur_time;
		} else { // incase last render call from event was ignored
			if(!timeout) setTimeout(function(){t.render(false, true);}, 50);
			return;		
		}

		xd = this.xmax-this.xmin;
		yd = this.ymax-this.ymin;
		scalef = Math.min(this.canvas.width/xd, this.canvas.height/yd)*this.scale;

		this.fs = 1;

		// Fill canvas with background color
		this.buffer_ctx.fillStyle = GSV.what_color[0];
		this.buffer_ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Set the linewidth so it draws normal size after scaling
		this.buffer_ctx.lineWidth = 1.0/scalef;

		// Save normal state
		this.buffer_ctx.save();
		
		// Tranform courdinates so we draw from bottom left
		this.buffer_ctx.transform(1, 0, 0, -1, 0, this.canvas.height);
		
		// scale the canvas so we can draw with file coordinates
		// and still fit in canvas
		this.buffer_ctx.scale(scalef, scalef);
		this.buffer_ctx.translate(-this.offsetx, -this.offsety);

		// Draw all Nets, Components, and Text
		for(i = 0; i < this.nets.length; i++) this.nets[i].render(this.buffer_ctx);
		for(i = 0; i < this.components.length; i++) this.components[i].render(this.buffer_ctx);

		// Text in main doc renders low TODO: figure out why?
		this.buffer_ctx.save();
		this.buffer_ctx.translate(0, 250);
		for(i = 0; i < this.txt.length; i++) this.txt[i].render(this.buffer_ctx);
		this.buffer_ctx.restore();

		// Draw dots where 3 or more net lines meet
		for(i in this.junctions){

			it = this.junctions[i];
		
			this.buffer_ctx.beginPath();
			this.buffer_ctx.arc(it.x, it.y, 30, 0, 2*Math.PI);
			this.buffer_ctx.fillStyle = GSV.what_color[21];
			this.buffer_ctx.fill();
			this.buffer_ctx.closePath();	

		}

		// Draw red squares to indicate where there is a
		// unconnected pin
		for(i in this.no_connection){

			it = this.no_connection[i];

			this.buffer_ctx.beginPath();
			this.buffer_ctx.rect(it.x-30, it.y-30, 60, 60);
			this.buffer_ctx.fillStyle = GSV.what_color[2];
			this.buffer_ctx.fill();
			this.buffer_ctx.closePath();

		}

		// Go back to normal size canvas
		this.buffer_ctx.restore();

		this.ctx.drawImage(this.buffer_layer, 0, 0);

		this.end_time = (new Date()).getTime();

	};

	return GSV;

});