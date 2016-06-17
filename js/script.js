// Class Chart
function Chart(data) {
	"use strict";
	// Si el objeto this no es instancia de Chart, se retorna la instancia correctamente
    if ( ! ( this instanceof Chart ) )
        return new Chart(data);

    // Valors privados
    this.data       = data;
	// Container
	this.container  = null;

	if ( typeof(d3) === 'undefined' )
		throw new Error('No se ha cargado la librería d3');

	var obj = this;
	document.addEventListener('DOMContentLoaded', function(){
		obj.build();
	});
	window.addEventListener('resize', function(){
		obj.delete().build();
	});
}

Chart.prototype.delete = function () {
	this.container.remove();
	return this;
};

Chart.prototype.build = function () {
	// Valores computados a partir de data
	var ranges        = this.data.ranges,
		margin        = { top : 130, right : 30, bottom : 130, left : 30 },
		width         = document.body.clientWidth,
		height        = document.body.clientHeight,
		insideWidth   = width - ( margin.left + margin.right ),
		insideHeight  = height - ( margin.top + margin.bottom ),
		ticksY        = 3;

	// Funciones básicas
	var maxY = function () {
		return d3.max( ranges, function (d) {
			return +d.value;
		});
	};
	var minY = function () {
		return d3.min( ranges, function (d) {
			return +d.value;
		});
	};

	// Escala la posición de los elementos en Y
	var scaleY = d3.scale.linear()
		.domain([0, maxY()])
		.rangeRound([insideHeight, 0]);

	// Calcula la distancia de los elementos en X
	var calcScaleX = d3.scale.ordinal()
		.rangePoints([0, insideWidth])
		.domain( ranges.map( function(d, i) { return i; }));

	// Contruir eje X
	var makeAxisX = function (){
		return d3.svg.axis()
			.scale(scaleX);
	};
	// Contruir eje Y
	var makeAxisY = function (){
		return d3.svg.axis()
			.scale(scaleY)
			.orient("left");
	};

	var lineCoordinates = function () {
		var coordinates = [], i = 0;
		ranges.forEach( function (range) {
			coordinates[i] = {
				'x' : calcScaleX(i),
				'y' : scaleY(range.value)
			};
			i++;
		});
		var first = { 'x' : coordinates[0].x - margin.left, 'y' : coordinates[0].y },
			last  = { 'x' : coordinates[coordinates.length - 1].x + margin.right, 'y' : coordinates[ coordinates.length - 1 ].y };
		coordinates.unshift(first);
		coordinates.push(last);
		return coordinates;
	};

	var zoneCoordinates = function () {
		var coordinates = lineCoordinates();
		var bottomLeft  = { 'x' : coordinates[0].x, 'y' : height },
			bottomRight = { 'x' : coordinates[coordinates.length - 1].x, 'y' : height };
		coordinates.unshift(bottomLeft);
		coordinates.push(bottomRight);
		return coordinates;
	};

	// Contruir una línea
	var makeLine = d3.svg.line()
		.x( function (d){ return d.x; } )
		.y( function (d){ return d.y; } )
		.interpolate("linear");

	this.container = d3.select('body')
		.append('div')
		.classed('svg-container', true);

	var svg = this.container
		.append('svg')
		.attr('preserveAspectRatio', 'xMinYMin meet')
		.attr('viewBox', '0 0 ' + width + ' ' + height )
		.classed('svg-content-responsive', true);

	var graph = svg
		.append('g')
		.classed('graph', true)
		.attr('transform', 'translate(' + margin.left + ' ' + margin.top + ')');

	var graphDots = graph
		.append('g')
		.classed('graph-dots', true)
			.selectAll('g')
			.data(ranges)
			.enter()
			.append('g')
				.classed('graph-dot-group', true)
				.attr('transform', function (d, i){
					return 'translate(' + calcScaleX(i)  + ')';
				})
				.append('circle')
					.attr('cx', 0)
					.attr('cy', function (d){
						return scaleY(d.value);
					})
					.attr('r', 4);

	var graphLine = graph
		.append('path')
		.classed('line', true)
			.attr('d', makeLine( lineCoordinates() ) )
			.attr('fill', 'none')
			.attr('stroke-width', 1)
			.attr('stroke', '#fff');

	var graphArea = graph
		.append('path')
		.classed('area', true)
			.attr('d', makeLine( zoneCoordinates() ) )
			.attr('stroke-width', 0);

	var axisY = svg
		.append('g')
		.classed('axis-y', true)
		.attr('transform', 'translate(0 ' + margin.top + ')');

	var axisYLines = axisY
		.call( makeAxisY()
			.tickSize( width * -1, 0, 0 )
			.tickValues( [ minY(), ( (minY()+maxY()) /2 ), maxY() ])
			.tickFormat('')
		);
};