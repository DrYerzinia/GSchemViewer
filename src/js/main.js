requirejs.config({

	baseUrl: 'js',

});

require(['circuit/GSchemViewer'], function(GSV){

	GSV.setSymbolLocation('/data/sym/');

	window.GSchemViewer = {};

	var canvas = document.getElementById('schcan');

	canvas.width = window.innerWidth-20;
	canvas.height = window.innerHeight-50;

	window.onresize = function(e){

		canvas.width = window.innerWidth-20;
		canvas.height = window.innerHeight-50;

		window.GSchemViewer.schem.resize();
		window.GSchemViewer.schem.render(true);

	};

	document.getElementById('load').onclick = function(){

		new_sym_req = new XMLHttpRequest();
		new_sym_req.open('GET', document.getElementById('schurl').value);
		new_sym_req.responseType = 'text';

		new_sym_req.onload = function(){
			
			window.GSchemViewer.schem = new GSV(document.getElementById('schcan'), true);
			window.GSchemViewer.schem.parse_data(window.GSchemViewer.schem, new_sym_req.response, function(){
				window.GSchemViewer.schem.render();
			});

		};

		new_sym_req.send();

	};

});