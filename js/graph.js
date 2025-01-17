/*
 *      Speed graph.
 *
 */

function clearElement(target)
{
	while(target.hasChildNodes())
	{
		clearElement(target.firstChild);
		target.firstChild.removeNode();
	}
}

function clearCanvas( target )
{
	var cnv = target.getElementsByTagName('canvas');
	if(cnv)
	{
		for(var i=0; i<cnv.length; i++)
		{
			cnv[i].onmousemove = null;
			cnv[i].onpropertychange = null;
			cnv[i].onresize = null;
			if(browser.isIE && browser.versionMajor<9)
			{
				cnv[i].getContext = null;
				cnv[i].context_.canvas = null;
				cnv[i].context_ = null;
			}
		}
	}
	if(browser.isIE)
		clearElement(target);
}

function rSpeedGraph()
{
}

rSpeedGraph.prototype.create = function( aOwner )
{
	this.owner = aOwner;
	this.setMaxSeconds(theWebUI.settings['webui.speedgraph.max_seconds']);
	this.seconds = -1;
	this.down = { label: theUILang.DL, data: [], color: "#1C8DFF" };
	this.up = { label: theUILang.UL, data: [], color: "#009900" };
	this.startSeconds = new Date().getTime()/1000;

	this.checked = [ true, true ];
	this.datasets = [ this.up, this.down ];
}

rSpeedGraph.prototype.setMaxSeconds = function(maxSeconds)
{
	this.maxSeconds = Math.max(isNaN(maxSeconds) ? 600 : maxSeconds, 10);
	this.tickSize = Math.max(Math.round(maxSeconds / 10), 1);
}

rSpeedGraph.prototype.getData = function()
{
	var ret = new Array();		
	for( var i in this.checked )
	{
		if(this.checked[i])
			ret.push(this.datasets[i]);
		else
		{
			var arr = cloneObject( this.datasets[i] );
			arr.data = [];
			ret.push(arr);
		}
	}
	return(ret);
}

rSpeedGraph.prototype.getColors = function()
{
	return([ this.up.color, this.down.color ]);
}

var previousSpeedPoint = null;
rSpeedGraph.prototype.draw = function()
{
	var gridSel = $('.graph_tab_grid');
	var legendSel = $('.graph_tab_legend');
	var self = this;
	$(function() 
	{
		if((theWebUI.activeView=='Speed') &&
			self.owner.height() && self.owner.width())
		{
			clearCanvas( self.owner.get(0) );
			self.owner.empty();

			function xTick(n) 
			{
				var dt = new Date(n*1000);
				var h = dt.getHours();
				var m = dt.getMinutes();
				var s = dt.getSeconds();
				h = (h < 10) ? ("0" + h) : h;
				m = (m < 10) ? ("0" + m) : m;
				s = (s < 10) ? ("0" + s) : s;
				return( h+":"+m+":"+s );
			}

			$.plot(self.owner, self.getData(),
			{ 
				colors: self.getColors(),
				lines:
				{
					show: true
				},
				grid:
				{
					color: gridSel.css('color'),
					backgroundColor: gridSel.css('background-color'),
					borderWidth: parseInt(gridSel.css('border-width')),
					borderColor: gridSel.css('border-color'),
					hoverable: true
				},
				legend : {
					color: legendSel.css('color'),
					borderColor: legendSel.css('border-color'),
					backgroundColor: legendSel.css('background-color'),
				},
				xaxis: 
				{ 
					min: (self.seconds-self.startSeconds>=self.maxSeconds) ? null : self.startSeconds,
					max: (self.seconds-self.startSeconds>=self.maxSeconds) ? null : self.maxSeconds+self.startSeconds,
					tickSize: self.tickSize,
					tickFormatter: xTick
			 	},
			  	yaxis: 
			  	{ 
			  		min: 0,
				  	minTickSize: 5*1024,
	  				tickFormatter: function(n) { return(theConverter.speed(n)) } 
		  		}
			});

			function showTooltip(x, y, contents)
			{
				$('<div>').attr('id', 'tooltip')
					.addClass('graph_tab_tooltip')
					.text(contents)
					.css( {
						display: 'none',
						top: y + 5,
						left: x + 5,
				}).appendTo("body").fadeIn(200);
			}

			self.owner.off("plothover"); 
			self.owner.on("plothover", 
				function (event, pos, item) 
				{ 
					if(item)
					{
						if(previousSpeedPoint != item.datapoint)
						{
							previousSpeedPoint = item.datapoint;
							$("#tooltip").remove();
							showTooltip(item.pageX, item.pageY,
								item.series.label + " " + xTick(item.datapoint[0]) + " = " + theConverter.speed(item.datapoint[1]));
						}
					}
					else
					{
						$("#tooltip").remove();
						previousSpeedPoint = null;
					}
				}
			);

			$('#'+self.owner.attr('id')+' .legendColorBox').before("<td class='legendCheckBox'><input type='checkbox'></td>");
			$.each($('#'+self.owner.attr('id')+' .legendCheckBox input'),function(ndx,element)
			{
				$(element).on('click', function() 
				{
					self.checked[ndx] = !self.checked[ndx];
					self.draw();
				}).attr("checked",self.checked[ndx]);
			});

		}
	}
	);
}

rSpeedGraph.prototype.resize = function( newWidth, newHeight )
{
	if(this.owner)
	{
		if(newWidth)
			this.owner.width(newWidth);
		if(newHeight)
			this.owner.height(newHeight);
		this.draw();
	}
}

rSpeedGraph.prototype.addData = function( upSpeed, downSpeed )
{
	this.seconds = new Date().getTime()/1000;
	
	if (this.up && this.down)
	{
		this.up.data.push([this.seconds,upSpeed]);
		this.down.data.push([this.seconds,downSpeed]);
		while((this.down.data[this.down.data.length-1][0]-this.down.data[0][0])>this.maxSeconds)
		{
			this.down.data.shift(); 
			this.up.data.shift();
		}		
		this.draw();
	}
}
