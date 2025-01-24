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
* Normally we would discuss design here.  In this case, we are discussing a new feature on
* 07 Sep 2022.  We want to implement an "uncut" that allows us to reverse a panel cut.  The
* step to "uncut" is to select a piece.  We have added a select field to the pieces.
* One tricky part is dtermining the context in which the mouse is clicked and released.
* Presently it is assumed that a panel is being dragged into position to be cut. We have
* one mechanism if the shutter has no uncovered areas, but we would like to be able to
* uncut on partially covered shutters.  One way to do this is to use the ctrl key as a
* context indication.
*
* The simplest implementation is to use the ctrl key. Now we can determine the shutter world
* coordinate of the mouse click.  Then we can inverse the panel piece transforms to find if
* the click is within a covered area
*
* We are revisiting this on 03 Dec 2024. Looking at how snap works and I don't like how I did it.
* First of all, I should only look at endpoints.  Second, I should be looking for the closest
* endpoint to the mouse click.  Also, instead of looking at both the panel and the shutter when
* releasing the mouse, I should look at the panel when the mouse is clicked and the shutter when
* the mouse is released.  This is because the panel is the moving object and the shutter is the
* static object.  I need to change the snap to only look at endpoints and to look at the panel
* when the mouse is clicked and the shutter when the mouse is released.
*
* I have to say that I am not happy with the way I did this before. I think the way it should work
* is that we have a transform and reverse transform for both the panel and the shutter. As discussed
* the shutter is static and the panel is moving.  We should "grab" the panel at a corner (endpoint)
* and have that point follow the mouse.  When the mouse is released, we should snap the endpoint to
* the closest endpoint on the shutter.  This is a little tricky because the endpoints are in the
* transformed coordinate system.  We have to inverse the transform to get the endpoints in the world
* coordinate system.  We then have to find the closest endpoint to the mouse click in the world
* coordinate system.  We then have to transform that endpoint back to the panel coordinate system. There
* is another subtlety here.  We ultimately want the panel to be in the shutter coordinate system.  The
* transform in that system is the panel transform that is stored in the panel piece.  So when we talk
* about the panel transform, we are talking about a transform in the real world shutter coordinate system.
*
* The display functions are going to use the things we set up to do the display.  We will establish what
* those are by discussing the design of the display functions. We have two canvases involved. NOTE: We are
* discussing the Shutter window here.  The lower canvas is the shutter and is static.  The upper canvas is
* selected panel and is moving.  The upper canvas is the one that is being manipulated.  The lower canvas
* uses a transform from the shutter coordinate system to the canvas coordinate system.  One can pan and zoom
* with mouse events.  The upper canvas uses a transform from the panel coordinate system to the shutter
* coordinate system.  The shutter's coordinate system has it origin in the middle of the shutter.  The panel
* coordinate system has its origin in the center of the panel.  By definition the panel starts in the center
* of the shutter.  The panel is moved by dragging the mouse.  The panel is rotated by the "r' or 'R' keys.
*
* The upper canvas is called the overlay and the display functions are called redrawMainOverlay.  As discussed
* the selected panel is moved by dragging the mouse.  It is a little more complicated than that.  The mouse
* is tied to a point on the panel.  That point is the point that is closest to the mouse when the mouse is
* clicked.  In any case the mouse event will be a display coordinate in the shutter coordinate system.  Things
* are complicated by the fact that the panel is rotated.  This rotation must happen before the translation.
* There are two ways to look at this. One way is to have a panel to display transform. The more desirable way
* is to find the real world coordinates of the mouse in the shutter coordinate system.  We can assume the panel
* is in the same system after the rotation. Then we can calculate the translation in the panel coordinate system
* and apply it to the panel.  The panel is then redrawn in the shutter coordinate system.
*
* One other discussion is the mouse up event. We should snap the panel to the closest endpoint on the shutter.
* As discussed, the translation happens after the rotation. The final panel translation should put the panel
* corner at the closest endpoint on the shutter.  The panel is then redrawn in the shutter coordinate system.
*
* The needed variables are:
* The real world corner point for the panel
* The panel rotation
* The shutter transform and inverse transform
* The panel transform and inverse transform
* The mouse down point in the shutter coordinate system
*
* Now for a discussion about the text. The point of the text is to identify the pieces. Each piece has
* some text associated with it that should be unique enough to identify the piece.  The pieces have various
* orientations and positions.  And the text has a form factor that is rectangular.  It would be difficult
* to place the text in a automatic way.  The user should be able to move the text to a position that is
* convenient.  We have a precedent for relative positioning with the pieces having transforms from the
* panel coordinate system to the shutter coordinate system.  We can use the same mechanism for the text.
* In this case, the text is in the panel coordinate system. The point of this part of the discussion is
* establish that each piece's text has a separate transform.  We could have done transforms on the text
* that combined the piece transform and the text transform.  This would have been an advantage if we wanted
* to move the piece and the text together.  But once we have set a piece, it is not moved. So it is far
* easier to move the text separately.  Additionally, with all the text in the same coordinate system, we can
* easily set up bounding boxes to aid in selecting the text.  The bounding boxes can be kept in an array for
* ease of use.  The text can be selected by clicking on the bounding box. I have realized how I had written
* this and I understand why. Co-pilot has been trying to tell me that I did it this way. The text is in the
* panel coordinate system and the transforms are separate.  I have been trying to combine the transforms, but
* I didn't think about the CNC machine.  The CNC machine is going to need the text in the panel coordinate system.
* Yes, the text is tied to a piece, but the text can be shown in the shutter coordinate system by using the
* piece transform.  The text is moved by dragging the mouse. 
*
* The text is derived from shutter descriptions, layer descriptions, and text from piece indexes.  The layer
* descriptions are hard coded. The shutter descriptions are the only variable text.  The only purpose for the
* text is to identify the pieces.  The text is not used for anything else.
*
* The setWorkingShutter function is used to set the working shutter.  It calls the setShutterTextInfo function.
* The setShutterTextInfo function sets the text for the shutter and converts it to svg paths.  It also sets the
* bounding boxes for the text.
*
* When we click on text, we need to know which text we are clicking on.  We can use the bounding boxes to determine
* which text we are clicking on.  We can then set the text index in the availSelect object.  The text index is used
* to determine which text we are moving.  The text is moved by dragging the mouse.  The text is moved in the panel
* coordinate system.  The text is rotated by the 'r' or 'R' keys.  The text is rotated in the panel coordinate system.
*
* In the mouse down event, when we have detected that we are moving text, we need to set the text index in the
* availSelect object.  We also need to set the transform for the text.  To be consistenet in the user interface,
* we need to extract the rotation from the transform.  The text is rotated by the 'r' or 'R' keys.  Having the
* starting rotation in the availSelect object allows us to rotate the text correctly on the first key press.
*
* During the move, we will recalculate the transform for each mouse position. We have split out the rotation, we only
* need to derive the translation. With the mouse position, we can get the shutter world coordinate.  We can then
* use the inverse piece transform to get the panel coordinate.  By design the text starts at the center of the
* panel.  We can then calculate the translation in the panel coordinate system.  We can then set the transform
* for the text.  The text is then redrawn in the shutter coordinate system.
*
* We have some cleanup to do during the moue up event. Mainly we need to recalculate the bounding box for the text.
* We also need to update the design file with the new text transform. 
*/
import SSTools from './ss_tools.js';
import SSAvail from './ss_avail.js';
import SSPanel from './ss_panel.js';
import SSDisplay from './ss_display.js';
import SSEntry from './ss_entry.js';
import { Affine } from './psBezier/affine.js';
import { VectorText } from './vector_text.js';
import { utils } from './psBezier/utils.js';
import { Area } from './psBezier/Area.js';

var shutterIdx = 0;
var textRot = 0;

//Refactor to use ES6 classes
const SSMain = {
	//This is used for main panel mouse events to capture state
	mouseMoveRef: { x: 0, y: 0, in: false, grab: false },

	//sIdx < -1 indicates no cut mode. -1 indicate ctrl pressed. >= 0 selected piece
	//isdx - Shutter Idx, iLdx - LayerIdx, iPdx - Piece Idx
	selectedPiece: { iSdx: -2, iLdx: 0, iPdx: 0 },

	shutterIdx: 0,
	zoom: 1,

	rotation: 0,

	snapDist: 2,
	//We are going to use a more intuitive way to move the panel. Typically, the panel is grabbed at a corner
	//but it can be grabbed anywhere.  The mouse is tied to a point on the panel.  The entire panel is moved
	//when the mouse is moved.  The panel is rotated around the mouse point.
	mousePanelLock: { x: 0, y: 0 },
	panel2ShutterTransform: null,
	panelFromShutterTransform: null,
	mainUnit: 1,
	shutterReal2DispTransform: null,
	shutterDisp2RealTransform: null,
	//Instead of using transforms to derive the mouse point when doing a rotation, we will just store it here
	mousePoint: { x: 0, y: 0 },
	pnlObj: null,

	workingShutter: null,

	layerIdx: 3,
	layerText: ['Front', 'Inner', 'Back', 'Outline'],

	btnCut: null,
	width: 0,
    height: 0,

	init: function ()
	{
		let lwrCnvs = document.createElement('canvas');
		let upprCnvs = document.createElement('canvas');
		SSMain.pnlObj = SSPanel.panelFactory('pnlMain', lwrCnvs, upprCnvs);
		SSMain.pnlObj.redraw = SSMain.redrawMainPanel;
		//SSPanel.setPanelDrag(SSMain.pnlObj);
		//SSPanel.setPanelResize(SSMain.pnlObj);
		SSMain.width = SSMain.pnlObj.panel.clientWidth;
		SSMain.height = SSMain.pnlObj.panel.clientHeight - 30;
		SSMain.pnlObj.lwrCnvs.width = SSMain.width;
		SSMain.pnlObj.lwrCnvs.height = SSMain.height;
		SSMain.pnlObj.upprCnvs.width = SSMain.width;
		SSMain.pnlObj.upprCnvs.height = SSMain.height;
		SSMain.pnlObj.header.style.height = '30px';

		let btnNew = SSPanel.createButton('New', SSMain.clickNew);
		btnNew.style.width = '40px';

		let btnStats = SSPanel.createButton('Stats', SSMain.stats);
		btnStats.style.width = '40px';

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

		SSMain.btnCut = SSPanel.createButton('Cut', SSMain.cutPanel);
		SSMain.btnCut.style.width = '60px';

		SSMain.pnlObj.hdrRight.appendChild(btnNew);
		SSMain.pnlObj.hdrRight.appendChild(btnStats);
		SSMain.pnlObj.hdrRight.appendChild(btnPrevLayer);
		SSMain.pnlObj.hdrRight.appendChild(lblLayer);
		SSMain.pnlObj.hdrRight.appendChild(btnNextLayer);
		SSMain.pnlObj.hdrRight.appendChild(btnPrev);
		SSMain.pnlObj.hdrRight.appendChild(lblShutter);
		SSMain.pnlObj.hdrRight.appendChild(btnNext);
		SSMain.pnlObj.hdrRight.appendChild(SSMain.btnCut);

		//SSMain.pnlObj.panel.onmouseenter = SSMain.mainMouseEnter;
		//SSMain.pnlObj.panel.onmouseleave = SSMain.mainMouseLeave;
		SSMain.pnlObj.panel.onmousemove = SSMain.mainMouseMove;
		SSMain.pnlObj.panel.onmousedown = SSMain.mainMouseDown;
		SSMain.pnlObj.panel.onmouseup = SSMain.mainMouseUp;

		SSMain.pnlObj.panel.onkeydown = SSMain.keydownEvent;
	},

	/*
	* This function is called when the stats button is pressed.  It will display the stats for the
	* design.  The stats are the number of shutters, the number of panels, dimensions of the
	* shutter storage shelf. In general, this is the size of the largest shutter.  However, it is
	* possible that two shutters combine to require more space than the largest shutter.  For example,
	* if we have a tall narrow shutter and a short wide shutter, the two shutters together will require
	* more space than the tall narrow shutter. Also, shutters can be rotated in storage. The test for
	* the largest dimension in each direction should be done with the shutters rotated with it's longest
	* dimension in the y direction.  This is because the shutters are stored in the y direction.
	*
	* We will use the entry dialog to display the stats.  The entry dialog is a modal dialog that is
	* used to get information from the user.  The entry dialog is a div that is displayed in the center
	* of the screen.  The entry dialog has a header that is used to display the title.  The entry dialog
	* has a body that is used to display the information.
	*/
	stats: function ()
	{
		console.log('SSMain stats');
		let shelfDims = { width: 0, height: 0 };
		for (let iIdx = 0; iIdx < SSTools.design.file.shutters.length; iIdx++)
		{
			let shutter = SSTools.design.file.shutters[iIdx];
			let maxDims = { x: shutter.maxX - shutter.minX, y: shutter.maxY - shutter.minY };
			console.log('shutter', iIdx, maxDims);
			if (maxDims.x > maxDims.y) maxDims = { x: maxDims.y, y: maxDims.x };
			if (maxDims.x > shelfDims.width) shelfDims.width = maxDims.x;
			if (maxDims.y > shelfDims.height) shelfDims.height = maxDims.y;
		}
		let stats = { shutters: SSTools.design.file.shutters.length, panels: SSTools.design.file.panels.length, shelf: shelfDims };
		SSEntry.showStats(stats);
	},

	//This will redraw the main window and remove the panel when ctrl is pressed
	keydownEvent: function (e)
	{
		e = e || window.event;
		//e.preventDefault();
		if (e.ctrlKey)
		{
			SSMain.selectedPiece.iSdx = -1;
			SSMain.btnCut.innerHTML = "Cut";
			SSMain.redrawMainOverlay();
			SSMain.redrawMainPanel();
			SSAvail.redrawAvailOverlay();
			SSAvail.redrawAvailPanel();
			return;
		}
		//implied else not ctrl
		if (e.key == 'r' || e.key == 'R')
		{
			console.log('rotate');
			e.preventDefault();
			if (SSAvail.availSelect.textIdx >= 0)
			{
				SSAvail.availSelect.textRot += Math.PI / 2;
				if (SSAvail.availSelect.textRot >= 2 * Math.Pi) SSAvail.availSelect.textRot = 0;
				//calculate the new transform
				SSMain.calcTextTransform(SSMain.mousePoint);
				SSMain.redrawMainOverlay();
				return;
			}
			SSAvail.rotate();
			return;
		}

		if (SSMain.selectedPiece.iSdx == -1)
		{
			SSMain.selectedPiece.iSdx = -2;
			SSMain.btnCut.innerHTML = "Cut";
		}
	},

	/*
	* When we rotate the panel, we need to rotate it around the mouse point. This function
	* recalculates the panel transform to rotate the panel around the mouse point.  The tricky
	* part is that this might happen during a drag operation.  Part of the panel transform is
	* derived from the mouse point.  We need to recalculate the panel transform with the new
	* rotation.  The mouse point is in the shutter display coordinate system.  We need take 
	* point we are tied to on the panel and find the real world point in the shutter coordinate
	* system.  From that we can get the present mouse point and use it to caculate the new panel
	* transform
	*/
	rotate: function ()
	{
		if (SSMain.mouseMoveRef.grab)
		{
			SSMain.calcPanelTransform(SSMain.mousePoint);
		}
		SSMain.redrawMainOverlay();
	},

	/*
	* Recalculate the panel transform to move the panel to the mouse point.  Conceptually, this transfrom is derived
	* from two sides. The first side is the mouse point in the shutter coordinate system.  From that side we need to
	* do an inverse transform to get the real point in the shutter coordinate system.  The second side is the panel
	* point tied to the mouse.  This point is in the panel coordinate system.  It is before rotation, we need to do
	* the rotation to get the real point before translation in the shutter coordinate system.  The translation is
	* is the difference between the two points.  The panel transform is then the rotation and translation.
	*/
	calcPanelTransform: function (mouse)
	{
		//This function is called when the mouse is clicked and the mouse is moved.  The mouse is tied to a point on the
		//panel.  The panel is moved by dragging the mouse.

		//Find the real coordinate for the mouse point in the shutter coordinate system
		let real = { x: mouse.x, y: mouse.y };
		Affine.transformPoint(real, SSMain.shutterDisp2RealTransform);
		let panel = { x: SSMain.mousePanelLock.x, y: SSMain.mousePanelLock.y };
		//console.log('calcPanelTransform real panel', real, panel);
		//Now rotate the panel point in the real world coordinate system
        //Our lock is in the unrotated panel coordinate system
		if (SSAvail.rotation != 0) Affine.transformPoint(panel, Affine.getRotateATx(SSAvail.rotation));

		//Calculate the translation
		SSMain.panel2ShutterTransform = Affine.getTranslateATx({ x: real.x - panel.x, y: real.y - panel.y });

		SSAvail.shutterInPanelTransform = Affine.getInverseATx(SSMain.panel2ShutterTransform);

		//Rotate if needed
		if (SSAvail.rotation != 0)
		{
			SSMain.panel2ShutterTransform = Affine.append(SSMain.panel2ShutterTransform, Affine.getRotateATx(SSAvail.rotation));
		}
		//Now set the inverse transform
		SSMain.panelFromShutterTransform = Affine.getInverseATx(SSMain.panel2ShutterTransform);
	},

	calcTextTransform: function (mouse)
	{
		//console.log('calcTextTransform', mouse);
		//      console.log('calcTextTransform mousePoint', SSMain.mousePoint);
		//let mouse = { x: SSMain.mousePoint.x, y: SSMain.mousePoint.y };
		let real = { x: mouse.x, y: mouse.y };
		Affine.transformPoint(real, SSMain.shutterDisp2RealTransform);
		Affine.transformPoint(real, SSAvail.availSelect.textInvAtx);

		//We now have the mouse point in the panel coordinate system

		let Atx = Affine.getTranslateATx(real);
		if (SSAvail.availSelect.textRot != 0)
		{
			Atx = Affine.append(Atx, Affine.getRotateATx(SSAvail.availSelect.textRot));
		}
		Atx = Affine.append(Atx, Affine.getScaleATx(SSAvail.availSelect.textScale));
		//console.log('bbox', Atx, SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.textIdx]);
		SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.textIdx].textAtx = Atx;
	},

	mainMouseEnter: function (e)
	{
		e = e || window.event;
		e.preventDefault();

		SSMain.mouseMoveRef.in = true;
	},

	mainMouseLeave: function (e)
	{
		e = e || window.event;
		e.preventDefault();

		SSMain.mouseMoveRef.in = false;

		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		//redrawMainPanel();
	},

	mainMouseMove: function (e)
	{
		e = e || window.event;

		e.preventDefault();
		
		if(SSMain.mouseMoveRef.grab)
		{
			SSMain.mousePoint = { x: e.offsetX, y: e.offsetY };
			//Display the mouse in the header middle
			//let hdr = SSMain.pnlObj.hdrMiddle;
			//let sMouse = SSMain.mousePoint.x.toFixed(2) + ', ' + SSMain.mousePoint.y.toFixed(2);
   //         hdr.innerHTML = sMouse;
			if (SSAvail.availSelect.textIdx >= 0)
			{
				//We are moving text
				SSMain.calcTextTransform(SSMain.mousePoint);
				SSMain.redrawMainOverlay();
				return;
			}
            //console.log('calcPanelTransform', SSMain.mousePoint);
            SSMain.calcPanelTransform({ x: e.offsetX, y: e.offsetY });
			SSMain.redrawMainOverlay();
			SSAvail.redrawAvailOverlay();
			//SSMain.rewriteMainHeader();
		}
		//console.log(SSMain.mouseMoveRef);
		
		//redrawMainPanel();

	},

	/*
	* This function can also be called as a panel being dragged from the Avail window enters the Main window.
	* The logic could made the same for both cases.  The only difference is that we already have the panel
	* corner real world coordinates.  We can skip the step of finding the closest endpoint to the mouse click.
	*
	* The panel display mechanism we are using now is to establish a display position for a given real world
	* panel coordinate. Normally this is a corner of the panel, but it is possible that we are trying move the
	* and have clicked away from a corner.  In that case, we want to find the real world position of the mouse
	* and make it the real world point that the mouse is tied to.  Note that we are not tied to a corner in this
	* case.  The panel is moved by dragging the mouse. Thyere are two concepts at work here.  The first is that
	* the mouse ultimately controls the real world translation of the panel. We most be able to determine the
	* panel translation at the mouse up event.  The second concept is that the panel does not move when the mouse
	* up.  If the mouse moves to a different mouse position, conceptually the panel has not moved and we must
	* determine the real world panel point for the mouse position.  This is the point that the panel will be tied
	* to.  The panel is then redrawn in the shutter coordinate system.
	*/
	mainMouseDown: function(e)
	{
		e = e || window.event;

        SSMain.mousePoint = { x: e.offsetX, y: e.offsetY };
		let world = { x: e.offsetX, y: e.offsetY };
        Affine.transformPoint(world, Affine.getRotateATx(SSAvail.rotation));
		Affine.transformPoint(world, SSMain.shutterDisp2RealTransform);
		//console.log('world', world);
		if (SSAvail.isDragging)
		{
			SSMain.mousePanelLock = { x: SSAvail.availSelect.corner.x, y: SSAvail.availSelect.corner.y };
			SSMain.calcPanelTransform({ x: e.offsetX, y: e.offsetY });
			textRot = 0;
			SSMain.mouseMoveRef.grab = true;
			SSMain.redrawMainOverlay();
			return;
        }
        //We are not dragging a panel from the Avail window

		//Are we selecting to uncut
		if(e.ctrlKey)
		{
			SSMain.mouseMoveRef.grab = false;
			//We have real world coordinates for mouse click check the pieces
			let pieces = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces;
			for(let iIdx = 0; iIdx < pieces.length; iIdx++)
			{
				let piece = pieces[iIdx];
				let svgPath = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path;
				svgPath = utils.svgTransform(svgPath, piece.panelTrans);
				let poly = utils.svg2Poly(svgPath);
				if(poly.contains(world))
				{
					//We have clicked in a used area
					SSMain.selectedPiece.iSdx = shutterIdx;
					SSMain.selectedPiece.iLdx = SSMain.layerIdx;
					SSMain.selectedPiece.iPdx = iIdx;
					SSMain.btnCut.innerHTML = "UnCut";
					SSMain.redrawMainOverlay();
					SSMain.redrawMainPanel();
					SSAvail.redrawAvailOverlay();
					SSAvail.redrawAvailPanel();
					return;					
				}
			}
			SSMain.selectedPiece.iSdx = -1;
			SSMain.btnCut.innerHTML = "Cut";
			SSMain.redrawMainOverlay();
			SSMain.redrawMainPanel();
			SSAvail.redrawAvailOverlay();
			SSAvail.redrawAvailPanel();
			return;
		}
		
		SSMain.mouseMoveRef.grab = true;
		if (SSMain.layerIdx > 2) return;
		//If this layer is completely covered, then we have text that can be edited
        //Here we look to see if the mouse click is in a text area
		if(SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.length == 0)
		{
            //Indicate that we are not selecting text
			SSAvail.availSelect.textIdx = -1;
			for(let iIdx = 0; iIdx < SSMain.bboxes[SSMain.layerIdx].length; iIdx++)
			{
				let bb = SSMain.bboxes[SSMain.layerIdx][iIdx];
				//console.log(bb, SSMain.mouseMoveRef);
				if (SSMain.mousePoint.x < bb.bbox.x.min)continue;
				if (SSMain.mousePoint.x > bb.bbox.x.max)continue;
				if (SSMain.mousePoint.y < bb.bbox.y.min)continue;
				if (SSMain.mousePoint.y > bb.bbox.y.max) continue;
                //console.log('text selected', iIdx, bb, SSAvail.availSelect);
				SSAvail.availSelect.textIdx = iIdx;
				//Get the rotation of the text
				let atx = bb.textAtx;
				SSAvail.availSelect.textRot = Affine.getRotateAngle(atx);
				SSAvail.availSelect.textScale = Affine.getScale(atx);
                console.log('text scale', SSAvail.availSelect.textScale);
				SSAvail.availSelect.textAtx = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[bb.ppIdx].panelTrans;
				SSAvail.availSelect.textInvAtx = Affine.getInverseATx(SSAvail.availSelect.textAtx);
				//SSAvail.availSelect.move.x = 0;
				//SSAvail.availSelect.move.y = 0;
				//textRot = 0;
				break;
			}
		}
		if (SSMain.panel2ShutterTransform == null) return;

		if (SSMain.panelFromShutterTransform == null) return;

		//Not completely covered
		//We need to find the closest corner of selected panel to the mouse click
		let Real = { x: e.offsetX, y: e.offsetY };
		//console.log('SSMain.panelFromShutterTransform', SSMain.panelFromShutterTransform);
		Affine.transformPoint(Real, SSMain.shutterDisp2RealTransform);
        Affine.transformPoint(Real, SSMain.panelFromShutterTransform);
		SSAvail.findClosestCornerSelectedPanel(Real, SSMain.snapDist);
		if (SSAvail.availSelect.corner != null)
		{
			SSMain.mousePanelLock = { x: SSAvail.availSelect.corner.x, y: SSAvail.availSelect.corner.y };
		} else
		{
			SSMain.mousePanelLock = { x: Real.x, y: Real.y };
		}
        SSMain.calcPanelTransform({ x: e.offsetX, y: e.offsetY });
		SSMain.redrawMainOverlay();
	},

	/*
	* By design, the mouse up event is used to snap the panel to the closest endpoint on the shutter.  The panel
	* is then redrawn in the shutter coordinate system.  The panel can now be cut.  The panel is cut by finding the
	* intersection of the panel with the shutter.  The intersection is then added to the shutter as a new piece.
	*/
	mainMouseUp: function(e)
	{
		e = e || window.event;
		//e.preventDefault();

        //In theory, we should not be able to get here if the mouse is not grabbed
		if (!SSMain.mouseMoveRef.grab) return;

		SSMain.mousePoint = { x: e.offsetX, y: e.offsetY };

		//Are we moving text
        if (SSAvail.availSelect.textIdx >= 0)
        {
			SSMain.calcTextTransform(SSMain.mousePoint);
			//Update the design file with the new text transform
            //We saves the shutter index, layer index, and piece index in the text bounding box
			let ppIdx = SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.textIdx].ppIdx;
            //Get the piece with the text being moved
			let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[ppIdx];
			//Save the new transform in the file
			SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.textIdx].textAtx;
            //Update the text bounding box
			SSMain.setPieceTextInfo(SSMain.layerIdx, ppIdx, SSMain.bboxes);
			//console.log('mouse up bbox', SSMain.bboxes);
            //Release the mouse
			SSMain.mouseMoveRef.grab = false;
            //indicate that we are not selecting text
            SSAvail.availSelect.textIdx = -1;
			SSMain.redrawMainOverlay();
            //SSMain.redrawMainPanel();
            return;
        }
        //Implied else not moving text, by default we are moving a panel
		//Update the panel transform
		SSMain.calcPanelTransform({ x: e.offsetX, y: e.offsetY });

		let world = { x: e.offsetX, y: e.offsetY };
        Affine.transformPoint(world, SSMain.shutterDisp2RealTransform);
		
		//Call snap with coordinates in the shutter coordinate system
		//We are looking for shutter snap points, if we have a panel snap point, we will use that
		//to calculate the panel transform and position
		SSMain.snap(world);

        //Release the mouse
		SSMain.mouseMoveRef.grab = false;
	},

	/*
	* This function is called when the Cut button is pressed.  A panel should have been selected.  The panel
	* is cut by finding the intersection of the panel with the shutter.  The intersection is then added to the
	* shutter as a new piece.  The panel is then removed from the panel list.  The panel is then redrawn in the
	* shutter coordinate system.  The panel can now be moved.  The panel is moved by dragging the mouse.  The
	* panel is rotated by the 'r' or 'R' keys.  The panel is rotated in the shutter coordinate system.
	*
	* We have created a new Area library that is used to find the intersection of the panel with the shutter.  
	* This new library represents areas as a collection of bezier curves.  The curves are used to create closed
	* loops.  The loops are used to represent areas.  The loops can be intersected, added and subtracted from each
	* other.  The loops can also be represented as svg paths.  The svg paths can be used to display the loops.
	*/
	cutPanel: function()
	{
		//The outline layer does not get panels
		if(SSMain.layerIdx >= 3)return;
		//Handle the UnCut
		//Get the uncovered area on this shutter and this layer.
		//This is used in both cut and uncut branches
		let uncovered = SSMain.workingShutter.layers[SSMain.layerIdx].uncovered;
		if(SSMain.selectedPiece.iSdx >= 0)
		{
			//We have a piece selected to be uncut
			//Get path to work with. If we pull it into a separate object 
			//we can do the following in any order
			//We need to remove it from the panel used
			//Add it to the panel unused (untransformed)
			//Remove it from the Layer pieces
			//Add it to the layer uncovered (transformed)
			let layer = SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx];
			let layerPiece = layer.panelPieces[SSMain.selectedPiece.iPdx];
			let panel = SSTools.design.file.panels[layerPiece.panelIdx];
			let panelPiece = panel.used[layerPiece.panelPieceIdx];
			//Remove used piece from panel
			panel.used.splice(layerPiece.panelPieceIdx, 1);
			//We have removed an index we need to fix the shutters for the changed indices
			let blankPoly = utils.svg2Poly(SSTools.design.file.blanks[panel.blankIdx].path);
			let unusedArea = new Area(blankPoly);
			for(let iIdx = 0; iIdx < panel.used.length; iIdx++)
			{
				let ppUsed = panel.used[iIdx];
				SSTools.design.file.shutters[ppUsed.sIdx].layers[ppUsed.layerIdx].panelPieces[ppUsed.ppIdx].panelPieceIdx = iIdx;
				let ppArea = new Area(utils.svg2Poly(ppUsed.path));
				unusedArea.subtract(ppArea);
			}
			panel.unused = [];
			for(let iIdx = 0; iIdx < unusedArea.solids.length; iIdx++)
			{
				let aSolid = unusedArea.solids[iIdx];
				panel.unused.push(new SSDesign.Piece(panel, utils.poly2Svg(aSolid)));
			}
			//console.log('unusedArea', unusedArea);
			// //Panel is updated, now shutter
			//Now remove layer piece
			layer.panelPieces.splice(SSMain.selectedPiece.iPdx, 1);
			//We have removed a layer piece, we need to fix the back references in the panels
			let pps = layer.panelPieces;
			let uncoveredArea = new Area(utils.svg2Poly(SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].outline));
			for(let iIdx = 0; iIdx < pps.length; iIdx++)
			{
				let lpp = pps[iIdx];
				let pp = SSTools.design.file.panels[lpp.panelIdx].used[lpp.panelPieceIdx];
				let poly = utils.svg2Poly(utils.svgTransform(pp.path, lpp.panelTrans));
				//utils.transformPoly(poly, lpp.panelTrans)
				let ppArea = new Area(poly);
				pp.ppIdx = iIdx;
				uncoveredArea.subtract(ppArea);
			}
			//console.log('uncoveredArea', uncoveredArea);
			layer.uncovered = [];
			for(let iIdx = 0; iIdx < uncoveredArea.solids.length; iIdx++)
			{
				let aSolid = uncoveredArea.solids[iIdx];
				layer.uncovered.push(utils.poly2Svg(aSolid));
			}
			//Now recalulate unused on panel and uncovered on shutter
			// let svgPath = panelPiece.path;
			// let piecePoly = utils.svg2Poly(svgPath);
			// let iIdx = 0;
			// let panelUnused = SSTools.design.file.panels[layerPiece.panelIdx].unused;
			// for(;iIdx < panelUnused.length; iIdx++)
			// {
				// let pieceArea = new Area(piecePoly);
				// let unusedPoly = utils.svg2Poly(panelUnused[iIdx].path);
				// let unusedArea = new Area(unusedPoly);
				// unusedArea.add(pieceArea);
				// if(unusedArea.solids.length == 1)
				// {
					// //These areas overlapped, replace old area with new
					// SSTools.design.file.panels[layerPiece.panelIdx].unused[iIdx].path = utils.poly2Svg(unusedArea.solids[0]);
					// break;
				// }
			// }
			// if(iIdx >= panelUnused.length)
			// {
				// //Not likely, but piece does not overlap any unused pieces
				// SSTools.design.file.panels[layerPiece.panelIdx].unused.push(new Piece(SSTools.design.file.panels[layerPiece.panelIdx], svgPath));
			// }
			// //Remove used piece from panel
			// SSTools.design.file.panels[layerPiece.panelIdx].used.splice(layerPiece.panelPieceIdx, 1);
			// //We have removed an index we need to fix the shutters for the changed indices
			// let used = SSTools.design.file.panels[layerPiece.panelIdx].used;
			// for(iIdx = layerPiece.panelPieceIdx; iIdx < used.length; iIdx++)
			// {
				// let ppUsed = used[iIdx];
				// SSTools.design.file.shutters[ppUsed.sIdx].layers[ppUsed.layerIdx].panelPieces[ppUsed.ppIdx].panelPieceIdx = iIdx;
			// }
			// //Panel is updated, now shutter
			// //Transform path into shutter coordinates
			// utils.transformPoly(piecePoly, layerPiece.panelTrans);
			// //svgPath = utils.svgTransform(svgPath, layerPiece.panelTrans);
			// //piecePoly = utils.svg2Poly(svgPath);
			// for(iIdx = 0;iIdx < uncovered.length; iIdx++)
			// {
				// let pieceArea = new Area(piecePoly);
				// let uncoveredPoly = utils.svg2Poly(uncovered[iIdx]);
				// let uncoveredArea = new Area(uncoveredPoly);
				// uncoveredArea.add(pieceArea);
				// if(uncoveredArea.solids.length == 1)
				// {
					// //These areas overlapped, replace old area with new
					// uncovered[iIdx] = utils.poly2Svg(uncoveredArea.solids[0]);
					// break;
				// }
			// }
			// if(iIdx >= uncovered.length)
			// {
				// //If piece does not overlap any unused pieces or uncovered was empty
				// uncovered.push(svgPath);
			// }
			// //Now remove layer piece
			// SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx].panelPieces.splice(SSMain.selectedPiece.iPdx, 1);
			// //We have removed a layer piece, we need to fix the back references in the panels
			// let pps = SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx].panelPieces;
			// for(iIdx = SSMain.selectedPiece.iPdx; iIdx < pps.length; iIdx++)
			// {
				// let pp = pps[iIdx];
				// SSTools.design.file.panels[pp.panelIdx].used[pp.panelPieceIdx].ppIdx = iIdx;
			// }
			SSMain.selectedPiece.iSdx = -2;
			SSMain.btnCut.innerHTML = "Cut";
			SSMain.setWorkingShutter(shutterIdx);
			SSMain.redrawMainOverlay();
			SSMain.redrawMainPanel();
			SSAvail.redrawAvailOverlay();
			SSAvail.recalcAvailPanels();
			return;
		}
        //This is the beginning of the Cut branch
		//The layer is completely covered, assume it wasn't covered before the cut. We would have bailed out
		//If it were covered
		//Get panel selected in panel window
		let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
		//I think this is here because I had a rule that text couldn't be moved until the layer was completely covered
		//I am rethinking that rule. I have to understand what I was doing in this block of code
		//I don't think this has any meaning now. Going to comment it out and remove later when I am sure
		//We do want to bail if the layer is completely covered
		if (uncovered.length == 0) return;

		//if(uncovered.length == 0)
		//{
		//	if(SSAvail.availSelect.editIdx < 0)return;
		//	//Below is the code that intuitively moves the text, which is what the user should be able
		//	//to do.  It is important to note that the mouse controls the movement on the screen.
		//	// We must translate that back to movement on the panel. There is a different concept at work.
		//	// Instead of manipulating a path with a transform.  We need to manipulate the transform
		//	// if(textRot != 0)moveText = utils.svgTransform(moveText, Affine.getRotateATx(textRot));
		//	// moveText = utils.svgTransform(moveText, SSMain.bboxes[SSMain.layerIdx][iIdx].Atx);
		//	// moveText = utils.svgTransform(moveText, piece.panelTrans);
		//	// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.move.x/mainUnit, y:-SSAvail.availSelect.move.y/mainUnit}));
			
		//	// moveText = utils.svgTransform(moveText, SSMain.bboxes[SSMain.layerIdx][iIdx].Atx);
		//	// moveText = utils.svgTransform(moveText, piece.panelTrans);
			
		//	let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].ppIdx];
		//	let inversePanelTrans = Affine.getInverseATx(piece.panelTrans);
		//	//let Atx = Affine.append(inversePanelTrans, Affine.getTranslateATx({x:SSAvail.availSelect.panelTranslateInDisplayUnits.x/mainUnit, y:-SSAvail.availSelect.panelTranslateInDisplayUnits.y/mainUnit}));
		//	//Atx = Affine.append(Atx, piece.panelTrans);
		//	//Atx = Affine.append(Atx, SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].Atx);
		//	////Do the rotation first
		//	//if(textRot != 0)Atx = Affine.append(Atx, Affine.getRotateATx(textRot));
		//	//Atx = Affine.append(Atx, inversePanelTrans);
		//	//Now the translation is last
		//	//SSMain.bboxes[SSMain.layerIdx][SSAvail.availSelect.editIdx].Atx = Atx;
		//	//SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = Atx;
		//	// moveText = utils.svgTransform(moveText, SSMain.bboxes[SSMain.layerIdx][iIdx].Atx);
		//	// moveText = utils.svgTransform(moveText, mainAtx);
		//	// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.panelTranslateInDisplayUnits.x, y:SSAvail.availSelect.panelTranslateInDisplayUnits.y}));
		//	return;
		//}
		//let localUsedIdx = SSAvail.availSelect.usedIdx;
		
		//Get type of panel
		if(SSAvail.avs[SSAvail.availSelect.idx].t == 0)
		{
			//We have a blank, clone the blank into a panel that can be used
			SSTools.design.file.panels.push(new SSDesign.CorrPanel(SSTools.design, SSAvail.avs[panelIdx].i));
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
			//We changed the svg2Poly function to handle multiple paths. That could be a problem here
            //But by design, these are single paths
			//let upoly = utils.svg2Poly(uncovered[iIdx]);
			//upoly.reverse();
			//console.log(upoly);
			console.log('uncovered');
			//SSDisplay.logPoly(upoly);
			//let uncoveredArea = new Area(upoly);
			let uncoveredArea = new Area(uncovered[iIdx]);
			//console.log('uncoveredArea cw', uncoveredArea.solids[0].cw);
            console.log('uncoveredArea', uncoveredArea.toSVG());
			for(let iPdx = 0; iPdx < panel.unused.length; iPdx++)
			{
				//let poly = utils.svg2Poly(panel.unused[iPdx].path);
				//This transform comes from the user mousing the panel into position. It was fine tuned with snapping
                //to position a panel corner with an uncovered shutter corner.
				//utils.transformPoly(poly, SSMain.panel2ShutterTransform);
				let panelArea = new Area(utils.svgTransform(panel.unused[iPdx].path, SSMain.panel2ShutterTransform));
                console.log('transformed panel Area', panelArea.toSVG());
				//SSDisplay.logPoly(poly);
				//poly.reverse();
				//let panelArea = new Area(poly);
				//let panelArea = new Area(poly);
				//console.log('panelArea', panelArea);
				//console.log('panelArea cw', panelArea.solids[0].cw);
				//This is the intersection of the panel with the uncovered area. If there is an intersection we have
                //"cut" a piece from the panel.  We need to add this piece to the shutter
				let intersectArea = panelArea.intersect(uncoveredArea);
				console.log('intersectArea', intersectArea.toSVG());
                continue; //Short circuit for debugging
				//console.log('intersected panel');
				//if(panelArea.solids.length != 0)
				//{
				//	//SSDisplay.logPoly(panelArea.solids[0]);
				//}
				//console.log('uncoveredArea cw after intersect', uncoveredArea.solids[0].cw);
				//console.log('Subtract panel intersect Area from uncovered');
                //Remove the intersected area from the uncovered area
				let newUncoveredArea = uncoveredArea.subtract(intersectArea);
				//console.log('uncoveredArea subtracted panel intersect');
				//if(uncoveredArea.solids.length != 0)
				//{
				//	//SSDisplay.logPoly(uncoveredArea.solids[0]);
				//}
				//console.log('uncoveredArea', uncoveredArea);
				newUncovered.push(newUncoveredArea.toSVG());
                //Note panel area is the cut piece and is in the shutter coordinate system
				if (!intersectArea.isEmpty())
				{
					////Return to the panel coordinate system
                    let IntersectSVG = utils.svgTransform(intersectArea.toSVG(), SSMain.panelFromShutterTransform);
                    //panelArea.transform(SSMain.panelFromShutterTransform);
					//Store the intersecting area and the index into the panel unused array
					overlaps.push({ area: IntersectSVG, idx:iPdx});
				}
			}
		}
		//We have performed all the intersections.  We have the cut pieces in the shutter coordinate system
        //and panel pieces in the overlap array in the panel coordinate system
		//console.log('newUncovered', newUncovered);
		//All the uncovered areas are in the newUncovered array.  We need to store them in the shutter
        //start by clearing the uncovered area
		SSMain.workingShutter.layers[SSMain.layerIdx].uncovered = [];
		for(let iIdx = 0; iIdx < newUncovered.length; iIdx++)
		{
            //Repopulate the uncovered area with the new uncovered areas
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
				let panelPiece =
					new SSDesign.Piece(panel,
						utils.poly2Svg(aSolid),
						workingIdx,
						SSMain.layerIdx,
						SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length,
						""
					);
				panel.used.push(panelPiece);
				SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.push(new SSDesign.LayerPiece(panelIdx, panel.used.length - 1, SSMain.panel2ShutterTransform));
				panelPiece.text = SSTools.design.getShutterPieceText(panelIdx,
					SSMain.layerIdx,
					SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length - 1
				);
				//Add this used panel to the shutter
				//SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.push(new LayerPiece(SSAvail.avs[panelIdx].i, panel.used.length - 1, Atx));
			}
            //Now we need to cut the overlap from the unused panel. overlap.idx is the index into the panel unused array
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
				panel.unused.push(new SSDesign.Piece(panel, utils.poly2Svg(aSolid)));
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
	},

	snap: function(world)
	{
		if (SSAvail.availSelect.corner == null) return; //Leave if there is no panel corner to snap to
        console.log('SSAvail.availSelect.corner', SSAvail.availSelect.corner);

		if (SSMain.workingShutter == null) return; //Leave if there is no shutter to snap to

		if (SSMain.layerIdx > 2) return; //Leave if we are on the outline layer

		//Now find the closest point on the shutter to the mouse click
		//We need to look on the layer for the closest point
		//It has to be on the outline or on a panel piece
		let path = SSMain.workingShutter.outline;
        let poly = utils.svg2Poly(path);
		let closestShutterPt = { pt: { x: 0, y: 0 }, dist: -1 };
		closestShutterPt = SSAvail.closestEndpointDist(poly, world, closestShutterPt);
        for (let iIdx = 0; iIdx < SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces.length; iIdx++)
        {
            let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[iIdx];
            path = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path;
			path = utils.svgTransform(path, piece.panelTrans);
            poly = utils.svg2Poly(path);
			closestShutterPt = SSAvail.closestEndpointDist(poly, world, closestShutterPt);
		}
		console.log('closestShutterPt', closestShutterPt, world, SSMain.snapDist);
		if (closestShutterPt.dist < 0) return; //Leave if point is invalid
		if (closestShutterPt.dist > SSMain.snapDist) return; //Leave if the closest point is too far away


		//We should have the closest point on the shutter to the mouse click
		//Now create the final panel transform. The best way is to use the calcPanelTransform function
		//We need to get the mouse position of the shutter corner, add a 0.01 to the x and y to minimize
        //coincident edges.
		let mouse = { x: closestShutterPt.pt.x, y: closestShutterPt.pt.y };
		//Now get display
		Affine.transformPoint(mouse, SSMain.shutterReal2DispTransform);
        SSMain.calcPanelTransform(mouse);
		//The panel corner must be moved to the closest point on the shutter
		//The final panel transform is the translation from the panel corner to the closest point on the shutter
		//SSMain.panel2ShutterTransform = Affine.getTranslateATx({ x: closestShutterPt.pt.x - SSAvail.availSelect.corner.x, y: closestShutterPt.pt.y - SSAvail.availSelect.corner.y });
		////Now append the rotation, if not 0
		//if (SSAvail.rotation != 0) SSMain.panel2ShutterTransform = Affine.append(SSMain.panel2ShutterTransform, Affine.getRotateATx(SSAvail.rotation));
        //That's it, we have the final panel transform
		//let panelTest = snapPanel();
		////console.log(panelTest);
		//if(!panelTest.found)return;
		
		//let shutterTest = snapShutter();
		
		////console.log(shutterTest);
		
		//if(!shutterTest.found)return;
		
		////We have two points do a snap
		////let dX = panelTest.x - shutterTest.x;
		////let dY = -panelTest.y - shutterTest.y;
		////We need a translation in mouse (graphics units)
		////For the shutter we scale and translate
		//let width = SSMain.pnlObj.panel.clientWidth;
		//let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		//// Display orign
		//let x0 = 10 + width/2;
		//let y0 = -10 + height/2;
		//let atx = Affine.getTranslateATx({x:x0, y:y0});
		//atx = Affine.append(atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		//Affine.transformPoint(shutterTest, atx);
		
		////The panel has an additional rotate
		//atx = Affine.append(atx, Affine.getRotateATx(SSAvail.rotation));
		//Affine.transformPoint(panelTest, atx);
		
		////Now we have both in graphics units.  The difference gives us the exact translation
		////in graphics units to match these two points up.
		//let dX = shutterTest.x - panelTest.x;
		//let dY = shutterTest.y - panelTest.y;
		
		//let pt = {x:dX, y:dY};
		
		// console.log('dX, dY', dX, dY);
		// console.log('mainUnit', mainUnit);
		
 		
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
	},
		
	prevShutter: function()
	{
		shutterIdx--;
		if(shutterIdx < 0)shutterIdx = SSTools.design.file.shutters.length - 1;
		
		SSMain.setWorkingShutter(shutterIdx);
		SSMain.selectedPiece.iSdx = -2;
		SSMain.btnCut.innerHTML = "Cut";

		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		SSAvail.redrawAvailPanel();
	},
	
	nextShutter: function()
	{
		shutterIdx++;
		if(shutterIdx >= SSTools.design.file.shutters.length)shutterIdx = 0;
		
		SSMain.setWorkingShutter(shutterIdx);
		SSMain.selectedPiece.iSdx = -2;
		SSMain.btnCut.innerHTML = "Cut";

		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		SSAvail.redrawAvailPanel();
	},
	animateTimer: null,
	showLayer: 0,

	animateFunction: function ()
	{
		//Step an index for layer to display
		SSMain.showLayer--;
		if (SSMain.showLayer < 0) SSMain.showLayer = 2;
		SSMain.redrawMainPanel();
	},

	prevLayer: function()
	{
		SSMain.layerIdx--;
		if(SSMain.layerIdx < 0)SSMain.layerIdx = 3;
		
		SSMain.selectedPiece.iSdx = -2;
		SSMain.btnCut.innerHTML = "Cut";

		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		SSAvail.redrawAvailPanel();
		if (SSMain.layerIdx == 3)
		{
			//Start the animation
			SSMain.animateTimer = setInterval(SSMain.animateFunction, 1000);
			return;
		}
		if (SSMain.animateTimer != null)
		{
			clearInterval(SSMain.animateTimer);
			SSMain.animateTimer = null;
		}

	},
	
	nextLayer: function()
	{
		SSMain.layerIdx++;
		if(SSMain.layerIdx >= 4)SSMain.layerIdx = 0;
		
		SSMain.selectedPiece.iSdx = -2;
		SSMain.btnCut.innerHTML = "Cut";

		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.redrawAvailOverlay();
		SSAvail.redrawAvailPanel();
		if (SSMain.layerIdx == 3)
		{
			//Start the animation
			SSMain.animateTimer = setInterval(SSMain.animateFunction, 1000);
			return;
		}
		if (SSMain.animateTimer != null)
		{
			clearInterval(SSMain.animateTimer);
			SSMain.animateTimer = null;
		}
	},
	
	prevPanel:function()
	{
		do
		{
			SSAvail.availSelect.idx--;
			if(SSAvail.availSelect.idx < 0)SSAvail.availSelect.idx = SSAvail.avs.length - 1;
		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
		SSDisplay.redrawCNCPanel();
	},
	
	nextPanel: function()
	{
		do
		{
			SSAvail.availSelect.idx++;
			if(SSAvail.availSelect.idx >= SSAvail.avs.length)SSAvail.availSelect.idx = 0;
		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
		SSDisplay.redrawCNCPanel();
	},
	
	clickNew: function()
	{
		SSEntry.newShutter();
	},
	
	//var tempShutter;
	calcDisplayTransform: function ()
	{
		let minX = SSMain.workingShutter.minX;
		let minY = SSMain.workingShutter.minY
		let maxX = SSMain.workingShutter.maxX;
		let maxY = SSMain.workingShutter.maxY
		let width = SSMain.pnlObj.panel.clientWidth;
		let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		SSMain.pnlObj.lwrCnvs.width = width;
		SSMain.pnlObj.lwrCnvs.height = height;
		SSMain.pnlObj.lwrCnvs.style.width = width.toString() + 'px';
		SSMain.pnlObj.lwrCnvs.style.height = height.toString() + 'px';
		SSMain.pnlObj.lwrCnvs.style.top = SSTools.hdrH.toString() + 'px';
		SSMain.pnlObj.lwrCnvs.style.left = '0px';
		SSMain.pnlObj.upprCnvs.width = width;
		SSMain.pnlObj.upprCnvs.height = height;
		SSMain.pnlObj.upprCnvs.style.width = width.toString() + 'px';
		SSMain.pnlObj.upprCnvs.style.height = height.toString() + 'px';
		SSMain.pnlObj.upprCnvs.style.top = SSTools.hdrH.toString() + 'px';
		SSMain.pnlObj.upprCnvs.style.left = '0px';
		//let width = SSMain.pnlObj.panel.clientWidth;
		//let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		let x0 = 10 + width / 2;
		let y0 = -10 + height / 2;
		// mainUnit controls scaling.  It is number of pixels for 100 drawing units
		SSMain.mainUnit = SSMain.zoom * SSDisplay.calcDisplayScale(width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		SSMain.shutterReal2DispTransform = Affine.getTranslateATx({ x: x0, y: y0 });
		//shutterReal2DispTransform = Affine.append(Affine.getScaleATx({x:mainUnit, y:-mainUnit}), shutterReal2DispTransform);
		SSMain.shutterReal2DispTransform = Affine.append(SSMain.shutterReal2DispTransform, Affine.getScaleATx({ x: SSMain.mainUnit, y: -SSMain.mainUnit }));
        SSMain.shutterDisp2RealTransform = Affine.getInverseATx(SSMain.shutterReal2DispTransform);
	},

	/*
	* When we move to a new shutter, there are things which are more efficient if done once.
	* For example, we need to detect when a text is selected so that we can move it.  The detection
	* is done by looking for mouse clicks in the bounding boxes for the text.  Those bounding boxes 
	* are defined here.
	*/
	setWorkingShutter: function(idx)
	{
		let workingIdx = idx;
		if(idx <0)
		{
			let tempShutter = new SSDesign.Shutter(new SSDesign.ShutterDesign(''), 'Example Shutter', utils.svgRect(-52.5/2, -38/2, 52.5, 38));
			SSMain.workingShutter = tempShutter;
		}else
		{
			SSMain.workingShutter = SSTools.design.file.shutters[idx];
		}
		SSMain.calcDisplayTransform();
		SSMain.setShutterTextInfo()
        if ((SSMain.layerIdx == 3) && (SSMain.animateTimer == null))
		{
			//Start the animation
            //console.log('Start Animation');
			SSMain.animateTimer = setInterval(SSMain.animateFunction, 1000);
		}
	},

	/*
	* The function below sets the text bounding boxes for the shutter.  This is done when we move to a new shutter.
	* After we move text, we need to recalculate the bounding boxes.  This is because the text may have moved to a new
	* bounding box. We will split out the code in the loop below into a separate function.
	*/
	setPieceTextInfo: function (iIdx, iJdx, bboxes)
	{
		let piece = SSMain.workingShutter.layers[iIdx].panelPieces[iJdx];
		//      let sText = SSTools.design.getShutterPieceText(workingIdx, iIdx, iJdx);
		let Atx = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans;
		let sText = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].text;
		let pathTxt = VectorText.svgText(sText, 1);
        let polyTxt = utils.svgTransform(pathTxt, Atx);
		polyTxt = utils.svgTransform(polyTxt, piece.panelTrans);
        polyTxt = utils.svgTransform(polyTxt, SSMain.shutterReal2DispTransform);
        let polys = utils.svg2Polys(polyTxt);
        bboxes[iIdx][iJdx] = { path: pathTxt, bbox: utils.bboxPolys(polys), ppIdx: iJdx, textAtx: Atx };
    },
	/*
	* We need a function to set text box display coordinate bounding boxes.  This is done when we move to a new shutter.
	* We also need to do it after we have moved text.  This is because the text may have moved to a new bounding box.
	* Presently, we are not doing any zooms or pans, if we do, we will need to recalculate the bounding boxes.
	*
	* We do all three layers at once.  As one changes layers the display transform does not change, so we can do all
	* three layers at once.
	*/
	setShutterTextInfo: function ()
	{
		SSMain.bboxes = [[], [], []];
		for (let iIdx = 0; iIdx < 3; iIdx++)
		{
			SSMain.bboxes.push([]);
			for (let iJdx = 0; iJdx < SSMain.workingShutter.layers[iIdx].panelPieces.length; iJdx++)
			{
                SSMain.bboxes[iIdx].push({});
				SSMain.setPieceTextInfo(iIdx, iJdx, SSMain.bboxes);
			//	let piece = SSMain.workingShutter.layers[iIdx].panelPieces[iJdx];
			//	//let at = piece.panelTrans;
			//	//Now position the associated text
			//	//let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[iIdx] + ' ' + iJdx.toString();
			//	let sText = SSTools.design.getShutterPieceText(workingIdx, iIdx, iJdx);
			//	//console.log('sText', sText);
			//	let pathTxt = VectorText.svgText(sText, 1);
			//	let Atx = SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans;
			//	let polyTxt = utils.svgTransform(pathTxt, Atx);
			//	polyTxt = utils.svgTransform(polyTxt, piece.panelTrans);
   //             polyTxt = utils.svgTransform(polyTxt, SSMain.shutterReal2DispTransform);
			//	let polys = utils.svg2Polys(polyTxt);
			//	SSMain.bboxes[iIdx].push({ path: pathTxt, bbox: utils.bboxPolys(polys), ppIdx: iJdx, Atx: Atx });
			}
		}
        //console.log('bboxes', SSMain.bboxes);
	},
	rewriteMainHeader: function()
	{
		let sText = 'Shutter: ';
		if(shutterIdx < SSTools.design.file.shutters.length)
		{
			sText += SSTools.design.getShutter(shutterIdx).description;
			sText += '    Layer: ' + SSMain.layerText[SSMain.layerIdx];
		}
		SSMain.pnlObj.hdrLeft.innerHTML = sText;
	},

	/*
	* As discussed above, this draws the shutter and all the pieces on the shutter. These are static.
	* Considering drawing the layers transparently on the outline layer.  This would allow the userto
	* see the outline and the pieces at the same time.  It would be a good way to see how the pieces
	* fit into the shutter. In particular, one can see how the crossed pices fit into the shutter.
	* This makes the use of smaller pieces easier to do and verify that they are correct.
	*/
		
	redrawMainPanel: function()
	{
		//console.log('Redraw Main Panel');
		//console.log(SSMain.pnlObj.panel.clientWidth, SSMain.pnlObj.panel.clientHeight);
		//1st we need to know the limits for the given shutter.
		//let minX = SSMain.workingShutter.minX;
		//let minY = SSMain.workingShutter.minY
		//let maxX = SSMain.workingShutter.maxX;
		//let maxY = SSMain.workingShutter.maxY
		//let width = SSMain.pnlObj.panel.clientWidth;
		//let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		//SSMain.pnlObj.lwrCnvs.width = width;
		//SSMain.pnlObj.lwrCnvs.height = height;
		//SSMain.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		//SSMain.pnlObj.lwrCnvs.style.height = height.toString()+'px';
		//SSMain.pnlObj.lwrCnvs.style.top = SSTools.hdrH.toString() + 'px';
		//SSMain.pnlObj.lwrCnvs.style.left = '0px';
		//// Display orign
		let x0 = 10 + SSMain.width/2;
		let y0 = -10 + SSMain.height/2;
		//// mainUnit controls scaling.  It is number of pixels for 100 drawing units
		//mainUnit = zoom*SSDisplay.calcDisplayScale( width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		let ctx = SSMain.pnlObj.lwrCnvs.getContext("2d");
		//Clear the canvas
        ctx.clearRect(0, 0, SSMain.width, SSMain.height);
		SSDisplay.displayScales(ctx, SSMain.width - 20, SSMain.height - 20, x0, y0, SSMain.mainUnit);
		//Now the rest of the story
		ctx.save();
		
		//console.log('mainUnit', mainUnit);
		//console.log(20 + mainUnit, height - 20 - mainUnit);
		//console.log(SSMain.workingShutter.outline);
		//Move 0,0 from upper left down to scale point
		//ctx.translate(x0, y0);
		//let atx = Affine.getTranslateATx({x:x0, y:y0});
		////ctx.translate(width/2, height/2);
		////now scale it
		//atx = Affine.append(atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		//ctx.scale(mainUnit, -mainUnit);
        Affine.ctxTransform(ctx, SSMain.shutterReal2DispTransform);
		ctx.lineWidth = 2/SSMain.mainUnit;  //Compensate for scaling
		//shutterInverseAtx = Affine.getInverseATx(atx);
		let path = new Path2D(SSMain.workingShutter.outline);
		//ctx.strokeStyle = 'black';
		ctx.fillStyle = 'rgb(230,230,230)';
		ctx.fill(path);
		ctx.stroke(path);
		//Now to draw the panel pieces
		if (SSMain.layerIdx == 3)
		{
			let alphas = [0.75, 0.75, 0.75, 1];
            ctx.save();
            for (let iIdx = 0; iIdx < SSMain.workingShutter.layers.length; iIdx++)
			{
                ctx.translate(-0.5, -0.5);
				let path = new Path2D(SSMain.workingShutter.outline);
				//ctx.strokeStyle = 'black';
                ctx.fillStyle = `rgb(230,230,230,${alphas[2 - iIdx]})`;
				ctx.fill(path);
				SSMain.drawShutterLayer(ctx, 2 - iIdx, alphas[2 - iIdx]);
				if (SSMain.showLayer == 2 - iIdx) break;
			}
            ctx.restore();
		}else
		{
            SSMain.drawShutterLayer(ctx, SSMain.layerIdx, 1);
		}
		//for(let iIdx = 0; iIdx < SSMain.workingShutter.holes.length; iIdx++)
		//{
		//	let hole = SSMain.workingShutter.holes[iIdx];
		//	let holePoly = SSCNC.makeHolePath(hole.dia, hole.center, 0);
		//	path = new Path2D(utils.poly2Svg(holePoly));
		//	ctx.stroke(path);
		//}
		ctx.restore();
		path = new Path2D('M 20 ' + y0.toString() + ' L ' + SSMain.width.toString() + ' ' + y0.toString());
		ctx.strokeStyle = "rgb(200,200,200)";
		ctx.stroke(path);
		path = new Path2D('M ' + x0.toString() + ' 0  L ' + x0.toString() + ' ' + (SSMain.height - 20).toString());
		ctx.stroke(path);
	},

	/*
	* This function takes code that was in the redrawMainPanel function and moves it to a separate function.
	* In addition to context and layer, it needs a way to indicate styling. I need to think a little more about
	* how we are going to style the transparent layers. Do we have different colors for different layers?  Or do
	* we change transparency?  The goal is to make it easy to determine the layer for a given piece.  Maybe we
	* combine the two.  We have a color for the layer and we change the transparency.  This would allow us to
	* see the outline and the pieces at the same time.  This would be very useful for the crossed pieces.
	*
	* A little more complication is that there are several colors used on a layer. The edges of the pieces are
	* black, the stripes are grey, the interior is rgb(180,255,180) and the keep out strokes are red.  The idea
	* of different colors is not straight forward. Let's start with transparency.
	*/
	drawShutterLayer: function (ctx, layerIdx, alpha)
	{
		//console.log('panelPieces.length', SSMain.workingShutter.layers[layerIdx].panelPieces.length);
		//console.log('SSTools.design.blankKOs', SSTools.design.blankKOs);
		for (let iIdx = 0; iIdx < SSMain.workingShutter.layers[layerIdx].panelPieces.length; iIdx++)
		{
            //console.log('iIdx', iIdx);
			let piece = SSMain.workingShutter.layers[layerIdx].panelPieces[iIdx];
			//let at = piece.panelTrans;
			ctx.save();
			Affine.ctxTransform(ctx, piece.panelTrans);
			//ctx.transform(at[0][0], at[1][0], at[0][1], at[1][1], at[0][2], at[1][2]);
			//console.log('piece', piece);
			let path = new Path2D(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path);
			if ((SSMain.selectedPiece.iSdx == shutterIdx) && (SSMain.selectedPiece.iLdx == layerIdx) && (SSMain.selectedPiece.iPdx == iIdx))
			{
                ctx.fillStyle = `rgb(180,255,180,${alpha})`;
				ctx.fill(path);
			}
            ctx.strokeStyle = `rgb(0,0,0,${alpha})`;
			ctx.stroke(path);
			path = new Path2D(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].stripes);
			//Make the selected piece have green stripes
            ctx.strokeStyle = `rgb(180,180,180,${alpha})`;
			ctx.stroke(path);
			//Now position the associated text
			//NOTE this is now on overlay
			// let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[layerIdx];
			// let sText = SSTools.design.getShutterPieceText(workingIdx, layerIdx, piece.panelPieceIdx);
			// let pathTxt = SSCNC.svgText(sText, 1);
			// if(rotation != 0)pathTxt = utils.svgTransform(pathTxt, Affine.getRotateATx(rotation));

			// pathTxt = utils.svgTransform(pathTxt, SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans);
			// ctx.strokeStyle = "rgb(0,0,0)";
			// ctx.stroke(new Path2D(pathTxt));
			let poly = utils.svg2Poly(SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path);
			let keepOut = SSTools.design.blankKOs[SSTools.design.file.panels[piece.panelIdx].blankIdx];
			//console.log('keepOut', keepOut);
			let intersects = utils.intersections(poly, keepOut, 0.01);
			//console.log('intersects', intersects);
			let curves = [];
			if (intersects.length != 0)
			{
				//We just want the keepOut lines on this panel piece
				let defensiveCnt = 0;
				let header = intersects.pop(); //Get the header
				let startIdx = header.next[1];
				let workingIdx = startIdx;
				do
				{
					let workingIntersect = intersects[workingIdx];
					let nextIdx = workingIntersect.next[1];
					let nextIntersect = intersects[nextIdx];
					//Tricky, not using if to allow implied else
					while (workingIntersect.xp < 0)
					{
						//KeepOut is entering piece
						if (workingIntersect.idx[1] == nextIntersect.idx[1])
						{
							//This will not happen for the panels, but in general this handles
							//the case where there are two intersections on the same curve
							curves.push(keepOut.curves[workingIntersect.idx[1]].split(workingIntersect.t[1], nextIntersect.t[1]));
							break;
						}
						//console.log('workingIntersect.idx[1]', workingIntersect.idx[1]);
						curves.push(keepOut.curves[workingIntersect.idx[1]].split(workingIntersect.t[1], 1.0));
						let c2Idx = workingIntersect.idx[1] + 1;
						if (c2Idx >= keepOut.curves.length) c2Idx = 0;
						while (c2Idx != nextIntersect.idx[1])
						{
							curves.push(keepOut.curves[c2Idx++]);
							if (c2Idx >= keepOut.curves.length) c2Idx = 0;
						}
						//console.log('c2Idx', c2Idx);
						curves.push(keepOut.curves[c2Idx].split(0, nextIntersect.t[1]));
						break;
					}
					workingIdx = nextIdx;
					defensiveCnt++;
					//console.log('defensiveCnt', defensiveCnt);
				} while (workingIdx != startIdx && defensiveCnt <= 2 * intersects.length);

			}
			//path = new Path2D(utils.poly2Svg(keepOut));
			//utils.transformPoly(poly, piece.panelTrans);M -22 -4.497787560897219 L -22 45.9968122656
			//curves.pop();
			poly = new PolyBezier(curves);
			//console.log('utils.poly2Svg(poly)', utils.poly2Svg(poly));
			path = new Path2D(utils.poly2Svg(poly));
			//path = new Path2D('M -21.5 -4 L -22 46 ');
            ctx.strokeStyle = `rgb(255,0,0,${alpha})`;
			ctx.stroke(path);
			ctx.restore();
			//path = 
		}
	},
	
	redrawMainOverlay: function()
	{
		//let width = SSMain.pnlObj.panel.clientWidth;
		//let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
		//SSMain.pnlObj.upprCnvs.width = width;
		//SSMain.pnlObj.upprCnvs.height = height;
		//SSMain.pnlObj.upprCnvs.style.width = width.toString()+'px';
		//SSMain.pnlObj.upprCnvs.style.height = height.toString()+'px';
		//SSMain.pnlObj.upprCnvs.style.top = SSTools.hdrH.toString() + 'px';
		//SSMain.pnlObj.upprCnvs.style.left = '0px';
		let ctx = SSMain.pnlObj.upprCnvs.getContext("2d");
		ctx.globalAlpha = 0.0;
		ctx.clearRect(0, 0, SSMain.width, SSMain.height);
		ctx.globalAlpha = 1.0;
		if(SSMain.layerIdx == 3)return;
		//if(!SSMain.mouseMoveRef.in)return;
		//let minX = SSMain.workingShutter.minX;
		//let minY = SSMain.workingShutter.minY
		//let maxX = SSMain.workingShutter.maxX;
		//let maxY = SSMain.workingShutter.maxY
		//// Display orign
		//// let x0 = 10 + width/2 + SSAvail.availSelect.move.x;
		//// let y0 = -10 + height/2 + SSAvail.availSelect.move.y;
		//let x0 = 10 + width/2;
		//let y0 = -10 + height/2;
		//// unit controls scaling.  It is number of pixels for 100 drawing units
		//mainUnit = zoom * SSDisplay.calcDisplayScale( width - 20, height - 20, 2 + maxX - minX, 2 + maxY - minY);
		//mainAtx = Affine.getTranslateATx({x:x0, y:y0});
		////mainAtx = Affine.append( Affine.getScaleATx({x:mainUnit, y:-mainUnit}), mainAtx);
		//mainAtx = Affine.append(mainAtx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
		//Now adjust scaling
		ctx.save();
		//console.log('mainUnit', mainUnit);
		//console.log(20 + mainUnit, height - 20 - mainUnit);
		//console.log(SSMain.workingShutter.outline);
		//Move 0,0 from upper left down to scale point
		//ctx.translate(x0, y0);
		//ctx.translate(width/2, height/2);
		//now scale it
		//ctx.scale(mainUnit, -mainUnit);
        Affine.ctxTransform(ctx, SSMain.shutterReal2DispTransform);
		ctx.lineWidth = 2 /SSMain.mainUnit;  //Compensate for scaling
		//console.log("doing text");
		//ctx.restore();
		for(let iIdx = 0; iIdx < SSMain.bboxes[SSMain.layerIdx].length; iIdx++)
		{
				let piece = SSMain.workingShutter.layers[SSMain.layerIdx].panelPieces[SSMain.bboxes[SSMain.layerIdx][iIdx].ppIdx];
			//let at = piece.panelTrans;
			ctx.save();
			//Affine.ctxTransform(ctx, piece.panelTrans);
			//Now position the associated text
			//let sText = SSMain.workingShutter.description + ' ' + SSMain.layerText[SSMain.layerIdx];
			//let pathTxt = SSCNC.svgText(sText, 1);
			//if(rotation != 0)pathTxt = utils.svgTransform(pathTxt, Affine.getRotateATx(rotation));

			//pathTxt = utils.svgTransform(pathTxt, SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans);
			ctx.strokeStyle = "rgb(0,0,0)";
			let moveText = SSMain.bboxes[SSMain.layerIdx][iIdx].path;
			if(iIdx == SSAvail.availSelect.textIdx)
			{
                //console.log('moveText', SSMain.bboxes[SSMain.layerIdx][iIdx].textAtx);
				SSAvail.availSelect.editIdx = SSAvail.availSelect.textIdx;
				//if(textRot != 0)moveText = utils.svgTransform(moveText, Affine.getRotateATx(textRot));
				//moveText = utils.svgTransform(moveText, SSMain.bboxes[SSMain.layerIdx][iIdx].Atx);
				//moveText = utils.svgTransform(moveText, piece.panelTrans);
				//moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.move.x/mainUnit, y:-SSAvail.availSelect.move.y/mainUnit}));
				//moveText = utils.svgTransform(moveText, mainAtx);
				ctx.strokeStyle = "rgb(0,0,255)";
			}
			moveText = utils.svgTransform(moveText, SSMain.bboxes[SSMain.layerIdx][iIdx].textAtx);
			moveText = utils.svgTransform(moveText, piece.panelTrans);
			//moveText = utils.svgTransform(moveText, mainAtx);
				
			ctx.stroke(new Path2D(moveText));
			ctx.restore();
			//path = 
		}
		//console.log("uncovered length", SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.length);
		ctx.restore();
		if (SSMain.workingShutter.layers[SSMain.layerIdx].uncovered.length == 0) return;
//		ctx.restore();
		if (SSAvail.availSelect.idx < 0) return;
		//Display panel possible that transform is not set
		if (SSMain.panelFromShutterTransform == null) return;
		ctx.save();
		// Here we calculate the affine transform for the panel that is being dragged around.
		//As usual the operation are in reverse.  So this is the last operation a translation
		//in display units (mouse dragging generated)
        let Atx = SSMain.shutterReal2DispTransform;
		//Scale from world to display
        Atx = Affine.append(Atx, SSMain.panel2ShutterTransform);
		//Rotate if needed
		//Atx = Affine.append(Atx, Affine.getRotateATx(SSAvail.rotation));
		//SSMain.panelFromShutterTransform = Affine.getInverseATx(Atx);
		//Note there is an implied real world translation of 0,0 here
		//Set this transform in the display context
		Affine.ctxTransform(ctx, Atx);
		ctx.lineWidth = 2 / SSMain.mainUnit;  //Compensate for scaling
		//console.log('SSMain.panelFromShutterTransform', SSMain.panelFromShutterTransform);
		SSAvail.drawPanelWCtx(ctx, SSAvail.avs[SSAvail.availSelect.idx].t, SSAvail.avs[SSAvail.availSelect.idx].i);
		ctx.restore();
	}
	
//	return this;
	
}

export default SSMain;

