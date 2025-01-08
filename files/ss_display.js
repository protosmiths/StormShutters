import { Affine } from './psBezier/affine.js';
import { SSTools } from './ss_tools.js';
import  SSMain  from './ss_main.js';
import { SSAvail } from './ss_avail.js';
import { utils } from './psBezier/utils.js';

class SSDisplayClass
{
    constructor()
    {
        this.mainUnit = 1;
        this.availUnit = 1;
        this.snapDist = 1;
        this.identAt = Affine.getIdentityATx();
        this.textRot = 0;
        this.mainAtx = [[1, 0, 0], [0, 1, 0]];
        this.workingIdx = 0;
    }

    logPoint(point)
    {
        console.log('Point ', point.x, point.y);
    }

    logLine(line)
    {
        let dir;
        if (line.constructor.name == 'Bezier')
        {
            let lo = line.order;
            dir = (Math.abs(line.points[0].x - line.points[lo].x) < 0.1) ? ' V' : (Math.abs(line.points[0].y - line.points[lo].y) < 0.1) ? ' H' : '';
            console.log('line', line.points[0].x, line.points[0].y, line.points[lo].x, line.points[lo].y, dir);
            return;
        }
        dir = (Math.abs(line.p1.x - line.p2.x) < 0.1) ? ' V' : (Math.abs(line.p1.y - line.p2.y) < 0.1) ? ' H' : '';
        console.log('line', line.p1.x, line.p1.y, line.p2.x, line.p2.y, dir);
    }

    logPoly(poly)
    {
        for (let iIdx = 0; iIdx < poly.curves.length; iIdx++)
        {
            if (poly.curves[iIdx]._linear)
            {
                this.logLine(poly.curves[iIdx]);
            }
        }
    }

    keydownEvent(e)
    {
        e = e || window.event;
        e.preventDefault();
        console.log(e.key);
        if (e.key == 'r')
        {
            console.log("rotate");
            this.textRot += Math.PI / 2;
            if (this.textRot >= 2 * Math.PI) this.textRot = 0;
            this.redrawMainOverlay();
            return;
        }
        if (e.key == 'o')
        {
            this.zoom /= 2.0;
            SSMain.setWorkingShutter(this.workingIdx);
            this.redrawMainPanel();
            this.redrawMainOverlay();
            return;
        }
        if (e.key == 'i')
        {
            this.zoom *= 2.0;
            SSMain.setWorkingShutter(this.workingIdx);
            this.redrawMainPanel();
            this.redrawMainOverlay();
            return;
        }
    }

    getPanelIdx()
    {
        return SSAvail.avs[SSAvail.availSelect.idx].i;
    }

    cutPanel()
    {
        if (this.layerIdx >= 3) return;
        let uncovered = SSMain.workingShutter.layers[this.layerIdx].uncovered;
        if (uncovered.length == 0)
        {
            if (SSAvail.availSelect.editIdx < 0) return;
            let piece = SSMain.workingShutter.layers[this.layerIdx].panelPieces[bboxes[this.layerIdx][SSAvail.availSelect.editIdx].ppIdx];
            let inversePanelTrans = Affine.getInverseATx(piece.panelTrans);
            let Atx = Affine.affineAppend(inversePanelTrans, Affine.getTranslateATx({ x: SSAvail.availSelect.refX / this.mainUnit, y: -SSAvail.availSelect.refY / this.mainUnit }));
            Atx = Affine.affineAppend(Atx, piece.panelTrans);
            Atx = Affine.affineAppend(Atx, bboxes[this.layerIdx][SSAvail.availSelect.editIdx].Atx);
            if (this.textRot != 0) Atx = Affine.affineAppend(Atx, Affine.getRotateATx(this.textRot));
            bboxes[this.layerIdx][SSAvail.availSelect.editIdx].Atx = Atx;
            SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = Atx;
            return;
        }
        let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
        if (SSAvail.avs[SSAvail.availSelect.idx].t == 0)
        {
            SSTools.design.file.panels.push(new CorrPanel(SSTools.design, SSAvail.avs[panelIdx].i));
            this.recalcAvailPanels();
            SSAvail.availSelect.idx = SSAvail.availSelect.count - 1;
            SSAvail.avs[SSAvail.availSelect.idx].i = SSTools.design.file.panels.length - 1;
            panelIdx = SSTools.design.file.panels.length - 1;
        }
        let panel = SSTools.design.file.panels[panelIdx];
        let overlaps = [];
        let Atx;
        let newUncovered = [];
        for (let iIdx = 0; iIdx < uncovered.length; iIdx++)
        {
            let upoly = utils.svg2Poly(uncovered[iIdx]);
            let uncoveredArea = new Area(upoly);
            for (let iPdx = 0; iPdx < panel.unused.length; iPdx++)
            {
                let poly = utils.svg2Poly(panel.unused[iPdx].path);
                Atx = Affine.getTranslateATx({ x: SSAvail.availSelect.refX / this.mainUnit, y: -SSAvail.availSelect.refY / this.mainUnit });
                if (SSAvail.rotation != 0) Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
                utils.transformPoly(poly, Atx);
                let panelArea = new Area(poly);
                panelArea.intersect(uncoveredArea);
                uncoveredArea.subtract(panelArea);
                newUncovered.push(...uncoveredArea.solids);
                if (!panelArea.isEmpty())
                {
                    let RAtx = Affine.getIdentityATx();
                    if (SSAvail.rotation != 0) RAtx = Affine.getRotateATx(-SSAvail.rotation);
                    RAtx = Affine.affineAppend(RAtx, Affine.getTranslateATx({ x: -SSAvail.availSelect.refX / this.mainUnit, y: SSAvail.availSelect.refY / this.mainUnit }), RAtx);
                    panelArea.transform(RAtx);
                    overlaps.push({ area: panelArea, idx: iPdx });
                }
            }
        }
        SSMain.workingShutter.layers[this.layerIdx].uncovered = [];
        for (let iIdx = 0; iIdx < newUncovered.length; iIdx++)
        {
            SSMain.workingShutter.layers[this.layerIdx].uncovered.push(utils.poly2Svg(newUncovered[iIdx]));
        }
        for (let iIdx = 0; iIdx < overlaps.length; iIdx++)
        {
            let anOverlap = overlaps[iIdx];
            for (let iJdx = 0; iJdx < anOverlap.area.solids.length; iJdx++)
            {
                let aSolid = anOverlap.area.solids[iJdx];
                panel.used.push(new Piece(panel, utils.poly2Svg(aSolid), this.workingIdx, this.layerIdx, SSMain.workingShutter.layers[this.layerIdx].panelPieces.length));
                SSMain.workingShutter.layers[this.layerIdx].panelPieces.push(new LayerPiece(panelIdx, panel.used.length - 1, Atx));
            }
            let panelUnusedArea = new Area(utils.svg2Poly(panel.unused[anOverlap.idx].path));
            panelUnusedArea.subtract(anOverlap.area);
            for (let iJdx = 0; iJdx < panelUnusedArea.solids.length; iJdx++)
            {
                let aSolid = panelUnusedArea.solids[iJdx];
                panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
            }
        }
        for (let iIdx = overlaps.length - 1; iIdx >= 0; iIdx--)
        {
            panel.unused.splice(overlaps[iIdx].idx, 1);
        }
        SSAvail.availSelect.idx = -1;
        SSAvail.redrawAvailPanel();
        this.redrawMainPanel();
        this.redrawMainOverlay();
    }

    calcDisplayScale(pixelW, pixelH, drawW, drawH)
    {
        let unitW = pixelW / drawW;
        let unitH = pixelH / drawH;
        let ret = (unitW < unitH) ? unitW : unitH;
        if (ret <= 0) ret = 0.1;
        return ret;
    }

    displayScales(ctx, width, height, orgX, orgY, unit)
    {
        ctx.font = "10px Arial";
        ctx.textAlign = 'center';
        this.doScale(ctx, width, unit, 5, orgX - 20, { rot: 0, x: 20, y: (height + 15) });
        this.doScale(ctx, height, unit, 5, orgY, { rot: -Math.PI / 2, x: 5, y: (height) });
        return unit;
    }

    doScale(ctx, pixels, unit, increments, mid, aff)
    {
        ctx.save();
        ctx.translate(aff.x, aff.y);
        ctx.rotate(aff.rot);
        let maxIdx = Math.floor((pixels) / (unit));
        let dir = (aff.rot != 0) ? 1 : -1;
        let iIdx = 0;
        for (let x = 0; x + mid < pixels || mid - x > 0; x += unit)
        {
            if ((iIdx) % increments == 0)
            {
                if (mid + x < pixels)
                {
                    ctx.fillText((iIdx).toString(), x + mid, 5 + 2 * dir);
                    ctx.moveTo(x + mid, dir * 10);
                    ctx.lineTo(x + mid, dir * 15);
                }
                if (mid - x > 0)
                {
                    ctx.fillText((iIdx).toString(), mid - x, 5 + 2 * dir);
                    ctx.moveTo(mid - x, dir * 10);
                    ctx.lineTo(mid - x, dir * 15);
                }
            } else
            {
                if (mid + x < pixels)
                {
                    ctx.moveTo(mid + x, dir * 5);
                    ctx.lineTo(mid + x, dir * 15);
                }
                if (mid - x > 0)
                {
                    ctx.moveTo(mid - x, dir * 5);
                    ctx.lineTo(mid - x, dir * 15);
                }
            }
            ctx.stroke();
            iIdx++;
        }
        ctx.restore();
    }

    drawPanelWCtx(ctx, type, idx)
    {
        if (type > 1) return;

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
                ctx.stroke(path);
            }
            path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
            ctx.strokeStyle = "rgb(255,0,0)";
            ctx.stroke(path);
        }
    }

    drawPanel(ctx, irX, irY, igX, igY, unit, type, idx, rotation)
    {
        if (type > 1) return;
        ctx.save();
        ctx.translate(igX, igY);
        ctx.scale(unit, -unit);
        ctx.translate(irX, irY);
        ctx.rotate(rotation);
        ctx.lineWidth = 2 / unit;
        this.drawPanelWCtx(ctx, type, idx);
        ctx.restore();
    }
}

const SSDisplay = new SSDisplayClass();
export default SSDisplay;


///*
//* This handles the display functions
//*/

//const SSDisplay = new(function()
//{
//	// //This is used for main panel mouse events to capture state
//	// var shutterPos = {x:0, y:0, in:false, grab:false};
	
//	//We needed to access the same real coordinate to graphics scaling factors in multiple places
//	//Scaling for main panel
//	var mainUnit = 1;
//	//Scaling for avail panel
//	var availUnit = 1;
	
//	// var rotation = 0;
	
//	var snapDist = 1;
	
//	// var shutterIdx = 0;
//	// var workingShutter = null;
	
//	// this.layerIdx = 3;
//	// this.layerText = ['Front', 'Inner', 'Back', 'Outline'];
	
//	var identAt = Affine.getIdentityATx();
	
//	//Some debug routines for logging various thing to the
//	this.logPoint = function(point)
//	{
//		console.log('Point ',point.x, point.y);
//	}
//	this.logLine = function(line)
//	{
//		let dir;
//		if(line.constructor.name == 'Bezier')
//		{
//			let lo = line.order;
//			dir = (Math.abs(line.points[0].x - line.points[lo].x) < 0.1)?' V':(Math.abs(line.points[0].y - line.points[lo].y) < 0.1)?' H':'';
//			console.log('line', line.points[0].x, line.points[0].y,line.points[lo].x,line.points[lo].y, dir);
//			return;
//		}
//		dir = (Math.abs(line.p1.x - line.p2.x) < 0.1)?' V':(Math.abs(line.p1.y - line.p2.y) < 0.1)?' H':'';
//		console.log('line', line.p1.x, line.p1.y,line.p2.x,line.p2.y, dir);
//	}
//	this.logPoly = function(poly)
//	{
//		for(let iIdx = 0; iIdx < poly.curves.length; iIdx++)
//		{
//			if(poly.curves[iIdx]._linear)
//			{
//				logLine(poly.curves[iIdx]);
//			}
//		}
//	}
//	var textRot = 0;
//	// var zoom = 1;
//	this.keydownEvent = function(e)
//	{
//		e = e || window.event;
//		// if(SSDisplay.displayOrder.at(-1) == SSEntry.pnlObj)
//		// {
//			// return;
//		// }
//		e.preventDefault();
//		console.log(e.key);
//		if(e.key == 'r')
//		{
//			console.log("rotate");
//			textRot += Math.PI/2;
//			if(textRot >= 2* Math.Pi)textRot = 0;
//			SSDisplay.redrawMainOverlay();
//			return;
//		}
//		if(e.key == 'o')
//		{
//			zoom /= 2.0;
//			SSMain.setWorkingShutter(workingIdx);
//			SSDisplay.redrawMainPanel();
//			SSDisplay.redrawMainOverlay();
//			return;
//		}
//		if(e.key == 'i')
//		{
//			zoom *= 2.0;
//			SSMain.setWorkingShutter(workingIdx);
//			SSDisplay.redrawMainPanel();
//			SSDisplay.redrawMainOverlay();
//			return;
//		}
//	}
	

//	// this.snap = function()
//	// {
//		// let panelTest = snapPanel();
//		// console.log(panelTest);
//		// if(!panelTest.found)return;
		
//		// let shutterTest = snapShutter();
		
//		// console.log(shutterTest);
		
//		// if(!shutterTest.found)return;
		
//		// //We have two points do a snap
//		// //let dX = panelTest.x - shutterTest.x;
//		// //let dY = -panelTest.y - shutterTest.y;
//		// //We need a translation in mouse (graphics units)
//		// //For the shutter we scale and translate
//		// let width = SSMain.pnlObj.panel.clientWidth;
//		// let height = SSMain.pnlObj.panel.clientHeight - SSTools.hdrH;
//		// // Display orign
//		// let x0 = 10 + width/2;
//		// let y0 = -10 + height/2;
//		// let atx = Affine.getTranslateATx({x:x0, y:y0});
//		// atx = Affine.affineAppend(atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
//		// Affine.transformPoint(shutterTest, atx);
		
//		// //The panel has an additional rotate
//		// atx = Affine.affineAppend(atx, Affine.getRotateATx(SSAvail.rotation));
//		// Affine.transformPoint(panelTest, atx);
		
//		// //Now we have both in graphics units.  The difference gives us the exact translation
//		// //in graphics units to match these two points up.
//		// let dX = shutterTest.x - panelTest.x;
//		// let dY = shutterTest.y - panelTest.y;
		
//		// //let pt = {x:dX, y:dY};
		
//		// // console.log('dX, dY', dX, dY);
//		// // console.log('mainUnit', mainUnit);
		
//		// SSAvail.availSelect.refX = dX; //Convert to graphics units
//		// SSAvail.availSelect.refY = dY;
//		// //Should already be 0, but just in case.
//		// SSAvail.availSelect.moveX = 0;
//		// SSAvail.availSelect.moveY = 0;
		
//		// SSDisplay.redrawMainOverlay();
//		// SSAvail.redrawAvailOverlay();
//	// }
	
//	// /*
//	// * Look for points on shutter layer to snap to
//	// * Note this not only includes points on the shutter, but also includes points on previously placed pieces
//	// */
//	// var snapShutter = function()
//	// {
//		// let width = SSMain.pnlObj.upprCnvs.width;
//		// let height = SSMain.pnlObj.upprCnvs.height;
//		// // Display origin
//		// let x0 = 10 + width/2;
//		// let y0 = -10 + height/2;
//		// let path = workingShutter.outline;
//		// let realX = (SSMain.shutterPos.x - x0) / mainUnit;
//		// let realY = (y0 - SSMain.shutterPos.y) / mainUnit;
//		// let test = findPoint(path, realX, realY, snapDist);
//		// if(test.found)return test;
		
//		// //No point on shutter, look at pieces
//		// //console.log('realX, realY', realX, realY);
//		// let pieces = workingShutter.layers[SSDisplay.layerIdx].panelPieces;
//		// for(let iIdx = 0; iIdx < pieces.length; iIdx++)
//		// {
//			// path = SSTools.design.file.panels[pieces[iIdx].panelIdx].used[pieces[iIdx].panelPieceIdx].path;
//			// path = utils.svgTransform(path, pieces[iIdx].panelTrans);
//			// //console.log('snapShutter peice' realX, realY. path);
//			// test = findPoint(path, realX, realY, snapDist);
//			// if(test.found)return test;
//		// }
		
//		// return test; //Tricky, we know test is false
//	// }
//	// /*
//	// * Look for points on unused panel pieces to snap to
//	// */
//	// var snapPanel = function()
//	// {
//		// if(SSAvail.availSelect.idx < 0)return{x:0, y:0, found:false};
		
//		// if(SSAvail.avs[SSAvail.availSelect.idx].t == 2)return {x:0, y:0, found:false};
//		// let width = SSMain.pnlObj.upprCnvs.width;
//		// let height = SSMain.pnlObj.upprCnvs.height;
//		// // Display orign
//		// let x0 = 10 + width/2;
//		// let y0 = -10 + height/2;
		
//		// //We need the real coordinates in the panel system for where the mouse is at
//		// //There is a more direct route, but the clearest solution is to find a mouse
//		// //to panel coordinate transform. To do this we find the panel to screen
//		// //transform and inverse it.
//		// // let Atx = Affine.getRotateATx(SSAvail.rotation);
//		// // Atx = Affine.affineAppend(Atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
//		// // Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:SSAvail.availSelect.refX + SSAvail.availSelect.moveX + x0, y:SSAvail.availSelect.refY + SSAvail.availSelect.moveY + y0}));
//		// //The following transform goes from real to graphics coordinates.  Transforms operate in reverse order.
//		// // We have a rotate around the origin in real coordinate, followed by scaling to graphics coordinates
//		// // finally a translation in the graphics system for centering and movement with mouse drag.
//		// //Go to center plus drag moves
//		// let Atx = Affine.getTranslateATx({x:SSAvail.availSelect.refX + SSAvail.availSelect.moveX + x0, y:SSAvail.availSelect.refY + SSAvail.availSelect.moveY + y0});
//		// //Scale from real to graphics. Note Y axis is reversed
//		// //console.log('mainUnit', mainUnit);
//		// Atx = Affine.affineAppend(Atx, Affine.getScaleATx({x:mainUnit, y:-mainUnit}));
//		// //Rotate if required
//		// Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
		
//		// //Now get the inverse transform to get real points from graphics points (mouse position)
//		// Atx = Affine.getInverseATx(Atx);
//		// let Real = {x:SSMain.shutterPos.x, y:SSMain.shutterPos.y};
//		// Affine.transformPoint(Real, Atx);
//		// // let realX = -((SSAvail.availSelect.refX + SSAvail.availSelect.moveX)/mainUnit + ((x0 - SSMain.shutterPos.x) / mainUnit));
//		// // let realY = -((SSAvail.availSelect.refY + SSAvail.availSelect.moveY)/mainUnit - ((y0 - SSMain.shutterPos.y) / mainUnit));
//		// // let realX = -((SSAvail.availSelect.refX + SSAvail.availSelect.moveX - x0)/mainUnit);
//		// // let realY = -((SSAvail.availSelect.refY + SSAvail.availSelect.moveY - y0)/mainUnit);
//		// //console.log('snapPanel: realX, realY', Real.x, Real.y);
//		// //let rotAt = Affine.getRotateATx(SSAvail.rotation);
//		// if(SSAvail.avs[SSAvail.availSelect.idx].t == 0)
//		// {
//			// //We are working a blank
//			// let path = SSTools.design.file.blanks[SSAvail.avs[SSAvail.availSelect.idx].i].path;
//			// return findPoint(path, Real.x, Real.y, snapDist);
//		// }
		
//		// //Implied else we are working a used panel
//		// let panel = SSTools.design.file.panels[SSAvail.avs[SSAvail.availSelect.idx].i];
//		// for(let iIdx = 0; iIdx < panel.unused.length; iIdx++)
//		// {
//			// let path = panel.unused[iIdx].path;
//			// let test = findPoint(path, Real.x, Real.y, snapDist);
//			// if(test.found)return test;
//		// }
//		// return {x:0, y:0, found:false};
//	// }
	
//	// var findPoint = function(path, x, y, dist)
//	// {
//		// let poly = utils.svg2Poly(path);
//		// //utils.transformPoly(poly, aTx);
//		// for(let iIdx = 0; iIdx < poly.curves.length; iIdx++)
//		// {
//			// let curve = poly.curves[iIdx];
//			// //console.log(curve);
//			// for(let iPdx = 0; iPdx < curve.points.length; iPdx++)
//			// {
//				// let dX = curve.points[iPdx].x - x;
//				// let dY = curve.points[iPdx].y - y;
//				// let d2 = dX*dX + dY*dY;
//				// if(d2 <= (dist * dist))
//				// {
//					// //return {x:dX, y:dY, found:true};
//					// //console.log(curve);
//					// return {x:curve.points[iPdx].x, y:curve.points[iPdx].y, found:true};
//				// }
//			// }
//		// }
//		// return {x:0, y:0, found:false};
//	// }
//	// this.displayOrder = [];
	
//	// this.setZOrder = function()
//	// {
//		// for(let iIdx = 0; iIdx < this.displayOrder.length; iIdx++)
//		// {
//			// //Do we have an overlay?
//			// if(this.displayOrder[iIdx].upprCnvs != null)
//			// {
//				// this.displayOrder[iIdx].upprCnvs.style.zIndex = 10 * iIdx + 2;
//			// }
//			// if(this.displayOrder[iIdx].lwrCnvs != null)
//			// {
//				// this.displayOrder[iIdx].lwrCnvs.style.zIndex = 10 * iIdx + 1;
//			// }
//			// this.displayOrder[iIdx].panel.style.zIndex = 10 * iIdx;
//		// }
//	// }
	
//	// //A little tricky. The Z order is the array index * 10.  Below we
//	// //push the object to the back of the array and remove it from where it was
//	// //based on its Z order (array index * 10)
//	// this.getFocus = function(objPanel)
//	// {
//		// this.displayOrder.push(objPanel);
//		// this.displayOrder.splice(objPanel.panel.style.zIndex/10, 1);
//		// //Now reset the z orders based on teh present index the panel with focus will
//		// //be the last index
//		// this.setZOrder();
//	// }
	
//	var mainAtx = [[1,0,0],[0,1,0]];
//	var workingIdx = 0;
	
	
//	this.getPanelIdx = function()
//	{
//		return SSAvail.avs[SSAvail.availSelect.idx].i;
//	}
	
//	/*
//	* This runs when an unused panel piece or blank has been positioned on the shutter.  This routine creates a new
//	* panel piece from the intersection of the uncovered shutter and the unused piece or blank.
//	*
//	* If it is a blank it creates a new panel with the whole panel as the unused piece, that becomes the panel for
//	* the remaining logic.
//	*
//	* We will be looking for the intersection between two shapes. We will first code for straight lines. This will be
//	* sufficient for the immediate future.  Starting from a point on one on the shapes there are three possibilities
//	* The point is inside the other shape, it is outside the other shape or it is on the boundary of the other shape.
//	* 
//	* First step is finding the intersections.  Second step is creating panel pieces from the intersections. This
//	* includes reducing the unused area. Third step is adding the panel pieces to the layer and reducing the uncovered
//	* area.
//	*
//	* It would be desirable to take an existing setup and copy it
//	*/
//	var cutShapes;
//	this.cutPanel = function()
//	{
//		//The outline layer does not get panels
//		if(SSDisplay.layerIdx >= 3)return;
//		//Get the uncovered area on this shutter and this layer
//		let uncovered = workingShutter.layers[SSDisplay.layerIdx].uncovered;
//		//The layer is completely covered
//		//Get panel selected in panel window
//		let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
//		if(uncovered.length == 0)
//		{
//			if(SSAvail.availSelect.editIdx < 0)return;
//			//Below is the code that intuitively moves the text, which is what the user should be able
//			//to do.  It is important to note that the mouse controls the movement on the screen.
//			// We must translate that back to movement on the panel. There is a different concept at work.
//			// Instead of manipulating a path with a transform.  We need to manipulate the transform
//			// if(textRot != 0)moveText = utils.svgTransform(moveText, Affine.getRotateATx(textRot));
//			// moveText = utils.svgTransform(moveText, bboxes[SSDisplay.layerIdx][iIdx].Atx);
//			// moveText = utils.svgTransform(moveText, piece.panelTrans);
//			// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.moveX/mainUnit, y:-SSAvail.availSelect.moveY/mainUnit}));
			
//			// moveText = utils.svgTransform(moveText, bboxes[SSDisplay.layerIdx][iIdx].Atx);
//			// moveText = utils.svgTransform(moveText, piece.panelTrans);
			
//			//let Atx = bboxes[SSDisplay.layerIdx][SSAvail.availSelect.editIdx].Atx;
//			//Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:SSAvail.availSelect.refX, y:-SSAvail.availSelect.refY}));
//			let piece = SSMain.workingShutter.layers[SSDisplay.layerIdx].panelPieces[bboxes[SSDisplay.layerIdx][SSAvail.availSelect.editIdx].ppIdx];
//			let inversePanelTrans = Affine.getInverseATx(piece.panelTrans);
//			let Atx = Affine.affineAppend(inversePanelTrans, Affine.getTranslateATx({x:SSAvail.availSelect.refX/mainUnit, y:-SSAvail.availSelect.refY/mainUnit}));
//			Atx = Affine.affineAppend(Atx, piece.panelTrans);
//			Atx = Affine.affineAppend(Atx, bboxes[SSDisplay.layerIdx][SSAvail.availSelect.editIdx].Atx);
//			//Do the rotation first
//			if(textRot != 0)Atx = Affine.affineAppend(Atx, Affine.getRotateATx(textRot));
//			//Atx = Affine.affineAppend(Atx, inversePanelTrans);
//			//Now the translation is last
//			bboxes[SSDisplay.layerIdx][SSAvail.availSelect.editIdx].Atx = Atx;
//			SSTools.design.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = Atx;
//			// moveText = utils.svgTransform(moveText, bboxes[SSDisplay.layerIdx][iIdx].Atx);
//			// moveText = utils.svgTransform(moveText, mainAtx);
//			// moveText = utils.svgTransform(moveText, Affine.getTranslateATx({x:SSAvail.availSelect.refX, y:SSAvail.availSelect.refY}));
//			return;
//		}
//		//let localUsedIdx = SSAvail.availSelect.usedIdx;
		
//		//Get type of panel
//		if(SSAvail.avs[SSAvail.availSelect.idx].t == 0)
//		{
//			//We have a blank, clone the blank into a panel that can be used
//			SSTools.design.file.panels.push(new CorrPanel(SSTools.design, SSAvail.avs[panelIdx].i));
//			//Tell the system to reconfigure for new panel count
//			SSDisplay.recalcAvailPanels();
//			//Point the index to the new panel
//			SSAvail.availSelect.idx = SSAvail.availSelect.count - 1;
//			SSAvail.avs[SSAvail.availSelect.idx].i = SSTools.design.file.panels.length - 1;
//			panelIdx = SSTools.design.file.panels.length - 1;
//			//localUsedIdx = 0;
//		}
		
//		//Get the panel at the index
//		let panel = SSTools.design.file.panels[panelIdx];
//		let overlaps = [];
//		let Atx;
//		//For now look at all possible intersections between unused panel pieces and uncovered shutter area.
//		//We may change this later for a way to limit the search if we found that is needed.  At present,
//		//I can't think of a use case where it is needed.
//		let newUncovered = [];
//		for(let iIdx = 0; iIdx < uncovered.length; iIdx++)
//		{
//			let upoly = utils.svg2Poly(uncovered[iIdx]);
//			//upoly.reverse();
//			//console.log(upoly);
//			console.log('uncovered');
//			SSDisplay.logPoly(upoly);
//			let uncoveredArea = new Area(upoly);
//			console.log('uncoveredArea cw', uncoveredArea.solids[0].cw);
//			//console.log('uncoveredArea', uncoveredArea);
//			for(let iPdx = 0; iPdx < panel.unused.length; iPdx++)
//			{
//				let poly = utils.svg2Poly(panel.unused[iPdx].path);
//				// if(SSAvail.rotation != 0)
//				// {
//					// utils.transformPoly(poly, Affine.getRotateATx(SSAvail.rotation));
//				// }
//				Atx = Affine.getTranslateATx({x:SSAvail.availSelect.refX/mainUnit, y:-SSAvail.availSelect.refY/mainUnit});
//				//if(SSAvail.rotation != 0)Atx = Affine.affineAppend(Affine.getRotateATx(SSAvail.rotation), Atx);
//				if(SSAvail.rotation != 0)Atx = Affine.affineAppend(Atx, Affine.getRotateATx(SSAvail.rotation));
//				utils.transformPoly(poly, Atx);
//				console.log('transformed panel');
//				SSDisplay.logPoly(poly);
//				//poly.reverse();
//				let panelArea = new Area(poly);
//				//console.log('panelArea', panelArea);
//				console.log('panelArea cw', panelArea.solids[0].cw);
//				panelArea.intersect(uncoveredArea);
//				console.log('intersected panel');
//				if(panelArea.solids.length != 0)
//				{
//					SSDisplay.logPoly(panelArea.solids[0]);
//				}
//				console.log('uncoveredArea cw after intersect', uncoveredArea.solids[0].cw);
//				console.log('Subtract panel intersect Area from uncovered');
//				uncoveredArea.subtract(panelArea);
//				console.log('uncoveredArea subtracted panel intersect');
//				if(uncoveredArea.solids.length != 0)
//				{
//					SSDisplay.logPoly(uncoveredArea.solids[0]);
//				}
//				//console.log('uncoveredArea', uncoveredArea);
//				newUncovered.push(...uncoveredArea.solids);
//				if(!panelArea.isEmpty())
//				{
//					//Return to the panel coordinate system
//					let RAtx = Affine.getIdentityATx();
//					if(SSAvail.rotation != 0)RAtx = Affine.getRotateATx(-SSAvail.rotation);
//					RAtx = Affine.affineAppend(RAtx, Affine.getTranslateATx({x:-SSAvail.availSelect.refX/mainUnit, y:SSAvail.availSelect.refY/mainUnit}), RAtx);
//					panelArea.transform(RAtx);
//					//Store the intersecting area and the index into the panel unused array
//					overlaps.push({area:panelArea, idx:iPdx});
//				}
//			}
//		}
//		console.log('newUncovered', newUncovered);
//		SSMain.workingShutter.layers[SSDisplay.layerIdx].uncovered = [];
//		for(let iIdx = 0; iIdx < newUncovered.length; iIdx++)
//		{
//			SSMain.workingShutter.layers[SSDisplay.layerIdx].uncovered.push(utils.poly2Svg(newUncovered[iIdx]));
//		}
//		//cutShapes = overlaps;
//		//console.log('overlaps', overlaps);
		
//		//panel.unused = [];
//		// for(let iIdx = 0; iIdx < overlaps.length; iIdx++)
//		// {
//			// let anOverlap = overlaps[iIdx];
//			// let panelUnusedArea = new Area(utils.svg2Poly(panel.unused[anOverlap.idx].path));
//			// panelUnusedArea.subtract(anOverlap.area);
//			// panel.unused = [];
//			// for(let iJdx = 0; iJdx < panelUnusedArea.solids.length; iJdx++)
//			// {
//				// let aSolid = panelUnusedArea.solids[iJdx];
//				// //panel.unused[anOverlap.idx]
//				// panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
//			// }
//			// // for(let iJdx = 0; iJdx < anOverlap.area.solids.length; iJdx++)
//			// // {
//				// // let aSolid = anOverlap.area.solids[iJdx];
//				// // panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
//			// // }
//		// }
//		// SSAvail.redrawAvailPanel();
//		// return;
//		//Now we have all the overlaps
//		for(let iIdx = 0; iIdx < overlaps.length; iIdx++)
//		{
//			let anOverlap = overlaps[iIdx];
//			for(let iJdx = 0; iJdx < anOverlap.area.solids.length; iJdx++)
//			{
//				let aSolid = anOverlap.area.solids[iJdx];
//				panel.used.push(new Piece(panel, utils.poly2Svg(aSolid), workingIdx, SSDisplay.layerIdx, SSMain.workingShutter.layers[SSDisplay.layerIdx].panelPieces.length));
			
//				//Add this used panel to the shutter
//				//SSMain.workingShutter.layers[SSDisplay.layerIdx].panelPieces.push(new LayerPiece(SSAvail.avs[panelIdx].i, panel.used.length - 1, Atx));
//				SSMain.workingShutter.layers[SSDisplay.layerIdx].panelPieces.push(new LayerPiece(panelIdx, panel.used.length - 1, Atx));
//			}
//			let panelUnusedArea = new Area(utils.svg2Poly(panel.unused[anOverlap.idx].path));
//			console.log('anOverlap.area', anOverlap.area);
//			console.log('Subtract intercept from unsed panel');
//			panelUnusedArea.subtract(anOverlap.area);
//			cutShapes = [panelUnusedArea];
//			for(let iJdx = 0; iJdx < panelUnusedArea.solids.length; iJdx++)
//			{
//				let aSolid = panelUnusedArea.solids[iJdx];
//				console.log('aSolid', aSolid);
//				//This is tricky we need to remove the original areas, do that later
//				panel.unused.push(new Piece(panel, utils.poly2Svg(aSolid)));
//			}
//			//Now we need to fix the uncovered area
//		}
//		//Now work backwards to remove previous unused areas
//		for(let iIdx = overlaps.length - 1; iIdx >= 0; iIdx--)
//		{
//			panel.unused.splice(overlaps[iIdx].idx,1);
//		}
//		console.log('panel',panel);
//		SSAvail.availSelect.idx = -1;
//		SSAvail.redrawAvailPanel();
//		SSDisplay.redrawMainPanel();
//		SSDisplay.redrawMainOverlay();
//	}
	
//	// var ctxTransform = function(ctx, at)
//	// {
//		// ctx.transform(at[0][0], at[1][0], at[0][1], at[1][1], at[0][2], at[1][2]);
//	// }
	

//	this.calcDisplayScale = function(pixelW, pixelH, drawW, drawH)
//	{
//		//Calculate the number of pixels per drawing unit
//		// let unitW = Math.floor(pixelW/drawW);
//		// let unitH = Math.floor(pixelH/drawH);
//		let unitW = pixelW/drawW;
//		let unitH = pixelH/drawH;
//		//console.log('unitW, unitH', unitW, unitH);
//		//Return the smaller number to fit in both directions
//		let ret = (unitW < unitH)?unitW:unitH;
//		if(ret <= 0) ret = 0.1;
//		return ret;
//	}

//	/*
//	* This displays tick marks and text along the edge of a window. Units can be feet (ft) or inches (in).
//	* This is displayed in the box in lower left corner. The width of the scale will be fixed at a given
//	* number of pixels (TBD).  The major markings will also be in a limited range of pixels (TBD)
//	*/
//	this.displayScales = function(ctx, width, height, orgX, orgY, unit)
//	{
//		// let height = cnvs.clientHeight;
//		// cnvs.height = height;
//		// //console.log(height);
//		// //let width = cnvs.clientWidth;
//		// let width = cnvs.clientWidth;
//		// cnvs.width = width;
//		//console.log(width);
//		//console.log('bbox', minX, minY, maxX, maxY);
//		//let ctx = cnvs.getContext("2d");
//		ctx.font = "10px Arial";
//		ctx.textAlign = 'center';
//		// let unit = Math.ceil((width - 20)/((maxX - minX + 2)));
//		// unit = (unit > Math.ceil((height - 20)/(maxY - minY + 2)))?Math.ceil((height - 20)/(maxY - minY + 2)):unit;
//		doScale(ctx, width, unit, 5, orgX - 20, {rot:0, x:20, y:(height+ 15)});
//		//console.log(unit);
//		// let maxIdx = Math.floor((width - 20)/(5*unit));
//		// for(let iIdx = 0 ; iIdx < maxIdx; iIdx++)
//		// {
//			// let x = 20 + (iIdx ) * 5 * unit;
//			// for(let iJdx = 1; iJdx < 5; iJdx ++)
//			// {
//				// ctx.moveTo(x + (iJdx * unit), height - 10);
//				// ctx.lineTo(x + (iJdx * unit), height - 20);
//			// }
//			// x += 5*unit;
//			// ctx.moveTo(x , height - 15);
//			// ctx.lineTo(x , height - 20);
//			// ctx.stroke();
//			// ctx.fillText((iIdx*5).toString(), x, height - 2);
//			// //console.log(20 + iIdx*unit);
//			// //ctx.fillText('testy', 20 + iIdx*unit, height - 10);
//		// }
//		//unit = Math.ceil((height - 20)/(maxY + 2));
//		doScale(ctx, height, unit, 5, orgY, {rot:-Math.PI/2, x:5, y:(height)});
//		return unit;
//	}
	
//	/*
//	* This routine takes the approach of constructing the scale in the same location and applying
//	* a transformation to move it into position.  If we construct the scale horizontally then the
//	* transformation is a translation for the horizontal scale and a rotation translation for the
//	* vertical scale.
//	*
//	* The look of the horizontal scale is ticks at the top edge of the scale with text below.
//	* For the vertical scale after rotation the ticks will be to the right with the text on the left.
//	* If we keep a left to right construction horizontally then the text is right side up and above
//	* the ticks.
//	*
//	* For the scale itself we need to know the length in pixels, the units and the display increments.
//	* Then the transformation matrix will place the scale.
//	*/
//	var doScale = function(ctx, pixels, unit, increments, mid, aff)
//	{
//		ctx.save();
//		//Things are kind of done in reverse
//		ctx.translate(aff.x, aff.y);
//		ctx.rotate(aff.rot);
//		//let maxIdx = Math.floor((pixels - (2 * unit))/(5 * unit));
//		let maxIdx = Math.floor((pixels)/(unit));
//		let tickIdx = -1;
//		let dir = (aff.rot != 0)?1:-1;
//		let iIdx = 0;
//		for(let x = 0; x + mid < pixels || mid - x > 0; x += unit)
//		{
//			if((iIdx)%increments == 0)
//			{
//				if(mid + x < pixels)
//				{
//					ctx.fillText((iIdx).toString(), x + mid, 5+2*dir);
//					ctx.moveTo(x + mid , dir * 10);
//					ctx.lineTo(x + mid, dir * 15);
//				}
//				if(mid - x > 0)
//				{
//					ctx.fillText((iIdx).toString(), mid - x, 5+2*dir);
//					ctx.moveTo(mid - x , dir * 10);
//					ctx.lineTo(mid - x, dir * 15);
//				}
//			}else
//			{
//				if(mid + x < pixels)
//				{
//					ctx.moveTo(mid + x , dir * 5);
//					ctx.lineTo(mid + x , dir * 15);
//				}
//				if(mid - x > 0)
//				{
//					ctx.moveTo(mid - x , dir * 5);
//					ctx.lineTo(mid - x , dir * 15);
//				}
//			}
//			ctx.stroke();
//			iIdx++;
//		}
//		ctx.restore();
//	}
	
//	var drawPanelWCtx = function(ctx, type, idx)
//	{
//		if(type > 1)return;

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
//				ctx.stroke(path);
//			}
//			path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
//			ctx.strokeStyle = "rgb(255,0,0)";
//			ctx.stroke(path);
//		}
//	}
	
//	this.drawPanel = function(ctx, irX, irY, igX, igY, unit, type, idx, rotation)
//	{
//		if(type > 1)return;
//		//console.log('drawPanel irX, irY, igX, igY, unit, type, idx', irX, irY, igX, igY, unit, type, idx);
//		ctx.save();
//		//console.log(iX, iY);
//		ctx.translate(igX, igY);
//		ctx.scale(unit, -unit);
//		ctx.translate(irX, irY);
//		ctx.rotate(rotation);
//		ctx.lineWidth = 2/unit;  //Compensate for scaling
//		drawPanelWCtx(ctx, type, idx);
//		ctx.restore();
//	}

//	return this;
	
//})();