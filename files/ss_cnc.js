import { Affine } from './psBezier/affine.js';
import SSPanel  from './ss_panel.js';
import SSDisplay  from './ss_display.js';
import { SSTools } from './ss_tools.js';
import { SSAvail } from './ss_avail.js';
import { VectorText } from './vector_text.js';
import { utils } from './psBezier/utils.js';
import SS3D from './ss_3d.js';

class SSCNCClass
{
    constructor()
    {
        this.pnlObj = null;
        this.drawMode = true;
        this.zoom = 1;
        this.center = { x: 0, y: 0 };
        this.presentAffine = Affine.getIdentityATx();
        this.moveZ = '0.75';
        this.cutZ = -0.18;
        this.knifeOff = 0.1;
        this.plungerOff = 0.731;
        this.knifeAng = 37.5;
        this.knifeZ2Off = 1 / Math.tan(this.knifeAng * Math.PI / 180);
        this.tipOff = this.knifeOff - this.knifeZ2Off * this.cutZ;
        this.res = 0.02;
        this.rampCnt = this.tipOff / this.res;
    }

    init()
    {
        let lwrCnvs = document.createElement('canvas');
        SSCNC.pnlObj = SSPanel.panelFactory('pnlCNC', lwrCnvs);
        SSCNC.pnlObj.redraw = SSCNC.redrawCNCPanel.bind(this);
        SSPanel.setPanelResize(SSCNC.pnlObj);
        SSCNC.pnlObj.panel.style.display = "none";
        lwrCnvs.onclick = SSCNC.mouseClick.bind(this);

        let btnSimulate = SSPanel.createButton('Simulate', SS3D.focus3D);
        btnSimulate.style.width = '100px';

        let btnSBP = SSPanel.createButton('SBP', SSCNC.exportSBP.bind(this));
        btnSBP.style.width = '40px';

        let btnMode = SSPanel.createButton('Mode', SSCNC.switchCncMode.bind(this));
        btnMode.style.width = '50px';

        let btnPrevPanel = SSPanel.createButton('<', SSCNC.prevPanel.bind(this));
        btnPrevPanel.style.width = '20px';
        let lblPanel = document.createElement('span');
        lblPanel.innerHTML = 'Panel';
        let btnNextPanel = SSPanel.createButton('>', SSCNC.nextPanel.bind(this));
        btnNextPanel.style.width = '20px';

        let btnCloseCNC = SSPanel.createButton('Close', SSCNC.close.bind(this));
        btnCloseCNC.style.width = '80px';

        SSCNC.pnlObj.hdrRight.appendChild(btnSimulate);
        SSCNC.pnlObj.hdrRight.appendChild(btnSBP);
        SSCNC.pnlObj.hdrRight.appendChild(btnMode);
        SSCNC.pnlObj.hdrRight.appendChild(btnPrevPanel);
        SSCNC.pnlObj.hdrRight.appendChild(lblPanel);
        SSCNC.pnlObj.hdrRight.appendChild(btnNextPanel);
        SSCNC.pnlObj.hdrRight.appendChild(btnCloseCNC);
    }

    close()
    {
        SSCNC.pnlObj.panel.style.display = "none";
    }

    focusCNC()
    {
        SSCNC.pnlObj.panel.style.display = "block";
        SSPanel.bringToTopZ(SSCNC.pnlObj);
        SSCNC.redrawCNCPanel();
    }

    switchCncMode()
    {
        SSCNC.drawMode = !SSCNC.drawMode;
        SSCNC.redrawCNCPanel();
    }

    prevPanel()
    {
        do
        {
            SSAvail.availSelect.idx--;
            if (SSAvail.availSelect.idx < 0) SSAvail.availSelect.idx = SSAvail.avs.length - 1;
        } while (SSAvail.avs[SSAvail.availSelect.idx].t != 1);
        SSCNC.redrawCNCPanel();
    }

    nextPanel()
    {
        do
        {
            SSAvail.availSelect.idx++;
            if (SSAvail.availSelect.idx >= SSAvail.avs.length) SSAvail.availSelect.idx = 0;
        } while (SSAvail.avs[SSAvail.availSelect.idx].t != 1);
        SSCNC.redrawCNCPanel();
    }

    mouseClick(e)
    {
        e = e || window.event;
        let displayPt = { x: e.offsetX, y: e.offsetY };
        let inverseAtx = Affine.getInverseATx(SSCNC.presentAffine);
        let realPt = { x: displayPt.x, y: displayPt.y };
        Affine.transformPoint(realPt, inverseAtx);
        SSCNC.center = { x: realPt.x, y: realPt.y };

        if (e.ctrlKey)
        {
            SSCNC.zoom *= 2;
        } else if (e.altKey)
        {
            SSCNC.zoom /= 2;
            if (SSCNC.zoom < 1)
            {
                SSCNC.zoom = 1;
                SSCNC.center = { x: 0, y: 0 };
            }
        }
        SSCNC.redrawCNCPanel();
    }

    redrawCNCPanel()
    {
        let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
        let sPanel = 'Panel ' + panelIdx.toString() + ': ';
        if (SSCNC.drawMode)
        {
            SSCNC.pnlObj.hdrLeft.innerHTML = sPanel + 'Drawing mode';
        } else
        {
            SSCNC.pnlObj.hdrLeft.innerHTML = sPanel + 'Cutting mode';
        }
        let width = SSCNC.pnlObj.panel.clientWidth;
        let height = SSCNC.pnlObj.panel.clientHeight - SSTools.hdrH;
        SSCNC.pnlObj.lwrCnvs.width = width;
        SSCNC.pnlObj.lwrCnvs.height = height;
        let ctx = SSCNC.pnlObj.lwrCnvs.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        let drawCNCUnit = SSDisplay.calcDisplayScale(width, height, 50, 100);
        ctx.save();
        let Atx = Affine.getTranslateATx({ x: width / 2, y: height / 2 });
        Atx = Affine.append(Atx, Affine.getScaleATx({ x: SSCNC.zoom * drawCNCUnit, y: -SSCNC.zoom * drawCNCUnit }));
        Atx = Affine.append(Atx, Affine.getTranslateATx({ x: -SSCNC.center.x, y: -SSCNC.center.y }));
        Affine.ctxTransform(ctx, Atx);
        SSCNC.presentAffine = Atx;
        ctx.lineWidth = 2 / (SSCNC.zoom * drawCNCUnit);
        let panel = SSTools.design.file.panels[panelIdx];
        let path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.stroke(path);
        path = new Path2D(SSCNC.getPanelPaths(panelIdx, SSCNC.drawMode));
        ctx.stroke(path);
        if (SSCNC.drawMode)
        {
            path = SSCNC.getPanelText(panelIdx);
            ctx.stroke(new Path2D(path));
        }
        path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
        ctx.strokeStyle = "rgb(255,0,0)";
        ctx.stroke(path);
        ctx.restore();
    }

    async exportSBP()
    {
        let iPanelIdx = SSDisplay.getPanelIdx();
        let sDrawCut = SSCNC.drawMode ? 'Draw' : 'Cut';
        let fileName = SSTools.design.file.description + ' panel ' + iPanelIdx.toString() + ' ' + sDrawCut + '.sbp';
        fileName = fileName.replace(' ', '_');
        let handle = await window.showSaveFilePicker({ suggestedName: fileName });
        SSCNC.writeFile(handle);
    }

    async writeFile(handle)
    {
        let writable = await handle.createWritable();
        let fileTxt = SSCNC.generateDrawingFile(SSDisplay.getPanelIdx(), SSCNC.drawMode);
        await writable.write(fileTxt);
        await writable.close();
    }

    generateDrawingFile(iPanelIdx, draw)
    {
        let Atx = Affine.getTranslateATx({ x: 48, y: 24 });
        Atx = Affine.append(Atx, Affine.getRotateATx(-Math.PI / 2));
        let svg = SSCNC.getPanelPaths(iPanelIdx, draw);
        if (draw)
        {
            svg += SSCNC.getPanelText(iPanelIdx) + ' ';
        }
        svg = utils.svgTransform(svg, Atx);
        let sbp = SSCNC.svg2sbp(svg, draw);
        return sbp;
    }

    svg2sbp(strSVG, draw)
    {
        let parseObj = {
            svgTokens: strSVG.match(/\S+/g),
            iIdx: 0,
            sbp: '',
            sim: [],
            lastPoint: { x: 0, y: 0 },
            knifeAngle: 0,
            draw: draw
        };
        let d1, q, d1u, dt;
        let thisPoint = { x: 0, y: 0 };
        let firstPoint = { x: thisPoint.x, y: thisPoint.y };
        let nextPoint;
        while (parseObj.iIdx < parseObj.svgTokens.length)
        {
            let cmdToken = parseObj.svgTokens[parseObj.iIdx];
            switch (cmdToken)
            {
                case 'M':
                    parseObj.sbp += '\'M ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
                    thisPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
                    firstPoint = { x: thisPoint.x, y: thisPoint.y };
                    parseObj.sbp += 'JZ ' + SSCNC.moveZ + '\n';
                    parseObj.z = SSCNC.moveZ;
                    parseObj.lastPoint = { x: thisPoint.x, y: thisPoint.y };
                    if (draw)
                    {
                        parseObj.sbp += 'J2 ' + parseObj.svgTokens[parseObj.iIdx + 1] + ', ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
                        parseObj.sbp += 'JZ 0\n';
                        parseObj.z = 0;
                        parseObj.iIdx += 3;
                    } else
                    {
                        SSCNC.sbpCut(parseObj);
                    }
                    break;
                case 'L':
                    parseObj.sbp += '\'L ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
                    nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
                    d1 = { x: nextPoint.x - parseObj.lastPoint.x, y: nextPoint.y - parseObj.lastPoint.y };
                    q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
                    d1u = { x: d1.x / q, y: d1.y / q };
                    if (draw) d1u = { x: 0, y: 0 };
                    parseObj.sbp += 'M2 ' + (nextPoint.x + SSCNC.knifeOff * d1u.x).toString() + ', ' + (nextPoint.y + SSCNC.knifeOff * d1u.y).toString() + '\n';
                    parseObj.lastPoint.x = nextPoint.x;
                    parseObj.lastPoint.y = nextPoint.y;
                    if (!draw && parseObj.z <= 0)
                    {
                        parseObj.knifeAngle = Math.atan2(d1.y, d1.x);
                    }
                    parseObj.iIdx += 3;
                    break;
                case 'Q':
                    parseObj.sbp += '\'Q ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + ' ' + parseObj.svgTokens[parseObj.iIdx + 3] + ' ' + parseObj.svgTokens[parseObj.iIdx + 4] + '\n';
                    nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
                    let curveQ = new Bezier(parseObj.lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 3));
                    SSCNC.bezier2sbp(parseObj, curveQ, SSCNC.knifeOff);
                    parseObj.iIdx += 5;
                    break;
                case 'C':
                    parseObj.sbp += '\'C ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + ' ' + parseObj.svgTokens[parseObj.iIdx + 3] + ' ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + '\n';
                    nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
                    let curveC = new Bezier(parseObj.lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 3), utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 5));
                    SSCNC.bezier2sbp(parseObj, curveC, SSCNC.knifeOff);
                    parseObj.iIdx += 7;
                    break;
                case 'Z':
                    parseObj.sbp += '\'Z\n';
                    if ((Math.abs(parseObj.lastPoint.x - firstPoint.x) > 0.05) || (Math.abs(parseObj.lastPoint.y - firstPoint.y) > 0.05))
                    {
                        d1 = { x: firstPoint.x - parseObj.lastPoint.x, y: firstPoint.y - parseObj.lastPoint.y };
                        q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
                        d1u = { x: d1.x / q, Y: d1.y / q };
                        parseObj.sbp += 'M2 ' + (firstPoint.x + SSCNC.knifeOff * d1u.x).toString() + ', ' + (firstPoint.y + SSCNC.knifeOff * d1u.y).toString() + '\n';
                    }
                    parseObj.iIdx += 1;
                    break;
            }
        }
        return parseObj.sbp;
    }

    sbpCut(parseObj)
    {
        let curve;
        let comment = '';
        let nextCurveToken = parseObj.svgTokens[parseObj.iIdx + 3];
        let nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 4);
        let lastPoint = { x: parseObj.lastPoint.x, y: parseObj.lastPoint.y };
        switch (nextCurveToken)
        {
            case 'L':
                curve = utils.makeline(lastPoint, nextPoint);
                parseObj.iIdx += 6;
                break;
            case 'Q':
                comment = '\'Q ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + ' ' + parseObj.svgTokens[parseObj.iIdx + 7] + '\n';
                curve = new Bezier(lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 6));
                parseObj.iIdx += 8;
                break;
            case 'C':
                comment = '\'C ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + ' ' + parseObj.svgTokens[parseObj.iIdx + 7] + ' ' + parseObj.svgTokens[parseObj.iIdx + 8] + ' ' + parseObj.svgTokens[parseObj.iIdx + 9] + '\n';
                curve = new Bezier(lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 6), utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 8));
                parseObj.iIdx += 10;
                break;
        }
        let length = curve.length();
        let d1 = curve.derivative(0);
        let q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
        let d1u = { x: d1.x / q, y: d1.y / q };
        let tangDist = { x: SSCNC.plungerOff * d1u.x, y: SSCNC.plungerOff * d1u.y };
        let tipDist = { x: SSCNC.tipOff * d1u.x, y: SSCNC.tipOff * d1u.y };
        let newKnifeAngle = Math.atan2(d1u.y, d1u.x);
        if (Math.abs(parseObj.knifeAngle - newKnifeAngle) > 0.01)
        {
            let plunger = { x: -SSCNC.plungerOff * Math.cos(parseObj.knifeAngle), y: -SSCNC.plungerOff * Math.sin(parseObj.knifeAngle) };
            let plungerPoint = { x: lastPoint.x - 2 * tangDist.x, y: lastPoint.y - 2 * tangDist.y };
            parseObj.sbp += 'J2 ' + (plungerPoint.x - plunger.x).toString() + ', ' + (plungerPoint.y - plunger.y).toString() + '\n';
            parseObj.sbp += 'MZ 0.1\n';
            parseObj.z = 0;
            SSCNC.makeMinArc(parseObj, plungerPoint, SSCNC.plungerOff, parseObj.knifeAngle, newKnifeAngle);
            parseObj.sbp += 'M2 ' + (lastPoint.x + tipDist.x).toString() + ', ' + (lastPoint.y + tipDist.y).toString() + '\n';
        } else
        {
            parseObj.sbp += 'J2 ' + (lastPoint.x).toString() + ', ' + (lastPoint.y).toString() + '\n';
            parseObj.sbp += 'JZ 0\n';
            parseObj.z = 0;
            parseObj.sbp += 'M2 ' + (lastPoint.x + tipDist.x).toString() + ', ' + (lastPoint.y + tipDist.y).toString() + '\n';
        }
        parseObj.sbp += 'PAUSE\n';
        switch (nextCurveToken)
        {
            case 'L':
                parseObj.sbp += '\'L ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + '\n';
                let rampDist = (length > SSCNC.rampCnt) ? SSCNC.rampCnt : length;
                let rampCnt = Math.floor(rampDist);
                let ramp = length / rampCnt;
                let rampPt = curve.get(0);
                for (let i = 1; i < rampCnt; i++)
                {
                    rampPt = curve.get(i * ramp);
                    parseObj.sbp += 'M2 ' + rampPt.x.toString() + ', ' + rampPt.y.toString() + '\n';
                }
                parseObj.sbp += 'M2 ' + nextPoint.x.toString() + ', ' + nextPoint.y.toString() + '\n';
                break;
            case 'Q':
                SSCNC.bezier2sbp(parseObj, curve, SSCNC.knifeOff);
                break;
            case 'C':
                SSCNC.bezier2sbp(parseObj, curve, SSCNC.knifeOff);
                break;
        }
        parseObj.knifeAngle = newKnifeAngle;
    }

    makeMinArc(parseObj, plungerPoint, plungerOff, knifeAngle, newKnifeAngle)
    {
        let arcAngle = Math.abs(knifeAngle - newKnifeAngle);
        let arcRadius = plungerOff / Math.sin(arcAngle / 2);
        let arcCenter = { x: plungerPoint.x + arcRadius * Math.cos((knifeAngle + newKnifeAngle) / 2), y: plungerPoint.y + arcRadius * Math.sin((knifeAngle + newKnifeAngle) / 2) };
        let arcStart = Math.atan2(plungerPoint.y - arcCenter.y, plungerPoint.x - arcCenter.x);
        let arcEnd = Math.atan2(parseObj.lastPoint.y - arcCenter.y, parseObj.lastPoint.x - arcCenter.x);
        let arcDir = (arcStart < arcEnd) ? 1 : 0;
        parseObj.sbp += 'MA ' + arcCenter.x.toString() + ', ' + arcCenter.y.toString() + ', ' + arcRadius.toString() + ', ' + arcStart.toString() + ', ' + arcEnd.toString() + ', ' + arcDir.toString() + '\n';
    }

    bezier2sbp(parseObj, curve, knifeOff)
    {
        let length = curve.length();
        let rampDist = (length > SSCNC.rampCnt) ? SSCNC.rampCnt : length;
        let rampCnt = Math.floor(rampDist);
        let ramp = length / rampCnt;
        let rampPt = curve.get(0);
        for (let i = 1; i < rampCnt; i++)
        {
            rampPt = curve.get(i * ramp);
            parseObj.sbp += 'M2 ' + rampPt.x.toString() + ', ' + rampPt.y.toString() + '\n';
        }
        parseObj.sbp += 'M2 ' + curve.points[3].x.toString() + ', ' + curve.points[3].y.toString() + '\n';
    }

    getPanelPaths(iPanelIdx, draw)
    {
        let panel = SSTools.design.file.panels[iPanelIdx];
        console.log('panel', panel);
        let path = '';
        for (let i = 0; i < panel.used.length; i++)
        {
            //let pathIdx = panel.paths[i];
            if (draw)
            {
                //path += SSTools.design.file.paths[pathIdx].path + ' ';
                path += panel.used[i].path + ' ';
            } else
            {
                //path += SSTools.design.file.paths[pathIdx].cut + ' ';
                path += panel.used[i].path + ' ';
            }
        }
        return path;
    }

    getPanelText(iPanelIdx)
    {
        let panel = SSTools.design.file.panels[iPanelIdx];
        let text = '';
        for (let i = 0; i < panel.used.length; i++)
        {
            let piece = panel.used[i];
            let svgText = VectorText.svgText(piece.text, 1);
            svgText = utils.svgTransform(svgText, piece.textTrans);
            text += svgText + ' ';
        //    let textIdx = panel.texts[i];
        //    text += VectorText.text2Svg(SSTools.design.file.texts[textIdx]);
        }
        return text;
    }
}

export let SSCNC = new SSCNCClass();
export default SSCNC;

//SSCNC.init();
//export let SSCNC = new SSCNCClass();

///*
//*These routines are for CNC code.  We will write routines to generate code in shopbot and G code.
//*
//*Some discussion about generating code for panels.  There are two modes, drawing with a pen and cutting with
//*a drag knife.  The main difference in the two modes is in how the Z axis is handled.  In the drawing mode, the
//*pen is lowered directly to the surface and the Z is set to work with a springed holder.  In the cutting mode,
//*the knife is lowered as moving along the cut to make the knife align with the cut.
//*
//*The normal sequence for processing a panel, is to load the panel in the machine and clamp the edges.  Then X and y
//*calibration is done to align the machine with the panel.  At this time, the plan is to locate three corners of the panel.
//*Then the text is drawn, followed by the lines to be cut.  Lines/cuts will not go to the edge, but will stop in case there
//*is a clamp,  This allows one to see where cuts will go to the edge and to move the clamps if needed.  The order of the
//*text will be based on the distance for the starting point of each group of letters from the origin.  Cuts will be sorted
//*to minimize the travel moves.  A simple implementation of this algorithm would be to start at the origin and try every
//*combination of cuts measuring the travel distances.  The algorithm could be made more complicated by allowing the cuts
//*go in opposite directions.  It could be made more efficient by always comparing to the shortest completed path. The
//*algorithm will be designed to logically combine a complete path.  As the algorithm is building a path, it will truncate
//* as soon as the path is greater than the last shortest path.  Truncated means that all combinations that follow from that
//*point are not searched. By definition, each path that is completed will be shorter than the previously completed path.
//*The algorithm needs to be written as a reentrant routine.
//*
//* One should be able to group items. For example, text could be done by line.  There could be various entities like this.
//* For the algorithm, paths could be represented with objects that have fields for the start and end points and a pointer
//* to the path entity.  A calling routine 'knows' how to extract these points and to break the path into these objects.
//* Then the optimizing routine is called.  On return the calling routine can take the objects and create the optimized
//* path.
//*
//* The above discussion is naive.  This is the traveling salesman problem (TSP) and is more complicated than I realized.
//* The time to write an algorithm or understand an existing one is not worth it.  We will do the paths in the order they
//* were created.
//*
//* There are basically two states for the Z axis up and traveling and down and drawing or cutting.  There is a difference
//* between drawing and cutting in how we transition between these states.  For drawing we just move from one state to the
//* other.  An example would be we start in the traveling state we move in X and Y to where we will start drawing. We execute
//* a z move to the drawing state.  We travel in X, Y on the path to be drawn until the end. Note this path does not need to
//* be a straight line., In general, it is a collection of lines and curves that are connected.  At the end of the path we
//* execute a Z move to the travel state.  We then move in a straight line to the X, Y location of the next path to draw.
//*
//* Cutting is more complicated.  At the end of a path, it is the same as drawing.  We simply make a Z move to the traveling
//* state. The beginning has several additional states.  First we move in the travel state to a point one knife offset on a
//* line extended along the tangent out from the start of the path. Then we make a Z move until the knife point just touches
//* the surface.  Then we make an X,Y move along the tangent for two offsets. This should cause the knife to rotate tangential
//* to the path with the knife point on the beginning of the path. Then we move along the path with the Z going down to the
//* full depth of the cut.  The distance traveled along the path for this is adjustable.  It is expected that this ramp can
//* be pretty steep. On the order of magnitude of one knife offset. So the sequence at the beginning of a cut is travel move
//* to just in front of path, z move to surface, xy move on path tangent and Z ramp to full depth along first section of path.
//* Then we follow the path in xy to the end where we go to the Z travel state.
//*
//* The comments above were written before writing the code.  These were written afterward.
//*
//* There are many subtle optimizations in the code.  First is aligning the drag knife.  The code tracks the knife orientation
//* and does a abbreviated alignment when knife is aligned from the last cut.  When not aligned it does an arcing move which
//* works even if the knife is 180 degrees out of alignment.  There are no moves to the edge. If a line starts in the keep
//* out region, it is reversed.
//*/
//const SSCNC = new(function()
//{
//	this.pnlObj = null;
	
//	this.drawMode = true;
  
//	// var getSvgPoint = function(tokens, idx){
//		// return { x:parseFloat(tokens[idx]), y:parseFloat(tokens[idx + 1])};
//	// },
//	var moveZ = '0.75';
	
//	//Cut Z is slightly more than material thickness
//	var cutZ = -0.18;
 
//	//Distance behind the pivot that the knife crosses the surface at cutting depth
//	var knifeOff = 0.1;
	
//	//Distance for plunger from pivot
//	var plungerOff = 0.731;
	
//	var knifeAng = 37.5;
	
//	var knifeZ2Off = 1/Math.tan(knifeAng * Math.PI/180);
//	//console.log('knifeZ2Off', knifeZ2Off);
	
//	//This is the distance behind the pivot point for the tip of the knife
//	this.tipOff = knifeOff - knifeZ2Off*cutZ;
//	//console.log('tipOff', SSCNC.tipOff);
	
//	var res = 0.02;
	
//	var rampCnt = this.tipOff / res;
	
//	this.init = function()
//	{
//		//console.log('SSCNC start init()');
//		let lwrCnvs = document.createElement('canvas');
//		this.pnlObj = SSPanel.panelFactory('pnlCNC', lwrCnvs);
//		//this.pnlObj = SSPanel.panelFactory('pnlCNC', false);
//		this.pnlObj.redraw = SSCNC.redrawCNCPanel;
//		//SSPanel.setPanelDrag(this.pnlObj);
//		SSPanel.setPanelResize(this.pnlObj);
//		this.pnlObj.panel.style.display = "none";
//		//.addEventListener('keydown', SSDisplay.keydownEvent);
//		lwrCnvs.onclick = SSCNC.mouseClick;
		
//		let btnSimulate = SSPanel.createButton('Simulate', SS3D.focus3D);
//		btnSimulate.style.width = '100px';
		
//		let btnSBP = SSPanel.createButton('SBP', SSCNC.exportSBP);
//		btnSBP.style.width = '40px';
		
//		let btnMode = SSPanel.createButton('Mode', SSCNC.switchCncMode);
//		btnMode.style.width = '50px';
		
//		let btnPrevPanel = SSPanel.createButton('<', SSCNC.prevPanel);
//		btnPrevPanel.style.width = '20px';
//		let lblPanel = document.createElement('span');
//		lblPanel.innerHTML = 'Panel';
//		let btnNextPanel = SSPanel.createButton('>', SSCNC.nextPanel);
//		btnNextPanel.style.width = '20px';
		
//		let btnCloseCNC = SSPanel.createButton('Close', SSCNC.close);
//		btnCloseCNC.style.width = '80px';
		
//		this.pnlObj.hdrRight.appendChild(btnSimulate);
//		this.pnlObj.hdrRight.appendChild(btnSBP);
//		this.pnlObj.hdrRight.appendChild(btnMode);
//		this.pnlObj.hdrRight.appendChild(btnPrevPanel);
//		this.pnlObj.hdrRight.appendChild(lblPanel);
//		this.pnlObj.hdrRight.appendChild(btnNextPanel);
//		this.pnlObj.hdrRight.appendChild(btnCloseCNC);
//		//console.log('SSCNC finished init()');
//	}
	
//	this.close = function()
//	{
//		SSCNC.pnlObj.panel.style.display = "none";
		
//	}
	
//	this.focusCNC = function()
//	{
//		SSCNC.pnlObj.panel.style.display = "block";
//		SSPanel.getFocus(SSCNC.pnlObj);
//		SSCNC.redrawCNCPanel();
//	}
	
//	this.switchCncMode = function()
//	{
//		SSCNC.drawMode = !SSCNC.drawMode;
//		//console.log(SSCNC.drawMode);
//		SSCNC.redrawCNCPanel();
//	}
	
//	this.prevPanel = function()
//	{
//		do
//		{
//			SSAvail.availSelect.idx--;
//			if(SSAvail.availSelect.idx < 0)SSAvail.availSelect.idx = SSAvail.avs.length - 1;
//		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
//		SSCNC.redrawCNCPanel();
//	}
	
//	this.nextPanel = function()
//	{
//		do
//		{
//			SSAvail.availSelect.idx++;
//			if(SSAvail.availSelect.idx >= SSAvail.avs.length)SSAvail.availSelect.idx = 0;
//		}while(SSAvail.avs[SSAvail.availSelect.idx].t != 1);
//		SSCNC.redrawCNCPanel();
//	}
	
//	this.zoom = 1;
//	this.center = {x:0, y:0};
//	this.presentAffine = Affine.getIdentityATx();
//	/*
//	* This function changes
//	*/
//	this.mouseClick = function(e)
//	{
//		e = e || window.event;
//		let displayPt = {x:e.offsetX, y:e.offsetY};
//		//This transform will let us take the display coordinates and determine what point
//		//in the real coordinates they represent
//		let inverseAtx = Affine.getInverseATx(SSCNC.presentAffine);
//		let realPt = {x:displayPt.x, y:displayPt.y};
//		Affine.transformPoint(realPt, inverseAtx);
		
//		//This is the center of the next display. We move in the negative to make this point 0,0
//		SSCNC.center = {x:realPt.x, y:realPt.y};
		
//		//Ok we have the real point, are we zooming in or out(panning is recentering without zoom)
//		if(e.ctrlKey)
//		{
//			//We are zooming in
//			SSCNC.zoom *= 2;
//		}else if(e.altKey)
//		{
//			//We are zooming out
//			SSCNC.zoom /= 2;
//			if(SSCNC.zoom < 1)
//			{
//				SSCNC.zoom = 1;
//				//Recenter the panel
//				SSCNC.center = {x:0, y:0};
//			}
//		}
//		SSCNC.redrawCNCPanel();
//	}
//	/*
//	*
//	*/
//	this.redrawCNCPanel = function()
//	{
//		let panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
//		let sPanel = 'Panel ' + panelIdx.toString() + ': ';
//		if(SSCNC.drawMode)
//		{
//			SSCNC.pnlObj.hdrLeft.innerHTML = sPanel + 'Drawing mode';
//		}else
//		{
//			SSCNC.pnlObj.hdrLeft.innerHTML = sPanel + 'Cutting mode';
//		}
//		let width = SSCNC.pnlObj.panel.clientWidth;
//		let height = SSCNC.pnlObj.panel.clientHeight - SSTools.hdrH;
//		SSCNC.pnlObj.lwrCnvs.width = width;
//		SSCNC.pnlObj.lwrCnvs.height = height;
//		let ctx = SSCNC.pnlObj.lwrCnvs.getContext("2d");
//		ctx.clearRect(0, 0, width, height);
//		// This function determines the scale needed to fit a panel into the display. We are scaling
//		// for a 50" x 100" space which will give us 1" and 2" margins for our 48" x 96" panel
//		let drawCNCUnit = SSDisplay.calcDisplayScale(width, height, 50, 100);
//		//Create transform. As discussed transforms happen in reverse order to the order declared
//		ctx.save();
//		//Translate in display units to the center of the display.  Note the positive sign. To visualize
//		//the sequence, consider the following. In the real world we move the point we want to center on 
//		//to 0,0 that means a negative sign. We scale around 0,0. If we were doing a rotation it would 
//		//done here as well. Then we move 0,0 in the display coordinates to the center of the display.  
//		//That move uses positive values.
//		let Atx = Affine.getTranslateATx({x:width/2, y:height/2});
//		//Scale from real world to display world. Note that Y has a negative sign since graphics
//		//coordinates go from top down and we use a standard cartesian system.  The drawCNCUnit scales
//		//between the real world and the display world. SSCNC.zoom allows us to zoom in and out.
//		Atx = Affine.append(Atx, Affine.getScaleATx({x:SSCNC.zoom*drawCNCUnit, y:-SSCNC.zoom*drawCNCUnit}));
//		//Here we translate in the real world to center on what we want to display
//		Atx = Affine.append(Atx, Affine.getTranslateATx({x:-SSCNC.center.x, y:-SSCNC.center.y}));
//		//This function applies our transform to the display context
//		Affine.ctxTransform(ctx, Atx);
//		//Make the present transform available to the mouse event 
//		SSCNC.presentAffine = Atx;
//		// ctx.translate(width/2, height/2);
//		// ctx.scale(SSCNC.zoom*drawCNCUnit, SSCNC.zoom*-drawCNCUnit);
//		// ctx.translate(SSCNC.center.x, SSCNC.center.y);
//		//Line width needs to be scaled
//		ctx.lineWidth = 2/(SSCNC.zoom*drawCNCUnit);
//		//ctx.translate(width/2, height/2);
//		let panel = SSTools.design.file.panels[panelIdx];
//		let path = new Path2D(SSTools.design.file.blanks[panel.blankIdx].path);
//		ctx.strokeStyle = "rgb(0,0,0)";
//		ctx.stroke(path);
//		path = new Path2D(SSCNC.getPanelPaths(panelIdx, SSCNC.drawMode));
//		ctx.stroke(path);
//		if(SSCNC.drawMode)
//		{
//			path = SSCNC.getPanelText(panelIdx);
//			ctx.stroke(new Path2D(path));
//		//	path = SSCNC.getPanelHoles(panelIdx);
//		//	ctx.stroke(new Path2D(path));
//		}
//		path = new Path2D(utils.poly2Svg(SSTools.design.blankKOs[panel.blankIdx]));
//		ctx.strokeStyle = "rgb(255,0,0)";
//		ctx.stroke(path);
//		ctx.restore();
//	}	

//	// //These are svg code for line characters.  It was generated by export glyphs from Helvetica True Type font as EPS files and
//	// //parsing those for the SVG codes
//	// var charSVG =
//	// [["0","M 326 0 C 150 0 108 161 108 360 C 108 558 150 720 326 720 C 502 720 544 558 544 360 C 544 161 502 0 326 0 Z M 326 0 C 150 0 108 161 108 360 C 108 558 150 720 326 720 C 502 720 544 558 544 360 C 544 161 502 0 326 0 Z"],["1","M 278 0 L 278 721 C 278 598 159 569 108 565 C 159 569 278 598 278 721 L 278 0 Z"],["2","M 537 0 L 108 0 C 112 146 190 193 275 249 L 446 363 C 517 412 516 482 516 549 C 516 617 474 727 332 727 C 189 727 136 621 136 521 C 136 621 189 727 332 727 C 474 727 516 617 516 549 C 516 482 517 412 446 363 L 275 249 C 190 193 112 146 108 0 L 537 0 Z"],["3","M 108 181 C 108 74 186 0 314 0 C 442 0 530 53 530 185 C 530 317 452 388 278 388 C 451 387 507 458 507 554 C 507 650 458 725 322 725 C 187 725 122 640 122 544 C 122 640 187 725 322 725 C 458 725 507 650 507 554 C 507 458 451 387 278 388 C 452 388 530 317 530 185 C 530 53 442 0 314 0 C 186 0 108 74 108 181 Z"],["4","M 448 0 L 448 721 L 108 192 L 576 192 L 108 192 L 448 721 L 448 0 Z"],["5","M 513 721 L 213 721 L 133 363 C 190 411 226 440 325 440 C 424 440 536 373 536 233 C 536 172 503 -3 323 -3 C 144 -3 120 100 108 159 C 120 100 144 -3 323 -3 C 503 -3 536 172 536 233 C 536 373 424 440 325 440 C 226 440 190 411 133 363 L 213 721 L 513 721 Z"],["6","M 155 217 C 155 347 246 434 367 434 C 488 434 587 378 587 217 C 587 56 488 0 367 0 C 246 0 159 87 155 217 C 151 347 108 723 388 723 C 540 723 570 640 576 590 C 570 640 540 723 388 723 C 108 723 151 347 155 217 C 159 87 246 0 367 0 C 488 0 587 56 587 217 C 587 378 488 434 367 434 C 246 434 155 347 155 217 Z"],["7","M 238 0 C 240 165 415 520 555 721 L 108 721 L 555 721 C 415 520 240 165 238 0 Z"],["8","M 323 387 C 221 387 137 433 137 553 C 137 673 216 718 323 720 C 430 722 509 673 509 553 C 509 433 425 387 323 387 Z M 323 0 C 205 0 108 56 108 194 C 108 332 193 387 323 387 C 453 387 539 332 539 194 C 539 56 442 0 323 0 Z M 323 387 C 221 387 137 433 137 553 C 137 673 216 718 323 720 C 430 722 509 673 509 553 C 509 433 425 387 323 387 Z M 323 0 C 205 0 108 56 108 194 C 108 332 193 387 323 387 C 453 387 539 332 539 194 C 539 56 442 0 323 0 Z"],["9","M 541 507 C 541 376 449 289 328 289 C 207 289 108 345 108 507 C 108 668 207 725 328 725 C 449 725 537 637 541 507 C 546 376 588 0 307 0 C 155 0 125 84 119 133 C 125 84 155 0 307 0 C 588 0 546 376 541 507 C 537 637 449 725 328 725 C 207 725 108 668 108 507 C 108 345 207 289 328 289 C 449 289 541 376 541 507 Z"],["A","M 108 0 L 394 721 L 681 0 L 394 721 L 108 0 Z M 198 227 L 590 227 L 198 227 Z"],["B","M 216 371 L 493 371 C 637 371 696 458 693 545 C 689 632 628 721 495 721 L 216 721 L 216 0 L 523 0 C 637 0 727 68 727 182 C 725 296 630 371 493 371 C 630 371 725 296 727 182 C 727 68 637 0 523 0 L 216 0 L 216 721 L 495 721 C 628 721 689 632 693 545 C 696 458 637 371 493 371 L 216 371 Z"],["C","M 720 242 C 688 70 584 -8 420 -8 C 221 -8 108 105 108 361 C 108 616 221 730 420 730 C 562 730 660 671 704 543 C 660 671 562 730 420 730 C 221 730 108 616 108 361 C 108 105 221 -8 420 -8 C 584 -8 688 70 720 242 Z"],["D","M 216 0 L 476 0 C 704 0 755 221 749 371 C 743 521 714 721 476 721 L 216 721 L 216 0 Z M 216 0 L 476 0 C 704 0 755 221 749 371 C 743 521 714 721 476 721 L 216 721 L 216 0 Z"],["E","M 682 0 L 216 0 L 216 717 L 682 717 L 216 717 L 216 0 L 682 0 Z M 642 369 L 216 369 L 642 369 Z"],["F","M 216 0 L 216 721 L 663 721 L 216 721 L 216 0 Z M 622 371 L 216 371 L 622 371 Z"],["G","M 455 350 L 712 350 C 712 104 601 -5 424 -5 C 247 -5 108 88 108 361 C 108 635 226 730 424 730 C 565 730 666 681 712 552 C 666 681 565 730 424 730 C 226 730 108 635 108 361 C 108 88 247 -5 424 -5 C 601 -5 712 104 712 350 L 455 350 Z M 712 0 L 712 350 L 712 0 Z"],["H","M 216 0 L 216 720 L 216 399 L 725 399 L 725 720 L 725 0 L 725 399 L 216 399 L 216 0 Z"],["I","M 216 0 L 216 721 L 216 0 Z"],["J","M 459 717 L 458 157 C 458 85 397 1 287 1 C 177 0 108 82 108 157 L 108 231 L 108 157 C 108 82 177 0 287 1 C 397 1 458 85 458 157 L 459 717 Z"],["K","M 216 0 L 216 283 L 400 453 L 739 0 L 400 453 L 691 721 L 216 283 L 216 721 L 216 0 Z"],["L","M 637 0 L 216 0 L 216 721 L 216 0 L 637 0 Z"],["M","M 216 0 L 216 721 L 526 0 L 837 721 L 837 0 L 837 721 L 526 0 L 216 721 L 216 0 Z"],["N","M 216 0 L 216 721 L 730 0 L 730 721 L 730 0 L 216 721 L 216 0 Z"],["O","M 426 -6 C 251 -6 108 90 108 366 C 108 642 251 740 426 740 C 601 740 744 642 744 366 C 744 90 601 -6 426 -6 Z M 426 -6 C 251 -6 108 90 108 366 C 108 642 251 740 426 740 C 601 740 744 642 744 366 C 744 90 601 -6 426 -6 Z"],["P","M 216 0 L 216 721 L 446 721 C 629 721 673 633 678 536 C 682 439 627 338 465 338 L 216 338 L 465 338 C 630 338 682 439 678 536 C 673 633 631 721 446 721 L 216 721 L 216 0 Z"],["Q","M 426 -15 C 251 -15 108 81 108 358 C 108 633 251 731 426 731 C 601 731 744 633 744 358 C 744 81 601 -15 426 -15 Z M 426 -15 C 251 -15 108 81 108 358 C 108 633 251 731 426 731 C 601 731 744 633 744 358 C 744 81 601 -15 426 -15 Z M 526 129 L 730 -39 L 526 129 Z"],["R","M 729 0 C 709 14 704 42 704 54 L 686 236 C 680 314 624 368 513 368 C 624 368 680 314 686 236 L 704 54 C 704 42 709 14 729 0 Z M 216 0 L 216 721 L 479 721 C 659 721 702 658 707 561 C 711 464 659 368 499 368 L 216 368 L 499 368 C 662 368 711 464 707 561 C 702 658 663 721 479 721 L 216 721 L 216 0 Z"],["S","M 108 218 C 108 58 230 -6 373 -6 C 518 -6 609 85 612 174 C 615 262 572 332 481 351 L 236 404 C 165 420 126 459 126 553 C 126 647 205 728 349 728 C 493 728 598 660 594 541 C 598 660 493 728 349 728 C 205 728 126 647 126 553 C 126 459 167 419 236 404 L 481 351 C 570 332 615 262 612 174 C 609 85 518 -6 373 -6 C 230 -6 108 58 108 218 Z"],["T","M 367 0 L 367 721 L 628 721 L 108 721 L 367 721 L 367 0 Z"],["U","M 615 722 L 615 229 C 615 109 541 0 365 1 C 189 4 108 102 108 229 L 108 722 L 108 229 C 108 102 189 4 365 1 C 541 0 615 109 615 229 L 615 722 Z"],["V","M 632 721 L 370 0 L 108 721 L 370 0 L 632 721 Z"],["W","M 108 721 L 298 0 L 527 721 L 756 0 L 946 721 L 756 0 L 527 721 L 298 0 L 108 721 Z"],["X","M 108 5 L 350 363 L 591 0 L 350 363 L 591 721 L 350 363 L 112 721 L 350 363 L 108 5 Z"],["Y","M 370 0 L 370 347 L 632 721 L 370 347 L 108 721 L 370 347 L 370 0 Z"],["Z","M 128 721 L 624 721 L 108 0 L 655 0 L 108 0 L 624 721 L 128 721 Z"],["a","M 472 131 C 442 88 339 -9 257 -6 C 174 -3 108 23 108 115 C 108 208 164 247 270 257 C 375 267 422 283 472 297 C 422 283 375 267 270 257 C 164 247 108 208 108 115 C 108 23 174 -3 257 -6 C 339 -9 442 88 472 131 Z M 543 0 C 543 0 472 5 472 65 L 472 394 C 472 436 451 516 316 516 C 181 516 131 455 131 392 C 131 455 181 516 316 516 C 451 516 472 436 472 394 L 472 65 C 472 5 543 0 543 0 Z"],["b","M 216 724 L 216 0 L 216 724 Z M 428 516 C 311 516 216 459 216 258 C 216 58 311 0 428 0 C 545 0 640 58 640 258 C 640 459 545 516 428 516 Z M 428 516 C 311 516 216 459 216 258 C 216 58 311 0 428 0 C 545 0 640 58 640 258 C 640 459 545 516 428 516 Z"],["c","M 515 163 C 512 79 422 0 337 0 C 253 0 108 14 108 265 C 108 515 270 518 341 518 C 412 518 506 463 512 393 C 506 463 412 518 341 518 C 270 518 108 515 108 265 C 108 14 253 0 337 0 C 422 0 512 79 515 163 Z"],["d","M 319 516 C 203 516 108 458 108 258 C 108 58 203 0 319 0 C 435 0 531 58 531 258 C 531 458 435 516 319 516 Z M 319 516 C 203 516 108 458 108 258 C 108 58 203 0 319 0 C 435 0 531 58 531 258 C 531 458 435 516 319 516 Z M 532 723 L 532 0 L 532 723 Z"],["e","M 109 274 L 556 274 C 556 385 512 527 353 527 C 195 527 108 419 108 254 C 108 88 220 0 353 4 C 487 8 545 112 552 149 C 545 112 487 8 353 4 C 220 0 108 88 108 254 C 108 419 195 527 353 527 C 512 527 556 385 556 274 L 109 274 Z"],["f","M 190 0 L 190 513 C 190 659 190 721 301 721 C 190 721 190 659 190 513 L 190 0 Z M 108 513 L 311 513 L 108 513 Z"],["g","M 319 518 C 203 518 108 460 108 260 C 108 60 203 2 319 2 C 435 2 531 60 531 260 C 531 460 435 518 319 518 Z M 319 518 C 203 518 108 460 108 260 C 108 60 203 2 319 2 C 435 2 531 60 531 260 C 531 460 435 518 319 518 Z M 138 -104 C 149 -164 222 -198 322 -202 C 424 -205 531 -130 531 -37 L 531 510 L 531 -37 C 531 -130 424 -205 322 -202 C 222 -198 149 -164 138 -104 Z"],["h","M 590 0 L 590 351 C 590 442 535 511 428 513 C 319 515 216 449 216 362 C 216 449 319 515 428 513 C 535 511 590 442 590 351 L 590 0 Z M 216 0 L 216 721 L 216 0 Z"],["i","M 217 1 C 217 -1 217 514 217 514 L 217 1 Z M 217 704 L 217 722 L 217 704 Z"],["j","M 108 -199 C 191 -199 201 -156 201 -101 L 201 515 L 201 -101 C 201 -156 191 -199 108 -199 Z M 201 722 L 201 704 L 201 722 Z"],["k","M 216 0 L 216 721 L 216 202 L 538 513 L 354 336 L 572 0 L 354 336 L 216 202 L 216 0 Z"],["l","M 216 0 L 216 721 L 216 0 Z"],["m","M 901 0 L 901 380 C 901 426 857 512 730 513 C 603 514 557 415 557 323 C 557 415 603 514 730 513 C 857 512 901 426 901 380 L 901 0 Z M 557 0 L 557 380 C 557 426 527 512 400 513 C 273 514 216 415 216 323 C 216 415 273 514 400 513 C 527 512 557 426 557 380 L 557 0 Z M 216 0 L 216 513 L 216 0 Z"],["n","M 584 0 L 584 380 C 584 426 538 512 411 513 C 283 514 216 415 216 323 C 216 415 283 514 411 513 C 538 512 584 426 584 380 L 584 0 Z M 216 0 L 216 513 L 216 0 Z"],["o","M 335 0 C 211 0 108 59 108 262 C 108 464 211 523 335 523 C 460 523 562 464 562 262 C 562 59 460 0 335 0 Z M 335 0 C 211 0 108 59 108 262 C 108 464 211 523 335 523 C 460 523 562 464 562 262 C 562 59 460 0 335 0 Z"],["p","M 428 0 C 312 0 217 59 217 262 C 217 464 312 523 428 523 C 544 523 640 464 640 262 C 640 59 544 0 428 0 Z M 428 0 C 312 0 217 59 217 262 C 217 464 312 523 428 523 C 544 523 640 464 640 262 C 640 59 544 0 428 0 Z M 216 -199 L 216 523 L 216 -199 Z"],["q","M 319 -2 C 203 -2 107 56 107 259 C 107 461 203 521 319 521 C 436 521 531 461 531 259 C 531 56 436 -2 319 -2 Z M 319 -2 C 203 -2 107 56 107 259 C 107 461 203 521 319 521 C 436 521 531 461 531 259 C 531 56 436 -2 319 -2 Z M 533 -202 L 533 521 L 533 -202 Z"],["r","M 219 262 C 216 377 322 514 415 513 C 322 514 216 377 219 262 Z M 219 0 L 219 513 L 219 0 Z"],["s","M 456 421 C 458 446 425 516 299 521 C 173 524 115 484 115 407 C 115 329 180 305 204 298 L 393 242 C 418 236 478 209 478 135 C 478 61 399 0 299 0 C 199 0 108 53 108 131 C 108 53 199 0 299 0 C 399 0 478 61 478 135 C 478 209 418 236 393 242 L 204 298 C 180 305 115 329 115 407 C 115 484 173 524 299 521 C 425 516 458 446 456 421 Z"],["t","M 315 5 C 266 2 213 0 213 67 L 213 707 L 213 67 C 213 0 266 2 315 5 Z M 108 518 L 317 518 L 108 518 Z"],["u","M 159 515 L 159 134 C 159 88 205 2 332 1 C 460 0 528 99 528 191 C 528 99 460 0 332 1 C 205 2 159 88 159 134 L 159 515 Z M 528 515 L 528 1 L 528 515 Z"],["v","M 516 513 L 311 0 L 108 513 L 311 0 L 516 513 Z"],["w","M 108 513 L 256 0 L 433 513 L 611 0 L 759 513 L 611 0 L 433 513 L 256 0 L 108 513 Z"],["x","M 108 0 L 314 286 L 521 0 L 314 286 L 479 513 L 314 286 L 150 513 L 314 286 L 108 0 Z"],["y","M 146 -206 C 213 -227 261 -191 282 -135 L 520 506 L 282 -135 C 261 -191 213 -227 146 -206 Z M 108 510 L 331 -3 L 108 510 Z"],["z","M 133 513 L 486 513 L 108 0 L 518 0 L 108 0 L 486 513 L 133 513 Z"],["(","M 211 -13 C 143 125 108 187 108 352 C 108 517 154 655 206 734 C 154 655 108 517 108 352 C 108 187 143 125 211 -13 Z"],[")","M 109 -13 C 178 125 213 187 213 352 C 213 517 167 655 115 734 C 167 655 213 517 213 352 C 213 187 178 125 109 -13 Z"]];
//	// this.svgTransform = function(svg, atx)
//	// {
//		// let svgTxed = [];
//		// let svgTokens = svg.match(/\S+/g);
//		// let aPoint = {x:0, y:0};
//		// let iIdx = 0;
//		// while(iIdx < svgTokens.length)
//		// {
//			// if(svgTokens[iIdx] == 'M'){
//				// svgTxed.push('M');
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 1);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// firstPoint = aPoint;
//				// iIdx += 3;
//			// }else if(svgTokens[iIdx] == 'Q'){
//			  // //New bezier curve
//				// svgTxed.push('Q');
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 1);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 3);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// iIdx += 5;
//			// }else if(svgTokens[iIdx] == 'C'){
//			  // //New bezier curve
//				// svgTxed.push('C');
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 1);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 3);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 5);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// iIdx += 7;
//			// }else if(svgTokens[iIdx] == 'L'){
//				// svgTxed.push('L');
//				// aPoint = utils.getSvgPoint(svgTokens, iIdx + 1);
//				// Affine.transformPoint(aPoint, atx);
//				// svgTxed.push(aPoint.x);
//				// svgTxed.push(aPoint.y);
//				// firstPoint = aPoint;
//				// iIdx += 3;
//			// }else if(svgTokens[iIdx] == 'Z'){
//				// svgTxed.push('Z');
//				// iIdx += 1;
//			// }else{
//				// console.log('unknown token', iIdx, svgTokens[iIdx]);
//				// return svg;
//			// }
//		// }
//		// return svgTxed.join(' ');
//	// }
	
//	this.exportSBP = async function()
//	{
//		let iPanelIdx = SSDisplay.getPanelIdx();
//		let sDrawCut = SSCNC.drawMode?'Draw':'Cut';
//		let fileName = SSTools.design.file.description + ' panel ' + iPanelIdx.toString() + ' ' + sDrawCut + '.sbp';
//		fileName = fileName.replace(' ', '_');
//		let handle = await window.showSaveFilePicker({suggestedName:fileName});
//		writeFile(handle);
//	}
		
//	var writeFile =	async function(handle)
//	{
//		let writable = await handle.createWritable();
//		let fileTxt = SSCNC.generateDrawingFile(SSDisplay.getPanelIdx(), SSCNC.drawMode);
//		//console.log(writeable);
//		await writable.write(fileTxt);
//		await writable.close();
//	}
	
//	// this.fontMap = new Map();
	
//	// this.createFontMap = function()
//	// {
//		// for(let iIdx = 0; iIdx < charSVG.length; iIdx++ )
//		// {
//			// this.fontMap.set(charSVG[iIdx][0], {svg:charSVG[iIdx][1], width:737});
//		// }
//		// this.fontMap.get('0').width = 600;
//		// this.fontMap.get('1').width = 500;
//		// this.fontMap.get('I').width = 300;
//		// this.fontMap.get('J').width = 500;
//		// this.fontMap.get('M').width = 900;
//		// this.fontMap.get('N').width = 800;
//		// this.fontMap.get('W').width = 1000;
//		// this.fontMap.get('a').width = 600;
//		// this.fontMap.get('c').width = 600;
//		// this.fontMap.get('f').width = 500;
//		// this.fontMap.get('i').width = 300;
//		// this.fontMap.get('j').width = 400;
//		// this.fontMap.get('l').width = 300;
//		// this.fontMap.get('m').width = 900;
//		// this.fontMap.get('r').width = 600;
//		// this.fontMap.get('t').width = 400;
//		// this.fontMap.get('w').width = 900;
//	// }
	
//	// var layerText =
//	// [
//		// "Front",
//		// "Inner",
//		// "Back"
//	// ];
	
//	/*
//	* 
//	*/
//	this.generateDrawingFile = function(iPanelIdx, draw)
//	{
//		//Do the text first. Assume we are at 0(Shopbot coords) and the Z is set
//		//Create a transform from panel coordinates to SAhopbot coordinates;
//		let Atx = Affine.getTranslateATx({x: 48, y: 24});
//		Atx = Affine.append(Atx, Affine.getRotateATx(-Math.PI/2));

//		let svg = SSCNC.getPanelPaths(iPanelIdx, draw);
//		if(draw)
//		{
//			svg += SSCNC.getPanelText(iPanelIdx) + ' ';
//			//svg += SSCNC.getPanelHoles(iPanelIdx) + ' ';
//		}
//		//svg += SSCNC.getPanelHoles(iPanelIdx) + ' ';
//		//svg = SSCNC.getPanelHoles(iPanelIdx) + ' ';
		
//		svg = utils.svgTransform(svg, Atx);
//		//Convert the svg to sbp
//		let sbp = SSCNC.svg2sbp(svg, draw);
//		return sbp;
//	}
	
//	/*
//	* Previously used point where knife contacted surface to calculate rotation of
//	* knife. Now using plunger as contact point
//	*/
//	var calculateKnifeAngle = function(parseObj, startPoint, endPoint)
//	{
//		let dx = endPoint.x - startPoint.x;
//		let dy = endPoint.y - startPoint.y;
//		let dz = endPoint.z - startPoint.z;
//		let length = Math.sqrt(dx*dx + dy*dy + dz*dz);
//		let dlu = {x:dx/length, y:dy/length, z:dz/length};
//		//When dragging the knife is trying to get to this angle
//		let dragAngle = Math.atan2(dlu.y, dlu.x);
//		// This section has an interesting role. It is to simulate the action of the drag knife
//		// There are four possible states/events. Not dragging, transitioning to dragging, dragging
//		// and transitioning to not dragging.  For simplicity it is assumed that the transitions happen
//		// with minimal x and y movement. So they happen at the endPoint.
//		let knifeRot = parseObj.knifeRot; //Assume not dragging
//		//console.log('startPoint.z', startPoint.z, endPoint.z);
//		if(endPoint.z <= 0.11) //Plunger is engaged at 0.1 (or higher)
//		{
//			//Knife is engaged with material. Offset is meaningful
//			let offset = SSCNC.tipOff  + knifeZ2Off*endPoint.z;
//			if(startPoint.z > 0.11)
//			{
//				//Set knife point as it is lowered to material
//				parseObj.knifePoint = {x:endPoint.x - offset*Math.cos(knifeRot), y:endPoint.y - offset*Math.sin(knifeRot)};
//				parseObj.plungerPoint = {x:endPoint.x - plungerOff*Math.cos(knifeRot), y:endPoint.y - plungerOff*Math.sin(knifeRot)};
//				//console.log('knifePoint offset', knifeRot, offset*Math.cos(knifeRot), offset*Math.sin(knifeRot));
//			}else if(startPoint.z > 0)
//			{
//				let dpx = endPoint.x - parseObj.plungerPoint.x;
//				let dpy = endPoint.y - parseObj.plungerPoint.y;
//				let q = Math.sqrt(dpx*dpx + dpy*dpy);
//				let dpu = {x:dpx/q, y:dpy/q};
//				let knifeAngle = Math.atan2(dpu.y, dpu.x);
//				knifeRot = knifeAngle;
//				//Calculate new knife point
//				parseObj.knifePoint = {x:endPoint.x - offset*Math.cos(knifeRot), y:endPoint.y - offset*Math.sin(knifeRot)};
//				parseObj.plungerPoint = {x:endPoint.x - plungerOff*Math.cos(knifeRot), y:endPoint.y - plungerOff*Math.sin(knifeRot)};
//			}else
//			{
//				//Calculate new knife point as it is being dragged
//				let dkx = endPoint.x - parseObj.knifePoint.x;
//				let dky = endPoint.y - parseObj.knifePoint.y;
//				let q = Math.sqrt(dkx*dkx + dky*dky);
//				let dku = {x:dkx/q, y:dky/q};
//				let knifeAngle = Math.atan2(dku.y, dku.x);
//				//console.log('angles', dragAngle, knifeAngle);
//				let dragWeight = 0.05;
//				//knifeRot = dragWeight*dragAngle +(1-dragWeight)*knifeAngle;
//				//knifeRot = dragAngle;
//				knifeRot = knifeAngle;
//				//Calculate new knife point
//				parseObj.knifePoint = {x:endPoint.x - offset*Math.cos(knifeRot), y:endPoint.y - offset*Math.sin(knifeRot)};
//				parseObj.plungerPoint = {x:endPoint.x - plungerOff*Math.cos(knifeRot), y:endPoint.y - plungerOff*Math.sin(knifeRot)};
//				// parseObj.knifePoint = {x:endPoint.x + offset*dku.x, y:endPoint.y + offset*dku.y};
//				// knifeRot = Math.atan2(-dku.y, -dku.x);
//			}
//		}
//		parseObj.knifeRot = knifeRot;
//	}
//	/*
//	* This generates the steps along a line for animation. And since everything is a line it
//	* generates all the steps.
//	*/
//	var playOnLine = function(parseObj, startPoint, endPoint, unit)
//	{
//		let dx = endPoint.x - startPoint.x;
//		let dy = endPoint.y - startPoint.y;
//		let dz = endPoint.z - startPoint.z;
//		let length = Math.sqrt(dx*dx + dy*dy + dz*dz);
//		let dlu = {x:dx/length, y:dy/length, z:dz/length};
//		if(length < 2*unit)
//		{
//			calculateKnifeAngle(parseObj, startPoint, endPoint);
//			parseObj.sim.push([endPoint.x, endPoint.y, endPoint.z, parseObj.knifeRot]);
//			return;
//		}
//		let sp = {x:startPoint.x, y:startPoint.y, z:startPoint.z};
//		let ep;
//		for(let dStep = unit; dStep < length; dStep += unit)
//		{
//			ep = {x:startPoint.x + dStep*dlu.x, y:startPoint.y + dStep*dlu.y, z:startPoint.z + dStep*dlu.z};
//			calculateKnifeAngle(parseObj, sp, ep);
//			parseObj.sim.push([ep.x, ep.y, ep.z, parseObj.knifeRot]);
//			sp = {x:ep.x, y:ep.y, z:ep.z};
//		}
//		calculateKnifeAngle(parseObj, sp, endPoint);
//		parseObj.sim.push([endPoint.x, endPoint.y, endPoint.z, parseObj.knifeRot]);
//	}
	
//	/*
//	* Presently we have used the following sbp commands
//	* '(comment), M2, M3, MZ, J2, JZ
//	*/
//	this.animateSBP = function(sbp)
//	{
//		let lines = sbp.split('\n');
//		let lastPoint = {x:0, y:0, z:0};
//		let thisPoint = {x:0, y:0, z:0};
//		let jog = 0.2;
//		let unit = jog;
//		let parseObj =
//		{
//			sim :[],
//			knifePoint:{x:0, y:0},
//			plungerPoint:{x:0, y:0},
//			knifeRot:0
//		};
		
//		for(let iIdx = 0; iIdx < lines.length; iIdx++)
//		{
//			if(lines[iIdx].charAt(0) == '\'')continue; //Comment go no further
//			let sbpTokens = lines[iIdx].match(/\S+/g);
			
//			if(sbpTokens == null || sbpTokens.length == 0)continue;
			
//			//console.log('sbpToken', sbpTokens[0]);
//			switch(sbpTokens[0])
//			{
//				case 'M2':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:lastPoint.z };
//				playOnLine(parseObj, lastPoint, thisPoint, unit);
//				break;
				
//				case 'M3':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:parseFloat(sbpTokens[3]) };
//				playOnLine(parseObj, lastPoint, thisPoint, unit);
//				break;
				
//				case 'MZ':
//				thisPoint = { x:lastPoint.x, y:lastPoint.y, z:parseFloat(sbpTokens[1]) };
//				playOnLine(parseObj, lastPoint, thisPoint, unit);
//				break;
				
//				case 'J2':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:lastPoint.z };
//				playOnLine(parseObj, lastPoint, thisPoint, jog);
//				break;
				
//				case 'JZ':
//				thisPoint = { x:lastPoint.x, y:lastPoint.y, z:parseFloat(sbpTokens[1]) };
//				playOnLine(parseObj, lastPoint, thisPoint, jog);
//				break;
				
//				case 'PAUSE':
//				break;
				
//				default:
//				console.log('Unrecognized SBP token', sbpTokens[0], 'line num', iIdx);
//				break;
				
//			}
//			unit = 0.02;
//			lastPoint = {x:thisPoint.x, y:thisPoint.y, z:thisPoint.z};
//		}
//		return parseObj.sim;
//	}

//	var drawOnLine = function(parseObj, startPoint, endPoint)
//	{
//		if(startPoint.z > 0 && endPoint.z <= 0)
//		{
//			parseObj.svg += 'M ' + endPoint.x.toString() + ' ' + endPoint.y.toString() + ' ';
//			return;
//		}
//		if(endPoint.z > 0)return;

//		parseObj.svg += 'L ' + endPoint.x.toString() + ' ' + endPoint.y.toString() + ' ';
		
//		// let dx = endPoint.x - startPoint.x;
//		// let dy = endPoint.y - startPoint.y;
//		// let dz = endPoint.z - startPoint.z;
//		// let length = Math.sqrt(dx*dx + dy*dy + dz*dz);
//		// let dlu = {x:dx/length, y:dy/length, z:dz/length};
//		// if(length < 2*unit)
//		// {
//			// parseObj.sim.push([endPoint.x, endPoint.y, endPoint.z, knifeRot]);
//			// return;
//		// }
//		// for(let dStep = unit; dStep <= length; dStep += unit)
//		// {
//			// parseObj.sim.push([startPoint.x + dStep*dlu.x, startPoint.y + dStep*dlu.y, startPoint.z + dStep*dlu.z, knifeRot]);
//		// }
//	}
	
//	this.sbp2svg = function(sbp)
//	{
//		let lines = sbp.split('\n');
//		let lastPoint = {x:0, y:0, z:0};
//		let thisPoint = {x:0, y:0, z:0};
//		let parseObj =
//		{
//			svg :'',
//		};
		
//		for(let iIdx = 0; iIdx < lines.length; iIdx++)
//		{
//			if(lines[iIdx].charAt(0) == '\'')continue; //Comment go no further
//			let sbpTokens = lines[iIdx].match(/\S+/g);
			
//			if(sbpTokens == null || sbpTokens.length == 0)continue;
			
//			//console.log('sbpToken', sbpTokens[0]);
//			switch(sbpTokens[0])
//			{
//				case 'M2':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:lastPoint.z };
//				drawOnLine(parseObj, lastPoint, thisPoint);
//				break;
				
//				case 'M3':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:parseFloat(sbpTokens[3]) };
//				drawOnLine(parseObj, lastPoint, thisPoint);
//				break;
				
//				case 'MZ':
//				thisPoint = { x:lastPoint.x, y:lastPoint.y, z:parseFloat(sbpTokens[1]) };
//				drawOnLine(parseObj, lastPoint, thisPoint);
//				break;
				
//				case 'J2':
//				thisPoint = { x:parseFloat(sbpTokens[1]), y:parseFloat(sbpTokens[2]), z:lastPoint.z };
//				drawOnLine(parseObj, lastPoint, thisPoint);
//				break;
				
//				case 'JZ':
//				thisPoint = { x:lastPoint.x, y:lastPoint.y, z:parseFloat(sbpTokens[1]) };
//				drawOnLine(parseObj, lastPoint, thisPoint);
//				break;
				
//				case 'PAUSE': //Ignore pauses
//				break;
				
//				default:
//				console.log('Unrecognized SBP token', sbpTokens[0], 'line num', iIdx);
//				break;
				
//			}
//			lastPoint = {x:thisPoint.x, y:thisPoint.y, z:thisPoint.z};
//		}
//		return parseObj.svg;
//	}
	
//	/*
//	* This function is used after placing the plunger on the tangent line.  Now we can rotate
//	* around the plunger to align the blade with the tangent line and the cut. This will make
//	* any arbitrary arc.  In this case the center point is the plunger position, the radius is
//	* the plunger offset, the start and end angles are the knife start and ending angles.
//	* We will move on the smallest include angle.  So the arc will always 180 degrees or less.
//	*
//	* We can create unit beziers for quarter turns.  We will have 1 or 2 beziers.  We create
//	* the two arcs starting at 0 and transform to the starting angle. The angles are in radians.
//	*
//	* To get this right we need to define what the angles mean. We have chosen the knife angle
//	* as the tangent to the curve in the forward direction. By this definition the knife is behind
//	* the pivot point.
//	*
//	* For this function the angles must be relative to the center point. Keeping the knife angle
//	* polarity, the center point is 'behind' the pivot point.
//	* 
//	*/
//	var makeMinArc = function(parseObj, centerPoint, radius, startAngle, endAngle)
//	{
//		let dAng = endAngle - startAngle;
	
//		while(dAng > Math.PI) dAng -= 2*Math.PI;
//		while(dAng < -Math.PI) dAng += 2*Math.PI;
		
//		if(dAng == 0)return;//The calling routine isn't smart enough to recognize either 0 or a multiple of 2*pi
		
//		//dAng is now between -Math.PI and Math.PI. Sign determines direction of rotation
//		//Start with a quarter arc
//		let arcs = [new Bezier([{x:1, y:0}, {x:1, y:0.551915}, {x:0.551915, y:1}, {x:0, y:1}])];
//		//Do we have a 2nd quarter arc?
//		if(Math.abs(dAng) > (Math.PI/2))arcs.push(new Bezier([{x:0, y:1}, {x:-0.551915, y:1}, {x:-1, y:0.551915}, {x:-1, y:0}]));
//		//Now do we have a partial quarter arc?
//		let partQ = Math.abs(dAng)%(Math.PI/2);
//		if(partQ != 0)
//		{
//			let t = partQ/(Math.PI/2);
//			arcs[arcs.length - 1] = arcs[arcs.length - 1].split(0, t);
//		}
//		//Build the transform.  Transform order is reversed. The order before reversing is to flip
//		//the direction. Rotate to the start angle, scale to radius and translate to the center point.
//		let Atx = Affine.getTranslateATx(centerPoint);
//		Atx = Affine.append(Atx, Affine.getScaleATx({x:radius, y:radius}));
//		Atx = Affine.append(Atx, Affine.getRotateATx(startAngle));
//		if(dAng < 0)
//		{
//			//Flip it all
//			Atx = Affine.append(Atx, Affine.getScaleATx({x:1, y:-1}));
//		}
//		let unitArc = new PolyBezier(arcs);
//		utils.transformPoly(unitArc, Atx);
//		bezier2sbp(parseObj, unitArc.curves[0], 0);
//		if(arcs.length > 1)bezier2sbp(parseObj, unitArc.curves[1], 0);		
		
//	}
//	/*
//	* This function replaces a straight line segment with a pivot at the knife offset distance
//	*/
//	var pivot2Align = function(parseObj, startPoint, endPoint)
//	{
//		//Pivot on the 1/2 way point at the 1/2 the length
//		let dx = endPoint.x - startPoint.x;
//		let dy = endPoint.y - startPoint.y;
//		let length = Math.sqrt(dx*dx + dy*dy);
//		let dlu = {x:dx/length, y:dy/length};
//		//set up unit half circle from -1,0 to 1,0
//		let arcs = [];
//		arcs.push(new Bezier([{x:-1, y:0}, {x:-1, y:0.551915}, {x:-0.551915, y:1}, {x:0, y:1}]));
//		arcs.push(new Bezier([{x:0, y:1}, {x:0.551915, y:1}, {x:1, y:0.551915}, {x:1, y:0}]));
//		//Transform the arc. Reverse order. Rotate so endpoints are on line. Scale to size and translate
//		//to position
//		let Atx = Affine.getTranslateATx({x:startPoint.x + length*dlu.x/2, y:startPoint.y + length*dlu.y/2});
//		Atx = Affine.append(Atx, Affine.getScaleATx({x:length/2, y:length/2}));
//		Atx = Affine.append(Atx, Affine.getRotateATx(Math.atan2(dlu.y, dlu.x)));
//		let unitArc = new PolyBezier(arcs);
//		utils.transformPoly(unitArc, Atx);
//		bezier2sbp(parseObj, unitArc.curves[0], 0);
//		bezier2sbp(parseObj, unitArc.curves[1], 0);		
//	}
	
//	var bezier2sbp = function(parseObj, curve, offset)
//	{
//		let length = curve.length();
//		let tCnt = length/0.02;
//		let dt = 1.0/tCnt;
//		for(let iRdx = 1; iRdx <= tCnt; iRdx++)
//		{
//			let increment = curve.get(iRdx*dt);
//			d1 = curve.derivative(iRdx*dt);
//			q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//			//Unit vector along tangent
//			d1u = {x:d1.x/q, y:d1.y/q};
//			parseObj.sbp += 'M2 ' + (increment.x + offset*d1u.x).toString() + ', ' + (increment.y + offset*d1u.y).toString() + '\n';
//		}
//		let pt = curve.get(1);
//		parseObj.lastPoint = {x:pt.x, y:pt.y};
//		if(parseObj.z <= 0)
//		{
//			//Knife is dragging
//			let dl = curve.derivative(1);
//			parseObj.knifeAngle = Math.atan2(dl.y, dl.x);
//		}
//	}
//	/*
//	* This routine generates the code for plunging the knife at the beginning of a cut. The basic concept
//	* is the same for line and curves, but the math is more complicated for the curve.  First we move the pivot
//	* point to a point two tip offsets along the tangent to the beginning of the line or curve.  The tip offset 
//	* is the horizontal distance from the pivot point to the tip. The worse case scenario is that the knife is
//	* pointing exactly 180 degrees from the direction is should be. In this scenario when we move 2 tip offsets 
//	* and lower the knife, it will touch the surface at one tip offset.  It is critical that the knife be barely 
//	* touching surface, because as we move along the tangent line toward the starting point, the knife needs to 
//	* move left or right and to swing around the pivot point.  We are moving the pivot point until it is one tip 
//	* offset along the tangent line past the curve starting point.  This should place the tip of the knife at the
//	* the starting point of the curve.  For a line we can just move the pivot point on a line to a point
//	* where the Z of the pivot point is at the cutting depth and is a knife offset in front of a target point
//	* on the line. This target point is chosen to cause the knife to move down into the material along a line
//	* that slopes into the material along the line.  As long as that slope is not straight down the knife will
//	* be dragged along the cut. In the case of the curve, we want the tip of the knife to slope into the material
//	* along the curve. A key difference is that motion along a curve must be broken up into small straight sections.
//	* We have chosen 0.02 inch as the length of our straight segments.
//	*/
//	var sbpCut = function(parseObj)
//	{
//		//console.log('Cut iIdx', parseObj.iIdx);
//		//We need to work with the next curve
//		let curve;
//		let comment = '';
//		let nextCurveToken = parseObj.svgTokens[parseObj.iIdx + 3];
//		//Get the point that follows the next curve token
//		let nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 4);
//		let lastPoint = {x:parseObj.lastPoint.x, y:parseObj.lastPoint.y};; //ParseObj.lastPoint can be modified before we are finshed with this value
//		switch(nextCurveToken)
//		{
//			case 'L':
//				//For a line that next point is the end of the line
//				curve = utils.makeline(lastPoint, nextPoint);
//				parseObj.iIdx += 6;
//			break;
			
//			case 'Q':
//				comment ='\'Q ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + ' ' + parseObj.svgTokens[parseObj.iIdx + 7] + '\n';
//				//For the beziers the next point is the control point
//				curve = new Bezier(lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 6));
//				parseObj.iIdx += 8;
//			break;
			
//			case 'C':
//				comment ='\'C ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + ' ' + parseObj.svgTokens[parseObj.iIdx + 7] + ' ' + parseObj.svgTokens[parseObj.iIdx + 8] + ' ' + parseObj.svgTokens[parseObj.iIdx + 9] + '\n';
//				curve = new Bezier(lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 6), utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 8));
//				parseObj.iIdx += 10;
//			break;
//		}
//		let length = curve.length();
//		//What is the tangent at the start
//		let d1 = curve.derivative(0);
//		//Prepare to get unit tangent
//		let q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//		let d1u = {x:d1.x/q, y:d1.y/q};
		
//		// let tangDist = {x:SSCNC.tipOff*d1u.x, y:SSCNC.tipOff*d1u.y};
//		//We are changing the paradigm and are going to rotate on the plunger
//		//to align the knife.  So the plunger needs to be placed on the tangent line
//		// more than a plunger distance away. We choose 2
//		let tangDist = {x:plungerOff*d1u.x, y:plungerOff*d1u.y};
		
//		let tipDist = {x:SSCNC.tipOff*d1u.x, y:SSCNC.tipOff*d1u.y};
		
//		let newKnifeAngle = Math.atan2(d1u.y, d1u.x);
		
		
//		if(Math.abs(parseObj.knifeAngle - newKnifeAngle) > 0.01)
//		{
//			//console.log('knifeAngles', parseObj.knifeAngle, newKnifeAngle);
//			//The knife angle determines where the plunger is relative to the pivot point
//			//plunger is behind the pivot piont
//			let plunger = {x:-plungerOff*Math.cos(parseObj.knifeAngle), y:-plungerOff*Math.sin(parseObj.knifeAngle)};
//			//We need to align knife
//			//This is where we want the plunger to be
//			let plungerPoint = {x:lastPoint.x - 2*tangDist.x, y: lastPoint.y - 2*tangDist.y};
//			//Move pivot to position plunger at plunger point
//			parseObj.sbp += 'J2 ' + (plungerPoint.x - plunger.x).toString() + ', ' + (plungerPoint.y - plunger.y).toString() + '\n';
//			//Move until tip of knife is just above the surface and the plunger is depressed
//			parseObj.sbp += 'MZ 0.1\n';
//			parseObj.z = 0;
//			//Now pivot around plunger to align knife with cut
//			makeMinArc(parseObj, plungerPoint, plungerOff, parseObj.knifeAngle, newKnifeAngle);
//			//Move to starting point of curve.  Since we are moving the pivot point the tip of the knife is actually 1 knife offset plus
//			//the thickness of the material in front of the statring point
//			//pivot2Align(parseObj, {x:lastPoint.x - 3*tangDist.x, y:lastPoint.y - 3*tangDist.y}, {x:lastPoint.x - 1*tangDist.x, y:lastPoint.y - 1*tangDist.y});
//			// parseObj.sbp += 'M2 ' + (lastPoint.x).toString() + ', ' + (lastPoint.y).toString() + '\n';
//			//We could do this several ways but this places the tip of the knife at the starting point of the curve
//			//In case we are pointing the wrong way lets pivot on the point
			
//			parseObj.sbp += 'M2 ' + (lastPoint.x + tipDist.x).toString() + ', ' + (lastPoint.y + tipDist.y).toString() + '\n';
//		}else
//		{
//			//Knife is aligned, but still give it a little lead in. Start one offset back
//			parseObj.sbp += 'J2 ' + (lastPoint.x ).toString() + ', ' + (lastPoint.y ).toString() + '\n';
//			//Move until tip of knife is on the surface
//			parseObj.sbp += 'JZ 0\n';
//			parseObj.z = 0;
//			//Now move one offset and put knife at start of cut
//			parseObj.sbp += 'M2 ' + (lastPoint.x + tipDist.x).toString() + ', ' + (lastPoint.y + tipDist.y).toString() + '\n';
//		}
//		parseObj.sbp += 'PAUSE\n';
//		switch(nextCurveToken)
//		{
//			case 'L':
//				parseObj.sbp += '\'L ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + '\n';
//				let rampDist = (length > 2*SSCNC.tipOff)?2*SSCNC.tipOff:length;
//				parseObj.sbp += 'M3 ' + (lastPoint.x + rampDist*d1.x/q).toString() + ', ' + (lastPoint.y + rampDist*d1.y/q).toString() + ', ' + cutZ.toString() + '\n';
//				//Now finish cut at depth
//				if(length > rampDist)parseObj.sbp += 'M2 ' + (nextPoint.x + knifeOff*d1u.x).toString() + ', ' + (nextPoint.y  + knifeOff*d1u.y).toString() + '\n';
//				parseObj.lastPoint = {x:nextPoint.x, y:nextPoint.y};
//				parseObj.knifeAngle = newKnifeAngle;
//			break;
			
//			case 'Q':
//			case 'C':
//				parseObj.sbp += comment;
//				//For the beziers the next point is the control point
				
//				//Number of 0.02 segments in length
//				let tCnt = length/0.02;
//				//Approx parameter t increment for 0.02 segment
//				let dt = 1/tCnt;
//				let thisCnt = (tCnt > rampCnt)?rampCnt:tCnt;
//				let increment;
//				for(let iRdx = 1; iRdx < thisCnt; iRdx++)
//				{
//					//z depth ramps down to cutZ
//					let zD = (cutZ*iRdx)/(thisCnt);
//					//Note zD is negative so tipOff + knifeZ2Off*zD gets smaller as the knife goes deeper. Finally we are at knifeOff
//					let offset = (SSCNC.tipOff + knifeZ2Off*zD);
//					//Find curve point as t increases to move approx 0.02 along curve
//					//console.log('zD', zD, knifeOff, offset);
//					increment = curve.get(iRdx*dt);
//					//Get the tangent at this point
//					d1 = curve.derivative(iRdx*dt);
//					q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//					//Unit vector along tangent
//					d1u = {x:d1.x/q, y:d1.y/q};
//					//With 45 deg knife the knife meets the surface at (tipOff + zD) behind pivot point. We are moving the pivot
//					//point that distance along tangent so that knife is meeting surface at the desired point
//					parseObj.sbp += 'M3 ' + (increment.x + offset*d1u.x).toString() + ', ' + (increment.y + offset*d1u.y).toString() + ', ' + (zD).toString() + '\n';
//				}
//				increment = curve.get(thisCnt*dt);
//				//Get the tangent at this point
//				d1 = curve.derivative(thisCnt*dt);
//				q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//				//Unit vector along tangent
//				d1u = {x:d1.x/q, y:d1.y/q};
//				parseObj.sbp += 'M3 ' + (increment.x + knifeOff*d1u.x).toString() + ', ' + (increment.y + knifeOff*d1u.y).toString() + ', ' + (cutZ).toString() + '\n';
//				//Now finish the curve at depth
//				for(let iRdx = thisCnt + 1; iRdx <= tCnt; iRdx++)
//				{
//					let increment = curve.get(iRdx*dt);
//					d1 = curve.derivative(iRdx*dt);
//					q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//					//Unit vector along tangent
//					d1u = {x:d1.x/q, y:d1.y/q};
//					parseObj.sbp += 'M2 ' + (increment.x + knifeOff*d1u.x).toString() + ', ' + (increment.y + knifeOff*d1u.y).toString() + '\n';
//				}
//				let pt = curve.get(1);
//				parseObj.lastPoint = {x:pt.x, y:pt.y};
//				let dl = curve.derivative(1);
//				parseObj.knifeAngle = Math.atan2(dl.y, dl.x);
//			break;
//		}
//		//parseObj.sbp += 'M2 ' + (lastPoint.x + knifeOff*d1.x/q).toString() + ', ' + (lastPoint.y + knifeOff*d1.y/q).toString() + '\n';
//	}
	
//	this.svg2sbp = function(strSVG, draw)
//	{
//		//text.match(/\S+/g) split and remove whitespace
//		let parseObj =
//		{
//			svgTokens:strSVG.match(/\S+/g),
//			iIdx:0,
//			sbp:'',
//			sim:[],
//			lastPoint:{x:0, y:0},
//			knifeAngle:0,  //This keeps track of expected knife angle
//			draw:draw
//		}
//		// let svgTokens = strSVG.match(/\S+/g);
//		// let sbp = '';
//		// let sim = [];
//		let d1, q, d1u, dt;
//		let thisPoint = {
//			x: 0,
//			y: 0
//		};
//		let firstPoint = {x:thisPoint.x, y:thisPoint.y};
//		// let lastPoint = {x:thisPoint.x, y:thisPoint.y};
//		// let thisKnifeAngle = 0;
//		let nextPoint;
//		let parsePoints = new Array(3);
//		//let iIdx = 0;
//		//	  let cw = 0;
//		//console.log("svg2poly svg ", strSVG);
//		while (parseObj.iIdx < parseObj.svgTokens.length) {
//			let cmdToken = parseObj.svgTokens[parseObj.iIdx];
//			switch(cmdToken) {
//				case 'M':
//				//Add the following comment
//				parseObj.sbp += '\'M ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
//				thisPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
//				firstPoint = {x:thisPoint.x, y:thisPoint.y};
//				//Lift the pen or knife at where we are
//				parseObj.sbp += 'JZ ' + moveZ + '\n';
//				parseObj.z = moveZ;
//				parseObj.lastPoint = {x:thisPoint.x, y:thisPoint.y};
//				//console.log('lastPoint', parseObj.lastPoint);
//				if(draw)
//				{
//					//Jog to the new location
//					parseObj.sbp += 'J2 ' + parseObj.svgTokens[parseObj.iIdx + 1] + ', ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
//					//For drawing we have a very simple z moves. Here we just move to the surface 
//					parseObj.sbp += 'JZ 0\n';
//					parseObj.z = 0;
//					parseObj.iIdx += 3;
//				}else
//				{
//					//Cut is way more complicated. We have a knife offset and we are going to
//					//move out in front of the point where the knife meets the surface.
//					//This also means that we need to move along the curve fast enough that
//					//the pivot point moves forward during the knife plunge into the material
//					// let parseObj = {parseObj.sbp:parseObj.sbp, parseObj.lastPoint:parseObj.lastPoint, parseObj.svgTokens:parseObj.svgTokens, parseObj.iIdx:parseObj.iIdx};
//					sbpCut(parseObj);
//					// sbp = obj.sbp;
//					// parseObj.iIdx = obj.parseObj.iIdx;
//					// parseObj.lastPoint = obj.parseObj.lastPoint;
//				}
//				break;
				
//				case 'L':
//					parseObj.sbp += '\'L ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + '\n';
//					nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
//					d1 ={x: nextPoint.x - parseObj.lastPoint.x, y:nextPoint.y - parseObj.lastPoint.y};
//					q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//					//Unit vector along tangent
//					d1u = {x:d1.x/q, y:d1.y/q};
//					if(draw)d1u = {x:0, y:0}; //Don't move along tangent
//					parseObj.sbp += 'M2 ' + (nextPoint.x + knifeOff*d1u.x).toString() + ', ' + (nextPoint.y  + knifeOff*d1u.y).toString() + '\n';
//					parseObj.lastPoint.x = nextPoint.x;
//					parseObj.lastPoint.y = nextPoint.y;
//					if(!draw && parseObj.z <= 0)
//					{
//						//Knife is dragging
//						parseObj.knifeAngle = Math.atan2(d1.y, d1.x);
//					}
//					parseObj.iIdx += 3;
//				break;
				
//				case 'Q':
//					parseObj.sbp += '\'Q ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + ' ' + parseObj.svgTokens[parseObj.iIdx + 3] + ' ' + parseObj.svgTokens[parseObj.iIdx + 4] + '\n';
//					nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
//					curve = new Bezier(parseObj.lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 3));
//					bezier2sbp(parseObj, curve, knifeOff);
//					parseObj.iIdx += 5;
//					break;
//				case 'C':
//					parseObj.sbp += '\'C ' + parseObj.svgTokens[parseObj.iIdx + 1] + ' ' + parseObj.svgTokens[parseObj.iIdx + 2] + ' ' + parseObj.svgTokens[parseObj.iIdx + 3] + ' ' + parseObj.svgTokens[parseObj.iIdx + 4] + ' ' + parseObj.svgTokens[parseObj.iIdx + 5] + ' ' + parseObj.svgTokens[parseObj.iIdx + 6] + '\n';
//					nextPoint = utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 1);
//					curve = new Bezier(parseObj.lastPoint, nextPoint, utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 3), utils.getSvgPoint(parseObj.svgTokens, parseObj.iIdx + 5));
//					bezier2sbp(parseObj, curve, knifeOff);
//					parseObj.iIdx += 7;
//				break;
				
//				case 'Z':
//				parseObj.sbp += '\'Z\n';
//				if((Math.abs(parseObj.lastPoint.x - firstPoint.x) > 0.05) || (Math.abs(parseObj.lastPoint.y - firstPoint.y) > 0.05))
//				{
//					d1 ={x: firstPoint.x - parseObj.lastPoint.x, y:firstPoint.y - parseObj.lastPoint.y};
//					q = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
//					//Unit vector along tangent
//					d1u = {x:d1.x/q, Y:d1.y/q};
//					parseObj.sbp += 'M2 ' + (firstPoint.x + knifeOff*d1u.x).toString() + ', ' + (firstPoint.y  + knifeOff*d1u.y).toString() + '\n';
//				}
//				parseObj.iIdx += 1;
//				break;
//			}
//		}
//		return parseObj.sbp;
//	}
//		//This gets the SVG for the text for a given panel
//	this.getPanelText = function(pIdx)
//	{
//		let svg = ' ';
//		for(let iIdx = 0; iIdx < SSTools.design.file.panels[pIdx].used.length; iIdx++)
//		{
//			let piece = SSTools.design.file.panels[pIdx].used[iIdx];
//			let bbox = utils.svg2Poly(piece.path).bbox();
//			//console.log('piece', piece);
//			let shutter = SSTools.design.file.shutters[piece.sIdx];
//			//let sText = shutter.description + ' ' + layerText[piece.layerIdx];
//			let sText = SSTools.design.getShutterPieceText(piece.sIdx, piece.layerIdx, piece.ppIdx);
//			//console.log('sText', sText);
//			let pathTxt = VectorText.svgText(sText, 1);
//			pathTxt = utils.svgTransform(pathTxt, piece.textTrans);
//			svg += pathTxt + ' ';
//			//ctx.stroke(new Path2D(pathTxt));
//		}
//		return svg;
//	}
	
//	/*
//	* First we take all the paths and remove the ones on the factory edge and one of any two
//	* that overlap. Then we add tabs. Finally we optimize what is left.
//	*/
//	this.getPanelPaths = function(pIdx, drawn)
//	{
//		let svg = '';
//		let polys = [];
//		let panel = SSTools.design.file.panels[pIdx];
//		let blank = utils.svg2Poly(SSTools.design.file.blanks[panel.blankIdx].path);
//		for(let iIdx = 0; iIdx < panel.used.length; iIdx++)
//		{
//			//curves.push(...utils.svg2Poly(panel.used[iIdx].path).curves);
//			polys.push(utils.svg2Poly(panel.used[iIdx].path).curves);
//		}
//		//Remove factory edges
//		for(let iPdx = 0; iPdx < polys.length; iPdx++)
//		{
//			let curves = polys[iPdx];
//			for(let iIdx = curves.length - 1; iIdx >= 0 ; iIdx--)
//			{
//				//Only lines can be aligned.  By definition the factory edge is a line
//				if(!curves[iIdx]._linear)continue;
				
//				let points = curves[iIdx].points;
//				for(let iJdx = 0; iJdx < blank.curves.length; iJdx++)
//				{
//					let factoryEdge = blank.curves[iJdx];
//					let aligned = utils.align(points, { p1: factoryEdge.points[0], p2: factoryEdge.points[factoryEdge.order] });
//					let onEdge = !aligned.some((p) => Math.abs(p.y) > 0.5);
//					if(onEdge)
//					{
//						curves.splice(iIdx, 1);
//						break;
//					}
//				}
//			}
//			//SMGTODO Here we would check for shared lines between panel pieces.
//			//This is a little more complicated than finding the factory edge.  Any line on a factory
//			//edge can bb removed.
//			//When implemented if one finds lines that are aligned they could have a partial or no
//			//overlap.  Only the overlap should be removed.
//			let tabbedCurves = [];
//			for(let iIdx = 0; iIdx < curves.length; iIdx++)
//			{
//				let curve = curves[iIdx];
//				//let end = null;
//				let nextCurves = {left:null, right:curve};
//				do
//				{
//					nextCurves = curveSplitter(nextCurves.right, 11.5, 0.5);
//					tabbedCurves.push(nextCurves.left);
//				}while(nextCurves.right != null);
//				//if(end != null)tabbedCurves.push(end);
//			}
//			let edgeOffset = -1;
//			if(drawn)
//			{
//				edgeOffset = -2;
//			}
//			let KO = blank.offset(edgeOffset, PolyBezier.NO_JOIN)[0];
//			for(let iIdx = tabbedCurves.length - 1; iIdx >= 0; iIdx--)
//			{
//				let curve = tabbedCurves[iIdx];
//				//We are going to assume that we have lines or simple beziers that do not cross
//				//the keep out boundary twice
//				let start = KO.contains(curve.get(0));
//				let end = KO.contains(curve.get(1));
//				if(!start && !end)
//				{
//					//This curve is entirely in keep out region. Toss it
//					tabbedCurves.splice(iIdx, 1);
//					continue;
//				}
//				if(start && end)continue;
				
//				//One end of curve is in the keep out and the other is not
//				for(let iJdx = 0; iJdx < KO.curves.length; iJdx++)
//				{
//					let intersects = curve.intersects(KO.curves[iJdx]);
//					if(intersects.length != 0)
//					{
//						//We found our intersection
//						let tk = intersects[0].split("/").map(v => parseFloat(v));
//						if(start)
//						{
//							tabbedCurves[iIdx] = curve.split(0, tk[0]);							
//						}else
//						{
//							tabbedCurves[iIdx] = curve.split(tk[0], 1.0);
//							if(!drawn)tabbedCurves[iIdx].reverse();
//						}
//						break;
//					}
//				}
//			}
//			//We want connected curves to be contiguous with no moves
//			let polyout = [];
//			let prevPt;
//			for(let iIdx = 0; iIdx < tabbedCurves.length; iIdx++)
//			{
//				let curve = tabbedCurves[iIdx];
//				//Are we building a poly
//				if(polyout.length != 0)
//				{
//					let presPt = curve.get(0);
//					//How close are the points
//					let dist2 = (prevPt.x - presPt.x)**2 + (prevPt.y - presPt.y)**2;
//					if(dist2 > 0.001)
//					{
//						//This curve is too far away, so output the svg
//						svg += utils.poly2Svg(new PolyBezier(polyout)) + ' ';
//						//Prepare for new array
//						polyout = [];
//					}
//				}
//				//Ad this curve to the array
//				prevPt = curve.get(1);
//				polyout.push(curve);
//			}
//			//Actually this is always true, there will be at least one if tabbedCurves
//			//is not empty.  But it is slightly possible for tabbedCurves to be empty
//			if(polyout.length != 0)
//			{
//				svg += utils.poly2Svg(new PolyBezier(polyout)) + ' ';
//			}
//		}
//		//console.log(svg);
//		return svg;
//	}
	
//	//This gets the SVG for the text for a given panel
//	// We would like the hole to be created so that the knife is aligned to start the cut
//	// This is a little tricky because we are applying a transform that could have a rotation
//	// operation
//	this.getPanelHoles = function(pIdx)
//	{
//		let svg = ' ';
//		let entryAngle = 0;
//		for(let iIdx = 0; iIdx < SSTools.design.file.panels[pIdx].used.length; iIdx++)
//		{
//			let piece = SSTools.design.file.panels[pIdx].used[iIdx];
//			let bbox = utils.svg2Poly(piece.path).bbox();
//			//console.log('piece', piece);
//			let shutter = SSTools.design.file.shutters[piece.sIdx];
//			//let sText = shutter.description + ' ' + layerText[piece.layerIdx];
//			let shutter2PanelTx = Affine.getInverseATx(shutter.layers[piece.layerIdx].panelPieces[piece.ppIdx].panelTrans);
//			//console.log('asin', Math.atan2(shutter2PanelTx[0][1], shutter2PanelTx[0][0]), shutter2PanelTx[1][0], shutter2PanelTx[1][1]);
//			entryAngle += Math.atan2(shutter2PanelTx[0][1], shutter2PanelTx[0][0]);
//			//entryAngle -= Math.PI/2;
//			entryAngle = entryAngle%(2*Math.PI);
//			for(let iJdx = 0; iJdx < shutter.holes.length; iJdx++)
//			{
//				let hole = shutter.holes[iJdx];
//				//console.log('hole', hole);
//				let holePoly = SSCNC.makeHolePath(hole.dia, hole.center, entryAngle);
//				//Rotate next hole for knife angle
//				utils.transformPoly(holePoly, shutter2PanelTx);
//				let holebox = holePoly.bbox();
//				if(!utils.bboxoverlap(holebox, bbox))
//				{
//					//console.log('Skip');
//					continue; // This hole is not on this part of the panel
//				}
//				svg += utils.poly2Svg(holePoly) + ' ';
//				//console.log('entryAngle', entryAngle);
//				entryAngle += 3*Math.PI/2;
//				entryAngle = entryAngle%(2*Math.PI);
//			}
//		}
//		return svg;
//	}
	
//	/*
//	* We will split up each curve into cutLen sections. This routine takes off tabLen inch
//	* and returns a cutLen section and the remainder
//	*/
//	var curveSplitter = function(curve, cutLen, tabLen)
//	{
//		let length = curve.length();
//		if(length < tabLen)return {left:curve, right:null};
			
//		//For lines t is proportional for others it is approximate, but still pretty ok
//		//Remove tabLen
//		let tabT = tabLen/length;
//		let tabRemoved = curve.split(tabT, 1.0);
//		if(!tabRemoved._linear)console.log('Split non-linear', tabRemoved);
//		length = tabRemoved.length();
		
//		if(length <= cutLen)return {left:tabRemoved, right:null};
		
//		return tabRemoved.split(cutLen/length);
//	}
	
//	this.getPanelTextPaths = function(pIdx)
//	{
//		let panel = SSTools.design.file.panels[panelIdx];
//		//Now find the shutters where this is used
//		let sIdx = 0;
//		let layerIdx = 0;
//		let ppIdx = 0;
//		let shutter;
//		let layer;
//		let pieces = [];
//		for(;sIdx < SSTools.design.file.shutters.length; sIdx++)
//		{
//			shutter = SSTools.design.file.shutters[sIdx];
//			for(layerIdx = 0; layerIdx < 3; layerIdx++)
//			{
//				layer = shutter.layers[layerIdx];
//				for(ppIdx = 0; ppIdx < layer.panelPieces.length; ppIdx++)
//				{
//					if(layer.panelPieces[ppIdx].panelIdx == pIdx)
//					{
//						//We have a location where a piece of this panel is used
//						pieces.push({sIdx:sIdx, layerIdx:layerIdx, ppIdx:ppIdx, piece:layer.panelPieces[ppIdx]});
//					}
//				}
//			}
//		}
//		svg = '';
//		//Now we have an array that shows where the pieces of this panel are used
//		for(let iJdx = 0; iJdx < pieces.length; iJdx++)
//		{
//			let piece = pieces[iJdx];
//			//Find the path to position the text
//			let poly = utils.svg2Poly(panel.used[piece.ppIdx].path);
//			utils.transformPoly(poly, piece.piece.panelTrans);
//			//Now get the poly box
//			let bbox = poly.bbox();
//			let sText = SSTools.design.file.shutters[piece.sIdx].description + ' ' + layerText[piece.layerIdx];
//			let svgText = this.svgText(sText, 1);
//			//Now find the bounds of this text and determine its position 
//		}
//	}
	
//	// Rot sets the knife entry angle. Exit will be entry + pi/2
//	this.makeHolePath = function(dia, loc, rot)
//	{
//		//console.log('arc rot', rot);
//		let arcs = [];
//		arcs.push(new Bezier([{x:0, y:-1}, {x:-0.551915, y:-1}, {x:-1, y:-0.551915}, {x:-1, y:0}]));
//		arcs.push(new Bezier([{x:-1, y:0}, {x:-1, y:0.551915}, {x:-0.551915, y:1}, {x:0, y:1}]));
//		arcs.push(new Bezier([{x:0, y:1}, {x:0.551915, y:1}, {x:1, y:0.551915}, {x:1, y:0}]));
//		arcs.push(new Bezier([{x:1, y:0}, {x:1, y:-0.551915}, {x:0.551915, y:-1}, {x:0, y:-1}]));
//		arcs.push(new Bezier([{x:0, y:-1}, {x:-0.551915, y:-1}, {x:-1, y:-0.551915}, {x:-1, y:0}]));
//		let unitHole = new PolyBezier(arcs);
//		//Transform the hole
//		let Atx = Affine.getTranslateATx(loc);
//		Atx = Affine.append(Atx, Affine.getScaleATx({x:dia/2, y:dia/2}));
//		//I know it doesn't seem right to rotate a hole, but this allows each hole to start with
//		//the knife pointing in the right direction
//		Atx = Affine.append(Atx, Affine.getRotateATx(rot));
//		utils.transformPoly(unitHole, Atx);
//		return unitHole;
//	}

//	// this.svgText = function(sText, height)
//	// {
//		// let split = sText.split('');
//		// let svg = '';
//		// let atx = Affine.getIdentityATx();
//		// for(let iIdx = 0; iIdx < split.length; iIdx++)
//		// {
//			// if(split[iIdx] == ' ')
//			// {
//				// atx = Affine.append(atx, Affine.getTranslateATx({x:737, y: 0}));
//				// continue;
//			// }
//			// //console.log('split[iIdx]', split[iIdx]);
//			// let char = this.fontMap.get(split[iIdx]);
//			// //console.log('char', char);
//			// svg += this.svgTransform(char.svg, atx) + ' ';
//			// atx = Affine.append(atx, Affine.getTranslateATx({x:char.width, y: 0}));
//		// }
//		// svg = this.svgTransform(svg, Affine.getScaleATx({x: height/737, y: height/737}));
//		// return svg;
//	// }
//	return this;
	
//})();
