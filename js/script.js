var CHARTS = (function(){
	var obj = {};

	// Gráfico Base
	obj.Line = function (data) {
		this.data       = data.data;
		this.range      = data.range;
		this.dataX      = [];
		this.dataY      = [];
		this.values     = [];
		this.minFormat  = null;
		this.maxFormat  = null;
		this.container  = null;

		var obj = this;
		// Se genera al cargar el contenido
		document.addEventListener('DOMContentLoaded', function(){
			obj.build();
		});
		window.addEventListener('resize', function(){
			obj.delete().build();
		});
	};

	obj.Line.prototype.delete = function () {
		this.container.remove();
		return this;
	};

	obj.Line.prototype.build = function () {
		// Valores computados a partir de data
		var _this           = this,
			labels          = [],
			overFormat      = null,
			// Configuración visual del gráfico; podrían ser editables
			margin          = { top : 90, right : 50, bottom : 90, left : 50 },
			ticksY          = 3,
			// Variables locales, no cambian nunca
			width           = document.body.clientWidth,
			height          = document.body.clientHeight,
			insideWidth     = width - ( margin.left + margin.right ),
			insideHeight    = height - ( margin.top + margin.bottom );


		if ( _this.range === 'month' ) {
			var _days = _this.dataX.length === ( 28 || 29 ) ?
				[ 0, 4, 8, 12, 16, 20, 24, ( _this.dataX.length - 1 ) ] :
				[ 0, 5, 10, 15, 20, 25, ( _this.dataX.length - 1 ) ] ;
			_days.forEach( function( i ){
				labels.push( _this.dataX[ i ] );
			});
		} else {
			labels = _this.dataX;
		}

		// Funciones básicas
		var maxY = function () {
			return d3.max( _this.dataY, function (d) {
				return +d;
			});
		};
		var minY = function () {
			return d3.min( _this.dataY, function (d) {
				return +d;
			});
		};
		// Escala la posición de los elementos
		var scaleX = d3.scale.ordinal()
			.rangePoints([0, insideWidth])
			.domain( labels.map( function(d, i) { return d; }));
		var scaleY = d3.scale.linear()
			.domain([0, maxY()])
			.rangeRound([insideHeight, 0]);
		// Calcula la distancia de los elementos en X
		var calcScaleX = d3.scale.ordinal()
			.rangePoints([0, insideWidth])
			.domain( _this.dataX.map( function(d, i) { return i; }));

		// Contruir eje X
		var makeAxisX = function (){
			return d3.svg.axis()
				.scale(scaleX)
				.tickFormat( d3.time.format('%d %b') );
		};
		// Contruir eje Y
		var makeAxisY = function (){
			return d3.svg.axis()
				.scale(scaleY)
				.orient("left");
		};
		// Line breaks
		var insertLinebreaks = function () {
			var el = d3.select(this);
			var words = el.text().split(' ');
			el.text('');
			for (var i = 0; i < words.length; i++) {
				var tspan = el.append('tspan')
					.text(words[i]);
				if ( i > 0 ) tspan.attr('x', 0).attr('dy', 15);
			}
		};

		var lineCoordinates = function () {
			var coordinates = [], i = 0;
			_this.dataY.forEach( function (d) {
				coordinates[i] = {
					'x' : calcScaleX(i),
					'y' : scaleY(d)
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

		var effects = {
			opacity : function (element, opacity) {
				element
					.transition()
					.style('opacity', opacity);
			}
		};

		var userActions = {
			_getSelectedRange : function (el) {
				var xPosition = d3.mouse(el)[0];
				// Primero, se verifica si la posicion obtenida esta dentro de los rangos posibles
				// Sino, se retorna false
				if ( xPosition < 0 || xPosition >= insideWidth )
					return false;
				// Si esta permitida, se calcula el rango seleccionado
				var leftEdges   = calcScaleX.range(),
					rangeWidth  = ( insideWidth / _this.dataX.length ) / 2,
					index;
				for ( index = 0; xPosition > ( leftEdges[index] + rangeWidth ); index++ ) {}
				return index;
			},
			init : function () {
				var selected = userActions._getSelectedRange(this);
				if ( selected === false )
					return false;
				// Opacidad en gráfico
				minValue.call( effects.opacity, 0 );
				maxValue.call( effects.opacity, 0 );
				graphDots.call( effects.opacity, '.5' );
				graphLine.call( effects.opacity, '.5' );
				// Mostrar elemento foco
				focus
					.style('display', 'inherit')
					.attr('transform', 'translate(' + ( calcScaleX( selected ) + margin.left ) + ' ' + margin.top + ')');
				// Mover el punto dentro del foco
				focusPoint.attr('transform', 'translate(-10 ' + ( scaleY( _this.dataY[selected] ) - 10 ) + ')');
			},
			move : function () {
				var selected = userActions._getSelectedRange(this);
				if ( selected === false )
					return false;
				// Mover el foco
				focus.attr('transform', 'translate(' + ( calcScaleX( selected ) + margin.left ) + ' ' + margin.top + ')');
				// Mover el punto dentro del foco
				focusPoint.attr('transform', 'translate(-10 ' + ( scaleY( _this.dataY[selected] ) - 10 ) + ')');
			},
			end : function(){
				// Ocultar el foco
				focus.style('display', 'none');
				// Opacidad en gráfico
				minValue.call( effects.opacity, 1 );
				maxValue.call( effects.opacity, 1 );
				graphDots.call( effects.opacity, 1 );
				graphLine.call( effects.opacity, 1 );
			}
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
				.data(_this.data)
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

		var axisX = svg
			.append('g')
			.classed('axis-x', true)
			.attr('transform', function (d) {
				var height = svg.node().getBoundingClientRect().height;
				return 'translate(' + margin.left + ' ' + ( height - 38 ) + ')';
			});

		var axisXRanges = axisX
			.call( makeAxisX()
				.innerTickSize([0])
				.outerTickSize([0])
				.tickPadding([0])
			)
			.selectAll('text')
				.style('text-anchor', 'start')
				.each( insertLinebreaks )
				.attr('transform', function(){
					return 'translate(' + ( ( this.getBoundingClientRect().width / 2 ) * -1 ) + ' 0)';
				});

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

		var minValue = d3.select(
				d3.selectAll('.graph-dot-group')
					.filter( function (d, i) {
						return d.value === minY();
					})[0].shift()
			)
			.append('text')
				.classed('min-value', true)
				.each( _this.minFormat )
				.attr('dy', function (d) {
					return ( scaleY(d.value) + 25 );
				})
				.attr('text-anchor', 'middle');

		var maxValue = d3.select(
				d3.selectAll('.graph-dot-group')
					.filter( function (d, i) {
						return d.value === maxY();
					})[0].pop()
			)
			.append('text')
				.classed('max-value', true)
				.each( _this.maxFormat )
				.attr('dy', function (d) {
					return ( scaleY(d.value) - 15 );
				})
				.attr('text-anchor', 'middle');

		var focus = svg.append('g')
			.classed('focus', true)
			.attr('transform', 'translate(' + margin.left + ' ' + margin.top + ')')
			.style('display', 'none');

		var focusLine = focus
			.append('line')
				.attr('x1', calcScaleX(0) )
				.attr('y1', ( scaleY( maxY() ) - 20 ) )
				.attr('x2', calcScaleX(0) )
				.attr('y2', scaleY( minY() ) )
				.attr('stroke', '#fff')
				.attr('stroke-width', 3);

		var focusPoint = focus
			.append('circle')
				.classed('focus-point', true)
				.attr('cx', 10)
				.attr('cy', 10)
				.attr('r', 10)
				.attr('transform', 'translate(-10 0)')
				.attr('fill', '#fff');

		var mouseArea = svg
			.append('rect')
			.attr('class', 'overlay')
			.attr('width', insideWidth)
			.attr('height', insideHeight)
			.attr('fill', 'transparent')
			.attr('transform', 'translate(' + margin.left + ' ' + margin.top + ')')
			.on('mouseover',  userActions.init )
			.on('touchstart', userActions.init )
			.on('mousemove',  userActions.move )
			.on('touchmove',  userActions.move )
			.on('mouseout',   userActions.end )
			.on('touchend',   userActions.end );
	};

	obj.helpers = {
		parseDate : function (date) {
			var dateFormat = d3.time.format("%Y-%m-%d");
			return dateFormat.parse(date);
		},
		formatCurrency : function (currency, value) {
			var data = CURRENCY_FORMATS[ currency ];
			return accounting.formatMoney( value, {
				symbol : '$',
				precision : data.precision,
				decimal : data.decimal,
				thousand : data.thousand
			});
		}
	};

	return obj;

}(CHARTS));

CHARTS = (function(obj){
	// Gráfico de Ventas
	obj.Sales = function (data) {
		var _this = this;
		// Se llama al constructor padre, estableciendo this para las llamadas
		obj.Line.call(this, data);
		// La propiedad 'currency' sólo esta presente en este gráfico
		this.currency   = data.currency;
		// Formatos
		this.minFormat  = function () {
			var el   = d3.select(this),
				data = el.datum();
			el.text( obj.helpers.formatCurrency( _this.currency, data.value ) );
		};
		this.maxFormat  = function () {
			var el   = d3.select(this),
				data = el.datum();
			el.text( obj.helpers.formatCurrency( _this.currency, data.value ) );
		};
		// Parse data
		this.parse();
	};

	// Se crea el Object Sales, heredando los prototipos de Line
	obj.Sales.prototype = Object.create( obj.Line.prototype );

	// Para procesar los datos enviados y definir los valores predeterminados
	obj.Sales.prototype.parse = function(){
		var dataX = [],
			dataY = [];
		this.data.forEach( function(d){
			dataX.push( obj.helpers.parseDate( d.date ) );
			dataY.push( d.value );
		});
		this.dataX = dataX;
		this.dataY = dataY;
	};
	return obj;
}(CHARTS));

CHARTS = (function(obj){
	obj.Occupancy = function (data) {
		// Se llama al constructor padre, estableciendo this para las llamadas
		obj.Line.call(this, data);
		// Formatos
		this.minFormat  = function () {
			var el   = d3.select(this),
				data = el.datum();
			el.append('tspan')
				.text(data.percent + '% (' + data.value + ')');
			el.append('tspan')
				.text(data.bloqued + ' bloqueadas')
				.attr('x', 0)
				.attr('dy', 16)
				.classed('label-bloqued', true);
		};
		this.maxFormat  = function () {
			var el   = d3.select(this),
				data = el.datum();
			el.attr('transform', 'translate(0 -15)');
			el.append('tspan')
				.text(data.percent + '% (' + data.value + ')');
			el.append('tspan')
				.text(data.bloqued + ' bloqueadas')
				.attr('x', 0 )
				.attr('dy', 16)
				.classed('label-bloqued', true);
		};
		// Se parsea la información enviada
		this.parse();
	};
	// Se crea el Object Occupancy, heredando los prototipos de Line
	obj.Occupancy.prototype = Object.create( obj.Line.prototype );
	// Para procesar los datos enviados y definir los valores predeterminados
	obj.Occupancy.prototype.parse = function(){
		var dataX    = [],
			dataY    = [];
		this.data.forEach( function(d){
			dataX.push( obj.helpers.parseDate( d.date ) );
			dataY.push( d.value );
		});
		this.dataX = dataX;
		this.dataY = dataY;
	};
	return obj;
}(CHARTS));