/*jslint browser: true*/
/*jshint -W055 */
/*global $, c3, Mustache, ZeroClipboard, console, jsPDF, Bloodhound, bb, alert*/

/*
 * For each disease area there will be 4 stages: Diagnosis, Monitoring, Treatment and Exclusions.
 * Each stage gets a single panel on the front screen.
 * Clicking on a panel takes you to a screen specific to that stage, but similar in layour and content
 *  to all the others.
 */

 //The way to scroll nice scroll
 //$('#patients').getNiceScroll().doScrollPos(0,$('td:contains(555877)').position().top-100);

(function () {
  'use strict';

  var location = window.history.location || window.location;
	/*******************************
	 *** Define local properties ***
	 *******************************/
	var local= {
		"charts" : {},
		"data" : {},
    "actionPlan": {},
		"categories" : {
			"diagnosis": {"name": "diagnosis", "display": "Diagnosis"},
			"monitoring": {"name": "monitoring", "display": "Monitoring"},
			"treatment": {"name": "treatment", "display": "Treatment"},
			"exclusions": {"name": "exclusions", "display": "Exclusions"}
		},
		"page" : "",
		"pathwayId" : "bp",
    "colors" : ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    "diseases" : [],
    "pathwayNames" : {},
    "monitored" : {"bp" : "Blood Pressure", "asthma" : "Peak Expiratory Flow"},
    "tmp" : null
	};

	var bottomLeftPanel, bottomRightPanel, topLeftPanel, topRightPanel, midPanel, farLeftPanel, farRightPanel, monitoringPanel, treatmentPanel,
		diagnosisPanel,	exclusionPanel, patientsPanelTemplate, breakdownPanel, actionPlanPanel, patientList, patientListSimple, suggestedPlanTemplate,
		breakdownTableTemplate,	individualPanel, valueTrendPanel, medicationPanel, patientsPanel,	suggestedPlanTeam, adviceList, breakdownTable,
    patientInfo, teamTab, individualTab, actionPlanList;


  var showDiseaseView = function(disease){
    local.pathwayId = disease;

    //Set up navigation panel
    var idx = local.diseases.map(function(v){ return v.id; }).indexOf(disease);
    showNavigation(local.diseases, idx, $('#main-dashboard'));

    //Show main dashboard page
    showPage('main-dashboard');

    //Show side panel if not already there
    showSidePanel();

    //Show overview panels
    showOverview();

    showHeaderBarItems();

    showTeamActionPlanPanel(farRightPanel);
    populateTeamSuggestedActionsPanel("monitoring");

    $('#navbar').children('.nav').find(".active").removeClass("active");
  };

  var showPathwayStageView = function(pathwayStage){

    showPatientPanel(farLeftPanel);

    hideAllPanels();

		//move to top rightt..
		showPanel(pathwayStage, topRightPanel, false);
    topRightPanel.children('div').removeClass('panel-default');

		switchTo121Layout();

    showIndividualActionPlanPanel(farRightPanel, pathwayStage);

		updateBreadcrumbs([local.pathwayId, pathwayStage]);

    //update patient panel
    patientsPanel.parent().parent().removeClass('panel-default').addClass('panel-' + pathwayStage);

    populatePatientPanel(local.pathwayId, pathwayStage, null);

    showBreakdownPanel(pathwayStage, bottomRightPanel);
  };

  var showPathwayStagePatientView = function(patientId){

    drawBpTrendChart(patientId);
    local.patientId = patientId;

    populateIndividualSuggestedActions(patientId);

    showTestTrendPanel(topRightPanel);
    drawBpTrendChart(patientId);

    showMedicationPanel(bottomRightPanel);
  };

  var showPatientView = function(patientId){

    showNavigation(local.diseases, local.diseases.length, $('#main-dashboard'));

    showPage('main-dashboard');
    showSidePanel();

    switchToNarrow121Layout();

    topRightPanel.hide();
    bottomRightPanel.hide();
    farRightPanel.hide();

    showHeaderBarItems();

    //showPatientPanel(farLeftPanel);
    showPatientDropdownPanel(farLeftPanel);
    hideAllPanels();

		updateBreadcrumbs(["Patients"]);

    //populatePatientPanelSimple();
  };

	/**************
	 *** Layout ***
	 **************/
  var narrowFirstColumn = function(){
    farLeftPanel.removeClass('col-xl-4').addClass('col-xl-3');
  };

  var widenFirstColumn = function(){
    farLeftPanel.addClass('col-xl-4').removeClass('col-xl-3');
  }

  var switchToNarrow121Layout = function(){
    switchTo121Layout();
    narrowFirstColumn();
  };

  var switchTo121Layout = function(){
    farLeftPanel.show();
    widenFirstColumn();
    topLeftPanel.removeClass('col-xl-6').html("").hide();
    bottomLeftPanel.removeClass('col-xl-6').html("").hide();
    topRightPanel.addClass('col-xl-12').removeClass('col-xl-6');
    bottomRightPanel.addClass('col-xl-12').removeClass('col-xl-6');
    midPanel.removeClass('col-xl-8').addClass('col-xl-4');
    farRightPanel.show();
  };

 var switchTo120Layout = function(){
   farLeftPanel.show();
   widenFirstColumn();
   topLeftPanel.removeClass('col-xl-6').html("").hide();
   bottomLeftPanel.removeClass('col-xl-6').html("").hide();
   topRightPanel.addClass('col-xl-12').removeClass('collg-6');
   bottomRightPanel.addClass('col-xl-12').removeClass('col-xl-6');
   midPanel.removeClass('col-xl-8').addClass('col-xl-4');
   farRightPanel.hide();
 };

	var switchTo221Layout = function(){
    farLeftPanel.hide();
    topLeftPanel.addClass('col-xl-6').show();
    bottomLeftPanel.addClass('col-xl-6').show();
    topRightPanel.removeClass('col-xl-12').addClass('col-xl-6');
    bottomRightPanel.removeClass('col-xl-12').addClass('col-xl-6');
    midPanel.removeClass('col-xl-4').addClass('col-xl-8');
    farRightPanel.show();
	};

	var switchToThreePanelLayout = function(){
		bottomLeftPanel.addClass('col-xl-12').removeClass('col-xl-6');
		bottomRightPanel.removeClass('col-xl-6').hide();
	};

	var updateBreadcrumbs = function(items){
		var html = [];
		if(items.length===1) {
			html.push('<span>' + local.pathwayNames[items[0]] + '</span>');
		}
		else {
			for(var i =0 ; i< items.length; i++){
				if(i===items.length-1){
					html.push('<span>' + local.categories[items[i]].display + '</span>');
				} else{
					html.push('<a href="#main/' + items[i] + '">' + local.pathwayNames[items[i]] + '</a>');
				}
			}
		}
		$('#breadcrumb').html(html.join(' &gt; '));
	};

	var showSidePanel = function() {
		$('#main').addClass('content');
		$('#topnavbar').addClass('full');
		$('#aside-toggle').removeClass('collapsed');
		$('#bottomnavbar').hide();
	};

	var hideSidePanel = function() {
		$('#main').removeClass('content');
		$('#topnavbar').removeClass('full');
		$('#aside-toggle').addClass('collapsed');
		$('#bottomnavbar').show();
	};

  var showHeaderBarItems = function() {
    $('.hide-if-logged-out').show();
  };

  var hideHeaderBarItems = function() {
    $('.hide-if-logged-out').hide();
  };

	/**************
	 *** Panels ***
	 **************/

	var hideAllPanels = function(){
		if(suggestedPlanTeam) suggestedPlanTeam.html('');
		$('#advice').html('');
		$('#advice-placeholder').show();
		if(patientsPanel) patientsPanel.html('');
		$('#patients-placeholder').show();
	};

	var createPanel = function(templateSelector, panelSelector, data, templates){
		var template = templateSelector.html();
		Mustache.parse(template);   // optional, speeds up future uses
		if(templates) {
			for(var o in templates) {
				if(templates.hasOwnProperty(o))	{
					Mustache.parse(templates[o]);
				}
			}
		}
		var rendered = Mustache.render(template, data, templates);
		panelSelector.html(rendered).show();
	};

	var showPanel = function(pathwayStage, location, enableHover) {
		if(pathwayStage === local.categories.monitoring.name) showMonitoringPanel(location, enableHover);
		if(pathwayStage === local.categories.treatment.name) showTreatmentPanel(location, enableHover);
		if(pathwayStage === local.categories.diagnosis.name) showDiagnosisPanel(location, enableHover);
		if(pathwayStage === local.categories.exclusions.name) showExclusionsPanel(location, enableHover);

		if(enableHover) highlightOnHoverAndEnableSelectByClick(location);
    else location.children('div').addClass('unclickable');
	};

	var showMonitoringPanel = function(location, enableHover) {
		var percentChange = local.data[local.pathwayId].monitoring.trend[1][1]-local.data[local.pathwayId].monitoring.trend[1][30];
		var numberChange = local.data[local.pathwayId].monitoring.trend[2][1]-local.data[local.pathwayId].monitoring.trend[2][30];
		createPanel(monitoringPanel, location, {
			percent: local.data[local.pathwayId].monitoring.trend[1][1],
			percentChange: Math.abs(percentChange),
			percentUp: percentChange>=0,
			number: local.data[local.pathwayId].monitoring.trend[2][1],
			numberUp: numberChange>=0,
			numberChange: Math.abs(numberChange),
      pathway: local.pathwayNames[local.pathwayId],
      title: local.data[local.pathwayId].monitoring.title
			}, {"change-bar": $('#change-bar').html()}
		);

		destroyCharts(['monitoring-chart']);
    setTimeout(function(){
  		local.charts["monitoring-chart"] = c3.generate({
  			bindto: '#monitoring-chart',
  			data: {
  				x: 'x',
  				columns: local.data[local.pathwayId].monitoring.trend,
  				axes: {
  					"%" : 'y',
  					"n" : 'y2'
  				}
  			},
        tooltip: {
          format: {
            title: function (x) { return x.toDateString() + (enableHover ? '<br>Click for more detail' : ''); }/*,
            value: function (value) { return  enableHover ? undefined : value;}*/
          }
        },
  			axis: {
  				x: {
  					type: 'timeseries',
  					tick: {
  						format: '%Y-%m-%d',
  						count: 7,
  						culling: {
  							max: 4
  						}
  					},
            label: {
              text: 'Date',
              position: 'outer-center'
            }
  				},
  				y : {
  					min : 0,
            label: {
              text: 'Proportion (%)',
              position: 'outer-middle'
            }
  				},
  				y2: {
  					show: true,
  					min: 0,
            label: {
              text: 'Patient count (n)',
              position: 'outer-middle'
            }
  				}
  			},
  			point: {
  				show: false
  			},
  			size: {
  				height: null
  			}
  			/*grid: {
  			 x: {
  			 lines: [{value: data[0][60], text: 'Action plan downloaded'}, {value: data[0][330], text: 'Action plan downloaded'}]
  			 }
  			 }*/
  		});
    },1);
	};

	var showTreatmentPanel = function(location, enableHover) {
		var percentChange = local.data[local.pathwayId].treatment.trend[1][1]-local.data[local.pathwayId].treatment.trend[1][30];
		var numberChange = local.data[local.pathwayId].treatment.trend[2][1]-local.data[local.pathwayId].treatment.trend[2][30];
		createPanel(treatmentPanel, location, {
			percent: local.data[local.pathwayId].treatment.trend[1][1],
			percentChange: Math.abs(percentChange),
			percentUp: percentChange>=0,
			number: local.data[local.pathwayId].treatment.trend[2][1],
			numberUp: numberChange>=0,
			numberChange: Math.abs(numberChange),
      pathway: local.pathwayNames[local.pathwayId],
      title: local.data[local.pathwayId].treatment.title
			}, {"change-bar": $('#change-bar').html()}
		);

		destroyCharts(['treatment-chart']);
    setTimeout(function(){
  		local.charts["treatment-chart"] = c3.generate({
  			bindto: '#treatment-chart',
  			data: {
  				x: 'x',
  				columns: local.data[local.pathwayId].treatment.trend,
  				axes: {
  					"%" : 'y',
  					"n" : 'y2'
  				}
  			},
        tooltip: {
          format: {
            title: function (x) { return x.toDateString() + (enableHover ? '<br>Click for more detail' : ''); }/*,
            value: function (value) { return  enableHover ? undefined : value;}*/
          }
        },
  			axis: {
  				x: {
  					type: 'timeseries',
  					tick: {
  						format: '%Y-%m-%d',
  						count: 7,
  						culling: {
  							max: 4
  						}
  					},
            label: {
              text: 'Date',
              position: 'outer-center'
            }
  				},
  				y : {
  					min : 0,
            label: {
              text: 'Proportion (%)',
              position: 'outer-middle'
            }
  				},
  				y2: {
  					show: true,
  					min: 0,
            label: {
              text: 'Patient count (n)',
              position: 'outer-middle'
            }
  				}
  			},
  			point: {
  				show: false
  			},
  			size: {
  				height: null
  			}/*,
  			 grid: {
  			 x: {
  			 lines: [{value: data[0][60], text: 'Action plan downloaded'}, {value: data[0][330], text: 'Action plan downloaded'}]
  			 }
  			 }*/
  		});
    },1);
	};

	var showDiagnosisPanel = function(location, enableHover) {
		createPanel(diagnosisPanel, location, {pathway: local.pathwayNames[local.pathwayId],title: local.data[local.pathwayId].diagnosis.title});

		setTimeout(function(){
      c3.generate({
  			bindto: '#diagnosis-chart',
  			data: {
  				columns: [
  					['Patients', 30, 200, 100, 400, 150]
  				],
  				type: 'bar',
          labels: true,
          color: function (color, d) {
            return local.colors[d.index];
          }
  			},
        tooltip: {
          format: {
            title: function (x) { return (enableHover ? 'Click for more detail' : ''); }/*,
            value: function (value) { return  enableHover ? undefined : value;}*/
          }
        },
        legend:{
          show: false
        },
  			bar: {
  				width: {
  					ratio: 0.5 // this makes bar width 50% of length between ticks
  				}
  				// or
  				//width: 100 // this makes bar width 100px
  			},
  			axis: {
  				x: {
  					type: 'category',
  					categories: ['HTN', 'CKD', 'DM', 'Protein', 'McrA'],
            label: {
              text: 'Disease',
              position: 'outer-center'
            }
  				},
          y : {
            label: {
              text: 'Patient count (n)',
              position: 'outer-middle'
            }
          }
  			}
  		});
    },1);
	};

	var showExclusionsPanel = function(location, enableHover) {
		createPanel(exclusionPanel, location, {pathway: local.pathwayNames[local.pathwayId],title: local.data[local.pathwayId].exclusions.title});

    setTimeout(function(){
  		c3.generate({
  			bindto: '#exclusion-chart',
  			data: {
  				columns: [
  					['Patients', 122, 78]
  				],
  				type: 'bar',
          labels: true,
          color: function (color, d) {
            return local.colors[d.index];
          }
  			},
        tooltip: {
          format: {
            title: function (x) { return (enableHover ? 'Click for more detail' : ''); }/*,
            value: function (value) { return  enableHover ? undefined : value;}*/
          }
        },
        legend: {
          show: false
        },
  			bar: {
  				width: {
  					ratio: 0.5 // this makes bar width 50% of length between ticks
  				}
  				// or
  				//width: 100 // this makes bar width 100px
  			},
  			axis: {
  				x: {
  					type: 'category',
  					categories: ['Reasons we think', 'Exclusion code'],
            label: {
              text: 'Reason for exclusion',
              position: 'outer-center'
            }
  				},
          y : {
            label: {
              text: 'Patient count (n)',
              position: 'outer-middle'
            }
          }
  			}
  		});
    }, 1);
	};

  var showPatientDropdownPanel = function(location){
    createPanel($('#patient-dropdown-panel'),location, {"patients" : Object.keys(local.data.patients)});
  };

  var showPatientPanel = function(location) {
		createPanel(patientsPanelTemplate,location);

		patientsPanel = $('#patients');

		patientsPanel.on('click', 'thead tr th.sortable', function(){	//Sort columns when column header clicked
			var sortAsc = !$(this).hasClass('sort-asc');
			if(sortAsc) {
				$(this).removeClass('sort-desc').addClass('sort-asc');
			} else {
				$(this).removeClass('sort-asc').addClass('sort-desc');
			}
			populatePatientPanel(local.pathwayId, local.selected, local.subselected, $(this).index(), sortAsc);
		}).on('click', 'tbody tr', function(e){	//Select individual patient when row clicked
			$('.list-item').removeClass('highlighted');
			$(this).addClass('highlighted');

		//	var nhsNumber = $(this).find('td button').attr('data-clipboard-text');
      var patientId = $(this).find('td button').attr('data-patient-id');

      showPathwayStagePatientView(patientId);

			e.preventDefault();
		}).on('click', 'tbody tr button', function(e){
			//don't want row selected if just button pressed?
			e.preventDefault();
			e.stopPropagation();
		});

    var c = patientsPanel.getNiceScroll();
    if(c && c.length>0){
      c.resize();
    } else {
      patientsPanel.niceScroll({
  			cursoropacitymin: 0.3,
  			cursorwidth: "7px",
  			horizrailenabled: false
  		});
    }
	};

	var showBreakdownPanel = function (pathwayStage, location){
		local.selected = pathwayStage;
    local.subselected = null;

		createPanel(breakdownPanel, location,{"pathwayStage" : pathwayStage, "header": local.data[local.pathwayId][pathwayStage] ? local.data[local.pathwayId][pathwayStage].header : ""});

		breakdownTable = $('#breakdown-table');

		location.off('click','.panel-body');
		location.on('click', '.panel-body', function(){
			if(!local.chartClicked){
        /*jshint unused: true*/
				$('path.c3-arc').attr('class', function(index, classNames) {
					return classNames.replace(/_unselected_/g, '');
				});
        /*jshint unused: false*/

				if(local.charts['breakdown-chart']) local.charts['breakdown-chart'].unselect();

        populatePatientPanel(local.pathwayId, pathwayStage, null);
        local.subselected = null;
				//hideAllPanels();
			}
			local.chartClicked=false;
		});

		breakdownTable.on('mouseout', 'tr', function(){
			if($(this).find('th').length>0) return; //ignore header row
			local.charts['breakdown-chart'].focus();
		}).on('mouseover', 'tr', function(){
			if($(this).find('th').length>0) return; //ignore header row
			local.charts['breakdown-chart'].focus($(this).data('subsection'));
		}).on('click', 'tr', function(){
			if($(this).find('th').length>0) return; //ignore header row
			var subselected = $(this).data('subsection');
			selectPieSlice('breakdown-chart', subselected);
			populatePatientPanel(local.pathwayId, pathwayStage, subselected);
			//populateSuggestedActionsPanel(subselected);
			local.subselected = subselected;
			breakdownTable.find('tr').removeClass('selected');
			$(this).addClass('selected');
		});

		destroyCharts(['breakdown-chart']);

    setTimeout(function(){
  		local.charts['breakdown-chart'] = c3.generate({
  			bindto: '#breakdown-chart',
  			tooltip: {
  				format: {
            name: function (name) { return name + ':<br>' +local.data[local.pathwayId][local.selected].bdown[name].desc; },
  					value: function (value, ratio) { //function(value, ratio, id, index) {
  						return value + ' (' + (ratio * 100).toFixed(2) + '%)';
  					}
  				}
  			},
  			data: {
  				columns: local.data[local.pathwayId][pathwayStage].breakdown,
  				type: 'pie',
  				selection: { enabled: true },
  				order: null,
  				onclick: function (d) {
  					selectPieSlice('breakdown-chart', d.id);
  					populatePatientPanel(local.pathwayId, pathwayStage, d.id);
  					//populateSuggestedActionsPanel(d.id);
  					breakdownTable.find('tr').removeClass('selected');
  					breakdownTable.find('tr[data-subsection="' + local.data[local.pathwayId][pathwayStage].bdown[d.id].name + '"]').addClass('selected');
  					local.subselected = d.id;
  				},
  				onmouseover: function(d){
  					breakdownTable.find('tr').removeClass('tr-hovered');
  					breakdownTable.find('tr[data-subsection="' + local.data[local.pathwayId][pathwayStage].bdown[d.id].name + '"]').addClass('tr-hovered');
  				},
  				onmouseout: function (){
  					breakdownTable.find('tr').removeClass('tr-hovered');
  				}
  			},
  			pie: {
  				label: {
            show: false
            /*jshint unused: true*/
  					/*format: function (value, ratio, id) {
  						return id;// + ' ('+value+')';
  					}*/
            /*jshint unused: false*/
  				}
  			},
  			legend: {
  				show: false
  			}
  		});
    },1);

		populateBreakdownTable(pathwayStage);
	};

  var showTeamActionPlanPanel = function(location){
    createPanel($('#team-action-plan-panel'),location);

		suggestedPlanTeam = $('#suggestedPlanTeam');

		suggestedPlanTeam.on('click', '.cr-styled input[type=checkbox]', function(){
			var idx = suggestedPlanTeam.find('.cr-styled input[type=checkbox]').index(this);
			var current = getObj();
			while(current[local.pathwayId].actions.team.done.length<=idx){
				current[local.pathwayId].actions.team.done.push(false);
			}
			current[local.pathwayId].actions.team.done[idx]=this.checked;
			setObj(current);

      if(this.checked) {
        recordEvent("Item completed", local.pathwayId);
      }

			updateTeamSapRows();
		});

    $('#personalPlanTeam').on('click', 'input[type=checkbox]', function(){
			var idx = $(this).closest('tr').prevAll().length;
      var obj = getObj();
      obj[local.pathwayId].plans.team[idx].done = this.checked;
      setObj(obj);

      if(this.checked){
        $(this).parent().parent().parent().addClass('success');
        recordEvent("Personal plan item", pathwayStage);
      } else {
        $(this).parent().parent().parent().removeClass('success');
      }
      //displayPersonalisedActionPlan(pathwayStage, $('#personalPlanTeam'), true);
		});

    var teamTab = $('#tab-plan-team'), idx, current;
		teamTab.on('click', '.edit-plan', function(){
      idx = $(this).closest('tr').prevAll().length;

      $('#editActionPlanItem').val($($(this).closest('tr').children('td')[0]).find('span').text());

      $('#editPlan').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        displayPersonalisedTeamActionPlan($('#personalPlanTeam'));
      }).off('shown.bs.modal').on('shown.bs.modal', function () {
        $('#editActionPlanItem').focus();
      }).off('click','.save-plan').on('click', '.save-plan',function(){
        var obj = getObj();
        if(!obj[local.pathwayId].plans.team[pathwayStage]) obj[local.pathwayId].plans.team[pathwayStage] = [];
  			obj[local.pathwayId].plans.team[pathwayStage][idx].text = $('#editActionPlanItem').val();
  			setObj(obj);

        $('#editPlan').modal('hide');
      }).off('keyup','#editActionPlanItem').on('keyup', '#editActionPlanItem',function(e){
        if(e.which === 13) $('#editPlan .save-plan').click();
      }).modal();
		}).on('click', '.delete-plan', function(){
      idx = $(this).closest('tr').prevAll().length;

      $('#deletePlan').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        displayPersonalisedTeamActionPlan($('#personalPlanTeam'));
      }).off('click','.delete-plan').on('click', '.delete-plan',function(){
        var obj = getObj();
        if(!obj[local.pathwayId].plans.team[pathwayStage]) obj[local.pathwayId].plans.team[pathwayStage] = [];
  			obj[local.pathwayId].plans.team[pathwayStage].splice(idx,1);
  			setObj(obj);

        $('#deletePlan').modal('hide');
      }).modal();
		}).on('click', '.add-plan', function(){
			var obj = getObj();
      if(!obj[local.pathwayId].plans.team[pathwayStage]) obj[local.pathwayId].plans.team[pathwayStage] = [];
			obj[local.pathwayId].plans.team[pathwayStage].push({"text" : $(this).parent().parent().find('textarea').val(), "done": false});
			setObj(obj);

			displayPersonalisedTeamActionPlan($('#personalPlanTeam'));
		}).on('change', '.btn-toggle input[type=checkbox]', function(){
      updateTeamSapRows();
    }).on('click', '.btn-yes,.btn-no', function(){
      var checkbox = $(this).find("input[type=checkbox]");
      if($(this).hasClass("active")){
        //unselecting
  			idx = Math.floor(suggestedPlanTeam.find('.btn-toggle input[type=checkbox]').index(checkbox)/2);
  			current = getObj();
  			while(current[local.pathwayId].actions.team.agree.length<=idx){
  				current[local.pathwayId].actions.team.agree.push("");
  			}
  			current[local.pathwayId].actions.team.agree[idx]="";
  			setObj(current);

      } else {
        //unselect other
        var other = $(this).parent().find($(this).hasClass("btn-yes") ? ".btn-no" : ".btn-yes");
        other.removeClass("active");
        other.find("input[type=checkbox]").prop("checked", false);

        //selecting
        if(checkbox.val()==="no") launchTeamModal(local.selected, checkbox.closest('tr').children().first().children().first().text());
  			idx = Math.floor(suggestedPlanTeam.find('.btn-toggle input[type=checkbox]').index(checkbox)/2);
  			current = getObj();
  			while(current[local.pathwayId].actions.team.agree.length<=idx){
  				current[local.pathwayId].actions.team.agree.push("");
  			}
  			current[local.pathwayId].actions.team.agree[idx]=checkbox.val()==="yes";
  			setObj(current);
      }
		}).on('keyup', 'input[type=text]', function(e){
      if(e.which === 13) {
        teamTab.find('.add-plan').click();
      }
    });
  };

	var showIndividualActionPlanPanel = function(location, pathwayStage) {
		createPanel($('#individual-action-plan-panel'),location,{"pathwayStage" : pathwayStage || "default"});

		adviceList = $('#advice-list');
		/*patientInfo = $('#patient-info');
		teamTab = $('#tab-plan-team');*/
		individualTab = $('#tab-plan-individual');

		adviceList.on('click', '.cr-styled input[type=checkbox]', function(){
			var idx = adviceList.find('.cr-styled input[type=checkbox]').index(this);
			var current = getObj();
			if(!current[local.pathwayId].actions[local.patientId]) current[local.pathwayId].actions[local.patientId] = {"agree":[],"done":[]};
			while(current[local.pathwayId].actions[local.patientId].done.length<=idx){
				current[local.pathwayId].actions[local.patientId].done.push(false);
			}
			current[local.pathwayId].actions[local.patientId].done[idx]=this.checked;
			setObj(current);

      if(this.checked) {
        recordEvent("Item completed", local.patientId);
      }

			updateIndividualSapRows();
		});

    $('#personalPlanIndividual').on('click', 'input[type=checkbox]', function(){
			var idx = $(this).closest('tr').prevAll().length;
      var obj = getObj();
      if(!obj[local.pathwayId].plans.individual[local.patientId]) obj[local.pathwayId].plans.individual[local.patientId] = [];
      obj[local.pathwayId].plans.individual[local.patientId][idx].done = this.checked;
      setObj(obj);

      if(this.checked){
        $(this).parent().parent().parent().addClass('success');
        recordEvent("Personal plan item", local.patientId);
      } else {
        $(this).parent().parent().parent().removeClass('success');
      }
      //displayPersonalisedActionPlan(pathwayStage, $('#personalPlanTeam'), true);
		});

		individualTab.on('click', '.edit-plan', function(){
      var idx = $(this).closest('tr').prevAll().length;

      $('#editActionPlanItem').val($($(this).closest('tr').children('td')[0]).find('span').text());

      $('#editPlan').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        displayPersonalisedIndividualActionPlan(local.patientId, $('#personalPlanIndividual'));
      }).off('shown.bs.modal').on('shown.bs.modal', function () {
        $('#editActionPlanItem').focus();
      }).off('click','.save-plan').on('click', '.save-plan',function(){
        var obj = getObj();
        if(!obj[local.pathwayId].plans.individual[local.patientId]) obj[local.pathwayId].plans.individual[local.patientId] = [];
  			obj[local.pathwayId].plans.individual[local.patientId][idx].text = $('#editActionPlanItem').val();
  			setObj(obj);

        $('#editPlan').modal('hide');
      }).off('keyup','#editActionPlanItem').on('keyup', '#editActionPlanItem',function(e){
        if(e.which === 13) $('#editPlan .save-plan').click();
      }).modal();
		}).on('click', '.delete-plan', function(){
      var idx = $(this).closest('tr').prevAll().length;

      $('#deletePlan').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        displayPersonalisedIndividualActionPlan(local.patientId, $('#personalPlanIndividual'));
      }).off('click','.delete-plan').on('click', '.delete-plan',function(){
        var obj = getObj();
        if(!obj[local.pathwayId].plans.individual[local.patientId]) obj[local.pathwayId].plans.individual[local.patientId] = [];
  			obj[local.pathwayId].plans.individual[local.patientId].splice(idx,1);
  			setObj(obj);

        $('#deletePlan').modal('hide');
      }).modal();
		}).on('click', '.add-plan', function(){
			var obj = getObj();
      if(!obj[local.pathwayId].plans.individual[local.patientId]) obj[local.pathwayId].plans.individual[local.patientId] = [];
			obj[local.pathwayId].plans.individual[local.patientId].push({"text": $(this).parent().parent().find('textarea').val(), "done": false});
			setObj(obj);

			displayPersonalisedIndividualActionPlan(local.patientId, $('#personalPlanIndividual'));
		}).on('change', '#individual-suggested-actions-table .btn-toggle input[type=checkbox]', function(){
      updateIndividualSapRows();
    }).on('click', '#individual-suggested-actions-table .btn-yes,#individual-suggested-actions-table .btn-no', function(){
      var checkbox = $(this).find("input[type=checkbox]");
      if($(this).hasClass("active")){
        //unselecting
  			var idx = Math.floor(adviceList.find('#individual-suggested-actions-table .btn-toggle input[type=checkbox]').index(checkbox)/2);
  			var current = getObj();
  			if(!current[local.pathwayId].actions[local.patientId]) current[local.pathwayId].actions[local.patientId] = {"agree":[],"done":[]};
  			while(current[local.pathwayId].actions[local.patientId].agree.length<=idx){
  				current[local.pathwayId].actions[local.patientId].agree.push("");
  			}
  			current[local.pathwayId].actions[local.patientId].agree[idx]="";
  			setObj(current);

      } else {
        //unselect other
        var other = $(this).parent().find($(this).hasClass("btn-yes") ? ".btn-no" : ".btn-yes");
        other.removeClass("active");
        other.find("input[type=checkbox]").prop("checked", false);

        //selecting
        if(checkbox.val()==="no") launchPatientActionModal(local.patientId, $(this).closest('tr').children().first().children().first().text());
  			var idx = Math.floor(adviceList.find('#individual-suggested-actions-table .btn-toggle input[type=checkbox]').index(checkbox)/2);
  			var current = getObj();
  			if(!current[local.pathwayId].actions[local.patientId]) current[local.pathwayId].actions[local.patientId] = {"agree":[],"done":[]};
  			while(current[local.pathwayId].actions[local.patientId].agree.length<=idx){
  				current[local.pathwayId].actions[local.patientId].agree.push("");
  			}
  			current[local.pathwayId].actions[local.patientId].agree[idx]=checkbox.val()==="yes";
  			setObj(current);
      }
		}).on('keyup', 'input[type=text]', function(e){
      if(e.which === 13) {
        individualTab.find('.add-plan').click();
      }
    });

    individualTab.on('change', '#individual-panel-classification .btn-toggle input[type=checkbox]', function(){
      updateIndividualSapRows();
    }).on('click', '#individual-panel-classification .btn-yes,#individual-panel-classification .btn-no', function(){
      var checkbox = $(this).find("input[type=checkbox]");
      var isClassification = $(this).closest('.panel').children().index($(this).closest('table'))===1;

      if($(this).hasClass("active")){
        //unselecting
  			var current = getObj();
  			if(!current[local.pathwayId].actions[local.patientId]) current[local.pathwayId].actions[local.patientId] = {"agree":[],"done":[]};

        if(isClassification){
          current[local.pathwayId].actions[local.patientId].classification = "";
        } else {
          current[local.pathwayId].actions[local.patientId].standard = "";
        }
  			setObj(current);
      } else {
        //unselect other
        var other = $(this).parent().find($(this).hasClass("btn-yes") ? ".btn-no" : ".btn-yes");
        other.removeClass("active");
        other.find("input[type=checkbox]").prop("checked", false);

        //selecting
        if(checkbox.val()==="no") launchPatientModal(local.patientId, $(this).closest('tr').children(':first').text(), !isClassification);

  			var current = getObj();
  			if(!current[local.pathwayId].actions[local.patientId]) current[local.pathwayId].actions[local.patientId] = {"agree":[],"done":[]};
        if(isClassification){
          current[local.pathwayId].actions[local.patientId].classification = checkbox.val()==="yes";
        } else {
          current[local.pathwayId].actions[local.patientId].standard = checkbox.val()==="yes";
        }
  			setObj(current);
      }
		});
	};

  var showTestTrendPanel = function(location){
    createPanel(valueTrendPanel, location, {"pathway": local.monitored[local.pathwayId], "pathwayStage" : local.selected});
  };

  var showMedicationPanel = function(location){
    var medications = [];
    createPanel(medicationPanel, location, {"areMedications" : medications.length>0, "medications": medications, "pathwayStage" : local.selected},{"medicationRow":$('#medication-row').html()});
  };

	var selectPanel = function(pathwayStage) {
		//move to top left..
		showPanel(pathwayStage, topLeftPanel, false);
    topLeftPanel.children('div').removeClass('panel-default');

		switchToThreePanelLayout();

		addActionPlanPanel(bottomLeftPanel, pathwayStage);
    populateSuggestedActionsPanel(pathwayStage);

		updateBreadcrumbs([local.pathwayId, pathwayStage]);

    //update patient panel
    patientsPanel.parent().parent().removeClass('panel-default').addClass('panel-' + pathwayStage);

    populatePatientPanel(local.pathwayId, pathwayStage, null);
	};

  var populatePatientPanelSimple = function(){
    var pList=[], i,k, prop;
    for(k=0; k < local.diseases.length; k++){
      for(i in local.categories){
        for(prop in local.data[local.diseases[k].id][i].bdown){
          if(local.data[local.diseases[k].id][i].bdown.hasOwnProperty(prop)){
            pList = pList.concat(local.data[local.diseases[k].id][i].bdown[prop].patients);
          }
        }
      }
    }
    var patients = pList.map(function(patientId) {
			var ret = local.data.patients[patientId];
			ret.nhsNumber = local.patLookup ? local.patLookup[patientId] : patientId;
      ret.patientId = patientId;
			return ret;
		});

		createPanel(patientList, patientsPanel, {"patients": patients});

		$('#patients-placeholder').hide();

		setupClipboard($('.btn-copy'), true);

    $('[data-toggle="tooltip"]').tooltip();
  };

	var populatePatientPanel = function (pathwayId, pathwayStage, subsection, sortField, sortAsc) {
    var pList=[], i,k, prop;
    if(pathwayId && pathwayStage && subsection) {
      pList = local.data[pathwayId][pathwayStage].bdown[subsection].patients;
    } else if(pathwayId && pathwayStage){
      for(prop in local.data[pathwayId][pathwayStage].bdown){
        if(local.data[pathwayId][pathwayStage].bdown.hasOwnProperty(prop)){
          pList = pList.concat(local.data[pathwayId][pathwayStage].bdown[prop].patients);
        }
      }
    } else if(pathwayId){
      for(i in local.categories){
        for(prop in local.data[pathwayId][i].bdown){
          if(local.data[pathwayId][i].bdown.hasOwnProperty(prop)){
            pList = pList.concat(local.data[pathwayId][i].bdown[prop].patients);
          }
        }
      }
    } else {
      for(k=0; k < local.diseases.length; k++){
        for(i in local.categories){
          for(prop in local.data[local.diseases[k].id][i].bdown){
            if(local.data[local.diseases[k].id][i].bdown.hasOwnProperty(prop)){
              pList = pList.concat(local.data[local.diseases[k].id][i].bdown[prop].patients);
            }
          }
        }
      }
    }

		var patients = pList.map(function(patientId) {
			var ret = local.data.patients[patientId];
			ret.nhsNumber = local.patLookup ? local.patLookup[patientId] : patientId;
      ret.patientId = patientId;
      ret.items = []; //The fields in the patient list table
			if(ret.bp) {
        if(pathwayStage === local.categories.monitoring.name){
          ret.items.push(ret.bp[0][ret.bp[0].length-1]); //Last BP date
        }
        else{
          ret.items.push(ret.bp[1][ret.bp[1].length-1]); //Last SBP
        }
			} else {
        ret.items.push("?");
			}
			return ret;
		});

		var data = {"patients": patients, "header-items" : [{"title" : "NHS no.", "isSorted":false, "direction":"sort-asc"}]};

    if(pathwayStage === local.categories.monitoring.name){
      data["header-items"].push({"title" : "Last BP Date", "isSorted":true, "direction":"sort-asc"});
    }
    else{
      data["header-items"].push({"title" : "Last SBP", "isSorted":true, "direction":"sort-asc"});
    }

    if(sortField === undefined) sortField = 1;
		if(sortField !== undefined) {
			data.patients.sort(function(a, b){
        if(sortField===0) { //NHS number
          if(a.nhsNumber === b.nhsNumber) {
  					return 0;
  				}

  				if(a.nhsNumber > b.nhsNumber) {
  					return sortAsc ? 1 : -1;
  				} else if (a.nhsNumber< b.nhsNumber) {
  					return sortAsc ? -1 : 1;
  				}
        } else {
        	if(a.items[sortField-1] === b.items[sortField-1]) {
  					return 0;
  				}

  				if(a.items[sortField-1] == "?") return 1;
  				if(b.items[sortField-1] == "?") return -1;

  				if(a.items[sortField-1] > b.items[sortField-1]) {
  					return sortAsc ? 1 : -1;
  				} else if (a.items[sortField-1] < b.items[sortField-1]) {
  					return sortAsc ? -1 : 1;
  				}
        }
			});

      for(var i = 0; i < data["header-items"].length; i++) {
        if(i === sortField){
          data["header-items"][i].direction = sortAsc ? "sort-asc" : "sort-desc";
          data["header-items"][i].isAsc = sortAsc;
          data["header-items"][i].isSorted = true;
        } else {
          data["header-items"][i].isSorted = false;
        }
      }
			//data.direction = sortAsc ? "sort-asc" : "sort-desc";
			//data.isSorted = sortAsc;
		}

		createPanel(patientList, patientsPanel, data, {"header-item" : $("#patient-list-header-item").html(), "item" : $('#patient-list-item').html()});

		$('#patients-placeholder').hide();

		setupClipboard($('.btn-copy'), true);

    $('[data-toggle="tooltip"]').tooltip();
	};

  var populateTeamSuggestedActionsPanel = function (){
		if(!local.data[local.pathwayId].index){
			local.data[local.pathwayId].index = function(){
				return ++window.INDEX||(window.INDEX=0);
			};
			local.data[local.pathwayId].lastIndex = function(){
				return window.INDEX;
			};
			local.data[local.pathwayId].resetIndex = function(){
				window.INDEX=null;
			};
		}

		createPanel(suggestedPlanTemplate, suggestedPlanTeam, local.data[local.pathwayId], {"item" : $('#suggested-plan-item').html(), "chk" : $('#checkbox-template').html() });

		displayPersonalisedTeamActionPlan($('#personalPlanTeam'));

		updateTeamCheckboxes();
	};

	var populateSuggestedActionsPanel = function (pathwayStage){
		if(pathwayStage === local.categories.exclusions.name){
			suggestedPlanTeam.html('No team actions for excluded patients');
		} else if(pathwayStage === local.categories.diagnosis.name){
			suggestedPlanTeam.html('No team actions for these patients');
		} else {
			if(!local.data[local.pathwayId][pathwayStage].index){
				local.data[local.pathwayId][pathwayStage].index = function(){
					return ++window.INDEX||(window.INDEX=0);
				};
				local.data[local.pathwayId][pathwayStage].lastIndex = function(){
					return window.INDEX;
				};
				local.data[local.pathwayId][pathwayStage].resetIndex = function(){
					window.INDEX=null;
				};
			}

			createPanel(suggestedPlanTemplate, suggestedPlanTeam, local.data[local.pathwayId][pathwayStage], {"item" : $('#suggested-plan-item').html(), "chk" : $('#checkbox-template').html() });

			displayPersonalisedIndividualActionPlan(pathwayStage, $('#personalPlanTeam'));

			updateIndividualCheckboxes(pathwayStage);
		}
	};

	var populateBreakdownTable = function(id){
		var data = local.data[local.pathwayId][id.toLowerCase()];
		for(var i = 0 ; i< data.items.length; i++){
			data.items[i].color = local.colors[i];// local.charts['breakdown-chart'].color(data.items[i].name);
		}
		createPanel(breakdownTableTemplate, breakdownTable, data);
	};

	var highlightOnHoverAndEnableSelectByClick = function(panelSelector) {
		panelSelector.children('div').removeClass('unclickable').on('mouseover',function(){
			$(this).removeClass('panel-default');
		}).on('mouseout',function(){
      $(this).addClass('panel-default');
    }).on('click', function(){
        // keep the link in the browser history
        history.pushState(null, null, '#'+$(this).data('stage'));
        loadContent('#'+$(this).data('stage'), true);
        // do not give a default action
        return false;
		});
	};

	/********************************
	* Charts - draw
	********************************/

	var drawBpTrendChart = function(patientId){
		destroyCharts(['chart-demo-trend']);
		if(!local.data.patients || !local.data.patients[patientId] || !local.data.patients[patientId].bp) return;

		var chartOptions = {
			bindto: '#chart-demo-trend',
			data: {
				x: 'x',
				columns: local.data.patients[patientId].bp
			},
			axis: {
				x: {
					type: 'timeseries',
					tick: {
  					format: '%Y-%m-%d',
  					count: 7,
  					culling: {
  						max: 3
  					}
					},
          max: new Date()
				}
			}
		};

    var lines = null;
		if(local.data.patients[patientId].contacts){
			lines = local.data.patients[patientId].contacts.slice();
		} //"contacts": [{"value": "2012-09-01", "text": "F2F"}, {"value": "2013-03-03", "text": "F2F"}]

    var obj = getObj();
    if(obj[local.pathwayId].events && obj[local.pathwayId].events[patientId] && obj[local.pathwayId].events[patientId].length>0){
      if(!lines) lines = [];
      for(var i = 0; i < obj[local.pathwayId].events[patientId].length; i++){
        lines.push({"value": obj[local.pathwayId].events[patientId][i].date.substr(0,10), "text": obj[local.pathwayId].events[patientId][i].name});
      }
    }

    if(lines){
      chartOptions.grid = {
				x: {
					lines: lines
				}
			};
    }

    //draw charts in separate thread and with delay to stop sluggish appearance
    setTimeout(function(){
      local.charts['chart-demo-trend'] = c3.generate(chartOptions);
    }, 1);
	};

	var selectPieSlice = function (chart, id){
		local.chartClicked=true;
    /*jshint unused: true*/
		$('#' + chart + ' path.c3-arc').attr('class', function(index, classNames) {
			return classNames + ' _unselected_';
		});
    /*jshint unused: false*/
		local.charts[chart].unselect();
		local.charts[chart].select(id);
	};

	var destroyCharts = function(charts){
		for(var i = 0 ; i<charts.length; i++){
			if(local.charts[charts[i]]) {
				local.charts[charts[i]].destroy();
				delete local.charts[charts[i]];
			}
		}
	};


	var showOverview = function(){

		switchTo221Layout();

		hideAllPanels();

		updateBreadcrumbs([local.pathwayId]);

		showPanel(local.categories.diagnosis.name, topLeftPanel, true);
		showPanel(local.categories.monitoring.name, topRightPanel, true);
		showPanel(local.categories.treatment.name, bottomLeftPanel, true);
		showPanel(local.categories.exclusions.name, bottomRightPanel, true);

    $('[data-toggle="tooltip"]').tooltip();
	};

  var updateTeamCheckboxes = function(){
    var current = getObj();
		var wireUpRadioButtons = function(i) {
			i = Math.floor(i/2);
			if(current[local.pathwayId].actions.team.agree.length>i){
				if(current[local.pathwayId].actions.team.agree[i]===true && this.value==="yes"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				} else if(current[local.pathwayId].actions.team.agree[i]===false && this.value==="no"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				}
			}
		};

		var wireUpCheckboxes =function(i){
			if(current[local.pathwayId].actions.team.done.length>i && current[local.pathwayId].actions.team.done[i]){
				$(this).prop('checked', true);
			}
		};

		suggestedPlanTeam.find('.cr-styled input[type=checkbox]').each(wireUpCheckboxes);

		suggestedPlanTeam.find('.btn-toggle input[type=checkbox]').each(wireUpRadioButtons);

		updateTeamSapRows();
  };

	var updateIndividualCheckboxes = function(id){
		var current = getObj();
		var wireUpRadioButtons = function(i) {
			i = Math.floor(i/2);
			if(current[local.pathwayId].actions && current[local.pathwayId].actions[id] && current[local.pathwayId].actions[id].agree.length>i){
				if(current[local.pathwayId].actions[id].agree[i]===true && this.value==="yes"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				} else if(current[local.pathwayId].actions[id].agree[i]===false && this.value==="no"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				}
			}
		};

		var wireUpRadioButtons2 = function() {
			if(current[local.pathwayId].actions && current[local.pathwayId].actions[id] && current[local.pathwayId].actions[id].classification !== undefined && current[local.pathwayId].actions[id].classification !== ""){
				if(current[local.pathwayId].actions[id].classification && this.value==="yes"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				} else if(!current[local.pathwayId].actions[id].classification && this.value==="no"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				}
			}
		};

		var wireUpRadioButtons3 = function() {
			if(current[local.pathwayId].actions && current[local.pathwayId].actions[id] && current[local.pathwayId].actions[id].standard !== undefined && current[local.pathwayId].actions[id].standard !== ""){
				if(current[local.pathwayId].actions[id].standard && this.value==="yes"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				} else if(!current[local.pathwayId].actions[id].standard && this.value==="no"){
					$(this).prop('checked', true);
					$(this).parent().addClass('active');
				}
			}
		};

		var wireUpCheckboxes =function(i){
			if(current[local.pathwayId].actions && current[local.pathwayId].actions[id] && current[local.pathwayId].actions[id].done.length>i && current[local.pathwayId].actions[id].done[i]){
				$(this).prop('checked', true);
			}
		};

		adviceList.find('.cr-styled input[type=checkbox]').each(wireUpCheckboxes);

		adviceList.find('#individual-suggested-actions-table .btn-toggle input[type=checkbox]').each(wireUpRadioButtons);

    adviceList.find('#individual-panel-classification table:first .btn-toggle input[type=checkbox]').each(wireUpRadioButtons2);
    adviceList.find('#individual-panel-classification table:last .btn-toggle input[type=checkbox]').each(wireUpRadioButtons3);

    updateIndividualSapRows();
	};

  var updateTeamSapRows = function(){
    suggestedPlanTeam.find('.suggestion').each(function(){
			$(this).find('td').last().children().hide();
		});
    var anyTeam = false;

    suggestedPlanTeam.find('.cr-styled input[type=checkbox]').each(function(){
      if(this.checked){
        $(this).parent().parent().parent().addClass('success');
      } else {
        $(this).parent().parent().parent().removeClass('success');
      }
    });

    suggestedPlanTeam.find('tr').each(function(){
      var self = $(this);
      var any = false;
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
        any = true;
  			if(this.value==="yes"){
  				self.removeClass('danger');
  				self.addClass('active');
  				self.find('td').last().children().show();
          anyTeam = true;
  			} else {
  				self.removeClass('active');
  				self.addClass('danger');
  			}
      });
      if(!any){
        self.removeClass('danger');
        self.removeClass('active');
        self.removeClass('success');
      }
		});

    suggestedPlanTeam.find('table thead tr th').last().html( anyTeam ? 'Completed' : '');
  };

  var updateIndividualSapRows = function(){
    adviceList.find('.suggestion').each(function(){
			$(this).find('td').last().children().hide();
		});
    var anyIndividual = false;

    adviceList.find('.cr-styled input[type=checkbox]').each(function(){
      if(this.checked){
        $(this).parent().parent().parent().addClass('success');
      } else {
        $(this).parent().parent().parent().removeClass('success');
      }
    });

    adviceList.find('#individual-suggested-actions-table tr').each(function(){
      var self = $(this);
      var any = false;
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
        any = true;
  			if(this.value==="yes"){
  				self.removeClass('danger');
  				self.addClass('active');
  				self.find('td').last().children().show();
          anyIndividual = true;
  			} else {
  				self.removeClass('active');
  				self.addClass('danger');
  			}
      });
      if(!any){
        self.removeClass('danger');
        self.removeClass('active');
        self.removeClass('success');
      }
		});

    $('#individual-panel-classification table').removeClass('panel-green').removeClass('panel-red');
    $('#individual-panel-classification').find('tr').each(function(){
      var self = $(this);
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
  			if(this.value==="yes"){
          $(this).closest('table').addClass('panel-green');
  			} else {
  				$(this).closest('table').addClass('panel-red');
  			}
      });
    });
    adviceList.find('table thead tr th').last().html( anyIndividual ? 'Completed' : '');
  };

	var updateSapRows = function(){
		suggestedPlanTeam.find('.suggestion').add(adviceList.find('.suggestion')).each(function(){
			$(this).find('td').last().children().hide();
		});

    var anyTeam = false;
    var anyIndividual = false;


    suggestedPlanTeam.add(adviceList).find('.cr-styled input[type=checkbox]').each(function(){
      if(this.checked){
        $(this).parent().parent().parent().addClass('success');
      } else {
        $(this).parent().parent().parent().removeClass('success');
      }
    });

    suggestedPlanTeam.find('tr').each(function(){
      var self = $(this);
      var any = false;
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
        any = true;
  			if(this.value==="yes"){
  				self.removeClass('danger');
  				self.addClass('active');
  				self.find('td').last().children().show();
          anyTeam = true;
  			} else {
  				self.removeClass('active');
  				self.addClass('danger');
  			}
      });
      if(!any){
        self.removeClass('danger');
        self.removeClass('active');
        self.removeClass('success');
      }
		});

    adviceList.find('#individual-suggested-actions-table tr').each(function(){
      var self = $(this);
      var any = false;
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
        any = true;
  			if(this.value==="yes"){
  				self.removeClass('danger');
  				self.addClass('active');
  				self.find('td').last().children().show();
          anyIndividual = true;
  			} else {
  				self.removeClass('active');
  				self.addClass('danger');
  			}
      });
      if(!any){
        self.removeClass('danger');
        self.removeClass('active');
        self.removeClass('success');
      }
		});

    $('#individual-panel-classification table').removeClass('panel-green').removeClass('panel-red');
    $('#individual-panel-classification').find('tr').each(function(){
      var self = $(this);
      self.find('.btn-toggle input[type=checkbox]:checked').each(function(){
  			if(this.value==="yes"){
          $(this).closest('table').addClass('panel-green');
  			} else {
  				$(this).closest('table').addClass('panel-red');
  			}
      });
    });

    suggestedPlanTeam.find('table thead tr th').last().html( anyTeam ? 'Completed' : '');
    adviceList.find('table thead tr th').last().html( anyIndividual ? 'Completed' : '');
	};

	var populateIndividualSuggestedActions = function (patientId) {
		var data = {"nhsNumber" : local.patLookup ? local.patLookup[patientId] : patientId, "patientId" : patientId};
    var pathwayStage = local.selected;

		if (local.selected && local.selected === local.categories.exclusions.name && local.subselected){
			if(local.subselected!="Exclusion code") {
			  data.isReadCode = true;
			}
		}

    var subsection = local.data.patients[patientId].subsection;

    data.suggestions = local.data[local.pathwayId][pathwayStage].bdown[subsection].suggestions;
    data.section = local.data[local.pathwayId][pathwayStage].bdown[subsection].name;
    data.category = local.data.patients[patientId].category;

		if(!data.index){
			data.index = function(){
				return ++window.INDEX||(window.INDEX=0);
			};
			data.lastIndex = function(){
				return window.INDEX;
			};
			data.resetIndex = function(){
				window.INDEX=null;
			};
		}
		$('#advice-placeholder').hide();
		$('#advice').show();

		createPanel(individualPanel, adviceList, data, {"chk" : $('#checkbox-template').html() });

    //Wire up any clipboard stuff in the suggestions
    adviceList.find('span:contains("[COPY")').each(function(){
      var html = $(this).text();
      $(this).html(html.replace(/\[COPY:([^\]]*)\]/g,'<button type="button" data-clipboard-text="$1" data-content="Copied" title="Copy to clipboard." class="btn btn-xs btn-default btn-copy"><span class="fa fa-clipboard"></span> $1</button>'));
    });

    adviceList.find('span:contains("[MED-SUGGESTION")').each(function(){
      var html = $(this).text();
      var suggestion = Math.random() <0.33 ? "Increase Ramipril to 10mg per day" : (Math.random() < 0.5 ? "Consider adding an ACE inhibior" : "Consider adding a thiazide-like diuretic");
      $(this).html(html.replace(/\[MED\-SUGGESTION\]/g,suggestion));
    });


		setupClipboard( $('.btn-copy'), true );

		updateIndividualCheckboxes(patientId);

		displayPersonalisedIndividualActionPlan(patientId, $('#personalPlanIndividual'));
	};

	var displayPersonalisedTeamActionPlan = function(parentElem) {
		var plans = getObj()[local.pathwayId].plans;

		var plan = "";

		if(plans.team) {
      plan = plans.team;
    }

		createPanel(actionPlanList, parentElem, {"suggestions" : plan}, {"action-plan": $('#action-plan').html(), "action-plan-item": $('#action-plan-item').html(), "chk" : $('#checkbox-template').html() });


	};

	var displayPersonalisedIndividualActionPlan = function(id, parentElem) {
		var plans = getObj()[local.pathwayId].plans;

		var plan = "";

		if(id && plans.individual[id]) {
      plan = plans.individual[id];
		}

		createPanel(actionPlanList, parentElem, {"suggestions" : plan}, {"action-plan": $('#action-plan').html(), "action-plan-item": $('#action-plan-item').html(), "chk" : $('#checkbox-template').html() });


	};

	var displayPersonalisedActionPlan = function(id, parentElem, isTeam) {
		var plans = getObj().plans;

		var plan = "";

		if(isTeam && id) {
			if(plans[local.pathwayId].team[id]) plan = plans[local.pathwayId].team[id];
		} else if(!isTeam && id) {
			if(plans[local.pathwayId].individual[id]) plan = plans[local.pathwayId].individual[id];
		}

		createPanel(actionPlanList, parentElem, {"suggestions" : plan}, {"action-plan": $('#action-plan').html(), "action-plan-item": $('#action-plan-item').html(), "chk" : $('#checkbox-template').html() });


	};

	var displaySelectedPatient = function(id){
		//find patient - throw error if not exists

		var pathwayStage = local.data[local.pathwayId].patients[id].pathwayStage;
		var subsection = local.data[local.pathwayId].patients[id].subsection;
    var nhs = local.patLookup ? local.patLookup[id] : id;


    // keep the link in the browser history
    history.pushState(null, null, '#'+pathwayStage);
    loadContent('#'+pathwayStage, true);

		populatePatientPanel(local.pathwayId, pathwayStage, subsection);
		populateSuggestedActionsPanel(pathwayStage);
		local.subselected = subsection;
		breakdownTable.find('tr').removeClass('selected');
		breakdownTable.find('tr[data-subsection="'+subsection+'"]').addClass('selected');

		setTimeout(function(){ return selectPieSlice('breakdown-chart', subsection);},500);

		$('.list-item').removeClass('highlighted');
		$('.list-item:has(button[data-clipboard-text=' + nhs +'])').addClass('highlighted');

		drawBpTrendChart(id);
    local.patientId = id;

		$('a[href=#tab-plan-individual]').tab('show');

		populateIndividualSuggestedActions(id);
	};

	var showPage = function (page) {
		local.page = page;
		$('.page').hide();
		$('#' + page).show();

		if (page !== 'main-dashboard') {
			hideSidePanel();
      hideHeaderBarItems();
		}
	};

  /********************************
	* Modals
	********************************/

  var launchModal = function(data, label, value){
    var template = $('#modal-why').html();
    Mustache.parse(template);   // optional, speeds up future uses

    var reasonTemplate = $('#modal-why-item').html();
    Mustache.parse(reasonTemplate);

    var rendered = Mustache.render(template, data, {"item" : reasonTemplate});
    $('#modal').html(rendered);

    local.modalSaved = false;

    $('#modal .modal').off('submit','form').on('submit', 'form', {"label" : label}, function(e){
      var obj = getObj();
      if(!e.data.label) e.data.label = "team";
      if(!obj[local.pathwayId].feedback[e.data.label]) obj[local.pathwayId].feedback[label] = [];
      var reason = $('input:radio[name=reason]:checked').val();
      var reasonText = $('#modal textarea').val();
      var item = {"val" : value, "reason" : reason};
      if(reasonText !== "") item.text = reasonText;
      obj[local.pathwayId].feedback[e.data.label].push(item);
      setObj(obj);

      local.modalSaved = true;

      e.preventDefault();
      $('#modal .modal').modal('hide');
    }).modal();

    $('#modal').off('hidden.bs.modal').on('hidden.bs.modal', {"label" : label}, function(e) {
      if(local.modalSaved) {
        local.modalSaved = false;
        $("#thanks-message").toggleClass("in");
        window.setTimeout(function(){
          $("#thanks-message").toggleClass("in");
        }, 2000);
      } else {
        //uncheck as cancelled. - but not if value is empty as this unchecks everything
        if(value !== "") $('tr:contains('+value+')').find(".btn-toggle input[type=checkbox]:checked").click();
      }
    });
  };

  var launchTeamModal = function(label, value){
    launchModal({"header" : "Why?", "placeholder":"Tell us more so we won’t make this error again...", "reasons" : [{"reason":"Already done this","value":"done"},{"reason":"Wouldn't work","value":"nowork"},{"reason":"Something else","value":"else"}]},label, value);
  };

  var launchPatientModal = function(label, value, justtext){
    var reasons = [];
    if(justtext!==true && (local.selected===local.categories.monitoring.name || local.selected===local.categories.treatment.name)) {
      if(local.selected===local.categories.monitoring.name) reasons.push({"reason":"Has actually already been monitored","value":"alreadymonitored"});
      else if(local.selected===local.categories.treatment.name) reasons.push({"reason":"Is actually treated to target","value":"treated"});
      reasons.push({"reason":"Should be excluded – please see the suggested way on how to do this below in the 'suggested actions panel'","value":"shouldexclude"});
      for(var prop in local.data[local.pathwayId][local.selected].bdown) {
        if(local.data[local.pathwayId].patients[local.patientId].subsection !== prop) {
          reasons.push({"reason": "Should be in the '" + prop + "' group", "value": "shouldbe_"+prop.replace(/\s+/g, '')});
        }
      }
      reasons.push({"reason":"Something else","value":"else"});
    }
    launchModal({"header" : "Why?", "placeholder":"Tell us more so we won’t make this error again...", "reasons" : reasons},label, value);
  };

  var launchPatientActionModal = function(label, value){
    launchModal({"header" : "Why?", "placeholder":"Tell us more so we won’t make this error again...", "reasons" : [{"reason":"Already done this","value":"done"},{"reason":"Wouldn't work","value":"nowork"},{"reason":"Something else","value":"else"}]},label, value);
  };

  /*******************
  * Utility functions
  ********************/

	var getObj = function(){
    var obj = JSON.parse(localStorage.bb);
    for(var i = 0 ; i < local.diseases.length; i++){
      if(!obj[local.diseases[i].id]) obj[local.diseases[i].id] = {"feedback":{"team":[]},"plans":{"team":[], "individual":{}},"actions":{"team":{"agree":[],"done":[]}},"events":{"team":[]}};
      setObj(obj);
    }
		return obj;
	};

	var setObj = function(obj){
		localStorage.bb = JSON.stringify(obj);
	};

	var setupClipboard = function(selector, destroy) {
		if(destroy)	ZeroClipboard.destroy(); //tidy up

		var client = new ZeroClipboard(selector);

		client.on( 'ready', function() {
			client.on( 'aftercopy', function(event) {
				console.log('Copied text to clipboard: ' + event.data['text/plain']);
        $(event.target).popover({
          trigger: 'manual',
          template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>',
          delay: {show:500, hide:500}
        });
        clearTimeout(local.tmp);
        $(event.target).popover('show');
        local.tmp = setTimeout(function(){$(event.target).popover('hide');}, 600);
			});
		});
	};

	var exportPlan = function(){
		var doc = new jsPDF(), margin = 20, verticalOffset = margin;

		var addHeading = function(text, size){
			if(verticalOffset > 270) {
				doc.addPage();
				verticalOffset = margin;
			}
			doc.setFontSize(size).text(margin, verticalOffset+10, text);
			verticalOffset+=15;
		};

		var addLine = function(text){
			var lines = doc.setFontSize(11).splitTextToSize(text, 170);
			if(verticalOffset +lines.length*10 > 280) {
				doc.addPage();
				verticalOffset = margin;
			}
			doc.text(margin, verticalOffset+5, lines);
			verticalOffset+=lines.length*7;
		};

		//create doctype
		var data = getObj(),i,j,mainId,suggs;


		addHeading("Action Plan",24);
		//Measured
		addHeading("Monitoring",20);

		var internalFunc = function(el) {
      var k;
			if(data.plans.individual[el] || data.actions[el]) {
        addLine("Patient "+ el +":");
        if(data.plans.individual[el]) {
          for(k =0; k < data.plans.individual[el].length; k++){
            if(!data.plans.individual[el][k].done){
              addLine(data.plans.individual[el][k].text);
            }
          }
  			}
        if(data.actions[el]) {
          var pathSec = local.data[local.pathwayId].patients[el].pathwayStage;
          var pathSub = local.data[local.pathwayId].patients[el].subsection;
          for(k =0; k < Math.max(data.actions[el].agree.length, data.actions[el].done.length); k++){
            if(data.actions[el].done.length>k && data.actions[el].done[k] ){
              //Completed so ignore
            } else if(data.actions[el].agree.length>k && data.actions[el].agree[k] ){
              addLine(local.actionPlan[pathSec].individual[pathSub][k].text);
            }
          }   //
  			}
      }
		};

    addHeading("Team plan",14);
    suggs = local.data[local.pathwayId].monitoring.suggestions;
    for(i=0; i<suggs.length; i++){
      if(data.actions.monitoring && data.actions.monitoring.done && data.actions.monitoring.done.length>i && data.actions.monitoring.done[i] ){
        //Completed so ignore
      } else if(data.actions.monitoring && data.actions.monitoring.agree && data.actions.monitoring.agree.length>i && data.actions.monitoring.agree[i] ){
        addLine(suggs[i].text);
      }
    }

    if(data.plans.team.monitoring && data.plans.team.monitoring.filter(function(i,v){if(!v.done) return true; else return false;}).length>0){
      addHeading("Custom team plan",14);
      for(i=0; i < data.plans.team.monitoring.length; i++){
          if(!data.plans.team.monitoring[i].done){
            addLine(data.plans.team.monitoring[i].text);
          }
      }
    }

		addHeading("Custom individual plans",14);
    for(i=0; i< local.data[local.pathwayId].monitoring.breakdown.length; i++){
			mainId = local.data[local.pathwayId].monitoring.breakdown[i][0];
		  local.data[local.pathwayId].monitoring.bdown[mainId].patients.forEach(internalFunc);
    }

    addHeading("Treatment",20);

    addHeading("Team plan",14);
    suggs = local.data[local.pathwayId].treatment.suggestions;
    for(i=0; i<suggs.length; i++){
      if(data.actions.treatment && data.actions.treatment.done && data.actions.treatment.done.length>i && data.actions.treatment.done[i] ){
        //Completed so ignore
      } else if(data.actions.treatment && data.actions.treatment.agree && data.actions.treatment.agree.length>i && data.actions.treatment.agree[i] ){
        addLine(suggs[i].text);
      }
    }

    if(data.plans.team.treatment && data.plans.team.treatment.filter(function(i,v){if(!v.done) return true; else return false;}).length>0){
      addHeading("Custom team plan",14);
      for(i=0; i < data.plans.team.treatment.length; i++){
          if(!data.plans.team.treatment[i].done){
            addLine(data.plans.team.treatment[i].text);
          }
      }
    }

		addHeading("Custom individual plans",14);
    for(i=0; i< local.data[local.pathwayId].monitoring.breakdown.length; i++){
			mainId = local.data[local.pathwayId].monitoring.breakdown[i][0];
		  local.data[local.pathwayId].monitoring.bdown[mainId].patients.forEach(internalFunc);
    }

		//trigger download
		doc.save();
	};

  var recordEvent = function(name, pathwayStage) {
    var obj = getObj();
    if(!obj[local.pathwayId].events[pathwayStage]) obj[local.pathwayId].events[pathwayStage] = [];
    obj[local.pathwayId].events[pathwayStage].push({"name": name, "date": new Date()});
    setObj(obj);
  };


  /********************************
	* Page setup
	********************************/

	var onSelected = function($e, nhsNumberObject) {
		//Hide the suggestions panel
		$('#search-box').find('.tt-dropdown-menu').css('display', 'none');

		//Clear the patient search box - needs a slight delay for some reason
		setTimeout(function() {$('#search-box > span > input.typeahead.tt-input, #search-box > span > input.typeahead.tt-hint').val('');},400);

		displaySelectedPatient(nhsNumberObject.id);
	};

  var showNavigation = function(list, idx, parent){
    var template = $('#pathway-picker').html();
    var itemTemplate = $('#pathway-picker-item').html();
    Mustache.parse(template);
    Mustache.parse(itemTemplate);

    list = list.slice();
    list.unshift({"link":"welcome", "faIcon":"fa-home", "name":"Home"});
    list.push({"link":"patients", "faIcon":"fa-users", "name":"All Patients"});

    list.map(function(v, i, arr){ v.isSelected = i===idx+1; v.hasSubItems = (i===idx+1 && idx>-1 && idx < arr.length-2); return v; });

    var renderedBefore = Mustache.render(template, {"items": list}, {"item": itemTemplate, "subItem":$('#pathway-picker-sub-item').html()});
    parent.find('aside nav:first').html(renderedBefore);

  };

  var loadContent = function(hash, isPoppingState){
    var i;
    if(!isPoppingState) {
      window.location.hash = hash;
    }

    if(hash === ''){
      showPage('login');
      $('html').removeClass('scroll-bar');
    } else {
      $('html').addClass('scroll-bar');
      if(/#main/.test(hash)) {
        var disease = hash.split('/')[1];
        showDiseaseView(disease);
      } else if (hash === "#help") {
        showPage('help-page');

        showSidePanel();
        showHeaderBarItems();
        hideAllPanels();
        showNavigation(local.diseases, -1, $('#help-page'));
      } else if (hash === "#patients") {
        showPatientView();

        $('[data-toggle=tooltip]').tooltip();
      } else if (hash === "#welcome") {
        showPage('welcome');

        showSidePanel();
        showHeaderBarItems();
        hideAllPanels();
        showNavigation(local.diseases, -1, $('#welcome'));

        //add tasks
        var teamTasks = [];
        var individualTasks = [];

        var current = getObj();
        for(i = 0; i < local.diseases.length; i++){
          if(current[local.diseases[i].id].actions) {
            for(var k in current[local.diseases[i].id].actions){
              if(k==="team" && current[local.diseases[i].id].actions[k] && current[local.diseases[i].id].actions[k].agree){
                for(var ii = 0; ii < current[local.diseases[i].id].actions[k].agree.length; ii++){
                  if(current[local.diseases[i].id].actions[k].agree[ii] && ! current[local.diseases[i].id].actions[k].done[ii]){
                    teamTasks.push({"pathway": local.diseases[i].name, "task": local.actionPlan[local.diseases[i].id][k][ii].text});
                  }
                }
              } /*else {
                for(i = 0; i < current[local.diseases[i].id].actions[k].agree.length; i++){
                  if(current[local.diseases[i].id].actions[k].agree[i] && ! current[local.diseases[i].id].actions[k].done[i]){
                    //find individual TODO update this!!!
                    if(local.data[local.diseases[i].id].patients[k]){
                      individualTasks.push({"pathway": local.diseases[i].name, "patientId":k, "task": local.actionPlan[local.diseases[i].id][local.data[local.diseases[i].id].patients[k].pathwayStage].individual[local.data[local.diseases[i].id].patients[k].subsection][i].text});
                    }
                  }
                }
              }*/
            }
          }
        }

        var addTemplate = $('#action-plan').html();
        Mustache.parse(addTemplate);
        var rendered = Mustache.render(addTemplate);
        $('#team-add-plan').html(rendered);

        $('#team-add-plan').off('click').on('click', '.add-plan', function(){
    			var obj = getObj();
          if(!obj[local.pathwayId].plans.team.other) obj[local.pathwayId].plans.team.other = [];
          var plan = $(this).parent().parent().find('textarea').val();
    			obj[local.pathwayId].plans.team.other.push({"text" : plan, "done": false});
    			setObj(obj);

          $('#team-task-panel').find('table tbody').append('<tr><td></td><td>' + plan + '</td><td><label class="cr-styled"><input type="checkbox"><i class="fa"></i></label></td></tr>');
    		});

        var template = $('#welcome-task-items').html();
        var itemTemplate = $('#welcome-task-item').html();
        Mustache.parse(template);
        Mustache.parse(itemTemplate);

        rendered = Mustache.render(template, {"tasks": teamTasks, "hasTasks": teamTasks.length>0}, {"task-item" : itemTemplate, "chk" : $('#checkbox-template').html()});
        $('#team-task-panel').children().not(":first").remove();
        $('#team-task-panel').append(rendered);

        rendered = Mustache.render(template, {"tasks": individualTasks, "isPatientTable":true, "hasTasks": individualTasks.length>0}, {"task-item" : itemTemplate, "chk" : $('#checkbox-template').html()});
        $('#individual-task-panel').children().not(":first").remove();
        $('#individual-task-panel').append(rendered);
      } else {
        //if screen not in correct segment then select it
        if(local.page !== 'main-dashboard'){
          $('.page').hide();
          $('#main-dashboard').show();

          showSidePanel();
          showOverview();
          showHeaderBarItems();
        }

        var pathwayStage = hash.substr(1);

        showPathwayStageView(pathwayStage);

        //selectPanel(pathwayStage);

        //showBreakdownPanel(pathwayStage);

        $('[data-toggle=tooltip]').tooltip();
      }
    }
  };

  var wireUpSearchBox = function () {
    if(local.states) {
      local.states.clearPrefetchCache();
    }

    local.states = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: $.map(local.data[local.pathwayId].patientArray, function(state) { return { id: state, value: local.patLookup ? local.patLookup[state] : state }; })
    });

    local.states.initialize(true);

    $('#search-box').find('.typeahead').typeahead('destroy');
    $('#search-box').find('.typeahead').typeahead(
      {hint: true, highlight: true, minLength: 2, autoselect: true},
      {name: 'patients', displayKey: 'value', source: local.states.ttAdapter()}
    ).on('typeahead:selected', onSelected)
    .on('typeahead:autocompleted', onSelected);
  };

  var preWireUpPages = function() {
		showPage('login');

    //Every link element stores href in history
    $(document).on('click', 'a.history', function() {
      // keep the link in the browser history
      history.pushState(null, null, this.href);
      loadContent(location.hash, true);
      // do not give a default action
      return false;
    });

    //Called when the back button is hit
    $(window).on('popstate', function(e) {
      loadContent(location.hash, true);
    });

		//Templates
		monitoringPanel = $('#monitoring-panel');
		treatmentPanel = $('#treatment-panel');
		diagnosisPanel = $('#diagnosis-panel');
		exclusionPanel = $('#exclusion-panel');
		patientsPanelTemplate = $('#patients-panel');
		breakdownPanel = $('#breakdown-panel');
		actionPlanPanel = $('#action-plan-panel');
		patientList = $('#patient-list');
		patientListSimple = $('#patient-list-simple');
		suggestedPlanTemplate = $('#suggested-plan-template');
		breakdownTableTemplate = $('#breakdown-table-template');
		individualPanel = $('#individual-panel');
		valueTrendPanel = $('#value-trend-panel');
    medicationPanel = $('#medications-panel');
		actionPlanList = $('#action-plan-list');

		//Selectors
		bottomLeftPanel = $('#bottom-left-panel');
		bottomRightPanel = $('#bottom-right-panel');
		topLeftPanel = $('#top-left-panel');
		topRightPanel = $('#top-right-panel');
    midPanel = $('#mid-panel');
		farLeftPanel = $('#left-panel');
		farRightPanel = $('#right-panel');
  };

	var wireUpPages = function () {
		$('#pick-nice').on('click', function(e){
			$('#pick-button').html('NICE <span class="caret"></span>');
      $('body').removeClass('qof');
      e.preventDefault();
		});

		$('#pick-qof').on('click', function(e){
			$('#pick-button').html('QOF <span class="caret"></span>');
      $('body').addClass('qof');
      e.preventDefault();
		});

    /*Wire up tooltips*/
    $('[data-toggle="tooltip"]').tooltip();

		/**********************************
		 ** Patient search auto complete **
		 **********************************/
    wireUpSearchBox();

    $('#data-file').on('change', function(evt){
      $('#data-file-wrapper').addClass('disabled').text("Loading...");
      var file = evt.target.files[0]; // FileList object
      var reader = new FileReader();

      reader.onload = (function() {
        return function(e) {
          var JsonObj = JSON.parse(e.target.result);
          getData(null, JsonObj.data);
          console.log(JsonObj);

          wireUpSearchBox();

          setTimeout(function() { $('#data-file-wrapper').hide(500); }, 1000);
        };
      })(file);

      reader.readAsText(file);
    });

    $('#patient-file').on('change', function(evt){
      $('#patient-file-wrapper').addClass('disabled').text("Loading...");
      var file = evt.target.files[0]; // FileList object
      var reader = new FileReader();

      reader.onload = (function() {
        return function(e) {
          var lines = e.target.result.split("\n");
          local.patLookup = {};
          for(var i = 0; i < lines.length; i++){
            var fields = lines[i].split(",");
            if(fields.length!==2) continue;
            local.patLookup[fields[0].trim()] = fields[1].trim();
          }

          wireUpSearchBox();

          setTimeout(function() { $('#patient-file-wrapper').hide(500); }, 1000);
        };
      })(file);

      reader.readAsText(file);
    });

    //exportPlan
    $('#export-plan').on('click', exportPlan);
	};

  var loadActionPlan = function(callback) {
    var r = Math.random();
    $.getJSON("action-plan.json?v="+r, function(file){
      local.actionPlan = file;
      callback();
    });
  };

  var addToPatientsObject = function(patients){
    for(var k in patients){
      if(local.data.patients[k]){

      } else {
        local.data.patients[k] = patients[k];
      }
    }
  };

  var loadData = function(data){
    var d="", i, j, k, patients, innerFunc = function(array){
      return function(i, el) {
        if($.inArray(el, array) === -1) array.push(el);
      };
    };

    local.data.patients = {};
    for(i = 0 ; i < data.length; i++){
      d = data[i].disease;
      local.pathwayNames[d] = data[i]["display-name"];
      local.diseases.push({"id":d,"link": data[i].link ? data[i].link : "main/"+d, "faIcon":data[i].icon, "name":data[i]["display-name"]});
      addToPatientsObject(data[i].patients);
      local.data[d] = {
        "suggestions" : local.actionPlan[d].team,
        "monitoring" : {"title": data[i].monitoring.title, "header": data[i].monitoring.header,"breakdown":[], "patients" : [], "bdown":{}, "trend":data[i].monitoring.trend, "table-headings":data[i].monitoring["table-headings"], "items" : data[i].monitoring.items},
        "treatment": {"title": data[i].treatment.title, "header": data[i].treatment.header,"breakdown":[], "patients" : [], "bdown":{}, "trend":data[i].treatment.trend, "table-headings":data[i].treatment["table-headings"], "items" : data[i].treatment.items},
        "diagnosis": {"title": data[i].diagnosis.title, "header": data[i].diagnosis.header,"breakdown":[], "patients" : [], "bdown":{}, "trend":data[i].diagnosis.trend, "table-headings":data[i].diagnosis["table-headings"], "items" : data[i].diagnosis.items},
        "exclusions": {"title": data[i].exclusions.title, "header": data[i].exclusions.header,"breakdown":[], "patients" : [], "bdown":{}, "trend":data[i].exclusions.trend, "table-headings":data[i].exclusions["table-headings"], "items" : data[i].exclusions.items}};
      local.data[d].patientArray = [];
      for(var o in data[i].patients) {
        if(data[i].patients.hasOwnProperty(o)) {
          local.data[d].patientArray.push(o);
        }
      }

      if(!local.data[d].monitoring.header) continue;
      patients = [];
      for(j=0; j < local.data[d].monitoring.items.length; j++) {
        local.data[d].monitoring.breakdown.push([local.data[d].monitoring.items[j].name, local.data[d].monitoring.items[j].n]);
        local.data[d].monitoring.bdown[local.data[d].monitoring.items[j].name] = local.data[d].monitoring.items[j];
        local.data[d].monitoring.bdown[local.data[d].monitoring.items[j].name].suggestions = local.actionPlan[d].monitoring.individual[local.data[d].monitoring.items[j].name];
        for(k=0; k < local.data[d].monitoring.items[j].patients.length; k++) {
          local.data.patients[local.data[d].monitoring.items[j].patients[k]].pathwayStage = "monitoring";
          local.data.patients[local.data[d].monitoring.items[j].patients[k]].subsection = local.data[d].monitoring.items[j].name;
          patients.push(local.data[d].monitoring.items[j].patients[k]);
        }
      }
      $.each(patients, innerFunc(local.data[d].monitoring.patients));
      patients = [];
      for(j=0; j < local.data[d].treatment.items.length; j++) {
        local.data[d].treatment.breakdown.push([local.data[d].treatment.items[j].name, local.data[d].treatment.items[j].n]);
        local.data[d].treatment.bdown[local.data[d].treatment.items[j].name] = local.data[d].treatment.items[j];
        local.data[d].treatment.bdown[local.data[d].treatment.items[j].name].suggestions = local.actionPlan[d].treatment.individual[local.data[d].treatment.items[j].name];
        for(k=0; k < local.data[d].treatment.items[j].patients.length; k++) {
          local.data.patients[local.data[d].treatment.items[j].patients[k]].pathwayStage = "treatment";
          local.data.patients[local.data[d].treatment.items[j].patients[k]].subsection = local.data[d].treatment.items[j].name;
          patients.push(local.data[d].treatment.items[j].patients[k]);
        }
      }
      $.each(patients, innerFunc(local.data[d].treatment.patients));
      patients = [];
      for(j=0; j < local.data[d].exclusions.items.length; j++) {
        local.data[d].exclusions.breakdown.push([local.data[d].exclusions.items[j].name, local.data[d].exclusions.items[j].n]);
        local.data[d].exclusions.bdown[local.data[d].exclusions.items[j].name] = local.data[d].exclusions.items[j];
        local.data[d].exclusions.bdown[local.data[d].exclusions.items[j].name].suggestions = local.actionPlan[d].exclusions.individual[local.data[d].exclusions.items[j].name];
        for(k=0; k < local.data[d].exclusions.items[j].patients.length; k++) {
          local.data.patients[local.data[d].exclusions.items[j].patients[k]].pathwayStage = "exclusions";
          local.data.patients[local.data[d].exclusions.items[j].patients[k]].subsection = local.data[d].exclusions.items[j].name;
          patients.push(local.data[d].exclusions.items[j].patients[k]);
        }
      }
      $.each(patients, innerFunc(local.data[d].exclusions.patients));
      patients = [];
      for(j=0; j < local.data[d].diagnosis.items.length; j++) {
        local.data[d].diagnosis.breakdown.push([local.data[d].diagnosis.items[j].name, local.data[d].diagnosis.items[j].n]);
        local.data[d].diagnosis.bdown[local.data[d].diagnosis.items[j].name] = local.data[d].diagnosis.items[j];
        local.data[d].diagnosis.bdown[local.data[d].diagnosis.items[j].name].suggestions = local.actionPlan[d].diagnosis.individual[local.data[d].diagnosis.items[j].name];
        for(k=0; k < local.data[d].diagnosis.items[j].patients.length; k++) {
          local.data.patients[local.data[d].diagnosis.items[j].patients[k]].pathwayStage = "diagnosis";
          local.data.patients[local.data[d].diagnosis.items[j].patients[k]].subsection = local.data[d].diagnosis.items[j].name;
          patients.push(local.data[d].diagnosis.items[j].patients[k]);
        }
      }
      $.each(patients, innerFunc(local.data[d].diagnosis.patients));
    }
  };

	var getData = function(callback, json) {
    if(json) {
      loadData(json);
      if(typeof callback === 'function') callback();
    } else {
      var r = Math.random();
  		$.getJSON("data.json?v="+r, function(file) {
  			loadData(file.data);
        if(typeof callback === 'function') callback();
  		}).fail(function(err){
        alert("data.json failed to load!! - if you've changed it recently check it's valid json at jsonlint.com");
      });
    }
	};

	var initialize = function(){
    preWireUpPages();

    loadActionPlan(function(){
      getData(wireUpPages);
    });
	};

	window.bb = {
		init : initialize
	};
})();

/********************************************************
*** Shows the pre-load image and slowly fades it out. ***
********************************************************/
$(window).load(function() {
  $('.loading-container').fadeOut(1000, function() {
	$(this).remove();
  });
});

/******************************************
*** This happens when the page is ready ***
******************************************/
$(document).on('ready', function () {
	//Load the data then wire up the events on the page
	bb.init();

	//Sorts out the data held locally in the user's browser
	if(!localStorage.bb) localStorage.bb = JSON.stringify({});
	var obj = JSON.parse(localStorage.bb);
  if(!obj.version || obj.version!=="1.6"){
    localStorage.bb = JSON.stringify({"version" : "1.6"});
  }

	$('[data-toggle="tooltip"]').tooltip();

  //ensure on first load the login screen is cached to the history
  history.pushState(null, null, '');
});
