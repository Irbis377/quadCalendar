/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {

    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;

    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    // selection interaction libs
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    
    // ViewModel
    interface CalendarViewModel {
        dataPoints: CalendarDataPoint[];
		yearsMonths: number[];
		n: number;
        settings: CalendarSettings;
        hasHighlights: boolean;
    };

    interface CalendarDataPoint extends SelectableDataPoint {
        value: number;
        valueText: string;
        category: string;
        rowdata: any;
        key: string;
        highlight?: boolean;
    };

	
    interface CalendarSettings {
        weekdayFormat: string;
        weekStartDay: number;
        borderWidth: number;
        borderColor: Fill;
        fontColor: Fill;
        fontWeight: number;
        textSize: number;
        monthAlignment: string;
        weekAlignment: string;
        dayAlignment: string;
        calendarColors: ColorSettings;
        dataLabels: DataLabelSettings;
        weekNumbers: WeekNumberSettings;
    };

    interface ColorSettings {
        diverging: boolean;
        startColor: Fill;
        centerColor: Fill;
        endColor: Fill;
        minValue: number;
        centerValue: number;
        maxValue: number;
        noDataColor: Fill;
    };

    interface DataLabelSettings {
        show: boolean;
        unit?: number;
        precision?: number;
        fontColor: Fill;
        fontWeight: number;
        textSize: number;
        alignment: string;
    };

    interface WeekNumberSettings {
        show: boolean;
        useIso: boolean;
        placement: string;
        fontColor: Fill;
        fontWeight: number;
        textSize: number;
        alignment: string;
    }

    function visualTransform(options: VisualUpdateOptions, host: IVisualHost, n:number): CalendarViewModel {
		
        let dataViews = options.dataViews;
        let defaultSettings: CalendarSettings = {
            weekdayFormat: 'short',
            weekStartDay: 1,
            borderWidth: 0,
            borderColor: {
                solid: {
                    color: '#000'
                }
            },
            fontColor: {
                solid: {
                    color: '#000'
                }
            },
            fontWeight: 100,
            textSize: 10,
            monthAlignment: 'center',
            weekAlignment: 'center',
            dayAlignment: 'right',
            calendarColors: {
                diverging: false,
                startColor: {
                    solid: {
                        color: '#A7FFF5'
                    }
                },
                centerColor: {
                    solid: {
                        color: null
                    }
                },
                endColor: {
                    solid: {
                        color: '#9AEAFF'
                    }
                },
                minValue: null,
                centerValue: null,
                maxValue: null,
                noDataColor: {
                    solid: {
                        color: '#DCFFF4'
                    }
                }
            },
            
			dataLabels: {
                show: true,
                unit: 0,
                fontColor: {
                    solid: {
                        color: '#000'
                    }
                },
                fontWeight: 100,
                textSize: 10,
                alignment: 'center'
            },
            weekNumbers: {
                show: false,
                useIso: false,
                placement: 'left',
                fontColor: {
                    solid: {
                        color: '#000'
                    }
                },
                fontWeight: 100,
                textSize: 8,
                alignment: 'center'
            }
        };
        let viewModel: CalendarViewModel = {
            dataPoints: [],
			yearsMonths: [],
			n: null,
            settings: <CalendarSettings>{},
            hasHighlights: false
        };

        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.categories[0].source
            || !dataViews[0].categorical.values
            || dataViews[0].categorical.categories[0].values.length == 0) {
            return viewModel;
        }

        let categorical = dataViews[0].categorical;
        let category = categorical.categories[0]; //период (даты)
        let dataValue = categorical.values[0];
        let objects = dataViews[0].metadata.objects;
        let colorPalette: IColorPalette = host.colorPalette;
        let calendarDataPoints: CalendarDataPoint[] = [];
        let firstDate: Date = new Date(category.values[0]);
		let lastDate: Date = new Date(category.values[category.values.length-1]);
		
		//здесь надо получить глобальный массив годов и месяцев
		//можно попробовать взять первую и последнюю дату. 
		//а между ними числа забить в массив.
		//привязать увеличение и уменьшение к кнопкам. 
		//Сделать кнопки неактивными в случае крайних дат
		//при апдейте или клике передавать во вьюшку новые данные
		
		var ym=[];
		let y:number = firstDate.getFullYear();
		let m:number = firstDate.getMonth();
		
		
		//по числу месяцев.
		//вид записи 201700 - янв 2017
		//201701 - февр 2017
		//201711 - дек 2017
		let a: number = 12*(lastDate.getFullYear() - firstDate.getFullYear())+ lastDate.getMonth()- firstDate.getMonth()+1;
		for (var i=0; i <a ;i++)
		{
			ym.push(-1);
		}
		
		try {
			
					
			for (var i=0; i <a ;i++)
			{
				ym[i]=y*100+m;
				if(m<11)
				{
					m+=1;
				}
				else 
				{
					y+=1;
					m=0;
				}
			}
		}
		catch(e){
			console.log("Error date!");
			console.log(e);
		}
		
        let tabledata = dataViews[0].table.rows; // used for tooltips
      
		let calendarSettings: CalendarSettings = {
            weekdayFormat: getValue<string>(objects, 'calendar', 'weekdayFormat', defaultSettings.weekdayFormat),
            weekStartDay: getValue<number>(objects, 'calendar', 'weekStartDay', defaultSettings.weekStartDay),
            borderWidth: getValue<number>(objects, 'calendar', 'borderWidth', defaultSettings.borderWidth),
            borderColor: getValue<Fill>(objects, 'calendar', 'borderColor', defaultSettings.borderColor),
            fontColor: getValue<Fill>(objects, 'calendar', 'fontColor', defaultSettings.fontColor),
            fontWeight: getValue<number>(objects, 'calendar', 'fontWeight', defaultSettings.fontWeight),
            textSize: getValue<number>(objects, 'calendar', 'textSize', defaultSettings.textSize),
            monthAlignment: getValue<string>(objects, 'calendar', 'monthAlignment', defaultSettings.monthAlignment),
            weekAlignment: getValue<string>(objects, 'calendar', 'weekAlignment', defaultSettings.weekAlignment),
            dayAlignment: getValue<string>(objects, 'calendar', 'dayAlignment', defaultSettings.dayAlignment),
            calendarColors: {
                diverging: getValue<boolean>(objects, 'calendarColors', 'diverging', defaultSettings.calendarColors.diverging),
                startColor: getValue<Fill>(objects, 'calendarColors', 'startColor', defaultSettings.calendarColors.startColor),
                centerColor: getValue<Fill>(objects, 'calendarColors', 'centerColor', defaultSettings.calendarColors.centerColor),
                endColor: getValue<Fill>(objects, 'calendarColors', 'endColor', defaultSettings.calendarColors.endColor),
                minValue: getValue<number>(objects, 'calendarColors', 'minValue', defaultSettings.calendarColors.minValue),
                centerValue: getValue<number>(objects, 'calendarColors', 'centerValue', defaultSettings.calendarColors.centerValue),
                maxValue: getValue<number>(objects, 'calendarColors', 'maxValue', defaultSettings.calendarColors.maxValue),
                noDataColor: getValue<Fill>(objects, 'calendarColors', 'noDataColor', defaultSettings.calendarColors.noDataColor)
            },
            dataLabels: {
                show: getValue<boolean>(objects, 'dataLabels', 'show', defaultSettings.dataLabels.show),
                unit: getValue<number>(objects, 'dataLabels', 'unit', defaultSettings.dataLabels.unit),
                precision: getValue<number>(objects, 'dataLabels', 'precision', defaultSettings.dataLabels.precision),
                fontColor: getValue<Fill>(objects, 'dataLabels', 'fontColor', defaultSettings.dataLabels.fontColor),
                fontWeight: getValue<number>(objects, 'dataLabels', 'fontWeight', defaultSettings.dataLabels.fontWeight),
                textSize: getValue<number>(objects, 'dataLabels', 'textSize', defaultSettings.dataLabels.textSize),
                alignment: getValue<string>(objects, 'dataLabels', 'alignment', defaultSettings.dataLabels.alignment)
            },
            weekNumbers: {
                show: getValue<boolean>(objects, 'showWeeks', 'show', defaultSettings.weekNumbers.show),
                useIso: getValue<boolean>(objects, 'showWeeks', 'useIso', defaultSettings.weekNumbers.useIso),
                placement: getValue<string>(objects, 'showWeeks', 'placement', defaultSettings.weekNumbers.placement),
                fontColor: getValue<Fill>(objects, 'showWeeks', 'fontColor', defaultSettings.weekNumbers.fontColor),
                fontWeight: getValue<number>(objects, 'showWeeks', 'fontWeight', defaultSettings.weekNumbers.fontWeight),
                textSize: getValue<number>(objects, 'showWeeks', 'textSize', defaultSettings.weekNumbers.textSize),
                alignment: getValue<string>(objects, 'showWeeks', 'alignment', defaultSettings.weekNumbers.alignment)
            }
        };

        // purge date (category) field from table data by checking for Date type
        for (let r = 0; r < tabledata.length; r++) {
            let row = tabledata[r];
            for (let v = 0; v < row.length; v++) {
                let val = row[v];
                if (Object.prototype.toString.call(val) === '[object Date]') {
                    row.splice(v, 1);
                    break;
                }
            }
        }

        let valueFormat = valueFormatter.create({
            value: calendarSettings.dataLabels.unit,
            precision: calendarSettings.dataLabels.precision
        });

        for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            let textFormat = valueFormatter.create({
                value: valueFormat.options.value,
                precision: valueFormat.options.precision,
                format: valueFormatter.getFormatStringByColumn(dataValue.source)
            });
            let selectionIdBuilder = host.createSelectionIdBuilder()
                .withCategory(category, i);
            let selectionId = selectionIdBuilder.createSelectionId();
            let highlight: any = dataValue.highlights && dataValue.highlights[i] !== null;

            calendarDataPoints.push({
                category: <string>category.values[i],
                value: parseFloat(valueFormat.format(dataValue.values[i])),
                valueText: textFormat.format(dataValue.values[i]),
                rowdata: tabledata[i],
                selected: false,
                identity: selectionId,
                key: (selectionIdBuilder.createSelectionId() as powerbi.visuals.ISelectionId).getKey(),
                highlight: highlight
            });
        }

        viewModel.dataPoints = calendarDataPoints;
        viewModel.settings = calendarSettings;
        viewModel.hasHighlights = !!(dataValue.highlights);
		viewModel.yearsMonths = ym;
				
				
		if (n==null) {
			viewModel.n = 0;
		}
		else
		{viewModel.n = n;}
	
        return viewModel;
    }

    export class Visual implements IVisual {
		public nm: number; //номер отображаемого месяца
        
		private target: HTMLElement;
        private host: IVisualHost;
        private locale: string;
        private calendar: any;
		
		public options_V: VisualUpdateOptions;
		
		private monthLabel: d3.Selection<HTMLLabelElement>;
		private btMM: d3.Selection<HTMLButtonElement>;
		private btPM: d3.Selection<HTMLButtonElement>;
		private btMY: d3.Selection<HTMLButtonElement>;
		private btPY: d3.Selection<HTMLButtonElement>;
        private table: d3.Selection<HTMLTableElement>; 

        private calendarSettings: CalendarSettings;
        private selectionManager: ISelectionManager;
        private selectionIdBuilder: ISelectionIdBuilder;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private vm: CalendarViewModel;
        private calendarDataPoints: CalendarDataPoint[];
        private interactivityService: IInteractivityService;
        private clearCatcher: d3.Selection<any>;
        private behavior: CalendarBehavior;
        private className: string = 'quadCalendar';

		private monthNames: string[];

	   
		
        constructor(options: VisualConstructorOptions) {
			this.monthNames = 
			['Январь',
            'Февраль',
            'Март',
            'Апрель',
            'Май',
            'Июнь',
            'Июль',
            'Август',
            'Сентябрь',
            'Октябрь',
            'Ноябрь',
            'Декабрь'
        ];
			
            this.target = options.element;
            this.host = options.host;
            this.locale = options.host.locale;
			this.nm = 0; 
		
			
			let btMY = this.btMY = d3.select(options.element).append('button');
				this.btMY.text("<<");
			
				//кнопка минус
			let btMM = this.btMM = d3.select(options.element).append('button');
				this.btMM.text("<");
				
				
			var minusMonth =  function(p_Visual){
				var Visual_local = p_Visual;
					return function(p_event)
					{
						if(Visual_local)
						{
							if(Visual_local.nm > 0)
							{
								Visual_local.nm--;
								Visual_local.update();
							}
						}
					}
				};	
				
				
				var minusYear =  function(p_Visual){
				var Visual_local = p_Visual;
					
					return function(p_event)
					{
						if(Visual_local)
						{
							if(Visual_local.nm > 0)
							{
								//поиск nm, где год меньше 
								var year = Number((Visual_local.vm.yearsMonths[Visual_local.nm].toString()).substr(0,4));
								var month = Number((Visual_local.vm.yearsMonths[Visual_local.nm].toString()).substr(4,2));
								//проверка первого месяца первого года.
								//если год такой же, то вернуть первый месяц,
								//если год меньше, а месяц больше или такой же, то вернуть первый месяц
								//иначе искать
								if((Number((Visual_local.vm.yearsMonths[0].toString()).substr(0,4)) == year) ||
									((Number((Visual_local.vm.yearsMonths[0].toString()).substr(0,4)) == (year-1)) 
									&&(Number((Visual_local.vm.yearsMonths[0].toString()).substr(4,2)) >= month)))
									{
										Visual_local.nm = 0;
									}
								else 
									{	
										
										for(var i=Visual_local.nm-1; i > 0; i--)
										{
											//найден год меньше текущего
											if  (Number((Visual_local.vm.yearsMonths[i].toString()).substr(0,4)) < year )
											{
												Visual_local.nm = i;
												//поиск равного месяца
												for (var j=i; j>0; j--)
												{
													if(Number((Visual_local.vm.yearsMonths[j].toString()).substr(4,2))==month)
													{
														Visual_local.nm = j;
														break;
													}
													
												}	
											}
											//закончить поиск, если месяц найден
											if(Visual_local.nm < i)
											{break;}
										}
									}
								Visual_local.update();
							}
						}
					}
				};	
					
				//клик для переключениея месяца
				this.btMM.on('click',  minusMonth(this));
				//rлик для переключениея года
				this.btMY.on('click', minusYear(this));
				
			
			//лейбл 
			let monthLabel = this.monthLabel = d3.select(options.element).append('p');
			
			
			
			
			var selectAllMonth =  function(p_Visual){
				var Visual_local = p_Visual;
					
					return function(p_event)
					{
						if(Visual_local)
						{
								//имитируем клик с нажатой клавишей ctrl
								var ev = new MouseEvent ("click",{ctrlKey:true});
								
								var a =	Visual_local.behavior.options.dayCells[0];
								for (var i =0; i<a.length; i++)
								{
									a[i].dispatchEvent(ev);	
								}
						}
					}
			}
			//клик для выделения всего месяца
			this.monthLabel.attr('id','monthlabel')
			this.monthLabel.on('click', selectAllMonth(this));
			
			//кнопка плюс
			let btPM = this.btPM = d3.select(options.element).append('button');
				this.btPM.text(">");
			let btPY = this.btPY = d3.select(options.element).append('button');
				this.btPY.text(">>");
		
				//(замыкание)
				var plusMonth = function(p_Visual){
					var Visual_local = p_Visual;
					return function(p_event)
					{
						if(Visual_local)
						{
							//условие неактивности кнопки, при достижении последнего месяца
							if(Visual_local.nm < Visual_local.vm.yearsMonths.length-1)
							{	
								Visual_local.nm++;
								Visual_local.update();
							}
						}
						//
					}
				};	
				
				var plusYear =  function(p_Visual){
				var Visual_local = p_Visual;
				
					return function(p_event)
					{
						if(Visual_local)
						{
							if(Visual_local.nm < Visual_local.vm.yearsMonths.length-1)
							{
								//поиск nm, где год больше 
								var year = Number((Visual_local.vm.yearsMonths[Visual_local.nm].toString()).substr(0,4));
								var month = Number((Visual_local.vm.yearsMonths[Visual_local.nm].toString()).substr(4,2));
								//проверка последнего месяца последнего года
								//последний год равен текущему или
								//последний год на единицу больше предыдущего и его месяц меньше или равен текущему (иначе искать)
								//переключиться на последний месяц
								if ((Number((Visual_local.vm.yearsMonths[Visual_local.vm.yearsMonths.length-1].toString()).substr(0,4)) == year) ||
									((Number((Visual_local.vm.yearsMonths[Visual_local.vm.yearsMonths.length-1].toString()).substr(0,4)) == (year+1)) &&(Number((Visual_local.vm.yearsMonths[Visual_local.vm.yearsMonths.length-1].toString()).substr(4,2))<=month)))
								{
									Visual_local.nm = Visual_local.vm.yearsMonths.length-1;	
								}
								else 
								{
								for(var i=Visual_local.nm; i < Visual_local.vm.yearsMonths.length; i++)
									{
										if  (Number((Visual_local.vm.yearsMonths[i].toString()).substr(0,4)) > year )
										{
											Visual_local.nm = i;
											
											//поиск того же месяца следующего года. 
											for (var j = i; j < Visual_local.vm.yearsMonths.length; j++ )
											{
												if ((Number((Visual_local.vm.yearsMonths[j].toString()).substr(4,2)) == month)
													&&( Number((Visual_local.vm.yearsMonths[j].toString()).substr(0,4)) == Number((Visual_local.vm.yearsMonths[i].toString()).substr(0,4)) ))
												{
													//вернуть этот месяц
														Visual_local.nm = j;
														break;
												}
											}
											//если месяц был найден, закончить поиск
										if(Visual_local.nm > i) {break;}
										}
										
									}
								}
								Visual_local.update();
							}
						}
					}
				};	
				
				
				//клик для переключения месяца
				this.btPM.on('click', plusMonth(this)); 
				//клик для переключения года
				this.btPY.on('click', plusYear(this));
				
				
				
			//табличка календаря	
			let table = this.table = d3.select(options.element)
                .append('table').classed(this.className, true);
			

            this.selectionManager = this.host.createSelectionManager();
            this.selectionIdBuilder = options.host.createSelectionIdBuilder();
            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                this.host.tooltipService, options.element);

            this.clearCatcher = appendClearCatcher(this.table);
            this.behavior = new CalendarBehavior();
            this.interactivityService = createInteractivityService(options.host);
			}

	   
	
        public update(options: VisualUpdateOptions) {
		
			if(options == null) 
				{
					options = this.options_V;
				}
			else{ 
					this.options_V = options;
				}
			
			let viewModel: CalendarViewModel = this.vm = visualTransform(options, this.host, this.nm );
			
            let settings = this.calendarSettings = viewModel.settings;
            this.calendarDataPoints = viewModel.dataPoints;

            let margins = {
                top: 0,
                right: 2.5,
                bottom: 50,
                left: 2.5
            };
            let width = options.viewport.width - (margins.right + margins.left);
            let height = options.viewport.height - (margins.top + margins.bottom);

            this.table
                .attr({
                    width: width,
                    height: height
                })
                .style({
                    'margin-left': margins.left + 'px',
                    'margin-top': margins.top + 'px'
                });
				
			this.btPM.style({'background-color': settings.calendarColors.noDataColor.solid.color,
							 'border-width': settings.borderWidth + 'px',
							 'border-color': settings.borderColor.solid.color,
							'border-style': 'solid'
							});
			this.btMM.style({'background-color': settings.calendarColors.noDataColor.solid.color,
							 'border-width': settings.borderWidth + 'px',
							 'border-color': settings.borderColor.solid.color,
							'border-style': 'solid'
							});
			this.btPY.style({'background-color': settings.calendarColors.startColor.solid.color,
							 'border-width': settings.borderWidth + 'px',
							 'border-color': settings.borderColor.solid.color,
							'border-style': 'solid'
							});
			this.btMY.style({'background-color': settings.calendarColors.startColor.solid.color,
							 'border-width': settings.borderWidth + 'px',
							 'border-color': settings.borderColor.solid.color,
							'border-style': 'solid'
							});
			
					
            this.table.selectAll('*').remove();
			
			
			if(this.nm > viewModel.yearsMonths.length-1) {this.nm = viewModel.yearsMonths.length-1; viewModel.n = this.nm;}
		
			
            this.calendar = quadCalendar.loadCalendar(this.table, viewModel, this.calendarSettings, this.selectionManager, this.host.allowInteractions);
			
			this.monthLabel.attr('class','month');
			
			this.monthLabel.style
					({
					'text-align': settings.monthAlignment,
                    'color': settings.fontColor.solid.color,
                    'font-size': settings.textSize +'px' + 1 + 'px',
                    'font-weight': settings.fontWeight
					});
					
			this.monthLabel.text(this.monthNames[Number((this.vm.yearsMonths[this.nm].toString()).substr(4,2))] +"  " + (this.vm.yearsMonths[this.nm].toString()).substr(0,4) );
					
					
            let cols = options.dataViews[0].metadata.columns.filter(c => !c.roles['category']).map(c => c);
            this.tooltipServiceWrapper.addTooltip(this.table.selectAll('[id^=quadCalendar]'),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => 
                    Visual.getTooltipData(<CalendarDataPoint>tooltipEvent.data, cols, this.locale, viewModel.settings.dataLabels.unit, viewModel.settings.dataLabels.precision),
                (tooltipEvent: TooltipEventArgs<CalendarDataPoint>) => null);

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.vm.dataPoints);
				//behaviorOptions - выбор дат 
				
                let behaviorOptions: CalendarBehaviorOptions = {
                    dayCells: d3.selectAll('[id^=' + this.className + ']'),
                    clearCatcher: this.clearCatcher,
                    interactivityService: this.interactivityService,
                    hasHighlights: this.vm.hasHighlights
                };

                this.interactivityService.bind(this.vm.dataPoints, this.behavior, behaviorOptions);
            }

            this.behavior.renderSelection(this.interactivityService.hasSelection());
        }

			
		
        public destroy(): void {
            //TODO: Perform any cleanup tasks here
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch (objectName) {
                case 'calendar': 
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            weekdayFormat: this.calendarSettings.weekdayFormat,
                            weekStartDay: this.calendarSettings.weekStartDay,
                            borderWidth: this.calendarSettings.borderWidth,
                            borderColor: this.calendarSettings.borderColor,
                            fontColor: this.calendarSettings.fontColor,
                            fontWeight: this.calendarSettings.fontWeight,
                            textSize: this.calendarSettings.textSize,
                            monthAlignment: this.calendarSettings.monthAlignment,
                            weekAlignment: this.calendarSettings.weekAlignment,
                            dayAlignment: this.calendarSettings.dayAlignment
                        },
                        selector: null
                    })
                    break;
                case 'showWeeks':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.calendarSettings.weekNumbers.show,
                            useIso: this.calendarSettings.weekNumbers.useIso,
                            placement: this.calendarSettings.weekNumbers.placement,
                            fontColor: this.calendarSettings.weekNumbers.fontColor,
                            fontWeight: this.calendarSettings.weekNumbers.fontWeight,
                            textSize: this.calendarSettings.weekNumbers.textSize,
                            alignment: this.calendarSettings.weekNumbers.alignment
                        },
                        selector: null
                    });
                    break;
                case 'calendarColors':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            diverging: this.calendarSettings.calendarColors.diverging,
                            startColor: this.calendarSettings.calendarColors.startColor,
                            centerColor: this.calendarSettings.calendarColors.diverging ? this.calendarSettings.calendarColors.centerColor : null,
                            endColor: this.calendarSettings.calendarColors.endColor,
                            minValue: this.calendarSettings.calendarColors.minValue,
                            centerValue: this.calendarSettings.calendarColors.centerValue,
                            maxValue: this.calendarSettings.calendarColors.maxValue,
                            noDataColor: this.calendarSettings.calendarColors.noDataColor
                        },
                        selector: null
                    });
                    break;
                case 'dataLabels':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.calendarSettings.dataLabels.show,
                            unit: this.calendarSettings.dataLabels.unit,
                            precision: this.calendarSettings.dataLabels.precision,
                            fontColor: this.calendarSettings.dataLabels.fontColor,
                            fontWeight: this.calendarSettings.dataLabels.fontWeight,
                            textSize: this.calendarSettings.dataLabels.textSize,
                            alignment: this.calendarSettings.dataLabels.alignment
                        },
                        selector: null
                    });
                    break;
            };

            return objectEnumeration;
        }

        private static getTooltipData(value: any, cols: any, locale: string, displayUnit: number, precision: number): VisualTooltipDataItem[] {
            var zip = rows => rows[0].map((_, c) => rows.map(row => row[c]));
            var tooltips = [];
            if (value.data != null && !isNaN(value.data.value)) {
                var tooltipdata = zip([cols, value.data.rowdata]);
                var date = new Date(value.data.category).toLocaleDateString(locale);
                tooltipdata.forEach((t) => {
                    let format = valueFormatter.create({
                        format: valueFormatter.getFormatStringByColumn(t[0]),
                        value: displayUnit,
                        precision: precision
                    });
                    let temp = {};

                    // если данные можно измерить, 
                    // то применить Display Unit и Decimal Places 
                    // для форматирования.
                    // иначе вывести как строку
                    let value;
                    if (t[0].roles.measure) {
                        value = format.format(t[1]);
                    } else {
                        value = valueFormatter.format(t[1], format.options.format);
                    }

                    temp['header'] = date;
                    temp['displayName'] = t[0].displayName;
                    temp['value'] = value;
                    tooltips.push(temp);
                })
            } else {
                tooltips.push({ 'displayName': 'Нет данных для выбранного дня' });
            }
            return tooltips;
        }
    }

    export interface CalendarBehaviorOptions {
        dayCells: d3.Selection<any>;
        clearCatcher: d3.Selection<any>;
        interactivityService: IInteractivityService;
        hasHighlights: boolean;
    }

    export class CalendarBehavior implements IInteractiveBehavior {
        private static DimmedOpacity: number = 0.4;
        private static DefaultOpacity: number = 1.0;

        private static getFillOpacity(selected: boolean, highlight: boolean, hasSelection: boolean, hasPartialHighlights: boolean): number {
            if ((hasPartialHighlights && !highlight) || (hasSelection && !selected)) {
                return CalendarBehavior.DimmedOpacity;
            } else {
                return CalendarBehavior.DefaultOpacity;
            }
        }

        private options: CalendarBehaviorOptions;

        public bindEvents(options: CalendarBehaviorOptions, selectionHandler: ISelectionHandler) {
          
			this.options = options;
            let clearCatcher = options.clearCatcher;
						
            options.dayCells.on('click', (d: any) => {
                selectionHandler.handleSelection(d.data, (d3.event as MouseEvent).ctrlKey); 
				//выделение по клику на ячейку и контрл.
            });

            clearCatcher.on('click', () => {
                selectionHandler.handleClearSelection();
            });
        }
//подсветка
        public renderSelection(hasSelection: boolean) {
            let options = this.options;
            let hasHighlights = options.hasHighlights;

            options.dayCells.style('opacity', (d: any) => {
                let selected = d.data ? d.data.selected : false;
                let highlight = d.data ? d.data.highlight : false;

                return CalendarBehavior.getFillOpacity(selected, highlight, !highlight && hasSelection, !selected && hasHighlights);
            });
        }
    }
}