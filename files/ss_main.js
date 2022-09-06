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
const SSMain = new(function()
{
	//This is used for main panel mouse events to capture state
	this.shutterPos = {x:0, y:0, in:false, grab:false};
	
	var shutterIdx = 0;

	var zoom = 1;
	
	var rotation = 0;
		
	var snapDist = 1;

	var panelInverseAtx = null;

	this.pnlObj = null;
	
	this.workingShutter = null;
	
	this.layerIdx = 3;
	this.layerText = ['Front', 'Inner', 'Back', 'Outline'];
	
	this.init = function()
	{
		let lwrCnvs = document.createElement('canvas');
		let upprCnvs = document.createElement('canvas');
		SSMain.pnlObj = SSPanel.panelFactory('pnlMain', lwrCnvs, upprCnvs);
		SSMain.pnlObj.redraw = SSMain.redrawMainPanel;
		//SSPanel.setPanelDrag(SSMain.pnlObj);
		//SSPanel.setPanelResize(SSMain.pnlObj);

		width = SSMain.pnlObj.panel.clientWidth;
		height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		SSMain.pnlObj.lwrCnvs.width = width;
		SSMain.pnlObj.lwrCnvs.height = height;
		SSMain.pnlObj.upprCnvs.width = width;
		SSMain.pnlObj.upprCnvs.height = height;
		SSMain.pnlObj.header.style.height = SSTools.hdrH.toString() + 'px';

		let btnNew = SSPanel.createButton('New', SSMain.clickNew);
		btnNew.style.width = '40px';
		
		//SSMain.pnlObj.hdrText.marginRight = '10px';
		//SSMain.pnlObj.header.innerHTML = 'Testy';
		//SSMain.pnlObj.header.display = 'inline-block';
		let btnPrevLayer = SSPanel.createButton('<', SSMain.prevLayer);
		btnPrevLayer.style.width = '20px';
		let lblLayer = document.createElement('span');
		lblLayer.innerHTML = 'Layer';
		let btnNextLayer = SSPanel.createButton('>', SSMain.nextLayer);
		btnNextLayer.style.width = '20px';

		let btnPrev = SSPanel.createButton('<', SSMain.prevShutter);
		btnPrev.style.width = '20px';
		let lblShutter = document.createElement('span');
		lblShutter.innerHTML = 'Shutter';
		let btnNext = SSPanel.createButton('>', SSMain.nextShutter);
		btnNext.style.width = '20px';
		
		let btnCut = SSPanel.createButton('Cut', SSMain.cutPanel);
		btnCut.style.width = '40px';
		
		SSMain.pnlObj.hdrRight.appendChild(btnNew);
		SSMain.pnlObj.hdrRight.appendChild(btnPrevLayer);
		SSMain.pnlObj.hdrRight.appendChild(lblLayer);
		SSMain.pnlObj.hdrRight.appendChild(btnNextLayer);
		SSMain.pnlObj.hdrRight.appendChild(btnPrev);
		SSMain.pnlObj.hdrRight.appendChild(lblShutter);
		SSMain.pnlObj.hdrRight.appendChild(btnNext);
		SSMain.pnlObj.hdrRight.appendChild(btnCut);
		
		SSMain.pnlObj.panel.onmouseenter = SSMain.mainMouseEnter;
		SSMain.pnlObj.panel.onmouseleave = SSMain.mainMouseLeave;
		SSMain.pnlObj.panel.onmousemove = SSMain.mainMouseMove;
		SSMain.pnlObj.panel.onmousedown = SSMain.mainMouseDown;
		SSMain.pnlObj.panel.onmouseup = SSMain.mainMouseUp;
	}
	
	this.mainMouseEnter = function(e)
	{
		e = e || window.event;
		e.preventDefault();
		
		SSMain.shutterPos.in = true;
	}
	this.mainMouseLeave = function(e)
	{
		e = e || window.event;
		e.preventDefault();
		
		SSMain.shutterPos.in = false;
		
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		//redrawMainPanel();
	}
	this.mainMouseMove = function(e)
	{
		e = e || window.event;
		e.preventDefault();
		
		if(SSMain.shutterPos.grab)
		{
			SSAvail.availSelect.moveX = e.offsetX - SSMain.shutterPos.x;
			SSAvail.availSelect.moveY = e.offsetY - SSMain.shutterPos.y;
			SSMain.redrawMainOverlay();
			SSAvail.redrawAvailOverlay();
			SSMain.rewriteMainHeader();
		}
		//console.log(SSMain.shutterPos);
		
		//redrawMainPanel();

	}
	this.mainMouseDown = function(e)
	{
		e = e || window.event;
		//e.preventDefault();

		SSMain.shutterPos.x = e.offsetX;// - objAvail.panel.offsetLeft - objAvail.lwrCnvs.offsetLeft;
		SSMain.shutterPos.y = e.offsetY;// - objAvail.panel.offsetTop - objAvail.lwrCnvs.offsetTop;
		
		SSMain.shutterPos.grab = true;
		if(SSMain.layerIdx > 2)return;
		if(SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.length == 0)
		{
			SSAvail.availSelect.textIdx = -1;
			for(let iIdx = 0; iIdx < bboxes[SSMain.layerIdx].length; iIdx++)
			{
				let bb = bboxes[SSMain.layerIdx][iIdx].bbox;
				console.log(bb, SSMain.shutterPos);
				if(SSMain.shutterPos.x < bb.x.min)continue;
				if(SSMain.shutterPos.x > bb.x.max)continue;
				if(SSMain.shutterPos.y < bb.y.min)continue;
				if(SSMain.shutterPos.y > bb.y.max)continue;
				SSAvail.availSelect.textIdx = iIdx;
				SSAvail.availSelect.refX = 0;
				SSAvail.availSelect.refY = 0;
				SSAvail.availSelect.moveX = 0;
				SSAvail.availSelect.moveY = 0;
				textRot = 0;
				break;
			}
		}
	}
	this.mainMouseUp = function(e)
	{
		e = e || window.event;
		//e.preventDefault();
		
		if(!SSMain.shutterPos.grab)return;

		SSMain.shutterPos.x = e.offsetX;// - objAvail.panel.offsetLeft - objAvail.lwrCnvs.offsetLeft;
		SSMain.shutterPos.y = e.offsetY;// - objAvail.panel.offsetTop - objAvail.lwrCnvs.offsetTop;
		
		SSAvail.availSelect.refX += SSAvail.availSelect.moveX;
		SSAvail.availSelect.refY += SSAvail.availSelect.moveY;
		//console.log('SSAvail.availSelect.refX, SSAvail.availSelect.refY', SSAvail.availSelect.refX, SSAvail.availSelect.refY);
		
		SSAvail.availSelect.moveX = 0;
		SSAvail.availSelect.moveY = 0;
		
		//Call snap
		SSMain.snap();
		
		SSMain.shutterPos.grab = false;
	}
	
	var cutShapes;
	this.cutPanel = function()
	{
		//The outline layer does not get panels
		if(SSMain.layerIdx >= 3)return;
		//Get the uncovered area on this shutter and this layer
		let uncovered = SSMain.workingShutter.layers[SSMain.layerIdx].uncovered;
		//The layer is completely covered
		//Get panel selected in panel window
		let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
		if(uncovered.length == 0)
		{
			if(SSAvail.availSelect.editIdx < 0)return;
			//Below is the code that intuitively moves the text, which is what the user should be able
			//to do.  It is important to note that the mouse controls the movement on the screen.
			// We must translate that back to movement on the panel. There is a different concept at work.
			// Instead of manipulating a path with a transform.  We need to manipulate the transform
			// if(textRot != 0)moveText = utils.svgTransform(moveText, Affine.getRotateATx(textRot));
			// moveText = utils.svgTransform(moveText, bboxes[SSMain.layerIdx][iIdx].Atx);
			// moveText = utils.svgTransform(moveText, piece.panelTrans);
			// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.moveX/mainUnit, y:-SSAvail.availSelect.moveY/mainUnit}));
			
			// moveText = utils.svgTransform(moveText, bboxes[SSMain.layerIdx][iIdx].Atx);
			// moveText = utils.svgTransform(moveText, piece.panelTrans);
			
			//let Atx = bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].Atx;
			//Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:SSAvail.availSelect.refX, y:-SSAvail.availSelect.refY}));
			let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].ppIdx];
			let inversePanelTrans = Affine.getInverseATx(piece.panelTrans);
			let Atx = Affine.affineAppend(inversePanelTrans, Affine.getTranslateATx({x:SSAvail.availSelect.refX/mainUnit, y:-SSAvail.availSelect.refY/mainUnit}));
			Atx = Affine.affineAppend(Atx, piece.panelTrans);
			Atx = Affine.affineAppend(Atx, bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].Atx);
			//Do the rotation first
			if(textRot != 0)Atx = Affine.affineAppend(Atx, Affine.getRotateATx(textRot));
			//Atx = Affine.affineAppend(Atx, inversePanelTrans);
			//Now the translation is last
			bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].Atx = Atx;
			SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = Atx;
			// moveText = utils.svgTransform(moveText, bboxes[SSMain.layerIdx][iIdx].Atx);
			// moveText = utils.svgTransform(moveText, mainAtx);
			// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.refX, y:SSAvail.availSelect.refY}));
			return;
		}
		//let localUsedIdx = SSAvail.availSelect.usedIdx;
		
		//Get type of panel
		if(SSAvail.avs[SSAvail.availSelect.idx].t == 0)
		{
			//We have a blank, clone the blank into a panel that can be used
			SSTools.design.file.panels.push(new CorrPanel(SSTools.design, SSAvail.avs[panelIdx].i));
			//Tell the system to reconfigure for new panel count
			SSAvail.recalcAvailPanels();
			//Point the index to the new panel
			SSAvail.availSelect.idx = SSAvail.availSelect.count - 1;
			SSAvail.avs[SSAvail.availSelect.idx].i = SSTools.design.file.panels.length - 1;
			panelIdx = SSTools.design.file.panels.length - 1;
			//localUsedIdx = 0;
		}
		
		//Get the panel at the index
		let panel = SSTools.design.file.panels[panelIdx];
		let overlaps = [];
		let Atx;
		//For now look at all possible intersections between unused panel pieces and uncovered shutter area.
		//We may change this later for a way to limit the search if we found that is needed.  At present,
		//I can't think of a use case where it is needed.
		let newUncovered = [];
		for(let iIdx = 0; iIdx < uncovered.length; iIdx++)
		{
			let upoly = utils.svg2Poly(uncovered[iIdx]);
			//upoly.reverse();
			//console.log(upoly);
			console.log('uncovered');
			//SSDisplay.logPoly(upoly);
			let uncoveredArea = new Area(upoly);
			console.log('uncoveredArea cw', uncoveredArea.solids[0].cw);
			//console.log('uncoveredArea', uncoveredArea);
			for(let iPdx = 0; iPdx < panel.unused.length; iPdx++)
			{
				let poly = utils.svg2Poly(panel.unused[iPdx].path);
				// if(SSAvail.rotation != 0)
				// {
					// utils.transformPoly(poly, Affine.getRotateATx(SSAvail.rotation));
				// }
				Atx = Affine.getTranslateATx({x:SSAvail.availSelect.refX/mainUnit, y:-SSAvail.availSelect.refY/mainUnit});
				//if(SSAvail.rotation != 0)Atx = Affine.affineAppend(Affine.getRotateATx(SSAvail.rotation), Atx);
				if(SSAvail.rotation != 0)Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
				utils.transformPoly(poly, Atx);
				console.log('transformed panel');
				//SSDisplay.logPoly(poly);
				//poly.reverse();
				let panelArea = new Area(poly);
				//console.log('panelArea', panelArea);
				console.log('panelArea cw', panelArea.solids[0].cw);
				panelArea.intersect(uncoveredArea);
				console.log('intersected panel');
				if(panelArea.solids.length != 0)
				{
					//SSDisplay.logPoly(panelArea.solids[0]);
				}
				console.log('uncoveredArea cw after intersect', uncoveredArea.solids[0].cw);
				console.log('Subtract panel intersect Area from uncovered');
				uncoveredArea.subtract(panelArea);
				console.log('uncoveredArea subtracted panel intersect');
				if(uncoveredArea.solids.length != 0)
				{
					//SSDisplay.logPoly(uncoveredArea.solids[0]);
				}
				//console.log('uncoveredArea', uncoveredArea);
				newUncovered.push(...uncoveredArea.solids);
				if(!panelArea.isEmpty())
				{
					//Return to the panel coordinate system
					let RAtx = Affine.getIdentityATx();
					if(SSAvail.rotation != 0)RAtx = Affine.getRotateATx(-SSAvail.rotation);
					RAtx = Affine.affineAppend(RAtx, Affine.getTranslateATx({x:-SSAvail.availSelect.refX/mainUnit, y:SSAvail.availSelect.refY/mainUnit}), RAtx);
					panelArea.transform(RAtx);
					//Store the intersecting area and the index into the panel unused array
					overlaps.push({area:panelArea, idx:iPdx});
				}
			}
		}
		console.log('newUncovered', newUncovered);
		SSMain.workingShutter.layers[SSMain.layerIdx].uncovered = [];
		for(let iIdx = 0; iIdx < newUncovered.length; iIdx++)
		{
			SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.push(utils.poly2Svg(newUncovered[iIdx]));
		}
		//cutShapes = overlaps;
		//console.log('overlaps', overlaps);
		
		//panel.unused = [];
		// for(let iIdx = 0; iIdx < overlaps.length; iIdx++)
		// {
			// let anOverlap = overlaps[iIdx];
			// let panelUnusedArea = new Area(utils.svg2Poly(panel.unused[anOverlap.idx].path));
			// panelUnusedArea.subtract(anOverlap.area);
			// panel.unused = [];
			// for(let iJdx = 0; iJdx < panelUnusedArea.solids.length; iJdx++)
			// {
				// let aSolid = panelUnusedArea.solids[iJdx];
				// //panel.unused[anOverlap.idx]
				// panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
			// }
			// // for(let iJdx = 0; iJdx < anOverlap.area.solids.length; iJdx++)
			// // {
				// // let aSolid = anOverlap.area.solids[iJdx];
				// // panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
			// // }
		// }
		// SSAvail.redrawAvailPanel();
		// return;
		//Now we have all the overlaps
		for(let iIdx = 0; iIdx < overlaps.length; iIdx++)
		{
			let anOverlap = overlaps[iIdx];
			for(let iJdx = 0; iJdx < anOverlap.area.solids.length; iJdx++)
			{
				let aSolid = anOverlap.area.solids[iJdx];
				panel.used.push(new Piece(panel, utils.poly2Svg(aSolid), workingIdx, SSMain.layerIdx, SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length));
			
				//Add this used panel to the shutter
				//SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.push(new LayerPiece(SSAvail.avs[panelIdx].i, panel.used.length - 1, Atx));
				SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.push(new LayerPiece(panelIdx, panel.used.length - 1, Atx));
			}
			let panelUnusedArea = new Area(utils.svg2Poly(panel.unused[anOverlap.idx].path));
			console.log('anOverlap.area', anOverlap.area);
			console.log('Subtract intercept from unsed panel');
			panelUnusedArea.subtract(anOverlap.area);
			cutShapes = [panelUnusedArea];
			for(let iJdx = 0; iJdx < panelUnusedArea.solids.length; iJdx++)
			{
				let aSolid = panelUnusedArea.solids[iJdx];
				console.log('aSolid', aSolid);
				//This is tricky we need to remove the original areas, do that later
				panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
			}
			//Now we need to fix the uncovered area
		}
		//Now work backwards to remove previous unused areas
		for(let iIdx = overlaps.length - 1; iIdx >= 0; iIdx--)
		{
			panel.unused.splice(overlaps[iIdx].idx,1);
		}
		console.log('panel',panel);
		SSAvail.availSelect.idx = -1;
		SSAvail.redrawAvailPanel();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
	}

	this.snap = function()
	{
		let panelTest = snapPanel();
		//console.log(panelTest);
		if(!panelTest.found)return;
		
		let shutterTest = snapShutter();
		
		console.log(shutterTest);
		
		if(!shutterTest.found)return;
		
		//We have two points do a snap
		//let dX = panelTest.x - shutterTest.x;
		//let dY = -panelTest.y - shutterTest.y;
		//We need a translation in mouse (graphics units)
		//For the shutter we scale and translate
		let width = SSMain.pnlObj.panel.clientWidth;
		let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		// Display orign
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		let atx = Affine.getTranslateATx({x:x0, y:y0});
		atx = Affine.affineAppend(atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		Affine.transformPoint(shutterTest, atx);
		
		//The panel has an additional rotate
		atx = Affine.affineAppend(atx, Affine.getRotateATx(SSAvail.rotation));
		Affine.transformPoint(panelTest, atx);
		
		//Now we have both in graphics units.  The difference gives us the exact translation
		//in graphics units to match these two points up.
		let dX = shutterTest.x - panelTest.x;
		let dY = shutterTest.y - panelTest.y;
		
		//let pt = {x:dX, y:dY};
		
		// console.log('dX, dY', dX, dY);
		// console.log('mainUnit', mainUnit);
		
		SSAvail.availSelect.refX = dX; //Convert to graphics units
		SSAvail.availSelect.refY = dY;
		//Should already be 0, but just in case.
		SSAvail.availSelect.moveX = 0;
		SSAvail.availSelect.moveY = 0;
		
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
	}
	
	/*
	* Look for points on shutter layer to snap to
	* Note this not only includes points on the shutter, but also includes points on previously placed pieces
	*/
	var snapShutter = function()
	{
		let width = SSMain.pnlObj.upprCnvs.width;
		let height = SSMain.pnlObj.upprCnvs.height;
		// Display origin
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		let path = SSMain.workingShutter.outline;
		let realX = (SSMain.shutterPos.x - x0) / mainUnit;
		let realY = (y0 - SSMain.shutterPos.y) / mainUnit;
		let test = findPoint(path, realX, realY, snapDist);
		if(test.found)return test;
		
		//No point on shutter, look at pieces
		//console.log('realX, realY', realX, realY);
		let pieces = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces;
		for(let iIdx = 0; iIdx < pieces.length; iIdx++)
		{
			path = SSTools.design.file.panels[pieces[iIdx].panelIdx].used[pieces[iIdx].panelPieceIdx].path;
			path = utils.svgTransform(path, pieces[iIdx].panelTrans);
			//console.log('snapShutter peice' realX, realY. path);
			test = findPoint(path, realX, realY, snapDist);
			if(test.found)return test;
		}
		
		return test; //Tricky, we know test is false
	}
	/*
	* Look for points on unused panel pieces to snap to
	*/
	var snapPanel = function()
	{
		if(SSAvail.availSelect.idx < 0)return{x:0, y:0, found:false};
		if(panelInverseAtx == null)return{x:0, y:0, found:false};
		
		if(SSAvail.avs[SSAvail.availSelect.idx].t == 2)return {x:0, y:0, found:false};
		let width = SSMain.pnlObj.upprCnvs.width;
		let height = SSMain.pnlObj.upprCnvs.height;
		// Display orign
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		
		//We need the real coordinates in the panel system for where the mouse is at
		//There is a more direct route, but the clearest solution is to find a mouse
		//to panel coordinate transform. To do this we find the panel to screen
		//transform and inverse it.
		// let Atx = Affine.getRotateATx(SSAvail.rotation);
		// Atx = Affine.affineAppend(Atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		// Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:SSAvail.availSelect.refX + SSAvail.availSelect.moveX + x0, y:SSAvail.availSelect.refY + SSAvail.availSelect.moveY + y0}));
		//The following transform goes from real to graphics coordinates.  Transforms operate in reverse order.
		// We have a rotate around the origin in real coordinate, followed by scaling to graphics coordinates
		// finally a translation in the graphics system for centering and movement with mouse drag.
		//Go to center plus drag moves
		// let Atx = Affine.getTranslateATx({x:SSAvail.availSelect.refX + SSAvail.availSelect.moveX + x0, y:SSAvail.availSelect.refY + SSAvail.availSelect.moveY + y0});
		// //Scale from real to graphics. Note Y axis is reversed
		// //console.log('mainUnit', mainUnit);
		// Atx = Affine.affineAppend(Atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		// //Rotate if required
		// Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
		
		// //Now get the inverse transform to get real points from graphics points (mouse position)
		// Atx = Affine.getInverseATx(Atx);
		let Real = {x:SSMain.shutterPos.x, y:SSMain.shutterPos.y};
		console.log('panelInverseAtx', panelInverseAtx);
		Affine.transformPoint(Real, panelInverseAtx);
		// let realX = -((SSAvail.availSelect.refX + SSAvail.availSelect.moveX)/mainUnit + ((x0 - SSMain.shutterPos.x) / mainUnit));
		// let realY = -((SSAvail.availSelect.refY + SSAvail.availSelect.moveY)/mainUnit - ((y0 - SSMain.shutterPos.y) / mainUnit));
		// let realX = -((SSAvail.availSelect.refX + SSAvail.availSelect.moveX - x0)/mainUnit);
		// let realY = -((SSAvail.availSelect.refY + SSAvail.availSelect.moveY - y0)/mainUnit);
		//console.log('snapPanel: realX, realY', Real.x, Real.y);
		//let rotAt = Affine.getRotateATx(SSAvail.rotation);
		if(SSAvail.avs[SSAvail.availSelect.idx].t == 0)
		{
			//We are working a blank
			let path = SSTools.design.file.blanks[SSAvail.avs[SSAvail.availSelect.idx].i].path;
			return findPoint(path, Real.x, Real.y, snapDist);
		}
		
		//Implied else we are working a used panel
		let panel = SSTools.design.file.panels[SSAvail.avs[SSAvail.availSelect.idx].i];
		for(let iIdx = 0; iIdx < panel.unused.length; iIdx++)
		{
			let path = panel.unused[iIdx].path;
			let test = findPoint(path, Real.x, Real.y, snapDist);
			if(test.found)return test;
		}
		return {x:0, y:0, found:false};
	}
	
	var findPoint = function(path, x, y, dist)
	{
		let poly = utils.svg2Poly(path);
		//utils.transformPoly(poly, aTx);
		for(let iIdx = 0; iIdx < poly.curves.length; iIdx++)
		{
			let curve = poly.curves[iIdx];
			//console.log(curve);
			for(let iPdx = 0; iPdx < curve.points.length; iPdx++)
			{
				let dX = curve.points[iPdx].x - x;
				let dY = curve.points[iPdx].y - y;
				let d2 = dX*dX + dY*dY;
				if(d2 <= (dist * dist))
				{
					//return {x:dX, y:dY, found:true};
					//console.log(curve);
					return {x:curve.points[iPdx].x, y:curve.points[iPdx].y, found:true};
				}
			}
		}
		return {x:0, y:0, found:false};
	}
	
	this.prevShutter = function()
	{
		shutterIdx--;
		if(shutterIdx < 0)shutterIdx = SSTools.design.file.shutters.length - 1;
		
		SSMain.setWorkingShutter(shutterIdx);
		
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
	}
	
	this.nextShutter = function()
	{
		shutterIdx++;
		if(shutterIdx >= SSTools.design.file.shutters.length)shutterIdx = 0;
		
		SSMain.setWorkingShutter(shutterIdx);
		
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
	}
	
	this.prevLayer = function()
	{
		SSMain.layerIdx--;
		if(SSMain.layerIdx < 0)SSMain.layerIdx = 3;
		
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
	}
	
	this.nextLayer = function()
	{
		SSMain.layerIdx++;
		if(SSMain.layerIdx >= 4)SSMain.layerIdx = 0;
		
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
	}
	
	this.prevPanel = function()
	{
		do
		{
			SSAvail.availSelect.idx--;
			if(SSAvail.availSelect.idx < 0)SSAvail.availSelect.idx = SSAvail.avs.length - 1;
		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
		SSDisplay.redrawCNCPanel();
	}
	
	this.nextPanel = function()
	{
		do
		{
			SSAvail.availSelect.idx++;
			if(SSAvail.availSelect.idx >= SSAvail.avs.length)SSAvail.availSelect.idx = 0;
		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
		SSDisplay.redrawCNCPanel();
	}
	
	this.clickNew = function()
	{
		SSEntry.newShutter();
	}
	
	var tempShutter;
	/*
	* When we move to a new shutter, there are things which are more efficient if done once.
	* For example, we need to detect when a text is selected so that we can move it.  The detection
	* is done by looking for mouse clicks in the bounding boxes for the text.  Those bounding boxes 
	* are defined here.
	*/
	this.setWorkingShutter = function(idx)
	{
		workingIdx = idx;
		if(idx <0)
		{
			tempShutter = new Shutter(new ShutterDesign(''), 'Example Shutter', utils.svgRect(-52.5/2, -38/2, 52.5, 38));
			SSMain.workingShutter = tempShutter;
		}else
		{
			SSMain.workingShutter = SSTools.design.file.shutters[idx];
		}
		let minX = SSMain.workingShutter.minX;
		let minY = SSMain.workingShutter.minY
		let maxX = SSMain.workingShutter.maxX;
		let maxY = SSMain.workingShutter.maxY
		let width = SSMain.pnlObj.panel.clientWidth;
		let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		SSMain.pnlObj.lwrCnvs.width = width;
		SSMain.pnlObj.lwrCnvs.height = height;
		SSMain.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		SSMain.pnlObj.lwrCnvs.style.height = height.toString()+'px';
		SSMain.pnlObj.lwrCnvs.style.top = SSTools.hdrH.toString() + 'px';
		SSMain.pnlObj.lwrCnvs.style.left = '0px';
		// Display orign
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		// mainUnit controls scaling.  It is number of pixels for 100 drawing units
		mainUnit = zoom * SSDisplay.calcDisplayScale( width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		mainAtx = Affine.getTranslateATx({x:x0, y:y0});
		//mainAtx = Affine.affineAppend(Affine.getScaleATx({x:mainUnit, y:-mainUnit}), mainAtx);
		mainAtx = Affine.affineAppend(mainAtx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		//console.log('mainAtx', mainAtx);
		//let ctx = SSMain.pnlObj.lwrCnvs.getContext("2d");
		bboxes = [[], [], []];
		//bboxes = [];
		textRot = 0;
		for(let iIdx = 0; iIdx < 3; iIdx++)
		{
			//bboxes.push([]);
			for(let iJdx = 0; iJdx < SSMain.workingShutter.layers[iIdx].panelPieces.length; iJdx++)
			{
				let piece = SSMain.workingShutter.layers[iIdx].panelPieces[iJdx];
				//let at = piece.panelTrans;
				//Now position the associated text
				//let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[iIdx] + ' ' + iJdx.toString();
				let sText = SSTools.design.getShutterPieceText(workingIdx, iIdx, iJdx);
				//console.log('sText', sText);
				let pathTxt = VectorText.svgText(sText, 1);
				let Atx = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans;
				let polyTxt = utils.svgTransform(pathTxt, Atx);
				polyTxt = utils.svgTransform(polyTxt, piece.panelTrans);
				polyTxt = utils.svgTransform(polyTxt, mainAtx);
				let polys = utils.svg2Polys(polyTxt);
				bboxes[iIdx].push({path:pathTxt, bbox:utils.bboxPolys(polys), ppIdx:iJdx, Atx:Atx});
			}
		}		
	}
	
	this.rewriteMainHeader = function()
	{
		let sText = 'Shutter: ';
		if(shutterIdx < SSTools.design.file.shutters.length)
		{
			sText += SSTools.design.getShutter(shutterIdx).description;
			sText += '    Layer: ' + SSMain.layerText[SSMain.layerIdx];
		}
		SSMain.pnlObj.hdrLeft.innerHTML = sText;
		// let Atx = Affine.getTranslateATx({x:SSAvail.availSelect.refX, y:SSAvail.availSelect.refY});
		// //if(rotation != 0)Atx = Affine.affineAppend(Affine.getRotateATx(rotation), Atx);
		// if(rotation != 0)Atx = Affine.affineAppend(Atx, Affine.getRotateATx(rotation));
		// let aText = '';
		// for(let iIdx = 0; iIdx < Atx.length; iIdx++)
		// {
			// for(let iJdx = 0; iJdx < Atx[iIdx].length; iJdx++)
			// {
				// aText += Atx[iIdx][iJdx].toFixed(3) + ' ';
			// }
		// }
		// SSMain.pnlObj.hdrMiddle.innerHTML = aText;
	}
		
	this.redrawMainPanel = function()
	{
		//console.log('Redraw Main Panel');
		//console.log(SSMain.pnlObj.panel.clientWidth, SSMain.pnlObj.panel.clientHeight);
		//1st we need to know the limits for the given shutter.
		let minX = SSMain.workingShutter.minX;
		let minY = SSMain.workingShutter.minY
		let maxX = SSMain.workingShutter.maxX;
		let maxY = SSMain.workingShutter.maxY
		let width = SSMain.pnlObj.panel.clientWidth;
		let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		SSMain.pnlObj.lwrCnvs.width = width;
		SSMain.pnlObj.lwrCnvs.height = height;
		SSMain.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		SSMain.pnlObj.lwrCnvs.style.height = height.toString()+'px';
		SSMain.pnlObj.lwrCnvs.style.top = SSTools.hdrH.toString() + 'px';
		SSMain.pnlObj.lwrCnvs.style.left = '0px';
		// Display orign
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		// mainUnit controls scaling.  It is number of pixels for 100 drawing units
		mainUnit = zoom*SSDisplay.calcDisplayScale( width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		let ctx = SSMain.pnlObj.lwrCnvs.getContext("2d");
		SSDisplay.displayScales(ctx, width - 20, height - 20, x0, y0, mainUnit);
		//Now the rest of the story
		ctx.save();
		
		//console.log('mainUnit', mainUnit);
		//console.log(20 + mainUnit, height - 20 - mainUnit);
		//console.log(SSMain.workingShutter.outline);
		//Move 0,0 from upper left down to scale point
		ctx.translate(x0, y0);
		//ctx.translate(width/2, height/2);
		//now scale it
		ctx.scale(mainUnit, -mainUnit);
		ctx.lineWidth = 2/mainUnit;  //Compensate for scaling
		let path = new Path2D(SSMain.workingShutter.outline);
		//ctx.strokeStyle = 'black';
		ctx.fillStyle = 'rgb(230,230,230)';
		ctx.fill(path);
		ctx.stroke(path);
		for(let iIdx = 0; iIdx < SSMain.workingShutter.holes.length; iIdx++)
		{
			let hole = SSMain.workingShutter.holes[iIdx];
			let holePoly = SSCNC.makeHolePath(hole.dia, hole.center, 0);
			path = new Path2D(utils.poly2Svg(holePoly));
			ctx.stroke(path);
		}
		//Now to draw the panel pieces
		if(SSMain.layerIdx != 3)
		{
			console.log('panelPieces.length', SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length);
			console.log('SSTools.design.blankKOs', SSTools.design.blankKOs);
			for(let iIdx = 0; iIdx < SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length; iIdx++)
			{
				let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[iIdx];
				//let at = piece.panelTrans;
				ctx.save();
				Affine.ctxTransform(ctx, piece.panelTrans);
				//ctx.transform(at[0][0], at[1][0], at[0][1], at[1][1], at[0][2], at[1][2]);
				console.log('piece', piece);
				path = new Path2D(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path);
				ctx.strokeStyle = "rgb(0,0,0)";
				ctx.stroke(path);
				path = new Path2D(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].stripes);
				ctx.strokeStyle = "rgb(180,180,180)";
				ctx.stroke(path);
				//Now position the associated text
				//NOTE this is now on overlay
				// let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[SSMain.layerIdx];
				// let sText = SSTools.design.getShutterPieceText(workingIdx, SSMain.layerIdx, piece.panelPieceIdx);
				// let pathTxt = SSCNC.svgText(sText, 1);
				// if(rotation != 0)pathTxt = utils.svgTransform(pathTxt, Affine.getRotateATx(rotation));

				// pathTxt = utils.svgTransform(pathTxt, SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans);
				// ctx.strokeStyle = "rgb(0,0,0)";
				// ctx.stroke(new Path2D(pathTxt));
				let poly = utils.svg2Poly(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path);
				let keepOut = SSTools.design.blankKOs[SSTools.design.file.panels[piece.panelIdx].blankIdx];
				console.log('keepOut', keepOut);
				let intersects = utils.intersections(poly, keepOut, 0.01);
				console.log('intersects', intersects);
				let curves = [];
				if(intersects.length != 0)
				{
					//We just want the keepOut lines on this panel piece
					let defensiveCnt = 0;
					let header = intersects.pop(); //Get the header
					let startIdx = header.next[1];
					let workingIdx = startIdx;
					do{
						let workingIntersect = intersects[workingIdx];
						let nextIdx = workingIntersect.next[1];
						let nextIntersect = intersects[nextIdx];
						//Tricky, not using if to allow implied else
						while(workingIntersect.xp < 0)
						{
							//KeepOut is entering piece
							if(workingIntersect.idx[1] == nextIntersect.idx[1])
							{
								//This will not happen for the panels, but in general this handles
								//the case where there are two intersections on the same curve
								curves.push(keepOut.curves[workingIntersect.idx[1]].split(workingIntersect.t[1], nextIntersect.t[1]));
								break;
							}
							console.log('workingIntersect.idx[1]', workingIntersect.idx[1]);
							curves.push(keepOut.curves[workingIntersect.idx[1]].split(workingIntersect.t[1], 1.0));
							let c2Idx = workingIntersect.idx[1] + 1;
							if(c2Idx >= keepOut.curves.length)c2Idx = 0;
							while(c2Idx != nextIntersect.idx[1])
							{
								curves.push(keepOut.curves[c2Idx++]);
								if(c2Idx >= keepOut.curves.length)c2Idx = 0;
							}
							console.log('c2Idx', c2Idx);
							curves.push(keepOut.curves[c2Idx].split(0, nextIntersect.t[1]));
							break;
						}
						workingIdx = nextIdx;
						defensiveCnt++;
						console.log('defensiveCnt', defensiveCnt);
					}while(workingIdx != startIdx && defensiveCnt <= 2*intersects.length);
				}
				//path = new Path2D(utils.poly2Svg(keepOut));
				//utils.transformPoly(poly, piece.panelTrans);M -22 -4.497787560897219 L -22 45.9968122656
				//curves.pop();
				poly = new PolyBezier(curves);
				console.log('utils.poly2Svg(poly)', utils.poly2Svg(poly));
				path = new Path2D(utils.poly2Svg(poly));
				//path = new Path2D('M -21.5 -4 L -22 46 ');
				ctx.strokeStyle = "rgb(255,0,0)";
				ctx.stroke(path);
				ctx.restore();
				//path = 
			}
		}
		ctx.restore();
		path = new Path2D('M 20 ' + y0.toString() + ' L ' + width.toString() + ' ' + y0.toString());
		ctx.strokeStyle = "rgb(200,200,200)";
		ctx.stroke(path);
		path = new Path2D('M ' + x0.toString() + ' 0  L ' + x0.toString() + ' ' + (height - 20).toString());
		ctx.stroke(path);
	}
	
	this.redrawMainOverlay = function()
	{
		let width = SSMain.pnlObj.panel.clientWidth;
		let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		SSMain.pnlObj.upprCnvs.width = width;
		SSMain.pnlObj.upprCnvs.height = height;
		SSMain.pnlObj.upprCnvs.style.width = width.toString()+'px';
		SSMain.pnlObj.upprCnvs.style.height = height.toString()+'px';
		SSMain.pnlObj.upprCnvs.style.top = SSTools.hdrH.toString() + 'px';
		SSMain.pnlObj.upprCnvs.style.left = '0px';
		let ctx = SSMain.pnlObj.upprCnvs.getContext("2d");
		ctx.globalAlpha = 0.0;
		ctx.clearRect(0, 0, width, height);
		ctx.globalAlpha = 1.0;
		if((SSMain.layerIdx == 3) || (SSAvail.availSelect.idx < 0))return;
		//if(!SSMain.shutterPos.in)return;
		let minX = SSMain.workingShutter.minX;
		let minY = SSMain.workingShutter.minY
		let maxX = SSMain.workingShutter.maxX;
		let maxY = SSMain.workingShutter.maxY
		// Display orign
		// let x0 = 10 + width/2 + SSAvail.availSelect.moveX;
		// let y0 = -10 + height/2 + SSAvail.availSelect.moveY;
		let x0 = 10 + width/2;
		let y0 = -10 + height/2;
		// unit controls scaling.  It is number of pixels for 100 drawing units
		mainUnit = zoom * SSDisplay.calcDisplayScale( width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		mainAtx = Affine.getTranslateATx({x:x0, y:y0});
		//mainAtx = Affine.affineAppend( Affine.getScaleATx({x:mainUnit, y:-mainUnit}), mainAtx);
		mainAtx = Affine.affineAppend(mainAtx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		//Now adjust scaling
		ctx.save();
		//console.log('mainUnit', mainUnit);
		//console.log(20 + mainUnit, height - 20 - mainUnit);
		//console.log(SSMain.workingShutter.outline);
		//Move 0,0 from upper left down to scale point
		ctx.translate(x0, y0);
		//ctx.translate(width/2, height/2);
		//now scale it
		ctx.scale(mainUnit, -mainUnit);
		ctx.lineWidth = 2/mainUnit;  //Compensate for scaling
		if(SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.length == 0)
		{
			//ctx.restore();
			for(let iIdx = 0; iIdx < bboxes[SSMain.layerIdx].length; iIdx++)
			{
				 let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[bboxes[SSMain.layerIdx][iIdx].ppIdx];
				//let at = piece.panelTrans;
				ctx.save();
				//Affine.ctxTransform(ctx, piece.panelTrans);
				//Now position the associated text
				//let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[SSMain.layerIdx];
				//let pathTxt = SSCNC.svgText(sText, 1);
				//if(rotation != 0)pathTxt = utils.svgTransform(pathTxt, Affine.getRotateATx(rotation));

				//pathTxt = utils.svgTransform(pathTxt, SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans);
				ctx.strokeStyle = "rgb(0,0,0)";
				let moveText = bboxes[SSMain.layerIdx][iIdx].path;
				if(iIdx == SSAvail.availSelect.textIdx)
				{
					SSAvail.availSelect.editIdx = SSAvail.availSelect.textIdx;
					if(textRot != 0)moveText = utils.svgTransform(moveText, Affine.getRotateATx(textRot));
					moveText = utils.svgTransform(moveText, bboxes[SSMain.layerIdx][iIdx].Atx);
					moveText = utils.svgTransform(moveText, piece.panelTrans);
					moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.moveX/mainUnit, y:-SSAvail.availSelect.moveY/mainUnit}));
					//moveText = utils.svgTransform(moveText, mainAtx);
					ctx.strokeStyle = "rgb(0,0,255)";
				}else
				{
					moveText = utils.svgTransform(moveText, bboxes[SSMain.layerIdx][iIdx].Atx);
					moveText = utils.svgTransform(moveText, piece.panelTrans);
					//moveText = utils.svgTransform(moveText, mainAtx);
				}
				ctx.stroke(new Path2D(moveText));
				ctx.restore();
				//path = 
			}
			ctx.restore();
			return;
		}
		ctx.restore();
		ctx.save();
		let Atx = Affine.getTranslateATx({x:x0 + (SSAvail.availSelect.refX + SSAvail.availSelect.moveX),y:y0 + (SSAvail.availSelect.refY + SSAvail.availSelect.moveY)});
		Atx = Affine.affineAppend(Atx, Affine.getScaleATx({x:mainUnit,y:-mainUnit}));
		Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
		Affine.ctxTransform(ctx, Atx);
		ctx.lineWidth = 2/mainUnit;  //Compensate for scaling
		panelInverseAtx = Affine.getInverseATx(Atx);
		//console.log('panelInverseAtx', panelInverseAtx);
		SSAvail.drawPanelWCtx(ctx, SSAvail.avs[SSAvail.availSelect.idx].t, SSAvail.avs[SSAvail.availSelect.idx].i);
		ctx.restore();
	}
	
	return this;
	
})();
