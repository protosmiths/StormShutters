const SSAvail = new(function()
{
	var bboxes = [];
	
	this.rotation = 0;

	this.pnlObj = null;

	// This is for avail panel mouse events.
	this.availSelect = {refX:0, refY:0, moveX:0, moveY:0, idx:0, txtIdx:-1, editIdx:-1, count:0};
	
	//The avail panel displays multiple 
	var availSides = 2;
	
	this.avs = [];
	
	this.init = function()
	{
		let lwrCnvs = document.createElement('canvas');
		let upprCnvs = document.createElement('canvas');
		SSAvail.pnlObj = SSPanel.panelFactory('pnlAvail', lwrCnvs, upprCnvs);
		SSAvail.pnlObj.redraw = SSAvail.redrawAvailPanel;
		//SSPanel.setPanelDrag(SSAvail.pnlObj);
		//SSPanel.setPanelResize(SSAvail.pnlObj);
		SSAvail.pnlObj.panel.style.width = "600px";
		let width = SSAvail.pnlObj.panel.clientWidth - 20;
		let height = SSAvail.pnlObj.panel.clientHeight - 50;
		SSAvail.pnlObj.lwrCnvs.width = width;
		SSAvail.pnlObj.lwrCnvs.height = height;
		SSAvail.pnlObj.upprCnvs.width = width;
		SSAvail.pnlObj.upprCnvs.height = height;
		
		// let btnDir = SSPanel.createButton('Dir', this.openDir);
		// btnDir.style.width = '50px';
		
		let btnNew = SSPanel.createButton('New', SSAvail.clickNew);
		btnNew.style.width = '40px';
		
		let btnOpen = SSPanel.createButton('Open', SSAvail.open);
		btnOpen.style.width = '50px';
		
		let btnSave = SSPanel.createButton('Save', SSAvail.save);
		btnSave.style.width = '50px';
		
		let btnRot = SSPanel.createButton('Rot', SSAvail.rotate);
		btnRot.style.width = '40px';
		
		let btnCNC = SSPanel.createButton('CNC', SSCNC.focusCNC);
		btnCNC.style.width = '40px';
		
		// SSAvail.pnlObj.hdrRight.appendChild(btnDir);
		SSAvail.pnlObj.hdrRight.appendChild(btnNew);
		SSAvail.pnlObj.hdrRight.appendChild(btnOpen);
		SSAvail.pnlObj.hdrRight.appendChild(btnSave);
		SSAvail.pnlObj.hdrRight.appendChild(btnRot);
		SSAvail.pnlObj.hdrRight.appendChild(btnCNC);
		
		SSAvail.pnlObj.panel.onclick = SSAvail.availMouseClick;
	}
	
	this.availMouseClick = function(e)
	{
		e = e || window.event;
		e.preventDefault();
		//console.log('availMouseClick');
		
		let posX = e.offsetX;
		let posY = e.offsetY;
		//Find closest avail panel
		let iIdx = 0;
		let iX = SSAvail.avs[iIdx].x - posX;
		let iY = SSAvail.avs[iIdx].y - posY;
		let iDist2 = iX*iX + iY*iY;
		let iFound = 0;
		for(iIdx = 1; iIdx < SSAvail.avs.length; iIdx++)
		{
			let iTestX = SSAvail.avs[iIdx].x - posX;
			let iTestY = SSAvail.avs[iIdx].y - posY;
			let iTestDist2 = iTestX*iTestX + iTestY*iTestY;
			if(iTestDist2 < iDist2)
			{
				iFound = iIdx;
				iDist2 = iTestDist2;
				iX = iTestX;
				iY = iTestY;
			}
		}
		SSAvail.availSelect.refX = 0;
		SSAvail.availSelect.refY = 0;
		SSAvail.availSelect.moveX = 0;
		SSAvail.availSelect.moveY = 0;
		SSAvail.availSelect.idx = iFound;
		SSAvail.redrawAvailPanel();
	}
	
	this.rotate = function()
	{
		SSAvail.rotation += Math.PI/2;
		if(SSAvail.rotation >= 2* Math.Pi)SSAvail.rotation = 0;
		SSMain.redrawMainPanel();
		SSAvail.redrawAvailPanel();
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
	}
	
	this.clickNew = function()
	{
		SSTools.design = new ShutterDesign('');
		SSTools.design.addBlank('M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z');
		SSMain.setWorkingShutter(-1);
		SSEntry.newDesign();
		SSAvail.recalcAvailPanels();
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.rewriteAvailHeader();
		SSAvail.redrawAvailPanel();
		console.log('New design');
	}
	
	this.open = async function()
	{
		let handle = await window.showOpenFilePicker();
		SSTools.design.readFile(handle);
	}
	
	this.save = async function()
	{
		let handle = await window.showSaveFilePicker();
		SSTools.design.writeFile(handle);
	}

	this.recalcAvailPanels = function()
	{
		let width = SSAvail.pnlObj.lwrCnvs.width - 20;
		let height = SSAvail.pnlObj.lwrCnvs.height - 20;

		//console.log('width, height', width, height);
		let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
		SSAvail.availSelect.count = count;
		availSides = 2;
		while(count > availSides * availSides)availSides++;
		let feet = availSides * 9;
		availUnit = SSDisplay.calcDisplayScale(width, height, 12*feet, 12*feet);
		//console.log('availUnit', availUnit);
		let paths = [];
		for(let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
		{
			paths.push({t:0, i:iIdx});
		}
		for(let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
		{
			paths.push({t:1, i:iIdx});
		}
		for(let iIdx = paths.length; iIdx < availSides * availSides; iIdx++)
		{
			paths.push({t:2, i:iIdx});
			//console.log('Empty Panel');
		}
		//Calculate the middle of the first box in Avail Canvas coords
		let orgX = 20 + 4.5 * 12* availUnit;
		let orgY = 4.5 * 12 * availUnit;
		SSAvail.avs = [];
		let iT = 0;
		for(let iRow = 0; iRow < availSides; iRow++)
		{
			for(let iCol = 0; iCol < availSides; iCol++)
			{
				let iX = orgX + iCol * 9 * 12*availUnit;
				let iY = orgY + (iRow * 9 * 12 * availUnit);
				SSAvail.avs.push({t:paths[iT].t, i:paths[iT].i, x:iX, y:iY});
				iT++;
			}
		}
		SSAvail.redrawAvailPanel();
	}
	
	this.rewriteAvailHeader = function()
	{
		SSAvail.pnlObj.hdrLeft.innerHTML = 'Design: ' + SSTools.design.file.description;
	}
	
	this.redrawAvailPanel = function()
	{
		let width = SSAvail.pnlObj.lwrCnvs.width;
		let height = SSAvail.pnlObj.lwrCnvs.height;
		//return;
		//console.log('Redraw Avail Panel');
		//console.log(SSMain.pnlObj.panel.clientWidth, SSMain.pnlObj.panel.clientHeight);
		// let width = SSAvail.pnlObj.panel.clientWidth - 20;
		// let height = SSAvail.pnlObj.panel.clientHeight - 50;
		// SSAvail.pnlObj.lwrCnvs.width = width;
		// SSAvail.pnlObj.lwrCnvs.height = height;
		// let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
		// let side = 2;
		// while(count > side * side)side++;
		//For now assume 4 x 8
		//let feet = side * 9;
		//Note unit is a foot which is 1200 panel units
		//let unit = SSDisplay.calcDisplayScale(width - 20, height - 20, 12*feet, 12*feet);
		let ctx = SSAvail.pnlObj.lwrCnvs.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		SSDisplay.displayScales(ctx, width - 20, height - 20, width/2, height/2, 12*availUnit);
		//return;
		// let orgX = 20 + 4.5 * 12* unit;
		// let orgY = 4.5 * 12 * unit;
		// let paths = [];
		// for(let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
		// {
			// paths.push({t:0, i:iIdx});
		// }
		// for(let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
		// {
			// paths.push({t:1, i:iIdx});
		// }
		// for(let iIdx = paths.length; iIdx < side * side; iIdx++)
		// {
			// paths.push({t:2, i:iIdx});
		// }
		let iT = 0;
		for(let iIdx = 0; iIdx < SSAvail.avs.length; iIdx++)
		{
			let iX = SSAvail.avs[iIdx].x;
			let iY = SSAvail.avs[iIdx].y;
			ctx.save();
			//console.log(iX, iY);
			ctx.translate(iX, iY);
			ctx.scale(availUnit, -availUnit);
			ctx.lineWidth = 2/availUnit;  //Compensate for scaling
			let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54 Z');
			if(iIdx == SSAvail.availSelect.idx)
			{
				ctx.fillStyle = 'rgb(220,220,255)';
				ctx.fill(path);
			}
			ctx.stroke(path);
			ctx.restore();
			ctx.save();
			ctx.translate(iX, iY);
			ctx.scale(availUnit, -availUnit);
			ctx.rotate(SSAvail.rotation);
			SSAvail.drawPanelWCtx(ctx, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
			ctx.restore();
			//SSDisplay.drawPanel(ctx, 0,0, iX, iY, availUnit, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
		}
		// for(let iRow = 0; iRow < side; iRow++)
		// {
			// for(let iCol = 0; iCol < side; iCol++)
			// {
				// let iX = orgX + iCol * 9 * 12*unit;
				// let iY = orgY + (iRow * 9 * 12 * unit);
				// ctx.save();
				// //console.log(iX, iY);
				// ctx.translate(iX, iY);
				// ctx.scale(unit, -unit);
				// ctx.lineWidth = 2/unit;  //Compensate for scaling
				// let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54');
				// ctx.stroke(path);
				// ctx.restore();
				// drawPanel(ctx, iX, iY, unit, paths[iT++]);
			// }
		// }
	}
	
	this.redrawAvailOverlay = function()
	{
		let width = SSAvail.pnlObj.upprCnvs.width;
		let height = SSAvail.pnlObj.upprCnvs.height;
		let ctx = SSAvail.pnlObj.upprCnvs.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		if(SSDisplay.layerIdx == 3)return;
		if(SSAvail.availSelect.idx < 0)return;
		//if(!shutterPos.in)return;
		// let iX = SSAvail.availSelect.moveX;
		// let iY = SSAvail.availSelect.moveY;
		let iX = SSAvail.avs[SSAvail.availSelect.idx].x;
		let iY = SSAvail.avs[SSAvail.availSelect.idx].y;
		//console.log('SSAvail.avs[SSAvail.availSelect.idx].x, SSAvail.avs[SSAvail.availSelect.idx].y', SSAvail.avs[SSAvail.availSelect.idx].x, SSAvail.avs[SSAvail.availSelect.idx].y);
		//console.log('SSAvail.availSelect.moveX, SSAvail.availSelect.moveY', SSAvail.availSelect.moveX, SSAvail.availSelect.moveY);
		//console.log('SSAvail.availSelect.refX, SSAvail.availSelect.refY', SSAvail.availSelect.refX, SSAvail.availSelect.refY);
		// iX *= availUnit;
		// iY *= availUnit;
		// iX /= mainUnit;
		// iY /= mainUnit;
		// iX = SSAvail.avs[SSAvail.availSelect.idx].x - iX;
		// iY = SSAvail.avs[SSAvail.availSelect.idx].y - iY;
		//console.log('iX, iY', iX, iY);
		ctx.save();
		ctx.translate(iX, iY);
		ctx.scale(availUnit, -availUnit);
		ctx.translate(-(SSAvail.availSelect.refX + SSAvail.availSelect.moveX)/mainUnit, (SSAvail.availSelect.refY +SSAvail.availSelect.moveY)/mainUnit);
		ctx.lineWidth = 2/availUnit;
		let path = new Path2D(SSMain.workingShutter.outline);
		ctx.stroke(path);
		ctx.restore();
		
	}
	
	/*
	* The available panels are displayed in two places.  In the available screen and as individual panels
	* on the shutter screen.
	*/
	this.drawPanelWCtx = function(ctx, type, idx)
	{
		if(type > 1)return;

		let path;
		if(type == 0)
		{
			path = new Path2D(SSTools.design.file.blanks[idx].path);
			ctx.stroke(path);
			path = new Path2D(SSTools.design.file.blanks[idx].stripes);
			ctx.strokeStyle = "rgb(180,180,180)";
			ctx.stroke(path);
			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[idx]));
			ctx.strokeStyle = "rgb(255,0,0)";
			ctx.stroke(path);
		}else
		{
			// if(cutShapes != undefined)
			// {
				// for(let iIdx = 0; iIdx < cutShapes.length; iIdx++)
				// {
					// let ano = cutShapes[iIdx];
					// for(let iJdx = 0; iJdx < ano.solids.length; iJdx++)
					// {
						// path = new Path2D(utils.poly2Svg(ano.solids[iJdx]));
						// //ctx.stroke(path);
					// }
				// }
				// //ctx.restore();
				// //return;
			// }
			let panel = SSTools.design.file.panels[idx];
			path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
			//ctx.stroke(path);
			for(let iIdx = 0; iIdx < panel.unused.length; iIdx++)
			{
				path = new Path2D(panel.unused[iIdx].path);
				ctx.stroke(path);
				ctx.strokeStyle = "rgb(180,180,180)";
				path = new Path2D(panel.unused[iIdx].stripes);
				ctx.stroke(path);
				ctx.strokeStyle = "rgb(0,0,0)";
			}
			for(let iIdx = 0; iIdx < panel.used.length; iIdx++)
			{
				path = new Path2D(panel.used[iIdx].path);
				ctx.stroke(path);
			}
			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
			ctx.strokeStyle = "rgb(255,0,0)";
			ctx.stroke(path);
		}
	}

	return this;
	
})();
	
	// this.availMouseEnter = function(e)
	// {
		// e = e || window.event;
		// e.preventDefault();
		
		// shutterPos.in = true;
	// }
	// this.availMouseLeave = function(e)
	// {
		// e = e || window.event;
		// e.preventDefault();
		
		// shutterPos.in = false;
		
		// SSDisplay.redrawAvailOverlay();
		// SSDisplay.redrawMainOverlay();
		// //redrawMainPanel();
	// }
	// this.availMouseMove = function(e)
	// {
		// e = e || window.event;
		// e.preventDefault();
		
		// shutterPos.x = e.offsetX;// - objAvail.panel.offsetLeft - objAvail.lwrCnvs.offsetLeft;
		// shutterPos.y = e.offsetY;// - objAvail.panel.offsetTop - objAvail.lwrCnvs.offsetTop;
		
		// //console.log(shutterPos);
		
		// SSDisplay.redrawAvailOverlay();
		// SSDisplay.redrawMainOverlay();
		// //redrawMainPanel();

	// }

