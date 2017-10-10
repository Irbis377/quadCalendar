!function() 
{
    var quadCalendar = {};
    var _this = {};

    consts = {
        dayNames: [
            'Воскресенье',
            'Понедельник',
            'Вторник',
            'Среда',
            'Четверг',
            'Пятница',
            'Суббота'
        ],
		
		shortDayNames: [
            'Вс',
            'Пн',
            'Вт',
            'Ср',
            'Чт',
            'Пт',
            'Сб'
        ]
    };
	
		
		
    quadCalendar.loadCalendar = function (element, viewModel, settings, selectionManager, allowInteractions) {
        _this = {
            calendar: element,
            viewModel: viewModel,
            settings: settings,
            selectionManager: selectionManager,
            allowInteractions: allowInteractions
        };

        var calendar = element;
		
        var className = calendar.attr("class");
        var colspan = settings.weekNumbers.show ? 8 : 7; //количество ячеек в зависимости от отображения номера недели

        if (viewModel.dataPoints.length == 0) {
            noData(calendar);
            return;
        }
		var height;
		
		var ym = viewModel.yearsMonths;
		
		
		//стартовые значения
		n = viewModel.n;
        var month = Number((ym[n].toString()).substr(4,2));
        var year = Number((ym[n].toString()).substr(0,4));

        // resequence dayNames[] based on settings.weekStartDay
        var dayNames = consts.dayNames.slice(settings.weekStartDay, consts.dayNames.length).concat(consts.dayNames.slice(0, settings.weekStartDay));
		var sdayNames = consts.shortDayNames.slice(settings.weekStartDay, consts.shortDayNames.length).concat(consts.shortDayNames.slice(0, settings.weekStartDay));
		
        var weeks = monthDays(year, month, { 
            weekStartDay: settings.weekStartDay,
            showWeekNumbers: settings.weekNumbers.show,
            useIso: settings.weekNumbers.useIso
        });

       
        mapData(weeks, viewModel, n);
        
        if (settings.weekNumbers.show) {
            // добавить пустоты в начало или в конец, чтоб было ровненькое отображение дней недели
			if(settings.weekdayFormat == 'short' )
			{
				settings.weekNumbers.placement === 'left' ? sdayNames.unshift('') : sdayNames.push('');
			}
			else
            {
				settings.weekNumbers.placement === 'left' ? dayNames.unshift('') : dayNames.push('');
			}
            //добавим номер недели для каждой недели в массиве
            addWeekNumbers(weeks, settings.weekNumbers.placement);
        }
		
		// хранения одной или нескольких строк, которые представлены вверху таблицы. 
		var thead = calendar.append('thead');
        var tbody = calendar.append('tbody');
				
		
        //строка с днями недели (под строкой с месяцем)
        thead 
            .append('tr')
            .selectAll('td')
            .data((settings.weekdayFormat === 'short' ? sdayNames : dayNames)) 
            .enter()
            .append('td')
            .style({
				'float': 'center',
                'text-align': 'center',
                'color': settings.fontColor.solid.color,
                'font-size': settings.textSize + 'px',
                'font-weight': settings.fontWeight,
                'text-align': settings.weekAlignment
            })
            .text(function (d) {
                return d;
            });
			

			
			//минимальное, максимальное и среднее значения для покраски
        var minValue = settings.calendarColors.minValue,
            centerValue = settings.calendarColors.centerValue,
            maxValue = settings.calendarColors.maxValue,
            color = d3.scale.linear();

			//покраска
        if (settings.calendarColors.diverging) {
            color
                .domain([minValue || d3.min(viewModel.dataPoints.map(function(d) {
                    return d.value;
                })), 
                centerValue || d3.mean(viewModel.dataPoints.map(function(d) {
                    return d.value;
                })), 
                maxValue || d3.max(viewModel.dataPoints.map(function(d) {
                    return d.value;
                }))])
                .range([settings.calendarColors.startColor.solid.color, 
                settings.calendarColors.centerColor.solid.color,
                settings.calendarColors.endColor.solid.color]);
        } else {
            color
                .domain([minValue || d3.min(viewModel.dataPoints.map(function(d) {
                    return d.value;
                })), 
                maxValue || d3.max(viewModel.dataPoints.map(function(d) {
                    return d.value;
                }))])
                .range([settings.calendarColors.startColor.solid.color, settings.calendarColors.endColor.solid.color]);
        }

        // построение дней календаря для выбранного месяца
        for (var i = 0; i < weeks.length; i++) {
           
			var week = weeks[i];
            tbody
                .append('tr')
                .style('height', 100/weeks.length + '%')
                .selectAll('td')
                .data(week)
                .enter()
                .append('td')
                .attr('class', function (d) {
                    let className = '';
                    if (d.day <= 0) {
                        className = 'empty';
                    } else if (!d.day && d.week && d.week > 0) {
                        className = 'week';
                    }
                    return className;
                })
                .attr('id', function(d) {
                    return d.day > 0 ? className + '-' + year.toString() + month.toString() + d.day.toString() : '';
                })
                .style('color', function(d) {
                    let color = '';
                    if (d.day > 0) {
                        color = settings.fontColor.solid.color;
                    } else if (!d.day && d.week > 0) {
                        color = settings.weekNumbers.fontColor.solid.color;
                    }
                    return color;
                })
                .style('font-size', function(d) {
                    let size = '';
                    if (d.day > 0) {
                        size = settings.textSize + 'px';
                    } else if (!d.day && d.week > 0) {
                        size = settings.weekNumbers.textSize + 'px';
                    }
                    return size;
                })
                .style('font-weight', function(d) {
                    let weight = '';
                    if (d.day > 0) {
                        weight = settings.fontWeight;
                    } else if (!d.day && d.week > 0) {
                        weight = settings.weekNumbers.fontWeight;
                    }
                    return weight;
                })
                .style('text-align', function(d) {
                    let align = '';
                    if (d.day > 0) {
                        align = settings.dayAlignment;
                    } else if (!d.day && d.week > 0) {
                        align = settings.weekNumbers.alignment;
                    }
                    return align;
                })
                .style({
                    'border-width': settings.borderWidth + 'px',
                    'border-color': settings.borderColor.solid.color,
					'border-style': 'solid',
					'-moz-border-radius':  '5px', /* Firefox */
					'-webkit-border-radius': '5px',/* Safari 4 */
					'border-radius':  '5px' /* IE 9, Safari 5, Chrome */
                })
                .style('background-color', function(d) {
                    var noDataColor = settings.calendarColors.noDataColor.solid.color;
                    return (noDataColor && (noDataColor !== null) && d.day > 0) ? noDataColor : '';
                })
                .append('div')
                .attr('class', function(d) {
                    return d.day > 0 ? className + '-parent' : '';
                })
                .append('div')
                .attr('class', function(d) {
                    return d.day > 0 ? className + '-day' : '';
                })
                .text(function (d) {
                    let label = '';
                    if (d.day > 0) {
                        label = d.day;
                    } else if (!d.day && d.week > 0) {
                        label = d.week;
                    }
                    return label;
                });
        }

        

        // добавление к календарю данных для отображения
		var dataForDay = 0;
		var l = viewModel.dataPoints.length;
		var flag = true; //Флаг для подсчета суммы
		var height;
		
		
		
        for (var i = 0; i < l; i++) {
			flag = true;
			var dataPoint = viewModel.dataPoints[i];
			var dataValue = dataPoint.value;
			var dataLabel = dataPoint.valueText;
			var date = new Date(dataPoint.category);
			var year_l = date.getFullYear();
			var month_l = date.getMonth();
			var day = date.getDate();
			
			var id = className + '-' + year_l.toString() + month_l.toString() + day.toString();
			
			if((year == year_l)&&(month == month_l))
			{	debugger;
				if(!isNaN(dataValue))//тут вывод числовых данных суммой
				{
					if (settings.dataLabels.show) 
					{
							if((i+1) != l) /*не последний элемент*/	
							{
								var dateNext = new Date(viewModel.dataPoints[i+1].category);
								//следующий день равен этому же
								if ((dateNext.getDate()==day) 
								&& (dateNext.getFullYear()==year_l)
								&& (dateNext.getMonth()==month_l ))
									{	
										dataForDay += dataValue;
										flag = false;
									}
							}
					
							if(flag==true)	
							{
								var td = d3.select('#' + id)
								td.style('background-color', color(dataValue));
								height = height || td.node().getBoundingClientRect().height;							
								d3.select('#' + id + ' .' + className + '-parent')
								.append('div')
								.attr('class', className + '-dataLabel')
								.style({
									'color': settings.dataLabels.fontColor.solid.color,
									'font-size': settings.dataLabels.textSize + 'px',
									'font-weight': settings.dataLabels.fontWeight,
									'text-align': settings.dataLabels.alignment,
									'height': parseInt(settings.dataLabels.textSize) + (parseInt(settings.dataLabels.textSize) * .5) + '%'
									})
								.text(dataForDay==0 ? dataValue: (dataForDay+dataValue));
								dataForDay=0; //cброс данных за день
							}
					}
				}
			
				else 
				{
					//а тут вывод стринговых данных строками
					var td = d3.select('#' + id)
					td.style('background-color', color(dataValue));
					
					try {
					height = height || td.node().getBoundingClientRect().height;
					}
					catch (e)
					{
						console.log(e);
					}
					
					if (settings.dataLabels.show) {
					d3.select('#' + id + ' .' + className + '-parent')
						.append('div')
						.attr('class', className + '-dataLabel')
						.style({
							'color': settings.dataLabels.fontColor.solid.color,
							'font-size': settings.dataLabels.textSize + 'px',
							'font-weight': settings.dataLabels.fontWeight,
							'text-align': settings.dataLabels.alignment,
							'height': parseInt(settings.dataLabels.textSize) + (parseInt(settings.dataLabels.textSize) * .5) + '%'
						})
						.text(dataLabel);
					}
				}
			}
		}
		
    }

	
function noData (calendar) {
        var thead = calendar.append('thead')
                        .append('tr')
                        .append('td')
                        .attr('colspan', 7)
                        .style('text-align', 'center')
                        .text('*** Нет данных для этого дня выбранного месяца ***');
    };
	
function mapData (weeks, viewModel, n) {
	 
        for (var w = 0; w < weeks.length; w++) {
            weeks[w] = weeks[w].map(function(d) {
                var data = { day: d.day, week: d.week };
                if (d.day > 0) {
                    var date = new Date(Number((viewModel.yearsMonths[n].toString()).substr(0,4)), Number((viewModel.yearsMonths[n].toString()).substr(4,2)), d.day);
					
                    // attempt to find matching date in viewModel.dataPoints
                    for (var i = 0; i < viewModel.dataPoints.length; i++) {
                        var dp = viewModel.dataPoints[i];
                        if (date.getTime() === dp.category.getTime()) {
                            data.data = dp;
                            break;
                        }
                    }
                }
                return data;
            });
        }
    };

	
function addWeekNumbers(weeks, placement) {
        for (let x = 0; x < weeks.length; x++) {
            let week = weeks[x];
            // get first non-0 week number
            for (let y = 0; y < week.length; y++) {
                let item = week[y];
                if (item.week !== 0) {
                    // add this to the start or end of the week[] array
                    placement === 'left' ? week.unshift({ week: item.week }) : week.push({ week: item.week });
                    break;
                }
            }
        }
    };

    /**
     * Credit: Ported from npm package 'calendar' 
     * https://www.npmjs.com/package/calendar
     */
    let _firstWeekDay = 0;
    let _options = {};
    var weekStartDate = function (date) {
        var startDate = new Date(date.getTime());
        while (startDate.getDay() !== _firstWeekDay) {
            startDate.setDate(startDate.getDate() - 1);
        }
        return startDate;
    };
 

function monthDates (year, month, dayFormatter, weekFormatter) {
        if ((typeof year !== "number") || (year < 1970)) {
            throw new CalendarException('год должен быть числом >= 1970');
        };
        if ((typeof month !== "number") || (month < 0) || (month > 11)) {
            throw new CalendarException('месяц должен быть числом (Янв = 0)');
        };
        var weeks = [],
            week = [],
            i = 0,
            date = weekStartDate(new Date(year, month, 1)),
            weekNum = 0;
        do {
            for (i=0; i<7; i++) {
                weekNum = weekFormatter ? weekFormatter(date) : 0;
                week.push({
                    day: dayFormatter ? dayFormatter(date) : date,
                    week: weekNum
                });
                date = new Date(date.getTime());
                date.setDate(date.getDate() + 1);
            }
            weeks.push(week);
            week = [];
        } while ((date.getMonth()<=month) && (date.getFullYear()===year));
        return weeks;
    };
    

function monthDays (year, month, options) {
        _firstWeekDay = options.weekStartDay || 0;
        _options = options || {};
        var getDayOrZero = function getDayOrZero(date) {
            return date.getMonth() === month ? date.getDate() : 0;
        };
        var getWeekOrZero = function getWeekOrZero(date) {
            return date.getMonth() === month ? date.getWeek(_options.showWeekNumbers && _options.useIso) : 0;
        }
        return monthDates(year, month, getDayOrZero, getWeekOrZero);
    };

    if (typeof define === 'function' && define.amd) {
        define(quadCalendar);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = quadCalendar;
    }
    this.quadCalendar = quadCalendar;
}();

Date.prototype.getWeek = function(useIso) {
    if (useIso) {
        let target = new Date(this.valueOf());
        let dayNr =  (this.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        let firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() != 4) {
            target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        return 1 + Math.ceil((firstThursday - target) / 604800000);
    } else {
        let onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil((((this.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    }
};
