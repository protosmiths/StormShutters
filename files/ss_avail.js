import { Affine } from './psBezier/affine.js';
import SSPanel  from './ss_panel.js';
import SSTools  from './ss_tools.js';
import SSMain  from './ss_main.js';
import { SSCNC } from './ss_cnc.js';
import SSEntry  from './ss_entry.js';
import SSDisplay  from './ss_display.js';
import { utils } from './psBezier/utils.js';

var availSides = 2;
var availUnit = 0;

class SSAvailClass
{
    constructor()
    {
        this.rotation = 0;
        this.selectAtx = Affine.getIdentityATx();
        this.dragTransform = null;
        this.pnlObj = null;
        this.availSelect = { move: { x: 0, y: 0 }, idx: 0, textIdx: -1, textRot: 0, textAtx: null, textInvAtx: null, editIdx: -1, count: 0, corner: null };
        this.avs = [];
        this.isDragging = false;
        this.dragCanvas = null;
        this.dragCtx = null;
        this.dragDisplayOffsetX = 0;
        this.dragDisplayOffsetY = 0;
        this.dragInverseTransform = null;
        this.shutterInPanelTransform = null;
    }

    init()
    {
        let lwrCnvs = document.createElement('canvas');
        let upprCnvs = document.createElement('canvas');
        SSAvail.pnlObj = SSPanel.panelFactory('pnlAvail', lwrCnvs, upprCnvs);
        SSAvail.pnlObj.redraw = SSAvail.redrawAvailPanel.bind(this);
        SSAvail.pnlObj.panel.style.width = "600px";
        let width = SSAvail.pnlObj.panel.clientWidth - 20;
        let height = SSAvail.pnlObj.panel.clientHeight - 50;
        SSAvail.pnlObj.lwrCnvs.width = width;
        SSAvail.pnlObj.lwrCnvs.height = height;
        SSAvail.pnlObj.upprCnvs.width = width;
        SSAvail.pnlObj.upprCnvs.height = height;
        SSAvail.pnlObj.lwrCnvs.style.width = width + 'px';
        SSAvail.pnlObj.lwrCnvs.style.height = height + 'px';
        SSAvail.pnlObj.upprCnvs.style.width = width + 'px';
        SSAvail.pnlObj.upprCnvs.style.height = height + 'px';

        let btnNew = SSPanel.createButton('New', SSAvail.clickNew.bind(this));
        btnNew.style.width = '40px';

        let btnOpen = SSPanel.createButton('Open', SSAvail.open.bind(this));
        btnOpen.style.width = '50px';

        let btnSave = SSPanel.createButton('Save', SSAvail.save.bind(this));
        btnSave.style.width = '50px';

        let btnRot = SSPanel.createButton('Rot', SSAvail.rotate.bind(this));
        btnRot.style.width = '40px';

        let btnCNC = SSPanel.createButton('CNC', SSCNC.focusCNC);
        btnCNC.style.width = '40px';

        SSAvail.pnlObj.hdrRight.appendChild(btnNew);
        SSAvail.pnlObj.hdrRight.appendChild(btnOpen);
        SSAvail.pnlObj.hdrRight.appendChild(btnSave);
        SSAvail.pnlObj.hdrRight.appendChild(btnRot);
        SSAvail.pnlObj.hdrRight.appendChild(btnCNC);

        document.addEventListener('mousedown', SSAvail.availMouseDown.bind(this));
        document.addEventListener('mousemove', SSAvail.availMouseMove.bind(this));
        document.addEventListener('mouseup', SSAvail.availMouseUp.bind(this));
        document.addEventListener('keydown', SSAvail.availKeyDown.bind(this));
    }

    availKeyDown(e)
    {
        e = e || window.event;

        const target = e.target;
        const isInteractive = target.matches('input, textarea, button, select, a[href]');

        if (isInteractive)
        {
            return; // Allow default behavior for interactive elements
        }

        if ((SSMain.mouseMoveRef.grab) && (SSAvail.availSelect.textIdx >= 0))
        {
            console.log('SSAvail.availKeyDown', e.key);
            if (e.key == 'r' || e.key == 'R')
            {
                e.preventDefault();
                SSAvail.availSelect.textRot += Math.PI / 2;
                if (SSAvail.availSelect.textRot >= 2 * Math.PI) SSAvail.availSelect.textRot = 0;
                SSMain.calcTextTransform(SSMain.mousePoint);
                console.log('Rotate Text', SSMain.mousePoint, SSAvail.availSelect.textRot);
                SSMain.redrawMainOverlay();
                return;
            }
            if (e.key == 'ArrowDown')
            {
                e.preventDefault();
                SSAvail.availSelect.textScale = { x: 3 * SSAvail.availSelect.textScale.x / 4, y: 3 * SSAvail.availSelect.textScale.y / 4 };
                console.log('Scale Text', SSMain.mousePoint, SSAvail.availSelect.textScale);
                SSMain.calcTextTransform(SSMain.mousePoint);
                SSMain.redrawMainOverlay();
                return;
            }
            if (e.key == 'ArrowUp')
            {
                e.preventDefault();
                SSAvail.availSelect.textScale = { x: 4 * SSAvail.availSelect.textScale.x / 3, y: 4 * SSAvail.availSelect.textScale.y / 3 };
                SSMain.calcTextTransform(SSMain.mousePoint);
                SSMain.redrawMainOverlay();
                return;
            }
        }
    }

    calcDragTransform()
    {
        SSAvail.dragTransform = Affine.getTranslateATx({ x: SSAvail.dragCanvas.width / 2, y: SSAvail.dragCanvas.height / 2 });
        SSAvail.dragTransform = Affine.append(SSAvail.dragTransform, Affine.getScaleATx({ x: availUnit, y: -availUnit }));
        SSAvail.dragTransform = Affine.append(SSAvail.dragTransform, Affine.getRotateATx(SSAvail.rotation));
        SSAvail.dragInverseTransform = Affine.getInverseATx(SSAvail.dragTransform);
        if (SSAvail.availSelect.corner == null) return;
        let ulCorner = { x: SSAvail.availSelect.corner.x, y: SSAvail.availSelect.corner.y };
        Affine.transformPoint(ulCorner, SSAvail.dragTransform);
        SSAvail.dragDisplayOffsetX = -ulCorner.x;
        SSAvail.dragDisplayOffsetY = -ulCorner.y;
    }

    createDragCanvas()
    {
        SSAvail.dragCanvas = document.createElement('canvas');
        SSAvail.dragCanvas.width = 12 * 9 * availUnit;
        SSAvail.dragCanvas.height = SSAvail.dragCanvas.width;
        SSAvail.dragCanvas.style.position = 'absolute';
        SSAvail.dragCanvas.style.pointerEvents = 'none';
        SSAvail.dragCanvas.style.backgroundColor = 'transparent';
        SSAvail.dragCanvas.style.zIndex = 1000;
        document.body.appendChild(SSAvail.dragCanvas);
        SSAvail.dragCtx = SSAvail.dragCanvas.getContext('2d');
        SSAvail.calcDragTransform();
    }

    startDragging()
    {
        SSAvail.isDragging = true;
        SSAvail.drawPanelOnDragCanvas();
    }

    stopDragging(mouseX, mouseY)
    {
        SSAvail.isDragging = false;
    }

    drawPanelOnDragCanvas()
    {
        SSAvail.dragCtx.globalAlpha = 0.0;
        SSAvail.dragCtx.clearRect(0, 0, SSAvail.dragCanvas.width, SSAvail.dragCanvas.height);
        SSAvail.dragCtx.globalAlpha = 1.0;
        SSAvail.dragCtx.save();
        Affine.ctxTransform(SSAvail.dragCtx, SSAvail.dragTransform);
        SSAvail.dragCtx.lineWidth = 1 / availUnit;
        let avs = SSAvail.avs[SSAvail.availSelect.idx];
        SSAvail.drawPanelWCtx(SSAvail.dragCtx, avs.t, avs.i);
        SSAvail.dragCtx.restore();
    }

    findClosestCornerSelectedPanel(realWorld, snapDist = 10)
    {
        let avs = SSAvail.avs[SSAvail.availSelect.idx];
        let poly;
        let aPt = { pt: { x: 0, y: 0 }, dist: -1 };
        switch (avs.t)
        {
            case 0:
                poly = utils.svg2Poly(SSTools.design.file.blanks[avs.i].path);
                aPt = SSAvail.closestEndpointDist(poly, realWorld, aPt);
                break;
            case 1:
                for (let iIdx = 0; iIdx < SSTools.design.file.panels[avs.i].unused.length; iIdx++)
                {
                    poly = utils.svg2Poly(SSTools.design.file.panels[avs.i].unused[iIdx].path);
                    aPt = SSAvail.closestEndpointDist(poly, realWorld, aPt);
                }
                break;
            case 2:
                SSAvail.availSelect.corner = null;
                break;
        }
        SSAvail.availSelect.corner = null;
        if ((aPt.dist >= 0) && (aPt.dist < snapDist))
        {
            SSAvail.availSelect.corner = aPt.pt;
        }
        return aPt;
    }

    findClosestCorner(mouseX, mouseY)
    {
        SSAvail.findClosestPanel(mouseX, mouseY);
        let avs = SSAvail.avs[SSAvail.availSelect.idx];
        let revTrans = Affine.getScaleATx({ x: 1 / availUnit, y: -1 / availUnit });
        revTrans = Affine.append(revTrans, Affine.getRotateATx(SSAvail.rotation));
        revTrans = Affine.append(revTrans, Affine.getTranslateATx({ x: -avs.x, y: -avs.y }));
        let realWorld = { x: mouseX, y: mouseY };
        Affine.transformPoint(realWorld, revTrans);
        return SSAvail.findClosestCornerSelectedPanel(realWorld);
    }

    closestEndpointDist(poly, realWorld, ep)
    {
        for (let iIdx = 0; iIdx < poly.curves.length; iIdx++)
        {
            let testDist = utils.dist(poly.curves[iIdx].get(0), realWorld);
            if ((testDist < ep.dist) || (ep.dist < 0))
            {
                ep.pt = poly.curves[iIdx].get(0);
                ep.dist = testDist;
            }
        }
        return ep;
    }

    availMouseDown(e)
    {
        e = e || window.event;
        const target = e.target;
        const isInteractive = target.matches('input, textarea, button, select, a[href]');

        if (isInteractive)
        {
            return; // Allow default behavior for interactive elements
        }

        let rect = SSAvail.pnlObj.lwrCnvs.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        if (x < 0 || x >= SSAvail.pnlObj.lwrCnvs.width || y < 0 || y >= SSAvail.pnlObj.lwrCnvs.height) return;

        console.log('SSAvail.availMouseDown');
        //e.preventDefault();
        SSAvail.findClosestCorner(x, y).pt;
        SSAvail.createDragCanvas();
        SSAvail.startDragging();
        SSAvail.updateDragCanvasPosition(e.clientX, e.clientY);
        SSAvail.drawPanelOnDragCanvas();
    }

    availMouseMove(e)
    {
        e = e || window.event;

        if (SSAvail.isDragging)
        {
            e.preventDefault();

            let rect = SSMain.pnlObj.panel.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            if (x >= 0 && x < SSMain.pnlObj.panel.clientWidth && y >= 0 && y < SSMain.pnlObj.panel.clientHeight)
            {
                //e.offsetX = x;
                //e.offsetY = y;
                SSMain.mainMouseDown(e);
                SSAvail.stopDragging(e.offsetX, e.offsetY);
                document.body.removeChild(SSAvail.dragCanvas);
                //e.offsetX = x;
                //e.offsetY = y;
                return;
            }
            SSAvail.updateDragCanvasPosition(e.clientX, e.clientY);
            SSAvail.drawPanelOnDragCanvas();
        }
    }

    availMouseUp(e)
    {
        e = e || window.event;

        if (SSAvail.isDragging)
        {
            e.preventDefault();
            SSAvail.stopDragging(e.offsetX, e.offsetY);
            document.body.removeChild(SSAvail.dragCanvas);
        }
    }

    updateDragCanvasPosition(mouseX, mouseY)
    {
        SSAvail.dragCanvas.style.left = SSAvail.dragDisplayOffsetX + mouseX + 'px';
        SSAvail.dragCanvas.style.top = SSAvail.dragDisplayOffsetY + mouseY + 'px';
    }

    findClosestPanel(mouseX, mouseY)
    {
        let iIdx = 0;
        let iX = SSAvail.avs[iIdx].x - mouseX;
        let iY = SSAvail.avs[iIdx].y - mouseY;
        let iDist2 = iX * iX + iY * iY;
        let iFound = 0;
        for (iIdx = 1; iIdx < SSAvail.avs.length; iIdx++)
        {
            let iTestX = SSAvail.avs[iIdx].x - mouseX;
            let iTestY = SSAvail.avs[iIdx].y - mouseY;
            let iTestDist2 = iTestX * iTestX + iTestY * iTestY;
            if (iTestDist2 < iDist2)
            {
                iFound = iIdx;
                iDist2 = iTestDist2;
                iX = iTestX;
                iY = iTestY;
            }
        }
        SSAvail.availSelect.move.x = 0;
        SSAvail.availSelect.move.y = 0;
        SSAvail.selectAtx = Affine.getIdentityATx();
        if (SSAvail.rotation != 0) SSAvail.selectAtx = Affine.append(SSAvail.selectAtx, Affine.getRotateATx(SSAvail.rotation));

        SSAvail.availSelect.idx = iFound;
        SSAvail.redrawAvailPanel();
    }

    rotate()
    {
        SSAvail.rotation += Math.PI / 2;
        if (SSAvail.rotation >= 2 * Math.PI) SSAvail.rotation = 0;
        if (SSAvail.isDragging)
        {
            SSAvail.calcDragTransform();
            SSAvail.drawPanelOnDragCanvas();
        }
        SSMain.rotate();
        SSAvail.redrawAvailPanel();
        SSAvail.redrawAvailOverlay();
    }

    clickNew()
    {
        SSEntry.newDesign();
        console.log('New design');
    }

    async open()
    {
        let handle = await window.showOpenFilePicker();
        SSTools.design.readFile(handle);
    }

    async save()
    {
        let handle = await window.showSaveFilePicker();
        SSTools.design.writeFile(handle);
    }
    //	SSAvail.recalcAvailPanels = function()
    //	{
    //		let width = SSAvail.pnlObj.lwrCnvs.width - 20;
    //		let height = SSAvail.pnlObj.lwrCnvs.height - 20;

    //		//console.log('width, height', width, height);
    //		let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
    //		SSAvail.availSelect.count = count;
    //		availSides = 2;
    //		while(count > availSides * availSides)availSides++;
    //		let feet = availSides * 9;
    //		availUnit = SSDisplay.calcDisplayScale(width, height, 12*feet, 12*feet);
    //		//console.log('availUnit', availUnit);
    //		let paths = [];
    //		for(let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
    //		{
    //			paths.push({t:0, i:iIdx, obj:SSTools.design.file.blanks[iIdx]});
    //		}
    //		for(let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
    //		{
    //			paths.push({ t: 1, i: iIdx, obj: SSTools.design.file.panels[iIdx] });
    //		}
    //		for(let iIdx = paths.length; iIdx < availSides * availSides; iIdx++)
    //		{
    //			paths.push({t:2, i:iIdx, obj:null});
    //			//console.log('Empty Panel');
    //		}
    //		//Calculate the middle of the first box in Avail Canvas coords
    //		let orgX = 20 + 4.5 * 12* availUnit;
    //		let orgY = 4.5 * 12 * availUnit;
    //		SSAvail.avs = [];
    //		let iT = 0;
    //		for(let iRow = 0; iRow < availSides; iRow++)
    //		{
    //			for(let iCol = 0; iCol < availSides; iCol++)
    //			{
    //				let iX = orgX + iCol * 9 * 12*availUnit;
    //				let iY = orgY + (iRow * 9 * 12 * availUnit);
    //				SSAvail.avs.push({t:paths[iT].t, i:paths[iT].i, x:iX, y:iY, obj:paths[iT]});
    //				iT++;
    //			}
    //		}
    //		SSAvail.redrawAvailPanel();
    //	}

    recalcAvailPanels()
    {
        let width = SSAvail.pnlObj.lwrCnvs.width - 20;
        let height = SSAvail.pnlObj.lwrCnvs.height - 20;
        //console.log('width, height', width, height);
        let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
        SSAvail.availSelect.count = count;
        availSides = 2;
        while (count > availSides * availSides) availSides++;
        let feet = availSides * 9;
        availUnit = SSDisplay.calcDisplayScale(width, height, 12 * feet, 12 * feet);
        //console.log('availUnit', availUnit, 'feet', feet, 'count', count);
        let paths = [];
        for (let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
        {
            paths.push({ t: 0, i: iIdx, obj: SSTools.design.file.blanks[iIdx] });
        }
        for (let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
        {
            paths.push({ t: 1, i: iIdx, obj: SSTools.design.file.panels[iIdx] });
        }
        for (let iIdx = paths.length; iIdx < availSides * availSides; iIdx++)
        {
            paths.push({ t: 2, i: iIdx, obj: null });
        }
        let orgX = 20 + 4.5 * 12 * availUnit;
        let orgY = 4.5 * 12 * availUnit;
        SSAvail.avs = [];
        let iT = 0;
        for (let iRow = 0; iRow < availSides; iRow++)
        {
            for (let iCol = 0; iCol < availSides; iCol++)
            {
                let iX = orgX + iCol * 9 * 12 * availUnit;
                let iY = orgY + (iRow * 9 * 12 * availUnit);
                SSAvail.avs.push({ t: paths[iT].t, i: paths[iT].i, x: iX, y: iY, obj: paths[iT] });
                iT++;
            }
        }
        SSAvail.redrawAvailPanel();
    }

    rewriteAvailHeader()
    {
        SSAvail.pnlObj.hdrLeft.innerHTML = 'Design: ' + SSTools.design.file.description;
    }

    //	SSAvail.redrawAvailPanel = function()
    //	{
    //		let width = SSAvail.pnlObj.lwrCnvs.width;
    //		let height = SSAvail.pnlObj.lwrCnvs.height;
    //		let ctx = SSAvail.pnlObj.lwrCnvs.getContext("2d");
    //		ctx.clearRect(0, 0, width, height);
    //		SSDisplay.displayScales(ctx, width - 20, height - 20, width/2, height/2, 12*availUnit);
    //		let iT = 0;
    //		for(let iIdx = 0; iIdx < SSAvail.avs.length; iIdx++)
    //		{
    //			let iX = SSAvail.avs[iIdx].x;
    //			let iY = SSAvail.avs[iIdx].y;
    //			ctx.save();
    //			//console.log(iX, iY);
    //			ctx.translate(iX, iY);
    //			ctx.scale(availUnit, -availUnit);
    //			ctx.lineWidth = 2/availUnit;  //Compensate for scaling
    //			let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54 Z');
    //			if(iIdx == SSAvail.availSelect.idx)
    //			{
    //				ctx.fillStyle = 'rgb(220,220,255)';
    //				ctx.fill(path);
    //			}
    //			ctx.stroke(path);
    //			ctx.restore();
    //			ctx.save();
    //			ctx.translate(iX, iY);
    //			ctx.scale(availUnit, -availUnit);
    //			ctx.rotate(SSAvail.rotation);
    //			SSAvail.drawPanelWCtx(ctx, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
    //			ctx.restore();
    //			//SSDisplay.drawPanel(ctx, 0,0, iX, iY, availUnit, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
    //		}
    //	}

    redrawAvailPanel()
    {
        let width = SSAvail.pnlObj.lwrCnvs.width;
        let height = SSAvail.pnlObj.lwrCnvs.height;
        let ctx = SSAvail.pnlObj.lwrCnvs.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        SSDisplay.displayScales(ctx, width - 20, height - 20, width / 2, height / 2, 12 * availUnit);
        let iT = 0;
        for (let iIdx = 0; iIdx < SSAvail.avs.length; iIdx++)
        {
            let iX = SSAvail.avs[iIdx].x;
            let iY = SSAvail.avs[iIdx].y;
            ctx.save();
            ctx.translate(iX, iY);
            ctx.scale(availUnit, -availUnit);
            ctx.lineWidth = 2 / availUnit;
            let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54 Z');
            if (iIdx == SSAvail.availSelect.idx)
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
        }
    }

    /*
    * This is a clever way to show the shutter in the selected panel in the avail panel. Note that there is an
    * implied transform where the shutter origin is at the center of the panel.  The shutter and the panel have
    * the same units and are therefore in the same coordinate system.  The panel is rotated by the rotation
    * variable and translated into position in the shutter coordinates. The problem is when we rotate the panel
    * What is happening is that the panel is rotated in the display and to show the shutter in the panel we need
    * only translate. From the user's perspective we want to show the rotated panel.
    */
    redrawAvailOverlay()
    {
        if (SSAvail.shutterInPanelTransform == null) return;
        let width = SSAvail.pnlObj.upprCnvs.width;
        let height = SSAvail.pnlObj.upprCnvs.height;
        let ctx = SSAvail.pnlObj.upprCnvs.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        if (SSDisplay.layerIdx == 3) return;
        if (SSMain.selectedPiece.iSdx >= -1) return;
        if (SSAvail.availSelect.idx < 0) return;
        let iX = SSAvail.avs[SSAvail.availSelect.idx].x;
        let iY = SSAvail.avs[SSAvail.availSelect.idx].y;
        ctx.save();
        let atx = Affine.getTranslateATx({ x: iX, y: iY });
        atx = Affine.append(atx, Affine.getScaleATx({ x: availUnit, y: -availUnit }));
        atx = Affine.append(atx, SSAvail.shutterInPanelTransform);
        //We need to add a translation because the panel transform is relative to the selected corner
        //SSAvail.availSelect.corner is the corner of the panel selected in the avail panel
        if (SSAvail.availSelect.corner != null)
        {
            //Needs the negative because the panel transform is relative to the corner
            //atx = Affine.append(atx, Affine.getTranslateATx({ x: -SSAvail.availSelect.corner.x, y: -SSAvail.availSelect.corner.y }));
        }
        ctx.lineWidth = 2 / availUnit;
        Affine.ctxTransform(ctx, atx);
        let path = new Path2D(SSMain.workingShutter.outline);
        ctx.stroke(path);
        ctx.restore();
    }

    //	/*
    //	* The available panels are displayed in two places.  In the available screen and as individual panels
    //	* on the shutter screen.
    //	*/
    //	this.drawPanelWCtx = function(ctx, type, idx)
    //	{
    //		if(type > 1)return;

    //		let selectedPiece = false;
    //		let iPPdx = SSMain.selectedPiece.iSdx;
    //		if(iPPdx >= 0)
    //		{
    //			let piece = SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx].panelPieces[SSMain.selectedPiece.iPdx];
    //			if(piece.panelIdx == idx)
    //			{
    //				selectedPiece = true;
    //				iPPdx = piece.panelPieceIdx;
    //			}
    //		}

    //		let path;
    //		if(type == 0)
    //		{
    //			path = new Path2D(SSTools.design.file.blanks[idx].path);
    //			ctx.stroke(path);
    //			path = new Path2D(SSTools.design.file.blanks[idx].stripes);
    //			ctx.strokeStyle = "rgb(180,180,180)";
    //			ctx.stroke(path);
    //			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[idx]));
    //			ctx.strokeStyle = "rgb(255,0,0)";
    //			ctx.stroke(path);
    //		}else
    //		{
    //			let panel = SSTools.design.file.panels[idx];
    //			path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
    //			//ctx.stroke(path);
    //			for(let iIdx = 0; iIdx < panel.unused.length; iIdx++)
    //			{
    //				path = new Path2D(panel.unused[iIdx].path);
    //				ctx.stroke(path);
    //				ctx.strokeStyle = "rgb(180,180,180)";
    //				path = new Path2D(panel.unused[iIdx].stripes);
    //				ctx.stroke(path);
    //				ctx.strokeStyle = "rgb(0,0,0)";
    //			}
    //			for(let iIdx = 0; iIdx < panel.used.length; iIdx++)
    //			{
    //				path = new Path2D(panel.used[iIdx].path);
    //				if(selectedPiece && (iIdx == iPPdx))
    //				{
    //					ctx.fillStyle = "rgb(180,255,180)";
    //					ctx.fill(path);
    //				}else{
    //					ctx.fillStyle = "rgb(255,255,255)";
    //				}
    //				ctx.stroke(path);
    //			}
    //			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
    //			ctx.strokeStyle = "rgb(255,0,0)";
    //			ctx.stroke(path);
    //		}
    //	}

    drawPanelWCtx(ctx, type, idx)
    {
        if (type > 1) return;

        let selectedPiece = false;
        let iPPdx = SSMain.selectedPiece.iSdx;
        if (iPPdx >= 0)
        {
            let piece = SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx].panelPieces[SSMain.selectedPiece.iPdx];
            if (piece.t == type && piece.i == idx) selectedPiece = true;
        }
        //console.log('SSAvail.drawPanelWCtx', type, idx);
        let path;
        if (type == 0)
        {
            path = new Path2D(SSTools.design.file.blanks[idx].path);
            ctx.stroke(path);
            path = new Path2D(SSTools.design.file.blanks[idx].stripes);
            ctx.strokeStyle = "rgb(180,180,180)";
            ctx.stroke(path);
            path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[idx]));
            ctx.strokeStyle = "rgb(255,0,0)";
            ctx.stroke(path);
        } else
        {
            let panel = SSTools.design.file.panels[idx];
            path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
            //ctx.stroke(path);
            for (let iIdx = 0; iIdx < panel.unused.length; iIdx++)
            {
                path = new Path2D(panel.unused[iIdx].path);
                ctx.stroke(path);
                ctx.strokeStyle = "rgb(180,180,180)";
                path = new Path2D(panel.unused[iIdx].stripes);
                ctx.stroke(path);
                ctx.strokeStyle = "rgb(0,0,0)";
            }
            for (let iIdx = 0; iIdx < panel.used.length; iIdx++)
            {
                path = new Path2D(panel.used[iIdx].path);
                if (selectedPiece && (iIdx == iPPdx))
                {
                    ctx.fillStyle = "rgb(180,255,180)";
                    ctx.fill(path);
                } else
                {
                    ctx.fillStyle = "rgb(255,255,255)";
                }
                ctx.stroke(path);
            }
            path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
            ctx.strokeStyle = "rgb(255,0,0)";
            ctx.stroke(path);
        }
    }

}

export let SSAvail = new SSAvailClass();
export default SSAvail;
//        let path = new Path2D();
//        switch (type)
//        {
//            case 0:
//                //path = utils.svg2Path(SSTools.design.file.blanks[idx].path);
//                path = new Path2D(SSTools.design.file.blanks[idx].path);
//                break;
//            case 1:
//                //path = utils.svg2Path(SSTools.design.file.panels[idx].path);
//                path = new Path2D(SSTools.design.file.panels[idx].path);
//                break;
//        }
//        ctx.stroke(path);
//        if (selectedPiece)
//        {
//            ctx.fillStyle = 'rgb(220,220,255)';
//            ctx.fill(path);
//        }
//    }

//const SSAvail = new(function()
//{
	
//	this.rotation = 0;
//	this.selectAtx = Affine.getIdentityATx();
//	this.dragTransform = null;

//	this.pnlObj = null;

//	// This is for avail panel mouse events.
//	this.availSelect = { move: { x: 0, y: 0 }, idx: 0, textIdx: -1, textRot: 0, textAtx:null, textInvAtx:null, editIdx: -1, count: 0, corner: null};
	
//	//The avail panel displays multiple 
//	var availSides = 2;
	
//	this.avs = [];
	
//	this.init = function()
//	{
//		let lwrCnvs = document.createElement('canvas');
//		let upprCnvs = document.createElement('canvas');
//		SSAvail.pnlObj = SSPanel.panelFactory('pnlAvail', lwrCnvs, upprCnvs);
//		SSAvail.pnlObj.redraw = SSAvail.redrawAvailPanel;
//		//SSPanel.setPanelDrag(SSAvail.pnlObj);
//		//SSPanel.setPanelResize(SSAvail.pnlObj);
//		SSAvail.pnlObj.panel.style.width = "600px";
//		let width = SSAvail.pnlObj.panel.clientWidth - 20;
//		let height = SSAvail.pnlObj.panel.clientHeight - 50;
//		SSAvail.pnlObj.lwrCnvs.width = width;
//		SSAvail.pnlObj.lwrCnvs.height = height;
//		SSAvail.pnlObj.upprCnvs.width = width;
//		SSAvail.pnlObj.upprCnvs.height = height;
		
//		// let btnDir = SSPanel.createButton('Dir', this.openDir);
//		// btnDir.style.width = '50px';
		
//		let btnNew = SSPanel.createButton('New', SSAvail.clickNew);
//		btnNew.style.width = '40px';
		
//		let btnOpen = SSPanel.createButton('Open', SSAvail.open);
//		btnOpen.style.width = '50px';
		
//		let btnSave = SSPanel.createButton('Save', SSAvail.save);
//		btnSave.style.width = '50px';
		
//		let btnRot = SSPanel.createButton('Rot', SSAvail.rotate);
//		btnRot.style.width = '40px';
		
//		let btnCNC = SSPanel.createButton('CNC', SSCNC.focusCNC);
//		btnCNC.style.width = '40px';
		
//		// SSAvail.pnlObj.hdrRight.appendChild(btnDir);
//		SSAvail.pnlObj.hdrRight.appendChild(btnNew);
//		SSAvail.pnlObj.hdrRight.appendChild(btnOpen);
//		SSAvail.pnlObj.hdrRight.appendChild(btnSave);
//		SSAvail.pnlObj.hdrRight.appendChild(btnRot);
//		SSAvail.pnlObj.hdrRight.appendChild(btnCNC);
		
//		//SSAvail.pnlObj.panel.onclick = SSAvail.availMouseClick;
//		//Let the panel handle the mouse events. Do it with registration. Not this method that blows away the other handlers.
//		// Register mouse event handlers
//		document.addEventListener('mousedown', SSAvail.availMouseDown);
//		document.addEventListener('mousemove', SSAvail.availMouseMove);
//		document.addEventListener('mouseup', SSAvail.availMouseUp);

//        document.addEventListener('keydown', SSAvail.availKeyDown);
//		//SSAvail.pnlObj.panel.addEventListener('mousedown', SSAvail.availMouseDown);
//		//SSAvail.pnlObj.panel.addEventListener('mousemove', SSAvail.availMouseMove);
//		//SSAvail.pnlObj.panel.addEventListener('mouseup', SSAvail.availMouseUp);
//		//SSAvail.pnlObj.panel.addEventListener('click', SSAvail.availMouseClick);
//        //console.log('SSAvail.init registered events');
//	}

//	/*
//	* I would like to be able to use the 'r' or'R' key to rotate the panel.  I am going to add a keydown event to the document.
//	*/
//	this.availKeyDown = function (e)
//	{
//		if ((SSMain.mouseMoveRef.grab) && (SSAvail.availSelect.textIdx >= 0))
//		{
//			console.log('SSAvail.availKeyDown', e.key);
//			if (e.key == 'r' || e.key == 'R')
//			{
//				e.preventDefault();
//				SSAvail.availSelect.textRot += Math.PI / 2;
//				if (SSAvail.availSelect.textRot >= 2 * Math.Pi) SSAvail.availSelect.textRot = 0;
//				//calculate the new transform
//				SSMain.calcTextTransform(SSMain.mousePoint);
//                console.log('Rotate Text', SSMain.mousePoint, SSAvail.availSelect.textRot);
//				SSMain.redrawMainOverlay();
//				return;
//			}
//			if (e.key == 'ArrowDown')
//			{
//				e.preventDefault();
//                SSAvail.availSelect.textScale = { x: 3 * SSAvail.availSelect.textScale.x / 4, y: 3 * SSAvail.availSelect.textScale.y / 4 };
//                console.log('Scale Text', SSMain.mousePoint, SSAvail.availSelect.textScale);
//				//calculate the new transform
//				SSMain.calcTextTransform(SSMain.mousePoint);
//				SSMain.redrawMainOverlay();
//				return;
//			}

//			if (e.key == 'ArrowUp')
//			{
//				e.preventDefault();
//                SSAvail.availSelect.textScale = { x: 4 * SSAvail.availSelect.textScale.x / 3, y: 4 * SSAvail.availSelect.textScale.y / 3 };
//				//calculate the new transform
//				SSMain.calcTextTransform(SSMain.mousePoint);
//				SSMain.redrawMainOverlay();
//				return;
//			}

//            //SSAvail.rotate();
//        }
//    }

//	/*
//	* Since we can do rotations on the fly we need to be able to calculate the transform for the drag canvas.
//	* We have changed how we do this from other displays. In other displays we calculate the transform at the time
//	* we draw the panel.  We are changing to a more event driven style. We will calculate the transform when we start
//	* and when events cause it to change. While a little less bullet proof it is more efficient.
//	*
//	* Something tricky, we want to save and restore the context. In order to do a restore we need to save the context.
//	* But we want the modified context to be the one that is used.  So we need to save the context before we modify it.
//	* So when we create the drag canvas we will save the context.  That saved context will be the one that is restored.
//	*/
//	this.calcDragTransform = function ()
//	{
//		this.dragTransform = Affine.getTranslateATx({ x: this.dragCanvas.width / 2, y: this.dragCanvas.height / 2 });
//		this.dragTransform = Affine.append(this.dragTransform, Affine.getScaleATx({ x: availUnit, y: -availUnit }));
//		this.dragTransform = Affine.append(this.dragTransform, Affine.getRotateATx(this.rotation));
//		this.dragInverseTransform = Affine.getInverseATx(this.dragTransform);
//		let ulCorner = { x: SSAvail.availSelect.corner.x, y: SSAvail.availSelect.corner.y };
//		Affine.transformPoint(ulCorner, this.dragTransform);
//		//console.log('startDragging ulCorner', ulCorner.x, ulCorner.y);
//		this.dragDisplayOffsetX = -ulCorner.x;
//		this.dragDisplayOffsetY = -ulCorner.y;
//		//Restore the initial context
//		//this.dragCtx.restore();
//        //Replace the initial context on the stack for the next save
//		//this.dragCtx.save();
//    }


//	this.createDragCanvas = function ()
//	{
//		this.dragCanvas = document.createElement('canvas');
//        this.dragCanvas.width = 12 * 9 * availUnit; // Set the initial width
//        this.dragCanvas.height = this.dragCanvas.width; // Set the initial height
//		this.dragCanvas.style.position = 'absolute';
//		this.dragCanvas.style.pointerEvents = 'none'; // Prevent the canvas from capturing mouse events
//		this.dragCanvas.style.backgroundColor = 'transparent'; // Ensure the canvas background is transparent
//        this.dragCanvas.style.zIndex = 1000; // Set the z-index to be above everything else
//		document.body.appendChild(this.dragCanvas);
//		this.dragCtx = this.dragCanvas.getContext('2d');
//        //As discussed above we need to save the context before we modify it.  We will save it here.
//		//this.dragCtx.save();
//		this.calcDragTransform();
//	}

//	this.startDragging = function ()
//	{
//		this.isDragging = true;

//		this.drawPanelOnDragCanvas();
//		//let ulCorner = { x: corner.x, y: corner.y };
//		//Affine.transformPoint(ulCorner, this.dragTransform);
//  //      console.log('startDragging ulCorner', ulCorner.x, ulCorner.y);
//		//this.dragDisplayOffsetX = -ulCorner.x;
//		//this.dragDisplayOffsetY = -ulCorner.y;
//		//this.dragRealOffsetX = ulCorner.x - SSAvail.availSelect.corner.x;
//		//this.dragRealOffsetY = ulCorner.y - SSAvail.availSelect.corner.y;
//		//this.dragDisplayOffsetX = this.dragRealOffsetX * availUnit;
//  //      this.dragDisplayOffsetY = -this.dragRealOffsetY * availUnit;
//		//console.log('startDragging dragStart', this.SSAvail.availSelect.corner.x, this.SSAvail.availSelect.corner.y);
//		//console.log('startDragging RealOffset', this.dragRealOffsetX, this.dragRealOffsetY);
//  //      console.log('startDragging DisplayOff', this.dragDisplayOffsetX, this.dragDisplayOffsetY);
//		// Draw the panel on the drag canvas
//	}

//	this.stopDragging = function (mouseX, mouseY)
//	{
//        this.isDragging = false;
//        //let panel = this.getSelectedPanel();
//        //let corner = this.findClosestCorner(mouseX, mouseY);
//        //let avs = SSAvail.avs[SSAvail.availSelect.idx];
//        //let realWorld = { x: mouseX, y: mouseY };
//        //let revTrans = Affine.getScaleATx({ x: 1 / availUnit, y: -1 / availUnit });
//        //revTrans = Affine.append(revTrans, Affine.getRotateATx(-this.rotation));
//        //revTrans = Affine.append(revTrans, Affine.getTranslateATx({ x: -avs.x, y: -avs.y }));
//        //Affine.transformPoint(realWorld, revTrans);
//        //let iX = realWorld.x;
//        //let iY = realWorld.y;
//        //let iX = mouseX;
//        //let iY = mouseY;
//        //console.log('stopDragging', iX, iY);
//        //SSAvail.avs[SSAvail.availSelect.idx].x = iX;
//        //SSAvail.avs[SSAvail.availSelect.idx].y = iY;
//        //SSAvail.redrawAvailPanel();
//        //SSAvail.redrawAvailOverlay();
//	}

//	/*
//	* A little discussion is in order.  The drag canvas is a canvas that is used to display the panel that is being dragged.
//	* We have a function that draws a panel when given a context of a canvas.  We are going to use that function to draw the
//	* panel on the drag canvas.  The context is relatively simple.  The panel is centered on the drag canvas. So the origin
//	* of the panel is in the center of the drag canvas.  That is display coordinates of width/2, height/2.  The panel is drawn
//	* in the display coordinates.  The panel is scaled to the display units.  The panel is rotated to the display orientation.
//	*
//	* The second part of this is positioning the drag canvas. The position of the upper left corner of the drag canvas is the
//	* real world coordinates of 4.5*12*availUnit to the left and 4.5*12*availUnit up from the center of the display.  The drag
//	* needs to be positioned so that the corner we found is at the mouse position. The mouse position is in document coordinates.
//	* The scale of the display is availUnit.  We can calculate the display offset by subtracting the corner position from the
//	* upper left corner in real world coordinates.  We can then divide by the scale to get the display offset.  We can then add
//	* the mouse position to the display offset to get the position of the drag canvas.
//	*/
//	this.drawPanelOnDragCanvas = function ()
//	{
//		//let panel = this.getSelectedPanel();
//		this.dragCtx.globalAlpha = 0.0;
//		this.dragCtx.clearRect(0, 0, this.dragCanvas.width, this.dragCanvas.height);
//		this.dragCtx.globalAlpha = 1.0;
//		//this.dragCtx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // Semi-transparent blue
//		//this.dragCtx.fillRect(0, 0, this.dragCanvas.width, this.dragCanvas.height);
//		this.dragCtx.save();
//		//Now modify the context
//		Affine.ctxTransform(this.dragCtx, this.dragTransform);
//		this.dragCtx.lineWidth = 1 / availUnit;
////      Affine.ctxTransform(this.dragCtx, this.dragTransform);
//		//this.dragCtx.translate(this.dragCanvas.width / 2, this.dragCanvas.height / 2);
//		//this.dragCtx.scale(availUnit, -availUnit);
//		//this.dragCtx.rotate(this.rotation);
//        let avs = SSAvail.avs[SSAvail.availSelect.idx];
//		this.drawPanelWCtx(this.dragCtx, avs.t, avs.i);
//        this.dragCtx.restore();
//	}

//	this.findClosestCornerSelectedPanel = function (realWorld, snapDist = 10)
//	{
//		let avs = SSAvail.avs[SSAvail.availSelect.idx];
//		let poly;
//        let aPt = { pt: { x: 0, y: 0 }, dist: -1 };
//		switch (avs.t)
//		{
//			case 0:
//				poly = utils.svg2Poly(SSTools.design.file.blanks[avs.i].path);
//				aPt = this.closestEndpointDist(poly, realWorld, aPt);
//				break;
//			case 1:
//				for (let iIdx = 0; iIdx < SSTools.design.file.panels[avs.i].unused.length; iIdx++)
//				{
//					poly = utils.svg2Poly(SSTools.design.file.panels[avs.i].unused[iIdx].path);
//					aPt = this.closestEndpointDist(poly, realWorld, aPt);
//				}
//				break;
//			case 2:
//				SSAvail.availSelect.corner = null;
//				break;
//		}
//		SSAvail.availSelect.corner = null;
//		if ((aPt.dist >= 0) && (aPt.dist < snapDist))
//        {
//            SSAvail.availSelect.corner = aPt.pt;
//		}
//		//console.log('findClosestCornerSelectedPanel', aPt.pt.x, aPt.pt.y, aPt.dist);
//  //      console.log('findClosestCornerSelectedPanel RealWorld', realWorld.x, realWorld.y);
//		return aPt;
//	}

//	/*
//	* This is the implementation of the findClosestCorner function.  It is used to determine which corner of the selected panel
//	* Actually we are goinmg to kind of overload this function. We don't in fact know the selected panel.  We have the information
//	* to do that here. This function will find the closest corner of the all panels in the avail panel. The panel with the closest
//	* corner will be the selected panel.
//	*/
//	this.findClosestCorner = function (mouseX, mouseY)
//	{
//		this.findClosestPanel(mouseX, mouseY);
//		let avs = SSAvail.avs[SSAvail.availSelect.idx];
//		//Now we know the selected panel.  We can find the closest corner of the selected panel.
//		//We need to create a transform to get the mouse position in the panel coordinates.
//		//The needed operations are translate, rotate, and scale.
//		let revTrans = Affine.getScaleATx({ x: 1 / availUnit, y: -1 / availUnit });
//		revTrans = Affine.append(revTrans, Affine.getRotateATx(this.rotation));
//		revTrans = Affine.append(revTrans, Affine.getTranslateATx({ x: -avs.x, y: -avs.y }));
//		let realWorld = { x: mouseX, y: mouseY };
//		Affine.transformPoint(realWorld, revTrans);
//        return this.findClosestCornerSelectedPanel(realWorld);
//	}

//	this.closestEndpointDist = function (poly, realWorld, ep)
//	{
//		for (let iIdx = 0; iIdx < poly.curves.length; iIdx++)
//		{
//			let testDist = utils.dist(poly.curves[iIdx].get(0), realWorld);
//            if ((testDist < ep.dist) || (ep.dist < 0))
//			{
//                ep.pt = poly.curves[iIdx].get(0);
//				ep.dist = testDist;
//			}
//		}
//		return ep;
//	}

//	this.availMouseDown = function (e)
//	{
//		e = e || window.event;

//		// Check if the mouse is down on the Avail panel
//		//This doesn't work.  The panel is not the target.  The target is the document
//		//Can we convert the document coordinates to SSAvail.pnlObj.lwrnCvs coordinates?
//		rect = SSAvail.pnlObj.lwrCnvs.getBoundingClientRect();
//		let x = e.clientX - rect.left;
//		let y = e.clientY - rect.top;
//		if (x < 0 || x >= SSAvail.pnlObj.lwrCnvs.width || y < 0 || y >= SSAvail.pnlObj.lwrCnvs.height) return;

//		console.log('SSAvail.availMouseDown');
//		e.preventDefault();
//        // Find the closest corner of the selected coroplast panel in  real world coordinates
//		SSAvail.findClosestCorner(x, y).pt;
//		// Create the drag canvas
//		SSAvail.createDragCanvas();
//		SSAvail.startDragging();
//		SSAvail.updateDragCanvasPosition(e.clientX, e.clientY);
//		SSAvail.drawPanelOnDragCanvas();

//		//SSAvail.updateDragCanvasPosition(e.clientX, e.clientY);
//	}

//	this.availMouseMove = function (e)
//	{
//		e = e || window.event;

//		if (SSAvail.isDragging)
//		{
//			e.preventDefault();

//			let rect = SSMain.pnlObj.panel.getBoundingClientRect();
//			let x = e.clientX - rect.left;
//			let y = e.clientY - rect.top;
//			if (x >= 0 && x < SSMain.pnlObj.panel.clientWidth && y >= 0 && y < SSMain.pnlObj.panel.clientHeight)
//			{
//				e.offsetX = x;
//                e.offsetY = y;
//				SSMain.mainMouseDown(e);
//				SSAvail.stopDragging(e.offsetX, e.offsetY);
//				document.body.removeChild(SSAvail.dragCanvas); // Remove the drag canvas
//				e.offsetX = x;
//                e.offsetY = y;
//				return;
//			}
//			//SSAvail.updateDragging(e.offsetX, e.offsetY);
//            //console.log('SSAvail.availMouseMove Event', e);
//			SSAvail.updateDragCanvasPosition(e.clientX, e.clientY);
//            SSAvail.drawPanelOnDragCanvas();
//		}
//	}

//	this.availMouseUp = function (e)
//	{
//		e = e || window.event;

//		if (SSAvail.isDragging)
//		{
//			e.preventDefault();
//			SSAvail.stopDragging(e.offsetX, e.offsetY);
//			document.body.removeChild(SSAvail.dragCanvas); // Remove the drag canvas
//		}
//	}

//	/*
//	* This was discussed in the startDragging function.  We need to find the display coordinates of the corner of the panel
//	*/
//	this.updateDragCanvasPosition = function (mouseX, mouseY)
//	{
//		this.dragCanvas.style.left = this.dragDisplayOffsetX + mouseX + 'px';
//		this.dragCanvas.style.top = this.dragDisplayOffsetY + mouseY + 'px';
//        //console.log('updateDragCanvasPosition', this.dragDisplayOffsetX + mouseX, this.dragDisplayOffsetY + mouseY);
//	}

//	this.findClosestPanel = function (mouseX, mouseY)
//	{
//		//Find closest avail panel
//		let iIdx = 0;
//		let iX = SSAvail.avs[iIdx].x - mouseX;
//		let iY = SSAvail.avs[iIdx].y - mouseY;
//		let iDist2 = iX*iX + iY*iY;
//		let iFound = 0;
//		for(iIdx = 1; iIdx < SSAvail.avs.length; iIdx++)
//		{
//			let iTestX = SSAvail.avs[iIdx].x - mouseX;
//			let iTestY = SSAvail.avs[iIdx].y - mouseY;
//			let iTestDist2 = iTestX*iTestX + iTestY*iTestY;
//			if(iTestDist2 < iDist2)
//			{
//				iFound = iIdx;
//				iDist2 = iTestDist2;
//				iX = iTestX;
//				iY = iTestY;
//			}
//		}
//		SSAvail.availSelect.move.x = 0;
//		SSAvail.availSelect.move.y = 0;
//		SSAvail.selectAtx = Affine.getIdentityATx();
//		if (SSAvail.rotation != 0) SSAvail.selectAtx = Affine.append(SSAvail.selectAtx, Affine.getRotateATx(SSAvail.rotation));

//		SSAvail.availSelect.idx = iFound;
//		SSAvail.redrawAvailPanel();
//	}
	
//	this.rotate = function()
//	{
//		SSAvail.rotation += Math.PI/2;
//		if (SSAvail.rotation >= 2 * Math.Pi) SSAvail.rotation = 0;
//		if (SSAvail.isDragging)
//		{
//			SSAvail.calcDragTransform();
//			SSAvail.drawPanelOnDragCanvas();
//		}
//		SSMain.rotate();
//		SSAvail.redrawAvailPanel();
//		SSAvail.redrawAvailOverlay();
//	}
	
//	this.clickNew = function()
//	{
//		SSEntry.newDesign();
//		console.log('New design');
//	}
	
//	this.open = async function()
//	{
//		let handle = await window.showOpenFilePicker();
//		SSTools.design.readFile(handle);
//	}
	
//	this.save = async function()
//	{
//		let handle = await window.showSaveFilePicker();
//		SSTools.design.writeFile(handle);
//	}

//	/*
//	* We have created a mechanism to adjust the way the panels are displayed based on the number of panels.
//	* The basic idea is to display the panels in a square.  Each individual panel is a square in the bigger square.
//	* The number of display squares is the next square number greater than the number of panels.  For example if there
//	* are 5 panels then we need 9 squares to display them.  If there are 10 panels then we need 16 squares to display them.
//	*
//	* After we have the number of squares we need to do two things. One we need to determine the real world size of the
//	* square.  Our panels are 4 x 8 feet.  We wiil be rotating them, so we need room for the 8 foot side.  We will use
//	* a 9 x 9 foot square for each panel.  The second thing we need to do is determine the scale of the square.  A side
//	* of the display square will be 9 * 12 * scale.  The scale is determined by the size of the display area.  We will
//	* use the same scale for the width and height.  This will make the display square a square.
//	*
//	* The second we need to do is to assign each panel to a square.  We will start in the upper left corner and work our
//	* way down the columns and then to the next row.  The first square will be the first blank, the second square will
//	* be the second blank, etc.  If we run out of blanks then we will start with the panels.  By design there are enough
//	* squares to display all the panels.  If there are more squares than panels then the remaining squares will be empty.
//	* 
//	* The structure of the avs array is as follows:
//	* t - type 0 = blank, 1 = panel, 2 = empty
//	* i - index into the blank or panel array
//	* x - x position of the center of the square in display units
//	* y - y position of the center of the square in display units
//	*/
//	this.recalcAvailPanels = function()
//	{
//		let width = SSAvail.pnlObj.lwrCnvs.width - 20;
//		let height = SSAvail.pnlObj.lwrCnvs.height - 20;

//		//console.log('width, height', width, height);
//		let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
//		SSAvail.availSelect.count = count;
//		availSides = 2;
//		while(count > availSides * availSides)availSides++;
//		let feet = availSides * 9;
//		availUnit = SSDisplay.calcDisplayScale(width, height, 12*feet, 12*feet);
//		//console.log('availUnit', availUnit);
//		let paths = [];
//		for(let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
//		{
//			paths.push({t:0, i:iIdx, obj:SSTools.design.file.blanks[iIdx]});
//		}
//		for(let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
//		{
//			paths.push({ t: 1, i: iIdx, obj: SSTools.design.file.panels[iIdx] });
//		}
//		for(let iIdx = paths.length; iIdx < availSides * availSides; iIdx++)
//		{
//			paths.push({t:2, i:iIdx, obj:null});
//			//console.log('Empty Panel');
//		}
//		//Calculate the middle of the first box in Avail Canvas coords
//		let orgX = 20 + 4.5 * 12* availUnit;
//		let orgY = 4.5 * 12 * availUnit;
//		SSAvail.avs = [];
//		let iT = 0;
//		for(let iRow = 0; iRow < availSides; iRow++)
//		{
//			for(let iCol = 0; iCol < availSides; iCol++)
//			{
//				let iX = orgX + iCol * 9 * 12*availUnit;
//				let iY = orgY + (iRow * 9 * 12 * availUnit);
//				SSAvail.avs.push({t:paths[iT].t, i:paths[iT].i, x:iX, y:iY, obj:paths[iT]});
//				iT++;
//			}
//		}
//		SSAvail.redrawAvailPanel();
//	}
	
//	this.rewriteAvailHeader = function()
//	{
//		SSAvail.pnlObj.hdrLeft.innerHTML = 'Design: ' + SSTools.design.file.description;
//	}
	
//	this.redrawAvailPanel = function()
//	{
//		let width = SSAvail.pnlObj.lwrCnvs.width;
//		let height = SSAvail.pnlObj.lwrCnvs.height;
//		//return;
//		//console.log('Redraw Avail Panel');
//		//console.log(SSMain.pnlObj.panel.clientWidth, SSMain.pnlObj.panel.clientHeight);
//		// let width = SSAvail.pnlObj.panel.clientWidth - 20;
//		// let height = SSAvail.pnlObj.panel.clientHeight - 50;
//		// SSAvail.pnlObj.lwrCnvs.width = width;
//		// SSAvail.pnlObj.lwrCnvs.height = height;
//		// let count = SSTools.design.file.blanks.length + SSTools.design.file.panels.length;
//		// let side = 2;
//		// while(count > side * side)side++;
//		//For now assume 4 x 8
//		//let feet = side * 9;
//		//Note unit is a foot which is 1200 panel units
//		//let unit = SSDisplay.calcDisplayScale(width - 20, height - 20, 12*feet, 12*feet);
//		let ctx = SSAvail.pnlObj.lwrCnvs.getContext("2d");
//		ctx.clearRect(0, 0, width, height);
//		SSDisplay.displayScales(ctx, width - 20, height - 20, width/2, height/2, 12*availUnit);
//		//return;
//		// let orgX = 20 + 4.5 * 12* unit;
//		// let orgY = 4.5 * 12 * unit;
//		// let paths = [];
//		// for(let iIdx = 0; iIdx < SSTools.design.file.blanks.length; iIdx++)
//		// {
//			// paths.push({t:0, i:iIdx});
//		// }
//		// for(let iIdx = 0; iIdx < SSTools.design.file.panels.length; iIdx++)
//		// {
//			// paths.push({t:1, i:iIdx});
//		// }
//		// for(let iIdx = paths.length; iIdx < side * side; iIdx++)
//		// {
//			// paths.push({t:2, i:iIdx});
//		// }
//		let iT = 0;
//		for(let iIdx = 0; iIdx < SSAvail.avs.length; iIdx++)
//		{
//			let iX = SSAvail.avs[iIdx].x;
//			let iY = SSAvail.avs[iIdx].y;
//			ctx.save();
//			//console.log(iX, iY);
//			ctx.translate(iX, iY);
//			ctx.scale(availUnit, -availUnit);
//			ctx.lineWidth = 2/availUnit;  //Compensate for scaling
//			let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54 Z');
//			if(iIdx == SSAvail.availSelect.idx)
//			{
//				ctx.fillStyle = 'rgb(220,220,255)';
//				ctx.fill(path);
//			}
//			ctx.stroke(path);
//			ctx.restore();
//			ctx.save();
//			ctx.translate(iX, iY);
//			ctx.scale(availUnit, -availUnit);
//			ctx.rotate(SSAvail.rotation);
//			SSAvail.drawPanelWCtx(ctx, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
//			ctx.restore();
//			//SSDisplay.drawPanel(ctx, 0,0, iX, iY, availUnit, SSAvail.avs[iIdx].t, SSAvail.avs[iIdx].i);
//		}
//		// for(let iRow = 0; iRow < side; iRow++)
//		// {
//			// for(let iCol = 0; iCol < side; iCol++)
//			// {
//				// let iX = orgX + iCol * 9 * 12*unit;
//				// let iY = orgY + (iRow * 9 * 12 * unit);
//				// ctx.save();
//				// //console.log(iX, iY);
//				// ctx.translate(iX, iY);
//				// ctx.scale(unit, -unit);
//				// ctx.lineWidth = 2/unit;  //Compensate for scaling
//				// let path = new Path2D('M -54 -54 L -54 54 L 54 54 L 54 -54 L -54 -54');
//				// ctx.stroke(path);
//				// ctx.restore();
//				// drawPanel(ctx, iX, iY, unit, paths[iT++]);
//			// }
//		// }
//	}
	
//	this.redrawAvailOverlay = function()
//	{
//		let width = SSAvail.pnlObj.upprCnvs.width;
//		let height = SSAvail.pnlObj.upprCnvs.height;
//		let ctx = SSAvail.pnlObj.upprCnvs.getContext("2d");
//		ctx.clearRect(0, 0, width, height);
//		if(SSDisplay.layerIdx == 3)return;
//		if(SSMain.selectedPiece.iSdx >= -1)return;
//		if(SSAvail.availSelect.idx < 0)return;
//		//if(!shutterPos.in)return;
//		// let iX = SSAvail.availSelect.move.x;
//		// let iY = SSAvail.availSelect.move.y;
//		let iX = SSAvail.avs[SSAvail.availSelect.idx].x;
//		let iY = SSAvail.avs[SSAvail.availSelect.idx].y;
//		ctx.save();
//		//Now to transform the outline of the shutter to the selected panel
//		let atx = Affine.getTranslateATx({ x: iX, y: iY });
//        atx = Affine.append(atx, Affine.getScaleATx({ x: availUnit, y: -availUnit }));
//		atx = Affine.append(atx, SSMain.panelFromShutterTransform);
//		ctx.lineWidth = 2 / availUnit;
//        Affine.ctxTransform(ctx, atx);
//		let path = new Path2D(SSMain.workingShutter.outline);
//		ctx.stroke(path);
//		ctx.restore();
		
//	}
	
//	/*
//	* The available panels are displayed in two places.  In the available screen and as individual panels
//	* on the shutter screen.
//	*/
//	this.drawPanelWCtx = function(ctx, type, idx)
//	{
//		if(type > 1)return;
		
//		let selectedPiece = false;
//		let iPPdx = SSMain.selectedPiece.iSdx;
//		if(iPPdx >= 0)
//		{
//			let piece = SSTools.design.file.shutters[SSMain.selectedPiece.iSdx].layers[SSMain.selectedPiece.iLdx].panelPieces[SSMain.selectedPiece.iPdx];
//			if(piece.panelIdx == idx)
//			{
//				selectedPiece = true;
//				iPPdx = piece.panelPieceIdx;
//			}
//		}

//		let path;
//		if(type == 0)
//		{
//			path = new Path2D(SSTools.design.file.blanks[idx].path);
//			ctx.stroke(path);
//			path = new Path2D(SSTools.design.file.blanks[idx].stripes);
//			ctx.strokeStyle = "rgb(180,180,180)";
//			ctx.stroke(path);
//			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[idx]));
//			ctx.strokeStyle = "rgb(255,0,0)";
//			ctx.stroke(path);
//		}else
//		{
//			// if(cutShapes != undefined)
//			// {
//				// for(let iIdx = 0; iIdx < cutShapes.length; iIdx++)
//				// {
//					// let ano = cutShapes[iIdx];
//					// for(let iJdx = 0; iJdx < ano.solids.length; iJdx++)
//					// {
//						// path = new Path2D(utils.poly2Svg(ano.solids[iJdx]));
//						// //ctx.stroke(path);
//					// }
//				// }
//				// //ctx.restore();
//				// //return;
//			// }
//			let panel = SSTools.design.file.panels[idx];
//			path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
//			//ctx.stroke(path);
//			for(let iIdx = 0; iIdx < panel.unused.length; iIdx++)
//			{
//				path = new Path2D(panel.unused[iIdx].path);
//				ctx.stroke(path);
//				ctx.strokeStyle = "rgb(180,180,180)";
//				path = new Path2D(panel.unused[iIdx].stripes);
//				ctx.stroke(path);
//				ctx.strokeStyle = "rgb(0,0,0)";
//			}
//			for(let iIdx = 0; iIdx < panel.used.length; iIdx++)
//			{
//				path = new Path2D(panel.used[iIdx].path);
//				if(selectedPiece && (iIdx == iPPdx))
//				{
//					ctx.fillStyle = "rgb(180,255,180)";
//					ctx.fill(path);
//				}else{
//					ctx.fillStyle = "rgb(255,255,255)";
//				}
//				ctx.stroke(path);
//			}
//			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
//			ctx.strokeStyle = "rgb(255,0,0)";
//			ctx.stroke(path);
//		}
//	}

//	return this;
	
//})();
	
//	// this.availMouseEnter = function(e)
//	// {
//		// e = e || window.event;
//		// e.preventDefault();
		
//		// shutterPos.in = true;
//	// }
//	// this.availMouseLeave = function(e)
//	// {
//		// e = e || window.event;
//		// e.preventDefault();
		
//		// shutterPos.in = false;
		
//		// SSDisplay.redrawAvailOverlay();
//		// SSDisplay.redrawMainOverlay();
//		// //redrawMainPanel();
//	// }
//	// this.availMouseMove = function(e)
//	// {
//		// e = e || window.event;
//		// e.preventDefault();
		
//		// shutterPos.x = e.offsetX;// - objAvail.panel.offsetLeft - objAvail.lwrCnvs.offsetLeft;
//		// shutterPos.y = e.offsetY;// - objAvail.panel.offsetTop - objAvail.lwrCnvs.offsetTop;
		
//		// //console.log(shutterPos);
		
//		// SSDisplay.redrawAvailOverlay();
//		// SSDisplay.redrawMainOverlay();
//		// //redrawMainPanel();

//	// }

