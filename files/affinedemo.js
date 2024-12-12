/*
*   Copyright 2022 Steven M Graves/Protosmiths
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*       http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
*   limitations under the License.
*/
/*
* This file has the functions for an affine demo.
*
* UI has the following
* Text boxes showing world coords from mouse, Affine parameters, scale, world center
* slider for zoom
* button for rotate
* Two windows, one with full scale, one with graphics view
*/
const AffineDemo = new (function()
{	
	
	var worldCenter = {x:0, y:0};
	var rotation = 0;
	var scale = 1;
	var displayCenter = {x:350, y:175};
	var zoom = 1;
	var worldInverse = null;
	var displayInverse = null;

	var demoPanel = 
	{
		"periPath": "M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z",
		"unused": [{
				"path": "M 24 10 L 24 -10 L -24 -10 L -24 -4.5 L 14 -4.5 L 14 48 L 19.5 48 L 19.5 10 L 24 10 Z"
			}
		],
		"used": [{
				"path": "M -24 -5 L -24 48 L 14 48 L 14 -4.5 L -24 -4.5 Z",
				"stripes": "M -22.00 -4.50 L -22.00 48.00 M -20.00 -4.50 L -20.00 48.00 M -18.00 -4.50 L -18.00 48.00 M -16.00 -4.50 L -16.00 48.00 M -14.00 -4.50 L -14.00 48.00 M -12.00 -4.50 L -12.00 48.00 M -10.00 -4.50 L -10.00 48.00 M -8.00 -4.50 L -8.00 48.00 M -6.00 -4.50 L -6.00 48.00 M -4.00 -4.50 L -4.00 48.00 M -2.00 -4.50 L -2.00 48.00 M 0.00 -4.50 L 0.00 48.00 M 2.00 -4.50 L 2.00 48.00 M 4.00 -4.50 L 4.00 48.00 M 6.00 -4.50 L 6.00 48.00 M 8.00 -4.50 L 8.00 48.00 M 10.00 -4.50 L 10.00 48.00 M 12.00 -4.50 L 12.00 48.00",
				"textTrans": [[0, 1, -19.083333333333332], [-1, 0, 44.16666666666666]],
				"text": "Example Text 1",
				"selected":false
			}, {
				"path": "M 24 -10 L 24 -48 L -24 -48 L -24 -10 L 24 -10 Z",
				"stripes": "M -22.00 -48.00 L -22.00 -10.00 M -20.00 -48.00 L -20.00 -10.00 M -18.00 -48.00 L -18.00 -10.00 M -16.00 -48.00 L -16.00 -10.00 M -14.00 -48.00 L -14.00 -10.00 M -12.00 -48.00 L -12.00 -10.00 M -10.00 -48.00 L -10.00 -10.00 M -8.00 -48.00 L -8.00 -10.00 M -6.00 -48.00 L -6.00 -10.00 M -4.00 -48.00 L -4.00 -10.00 M -2.00 -48.00 L -2.00 -10.00 M 0.00 -48.00 L 0.00 -10.00 M 2.00 -48.00 L 2.00 -10.00 M 4.00 -48.00 L 4.00 -10.00 M 6.00 -48.00 L 6.00 -10.00 M 8.00 -48.00 L 8.00 -10.00 M 10.00 -48.00 L 10.00 -10.00 M 12.00 -48.00 L 12.00 -10.00 M 14.00 -48.00 L 14.00 -10.00 M 16.00 -48.00 L 16.00 -10.00 M 18.00 -48.00 L 18.00 -10.00 M 20.00 -48.00 L 20.00 -10.00 M 22.00 -48.00 L 22.00 -10.00",
				"textTrans": [[1, 0, -20.499999999999996], [0, 1, -43.25]],
				"text": "Example Text 2",
				"selected":false
			}, {
				"path": "M 19.5 48 L 24 48 L 24 10 L 19.5 10 L 19.5 48 Z",
				"stripes": "M 22.00 10.00 L 22.00 48.00",
				"textTrans": [[0, 1, 20.250000000000004], [-1, 0, 43.75]],
				"text": "Example Text 3",
				"selected":false
			}
		]
	};
	
	this.pnlObjWorld = null;
	this.pnlObjDemo = null;
	this.pnlObjControls = null;
	
	var cellRtX;
	var cellRtY;
	var cellRot;
	var cellZoom;
	var cellScaleX;
	var cellScaleY;
	var cellDtX;
	var cellDtY;
	
	var cellMouseDispX;
	var cellMouseDispY;
	var cellMouseWorldX;
	var cellMouseWorldY;
	
	var findTextExtents = function()
	{
		for(let iIdx = 0; iIdx < demoPanel.used.length; iIdx++)
		{
			let svgText = VectorText.svgText(demoPanel.used[iIdx].text, 1);
			svgText = utils.svgTransform(svgText, demoPanel.used[iIdx].textTrans);
			let polyText = utils.svg2Polys(svgText);
			demoPanel.used[iIdx].textExtents = utils.bboxPolys(polyText);
		}
		console.log("Used", demoPanel.used);
	}
	
	/*
	*
	*/
	this.DemoInit = function()
	{
		findTextExtents();
		
		let worldCnvs = document.createElement('canvas');
		AffineDemo.pnlObjWorld = SSPanel.panelFactory('pnlWorld', worldCnvs);
		AffineDemo.pnlObjWorld.redraw = AffineDemo.redrawWorldPanel;
		AffineDemo.pnlObjWorld.hdrLeft.innerHTML = 'Panel World Coordinates 50 " x 100 "';

		let width = AffineDemo.pnlObjWorld.panel.clientWidth;
		let height = AffineDemo.pnlObjWorld.panel.clientHeight - 50;
		AffineDemo.pnlObjWorld.lwrCnvs.width = width;
		AffineDemo.pnlObjWorld.lwrCnvs.height = height;
		worldCnvs.onmousemove = function(e)
		{
			let rect = worldCnvs.getBoundingClientRect();
			let disp = {x:e.clientX - rect.x, y:e.clientY - rect.y};
			let world = {x:disp.x, y:disp.y};
			Affine.transformPoint(world, worldInverse);
			AffineDemo.updateCtrlMouse(disp, world);
		}
		worldCnvs.onclick = function(e)
		{
			let rect = worldCnvs.getBoundingClientRect();
			let disp = {x:e.clientX - rect.x, y:e.clientY - rect.y};
			let world = {x:disp.x, y:disp.y};
			Affine.transformPoint(world, worldInverse);
			if(e.ctrlKey)
			{
				for(let iIdx = 0; iIdx < demoPanel.used.length; iIdx++)
				{
					let extents = demoPanel.used[iIdx].textExtents
					if(world.x < extents.x.min)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.x > extents.x.max)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.y < extents.y.min)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.y > extents.y.max)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					demoPanel.used[iIdx].selected = true;
				}
				AffineDemo.redrawWorldPanel();
				AffineDemo.redrawDemoPanel();
				return e;
			}
			AffineDemo.updateCtrlMouse(disp, world);
			worldCenter = {x:-world.x, y:-world.y};
			AffineDemo.updateCtrlAffine();
			AffineDemo.redrawDemoPanel();
		}
		SSPanel.show(AffineDemo.pnlObjWorld, true);

		let demoCnvs = document.createElement('canvas');
		AffineDemo.pnlObjDemo = SSPanel.panelFactory('pnlDemo', demoCnvs);
		AffineDemo.pnlObjDemo.redraw = AffineDemo.redrawDemoPanel;
		AffineDemo.pnlObjDemo.hdrLeft.innerHTML = 'Demo Display Coordinates 700 px x 350 px';
		// AffineDemo.pnlObjDemo.panel.style.width = "1000px";
		// AffineDemo.pnlObjDemo.panel.style.height = "550px";
		width = AffineDemo.pnlObjDemo.panel.clientWidth;
		height = AffineDemo.pnlObjDemo.panel.clientHeight - 50;
		AffineDemo.pnlObjDemo.lwrCnvs.width = width;
		AffineDemo.pnlObjDemo.lwrCnvs.height = height;
//		AffineDemo.pnlObjDemo.panel.style.left = "350px";
		SSPanel.show(AffineDemo.pnlObjDemo, true);

		let cntrlsDiv = document.createElement('div');
		AffineDemo.pnlObjControls = SSPanel.panelFactory('pnlControls', cntrlsDiv);
		AffineDemo.pnlObjControls.hdrLeft.innerHTML = 'Controls and Indicators';
		// AffineDemo.pnlObjControls.panel.style.width = "600px";
		// AffineDemo.pnlObjControls.panel.style.height = "400px";
		// AffineDemo.pnlObjControls.panel.style.top = "200px";
		
		let tableInputa = document.createElement('table');
		let cellZoomSliderLbl = tableInputa.insertRow().insertCell();
		cellZoomSliderLbl.style.textAlign = 'center';
		cellZoomSliderLbl.innerHTML = "Zoom";
		
		let sliderZoom = document.createElement('input');
		sliderZoom.type = 'range';
		sliderZoom.value = 0;
		sliderZoom.className = 'slider';
		sliderZoom.oninput = function()
		{
			//zoom = 2^(slider.value/25);
			zoom = 1 + (sliderZoom.value/6);
			AffineDemo.updateCtrlAffine();
			AffineDemo.redrawDemoPanel();
		}
		let cellZoomSlider = tableInputa.insertRow().insertCell();
		cellZoomSlider.style.padding = '10px';
		cellZoomSlider.appendChild(sliderZoom);
		
		// let rotFunc = function()
		// {
			// rotation += Math.PI/2;
			// while(rotation >= 2*Math.PI)rotation -= 2*Math.PI;
			// AffineDemo.updateCtrlAffine();
			// AffineDemo.redrawDemoPanel();
		// }

		// let btnRot = SSPanel.createButton('Rotate', rotFunc);
		// let cellBtnRot = tableInputa.insertRow().insertCell();
		// cellBtnRot.style.padding = '15px';
		// cellBtnRot.style.textAlign = 'center';
		// //cellBtnRot.style.margin = 'auto';
		// cellBtnRot.appendChild(btnRot);
		let cellRotSliderLbl = tableInputa.insertRow().insertCell();
		cellRotSliderLbl.style.textAlign = 'center';
		cellRotSliderLbl.innerHTML = "Rotate";
		let sliderRot = document.createElement('input');
		sliderRot.type = 'range';
		sliderRot.value = 0;
		sliderRot.className = 'slider';
		sliderRot.oninput = function()
		{
			//zoom = 2^(slider.value/25);
			rotation = 2*Math.PI*(sliderRot.value/100);
			AffineDemo.updateCtrlAffine();
			AffineDemo.redrawDemoPanel();
		}
		let cellRotSlider = tableInputa.insertRow().insertCell();
		cellRotSlider.style.padding = '10px';
		cellRotSlider.appendChild(sliderRot);
		cntrlsDiv.appendChild(tableInputa);
		
		//AffineDemo.pnlObjDemo.redraw = AffineDemo.redrawWorldPanel;
		let tableCntrlsATO = document.createElement('table');
		tableCntrlsATO.className = 'ctrlTable';
		// tableCntrlsATO.style.margin = '15px';
		// tableCntrlsATO.style.border = '1px solid black';
		//let rowZoom = tableCntrlsATO.insertRow();
		let rowATO = tableCntrlsATO.insertRow().insertCell();
		rowATO.colSpan = 8;
		rowATO.style.textAlign = 'center';
		rowATO.innerHTML = "Affine Transform Operations";
		// let rowATOLabels = tableCntrlsATO.insertRow();
		// rowATOLabels.insertCell().innerHTML = "Translate (Panel Coords)";
		// rowATOLabels.insertCell().innerHTML = "Rotate";
		// rowATOLabels.insertCell().innerHTML = "Translate (Display Center)";
		let rowATOLbls = tableCntrlsATO.insertRow();
		let cellRtLbl = rowATOLbls.insertCell();
		cellRtLbl.colSpan = 2;
		cellRtLbl.className = 'ctrlCellLbl';
		cellRtLbl.innerHTML = "Translate (Panel Coords)";
		let cellRotLbl = rowATOLbls.insertCell();
		cellRotLbl.className = 'ctrlCellLbl';
		cellRotLbl.innerHTML = "Rotate";
		let cellZoomLbl = rowATOLbls.insertCell();
		cellZoomLbl.className = 'ctrlCellLbl';
		cellZoomLbl.innerHTML = "Zoom";
		let cellScaleLbl = rowATOLbls.insertCell();
		cellScaleLbl.colSpan = 2;
		cellScaleLbl.className = 'ctrlCellLbl';
		cellScaleLbl.innerHTML = "Scale";
		let cellDtLbl = rowATOLbls.insertCell();
		cellDtLbl.colSpan = 2;
		cellDtLbl.className = 'ctrlCellLbl';
		cellDtLbl.innerHTML = "Translate (Display Center)";
		let rowATOValues = tableCntrlsATO.insertRow();
		cellRtX = rowATOValues.insertCell();
		cellRtX.className = 'ctrlCellVal';
		// cellRtX.innerHTML = "x: 00.00";
		cellRtY = rowATOValues.insertCell();
		cellRtY.className = 'ctrlCellVal';
		// cellRtY.innerHTML = "y: 00.00";
		cellRot = rowATOValues.insertCell();
		cellRot.className = 'ctrlCellVal';
		cellZoom = rowATOValues.insertCell();
		cellZoom.className = 'ctrlCellVal';
		// cellRot.innerHTML = "00 degs";
		cellScaleX = rowATOValues.insertCell();
		cellScaleX.className = 'ctrlCellVal';
		// cellScaleX.innerHTML = "x: 00.00";
		cellScaleY = rowATOValues.insertCell();
		cellScaleY.className = 'ctrlCellVal';
		// cellScaleY.innerHTML = "y: 00.00";
		cellDtX = rowATOValues.insertCell();
		cellDtX.className = 'ctrlCellVal';
		// cellDtX.innerHTML = "x: 400";
		cellDtY = rowATOValues.insertCell();
		cellDtY.className = 'ctrlCellVal';
		// cellDtY.innerHTML = "y: 200";
		// AffineDemo.updateCtrlAffine();
		cntrlsDiv.appendChild(tableCntrlsATO);
		
		let tableCntrlsMouse = document.createElement('table');
		tableCntrlsMouse.style.margin = '15px';
		tableCntrlsMouse.style.border = '1px solid black';
		let rowMouseTitle = tableCntrlsMouse.insertRow().insertCell();
		rowMouseTitle.colSpan = 4;
		rowMouseTitle.style.textAlign = 'center';
		rowMouseTitle.innerHTML = "Mouse Position";
		let rowMouseSubtitle = tableCntrlsMouse.insertRow();
		let cellMouseDispLbl = rowMouseSubtitle.insertCell();
		cellMouseDispLbl.colSpan = 2;
		cellMouseDispLbl.style.textAlign = 'center';
		cellMouseDispLbl.style.border = '1px solid black';
		cellMouseDispLbl.style.padding = '5px';
		cellMouseDispLbl.innerHTML = "Display Coords";
		let cellMouseWorldLbl = rowMouseSubtitle.insertCell();
		cellMouseWorldLbl.colSpan = 2;
		cellMouseWorldLbl.style.textAlign = 'center';
		cellMouseWorldLbl.style.border = '1px solid black';
		cellMouseWorldLbl.style.padding = '5px';
		cellMouseWorldLbl.innerHTML = "Panel Coords";
		let rowMouseVals = tableCntrlsMouse.insertRow();
		cellMouseDispX = rowMouseVals.insertCell();
		cellMouseDispX.style.border = '1px solid black';
		cellMouseDispX.style.padding = '5px';
		cellMouseDispX.innerHTML = 'x: 0000';
		cellMouseDispY = rowMouseVals.insertCell();
		cellMouseDispY.style.border = '1px solid black';
		cellMouseDispY.style.padding = '5px';
		cellMouseDispY.innerHTML = 'y: 0000';
		cellMouseWorldX = rowMouseVals.insertCell();
		cellMouseWorldX.style.border = '1px solid black';
		cellMouseWorldX.style.padding = '5px';
		cellMouseWorldX.innerHTML = 'x: 00.00';
		cellMouseWorldY = rowMouseVals.insertCell();
		cellMouseWorldY.style.border = '1px solid black';
		cellMouseWorldY.style.padding = '5px';
		cellMouseWorldY.innerHTML = 'y: 00.00';

		cntrlsDiv.appendChild(tableCntrlsMouse);
		//		let rowZoom = tableCntrlsATO.insertRow();

		let grab = false;
		/*
		* Changing the way the demo works.  Going to create a grabbable panel that can be moved around
		*/
		demoCnvs.onmousedown = function (e)
		{
			e.preventDefault();
		}

		demoCnvs.onmousemove = function(e)
		{
			let rect = demoCnvs.getBoundingClientRect();
			let disp = {x:e.clientX - rect.x, y:e.clientY - rect.y};
			let world = {x:disp.x, y:disp.y};
			Affine.transformPoint(world, displayInverse);
			AffineDemo.updateCtrlMouse(disp, world);
			//console.log(demoCnvs.offsetLeft, demoCnvs.offsetTop);
			//console.log(e.clientX - rect.x, e.clientY - rect.y);
			//console.log(demoCnvs.getBoundingClientRect());
			//console.log(e);
		}

		demoCnvs.onclick = function(e)
		{
			let rect = demoCnvs.getBoundingClientRect();
			let disp = {x:e.clientX - rect.x, y:e.clientY - rect.y};
			let world = {x:disp.x, y:disp.y};
			Affine.transformPoint(world, displayInverse);
			if(e.ctrlKey)
			{
				for(let iIdx = 0; iIdx < demoPanel.used.length; iIdx++)
				{
					let extents = demoPanel.used[iIdx].textExtents
					if(world.x < extents.x.min)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.x > extents.x.max)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.y < extents.y.min)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					if(world.y > extents.y.max)
					{
						demoPanel.used[iIdx].selected = false;
						continue;
					}
					demoPanel.used[iIdx].selected = true;
				}
				AffineDemo.redrawWorldPanel();
				AffineDemo.redrawDemoPanel();
				return e;
			}
			AffineDemo.updateCtrlMouse(disp, world);
			worldCenter = {x:-world.x, y:-world.y};
			AffineDemo.updateCtrlAffine();
			AffineDemo.redrawDemoPanel();
			//console.log(demoCnvs.offsetLeft, demoCnvs.offsetTop);
			//console.log(e.clientX - rect.x, e.clientY - rect.y);
			//console.log(demoCnvs.getBoundingClientRect());
			//console.log(e);
		}
		
		SSPanel.show(AffineDemo.pnlObjControls, true);

		SSPanel.displayOrder.push(AffineDemo.pnlObjControls);
		SSPanel.displayOrder.push(AffineDemo.pnlObjDemo);
		SSPanel.displayOrder.push(AffineDemo.pnlObjWorld);
		SSPanel.setZOrder();
		
		AffineDemo.setDemoParms();
		AffineDemo.updateCtrlAffine();
		
		AffineDemo.redrawWorldPanel();
		AffineDemo.redrawDemoPanel();
		
	}
	
	var displayPanel = function(ctx)
	{
		let path = new Path2D(demoPanel.periPath);
		ctx.stroke(path);
		for(let iIdx = 0; iIdx < demoPanel.unused.length; iIdx++)
		{
			path = new Path2D(demoPanel.unused[iIdx].path);
			ctx.stroke(path);
		}
		
		for(let iIdx = 0; iIdx < demoPanel.used.length; iIdx++)
		{
			//console.log(new ShutterDesign().makeStripes(demoPanel.used[iIdx].path));
			path = new Path2D(demoPanel.used[iIdx].path);
			ctx.strokeStyle = "rgb(0,0,0)";
			ctx.stroke(path);
			path = new Path2D(demoPanel.used[iIdx].stripes);
			ctx.strokeStyle = "rgb(180,180,180)";
			ctx.stroke(path);
			let svgText = VectorText.svgText(demoPanel.used[iIdx].text, 1);
			svgText = utils.svgTransform(svgText, demoPanel.used[iIdx].textTrans);
			path = new Path2D(svgText);
			if(demoPanel.used[iIdx].selected)
			{
				ctx.strokeStyle = "rgb(0,255,0)";
			}else{
				ctx.strokeStyle = "rgb(0,0,255)";
			}
			ctx.stroke(path);
		}
	}
	
	/*
	* This sets the initial parameters for the affine transform.  It is run any time the demo
	* panel is resized. The most important thing it does is determine the base scale. The base scale
	* is the minimum scale and is set to allow the panel to fit regardless of rotation.  Then the zoom
	* allows one to zoom in from there.
	*/
	this.setDemoParms = function()
	{
		let width = AffineDemo.pnlObjDemo.lwrCnvs.width;
		let height = AffineDemo.pnlObjDemo.lwrCnvs.height;
		scale = width/100;
		if(scale > height/100)scale = height/100;
		
		displayCenter = {x:width/2, y:height/2};
	}
	
	this.updateCtrlAffine = function()
	{
		cellRtX.innerHTML = "x: " + worldCenter.x.toFixed(2);
		cellRtY.innerHTML = "y: " + worldCenter.y.toFixed(2);
		cellRot.innerHTML = (180*rotation/Math.PI).toFixed(0) + " degs";
		cellZoom.innerHTML = zoom.toFixed(2);
		cellScaleX.innerHTML = "x: " + scale.toFixed(2);
		cellScaleY.innerHTML = "y: -" + scale.toFixed(2);
		cellDtX.innerHTML = "x: " + displayCenter.x.toFixed(0);
		cellDtY.innerHTML = "y: " + displayCenter.y.toFixed(0);
	}
	
	this.updateCtrlMouse = function(disp, world)
	{
		cellMouseDispX.innerHTML = "x: " + disp.x.toFixed(0);
		cellMouseDispY.innerHTML = "y: " + disp.y.toFixed(0);
		cellMouseWorldX.innerHTML = "x: " + world.x.toFixed(2);
		cellMouseWorldY.innerHTML = "y: " + world.y.toFixed(2);
	}
	
	/*
	* This display is to allow the user to visualize the world panel
	*/
	this.redrawWorldPanel = function()
	{
		let width = AffineDemo.pnlObjWorld.panel.clientWidth;
		let height = AffineDemo.pnlObjWorld.panel.clientHeight - 50;
		let ctx = AffineDemo.pnlObjWorld.lwrCnvs.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		ctx.save();
		let transform = Affine.getTranslateATx({x:width/2, y:height/2});
		transform = Affine.affineAppend(transform, Affine.getScaleATx({x:height/100, y:-height/100}));
		Affine.ctxTransform(ctx, transform);
		// ctx.translate(width/2, height/2);
		// ctx.scale(height/100, -height/100);
		ctx.lineWidth = 2*50/width;
		displayPanel(ctx);
		worldInverse = Affine.getInverseATx(transform);
		ctx.restore();
		
		ctx.strokeStyle = "rgb(220,150,150)";
		ctx.beginPath();
		ctx.moveTo(0, height/2);
		ctx.lineTo(width, height/2);
		ctx.stroke();		
		ctx.beginPath();
		ctx.moveTo(width/2, 0);
		ctx.lineTo(width/2, height);
		ctx.stroke();		
	}
	
	this.redrawDemoPanel = function()
	{
		let width = AffineDemo.pnlObjDemo.lwrCnvs.width;
		let height = AffineDemo.pnlObjDemo.lwrCnvs.height;
		let ctx = AffineDemo.pnlObjDemo.lwrCnvs.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		ctx.save();
		let transform = Affine.getTranslateATx({x:displayCenter.x, y:displayCenter.y});
		transform = Affine.affineAppend(transform, Affine.getScaleATx({x:zoom*scale, y:-zoom*scale}));
		transform = Affine.affineAppend(transform, Affine.getRotateATx(rotation));
		transform = Affine.affineAppend(transform, Affine.getTranslateATx({x:worldCenter.x, y:worldCenter.y}));
		Affine.ctxTransform(ctx, transform);
		// ctx.translate(displayCenter.x, displayCenter.y);
		// ctx.scale(zoom*scale, -zoom*scale);
		// ctx.rotate(rotation);
		// ctx.translate(worldCenter.x, worldCenter.y);
		ctx.lineWidth = 2/(zoom*scale);
		displayPanel(ctx);
		displayInverse = Affine.getInverseATx(transform);
		ctx.restore();
		
		ctx.strokeStyle = "rgb(220,150,150)";
		ctx.beginPath();
		ctx.moveTo(0, height/2);
		ctx.lineTo(width, height/2);
		ctx.stroke();		
		ctx.beginPath();
		ctx.moveTo(width/2, 0);
		ctx.lineTo(width/2, height);
		ctx.stroke();		
	}
	
	return this;
})();