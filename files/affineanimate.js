/*
* Now we can discuss the overall design of the animation.  It turns out that all the animations involve the text elements.
* The text elements are the only things that move between the different displays.  We will take the approach that the text
* elements control the animation. That is the text element will call the other objects to animate along with it.
*
* There are three animation segments. The text moving (or tranforming) from the text coordinates to the panel coordinates.
* Then within the panel coordinates the text moves to its position on the panel piece it is associated with.  Finally the
* text moves along with its associated panel piece to their position on a shutter layer.
*
* To avoid confusion, we will remove the animated parts from the static displays. Since we are associated the text with
* the animation, it makes sense to also associate it with drawing the static displays.
*
* The above applies to animation and the text elements. For the static displays, we will do things a little differently.
* We have chosen to use the JSON structure for the Storm Shutter design.  Without creating new classes, we can expand
* the JSON structure to include the other components for the display. Let's go and do that now and see where it takes us.
*/

import { SSPanel } from './ss_panel.js';
import { VectorText } from './vector_text.js';
import { Affine } from './psBezier/affine.js';
import utils from './psBezier/utils.js';

//I know this is bad form, but I want to define constants that are used in the code.  I am going to define them here.
//If we assume 60 frames per second, then we can calculate the number of steps for the animation. I am thinking that 60 pixels per second is a good speed.
//That would be 1 pixel per frame.  We will need to calculate the number of steps for the animation.  We will use the distance between the start and end
//points to calculate the number of steps.  We will use the distance divided by the number of pixels per frame to get the total number of steps.  We will
//round up to the nearest integer. This will be adjusted as needed.  We will use the number of steps to calculate the step interval.  The step interval
//will be the a count of the number of steps divived by the total number of steps.  We will use the step interval to calculate the intermediate transform by
//interpolating between the start and end transforms.  We will use the intermediate transform to draw the object at the given step.
//After the first runs, 60 pixels per second is a little too slow.  I am going to increase the speed to 120 pixels per second.  That gives us 2 pixels per frame.
//Each animation segment will calculate the distance between the start and end points.  It will calculate the number of steps needed to move the object from the
//start to the end using the values below.  This will give all animations the same speed.
const animStepsPerSecond = 60;
const animSpeed = 240;
const animPixelsPerStep = animSpeed / animStepsPerSecond;

/*
* As discussed below, we are going to create a class that will encapsulate the text element and the transformations.
* The plan for animation is to have this class be responsible for determining the step intervals for the animation.
*
* I am going to try an approach of encapsulating the functionality of different objects that I plan to animate.
* For example, I am presently working on the text elements.  I will create a class that will encapsulate the
* text element and the transformations that are needed to animate the text element.  I will create a list of
* these objects and then animate them.  I will use the requestAnimationFrame to animate the objects.  There will
* be a master function that runs the animation. It will call the various objects to animate themselves.  We will
* have animation segments that will be called by the master function.  The segments will be called in sequence.
* Each segment will have a parameter that goes from 0 to 1.  The segment will interpolate the transformations
* from the start to the end.  The segment will then draw the object at the interpolated transformation.
*
* The first object that we will animate is the text elements.  We will create a class that will encapsulate the
* text element and the transformations that are needed to animate the text element.  We will create a list of
* these objects and then animate them.  We will need the following text element transformations:
* 1. Text element to coroplast display panel _ We are allocaing an area on the coroplast display panel for the text
* 2. Panel position - Each text element will have a position on the panel.  This transformation is part of the panel
* 3. Panel to shutter - Each text element will have a position on the shutter.  This transformation is part of the shutter
* 4. Animation transformation - The objects move on a canvas above the other displays.  This transformation is part of the
*   animation canvas. Mainly it establishes a relationship between the display panel and the animation canvas.
*   The point od the animation canvas is that it allows us to maove between the displays. So part of the animation is to
*   calculate the starting and ending transformations in the animation canvas coordinate system. We need a function that
*   will calculate the starting and ending transformations in the animation canvas coordinate system.  We will use the
*   starting and ending transformations to interpolate the intermediate transformations.  We will then draw the object
*   at the intermediate transformations.
*
*  Let's start with the text element class.  Let's back into what wee need to do.  I believe I undesrstand some of the
* transformations that we need to do.  Let's start with those.
*
* Text element to coroplast display panel - This is a simple translation.  We are going to allocate space down the left
* of the display panel for the text elements.  The text will in the real world coordinate system. We will need the scale
* factor to convert the real world coordinates to the display panel coordinates.  We will need to translate the text
* to each one allocated space.  First let us discuss the lay out. There will be a box around the text. Let's define
* these boxes in real world coordinates.  The text is 1" tall and 0,0 is the lower left corner.  The box is 1.5" tall
* and as wide as the longest text plus some small padding.  The lower left corner of the box is at -0.5, -0.25.  The
* spacing between boxes is 2". We establish the display coordinates for the first box. Each following box is a mutilple
* of 2" down from the first box.  The index of the text sets the position of the box.  The text has 0,0 at the lower
* left corner.  The box has -0.5, -0.25 at the lower left corner.  The text is 1" tall.  The box is 1.5" tall.  We
* will start with the boxes 10" wide and adjust as needed.  The text is 0.5" from the left edge of the box.  The text
*/
class TextElementClass
{
    constructor(idx, parent)
    {
        //Changing things up and using parent to get the other data we need
        // TextElement properties and methods
        this.idx = idx;
        this.text = parent.demoCoroplast.used[idx].text;
        this.layerIdx = parent.demoCoroplast.used[idx].layerIdx;
        this.panelScale = 1.5 * parent.scale;
        this.coroTrans = parent.coroTrans;
        this.segOps = [];
        this.textDisplayTrns = this.calculateTextDisplayTransform();
        this.textTrans = parent.demoCoroplast.used[idx].textTrans;
        this.panelTrans = Affine.append(parent.layerTrans[this.layerIdx], parent.demoCoroplast.used[idx].panelTrans);
        //console.log('textDisplayTrns', this.textDisplayTrns);
        //this.animDist = Math.sqrt(Math.pow(this.startAnimTrans[0][2] - this.endAnimTrans[0][2], 2) + Math.pow(this.startAnimTrans[1][2] - this.endAnimTrans[1][2], 2));
        //this.animSteps = Math.ceil(this.animDist / animPixelsPerStep); // 120 pixels per second or 2 pixels per frame.
        /*
        * The idea of using affine transforms needs to be modified. We were trying to extract the operations from the affine. Ther is an issue with 90 degree rotations.
        * We will modify our system to have the start and end operations and interpolate them and then create the affine from the operations.  We will use the operations
        */
        this.animStep = 0;
        this.segment = 0;
        this.segTrans = [];
        this.segTrans.push(
            {
                start: Affine.append(parent.coroAnimTrans, this.textDisplayTrns),
                end: Affine.append(parent.coroAnimTrans, this.coroTrans),
            });
        this.segTrans.push(
            {
                start: this.segTrans[0].end,
                end: Affine.append(parent.coroAnimTrans, Affine.append(this.coroTrans, this.textTrans)),
            });
        this.segTrans.push(
            {
                start: Affine.append(parent.coroAnimTrans, this.coroTrans),
                end: Affine.append(parent.layerAnimTrans[this.layerIdx], this.panelTrans),
            });
        for (let iIdx = 0; iIdx < this.segTrans.length; iIdx++)
        {
            let start = this.segTrans[iIdx].start;
            let end = this.segTrans[iIdx].end;
            let dx = end[0][2] - start[0][2];
            let dy = end[1][2] - start[1][2];
            let dist = Math.sqrt(dx * dx + dy * dy);
            let steps = Math.ceil(dist / animPixelsPerStep);
            this.segTrans[iIdx].animSteps = steps;
            //console.log('segTrans', iIdx, this.segTrans[iIdx]);
            let ops = Affine.extractOps(start);
            console.log('start ops', JSON.stringify(ops));
            console.log('start', iIdx, JSON.stringify(start));
            ops = Affine.extractOps(end);
            console.log('end ops', JSON.stringify(ops));
            console.log('end', iIdx, JSON.stringify(end));
        }
        let textSvg = VectorText.svgText(this.text, 1);
        this.segTrans[0].path = new Path2D(textSvg);
        this.segTrans[0].stripes = null; // No stripes for the text
        this.segTrans[1].path = this.segTrans[0].path;
        this.segTrans[1].stripes = null; // No stripes for the text
        textSvg = utils.svgTransform(textSvg, this.textTrans);
        textSvg += ' ' + parent.demoCoroplast.used[idx].path;
        this.segTrans[2].path = new Path2D(textSvg);
        this.segTrans[2].stripes = new Path2D( parent.demoCoroplast.used[idx].stripes); // Stripes for the panel
        this.animated = false;
    }

    calculateTextDisplayTransform()
    {
        // Translate to the reference point of the display panel
        let atx = Affine.getTranslateATx({ x: 10, y: 20 });
        // Scale to the display panel
        atx = Affine.append(atx, Affine.getScaleATx({ x: this.panelScale, y: -this.panelScale }));
        // Translate in real coordinates for each text box
        atx = Affine.append(atx, Affine.getTranslateATx({ x: 0, y: -this.idx * 2 }));
        return atx;
    }

    startAnimation()
    {
        this.animStep = 0;
        this.segment = 0;
        this.animSteps = this.segTrans[this.segment].animSteps;
        this.animated = true;
        //let atx = this.segTrans[this.segment].start;
        //console.log('atx arctans', atx, Math.atan2(atx[1][0], atx[0][0]), Math.atan2(atx[0][1], atx[1][1]));
        //let ops = Affine.extractOps(this.segTrans[this.segment].start);
        //console.log('start ops', JSON.stringify(ops));
        //atx = this.segTrans[this.segment].end;
        //console.log('atx arctans', atx, Math.atan2(atx[1][0], atx[0][0]), Math.atan2(atx[0][1], atx[1][1]));
        //ops = Affine.extractOps(this.segTrans[this.segment].end);
        //console.log('end ops', JSON.stringify(ops));
    }

    interpolate(start, end, step)
    {
        let intepAngle = start.angle + (end.angle - start.angle) * step;
        let intepScaleX = start.scale.x + (end.scale.x - start.scale.x) * step;
        let intepScaleY = start.scale.y + (end.scale.y - start.scale.y) * step;
        let intepTranslateX = start.translate.x + (end.translate.x - start.translate.x) * step;
        let intepTranslateY = start.translate.y + (end.translate.y - start.translate.y) * step;
        //Go for the gusto and do the full affine transformation
        let atx = Affine.getTranslateATx({ x: intepTranslateX, y: intepTranslateY });
        atx = Affine.append(atx, Affine.getScaleATx({ x: intepScaleX, y: intepScaleY }));
        atx = Affine.append(atx, Affine.getRotateATx(intepAngle));
        return atx;
    }

    displayAnim(ctx)
    {
        let step = this.animStep / this.animSteps;
        //console.log('step', step);
        //let start = this.segTrans[this.segment].start;
        //let end = this.segTrans[this.segment].end;
        //let atx = Affine.interpolate(start, end, step);
        let atx = this.interpolate(this.segOps[this.segment].start, this.segOps[this.segment].end, step);
        if (this.animStep % 30 == 0)
        {
            let ops = Affine.extractOps(atx);
            //console.log('ops', step, JSON.stringify(ops));
        }
        //console.log('atx', atx);
        ctx.save();
        Affine.ctxTransform(ctx, atx);
        ctx.lineWidth = 2 / this.panelScale;
        // Draw the text
        //let textSvg = VectorText.svgText(this.text, 1);
        //let textPath = new Path2D(textSvg);
        ctx.strokeStyle = 'black';
        ctx.stroke(this.segTrans[this.segment].path);
        if (this.segTrans[this.segment].stripes)
        {
            ctx.strokeStyle = 'lightgray';
            ctx.stroke(this.segTrans[this.segment].stripes);
        }
        ctx.restore();
        if (this.animStep < this.animSteps)
        {
            this.animStep++;
            return true;
        }
        this.segment++;
        if (this.segment < this.segTrans.length)
        {
            this.animStep = 0;
            this.animSteps = this.segTrans[this.segment].animSteps;
            //let atx = this.segTrans[this.segment].start;
            //console.log('atx arctans', atx, Math.atan2(atx[1][0], atx[0][0]), Math.atan2(atx[0][1], atx[1][1]));
            //let ops = Affine.extractOps(this.segTrans[this.segment].start);
            //console.log('start ops', JSON.stringify(ops));
            //atx = this.segTrans[this.segment].end;
            //console.log('atx arctans', atx, Math.atan2(atx[1][0], atx[0][0]), Math.atan2(atx[0][1], atx[1][1]));
            //ops = Affine.extractOps(this.segTrans[this.segment].end);
            //console.log('end ops', JSON.stringify(ops));
           return true;
        }
        return false;
    }

    displayCoro(ctx)
    {
        ctx.save();
        Affine.ctxTransform(ctx, this.textDisplayTrns);
        ctx.lineWidth = 2 / this.panelScale;
        // Draw a box around the text
        let box = new Path2D("M -0.5 -0.25 L 20.5 -0.25 L 20.5 1.25 L -0.5 1.25 L -0.5 -0.25 Z");
        ctx.stroke(box);
        // When we animate the text, we will draw the text in the animation canvas.  We will use the textDisplayTrns to draw the text in the animation canvas.
        if (!this.animated)
        {
            // Draw the text
            let textSvg = VectorText.svgText(this.text, 1);
            let textPath = new Path2D(textSvg);
            ctx.stroke(textPath);
        }
        ctx.restore();
    }
}

class AffineAnimateClass
{
    constructor()
    {
        this.text = [];
        this.demoCoroplast = {
            "parentDesign": "",
            "minX": -24,
            "minY": -48,
            "maxX": 24,
            "maxY": 48,
            "outline": "M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z",
            "unused": [{
                "parentPanel": "",
                "path": "M -18 -5.875 L -1 -5.875 L -1 48 L 1 48 L 1 -6 L 18 -6 L 18 -25 L -24 -25 L -24 -9.875 L -18 -9.875 L -18 -5.875 Z",
                "stripes": "",
                "textTrans": [[1, 0, 0], [0, 1, 0]]
            }],
            "path": "M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z",
            "used": [
                {
                    "parentPanel": "",
                    "path": "M -24 -5.875 L -24 48 L -1 48 L -1 -5.875 L -24 -5.875 Z",
                    "stripes": "",
                    "text": "Animate Front 0 P0",
                    "textTrans": [[0, 1, -21.12857142857143], [-1, 0, 44.028571428571425]],
                    "sIdx": 0,
                    "layerIdx": 0,
                    "ppIdx": 0
                }, {
                    "parentPanel": "",
                    "path": "M 1 48 L 24 48 L 24 -6 L 1 -6 L 1 48 Z",
                    "stripes": "",
                    "text": "Animate Back 0 P0",
                    "textTrans": [[0, 1, 3.128571428571428], [-1, 0, 43.628571428571426]],
                    "sIdx": 0,
                    "layerIdx": 2,
                    "ppIdx": 0
                }, {
                    "parentPanel": "",
                    "path": "M 24 -25 L 24 -48 L -24 -48 L -24 -25 L 24 -25 Z",
                    "stripes": "",
                    "text": "Animate Inner 0 P0",
                    "textTrans": [[-1, 0, 20.485714285714284], [0, -1, -27.41428571428571]],
                    "sIdx": 0,
                    "layerIdx": 1,
                    "ppIdx": 0
                }, {
                    "parentPanel": "",
                    "path": "M 18 -6 L 24 -6 L 24 -25 L 18 -25 L 18 -6 Z",
                    "stripes": "",
                    "text": "Animate Inner 0 P1",
                    "textTrans": [[0, 1, 20.37142857142857], [-1, 0, -7.500000000000001]],
                    "sIdx": 0,
                    "layerIdx": 1,
                    "ppIdx": 1
                }, {
                    "parentPanel": "",
                    "path": "M -24 -9.875 L -24 -5.875 L -18 -5.875 L -18 -9.875 L -24 -9.875 Z",
                    "stripes": "",
                    "text": "Animate Inner 0 P2",
                    "textTrans": [[0.2, 0, -22.457142857142856], [0, 0.2, -8.489285714285717]],
                    "sIdx": 0,
                    "layerIdx": 1,
                    "ppIdx": 2
                }
            ]
        };
        this.demoShutter = {
            "parentDesign": "",
            "description": "Animate",
            "outline": "M -27 -11.5 L -27 11.5 L 27 11.5 L 27 -11.5 L -27 -11.5 Z",
            "minX": -27,
            "minY": -12,
            "maxX": 27,
            "maxY": 12,
            "layers": [
                {
                    "panelPieces": [
                        {
                            "panelIdx": 0,
                            "panelPieceIdx": 0,
                            "panelTrans": [[6.123233995736766e-17, -1, 21.114285714285714], [1, 6.123233995736766e-17, 12.499999999999998], [0, 0, 1]],
                        }],
                    "uncovered": ["M -26.8812 -11.5 L -27 -11.5 L -27 11.5 L -26.88174 11.5 L -26.885703759050656 -11.502507707989576"]
                }, {
                    "panelPieces": [{
                        "panelIdx": 0,
                        "panelPieceIdx": 2,
                        "panelTrans": [[-1, -1.2246467991473532e-16, -3.000000000000007], [1.2246467991473532e-16, -1, -36.5], [0, 0, 1], [0, 0, 1]],
                    }, {
                        "panelIdx": 0,
                        "panelPieceIdx": 3,
                        "panelTrans": [[-1, -1.2246467991473532e-16, 45], [1.2246467991473532e-16, -1, -13.500000000000005], [0, 0, 1]],
                    }, {
                        "panelIdx": 0,
                        "panelPieceIdx": 4,
                        "panelTrans": [[1, 2.4492935982947064e-16, 45], [-2.4492935982947064e-16, 1, -1.625000000000007], [0, 0, 1]],
                    }],
                    "uncovered": []
                }, {
                    "panelPieces": [{
                        "panelIdx": 0,
                        "panelPieceIdx": 1,
                        "panelTrans": [[6.123233995736766e-17, -1, 21], [1, 6.123233995736766e-17, -12.500000000000004], [0, 0, 1], [0, 0, 1]],
                    }],
                    "uncovered": []
                }
            ]
        };

        this.scale = 1;
        this.coroTrans = [[1, 0, 0], [0, 1, 0]];
        this.coroAnimTrans = [[1, 0, 0], [0, 1, 0]];
        this.layer0Trans = [[1, 0, 0], [0, 1, 0]];
        this.layer1Trans = [[1, 0, 0], [0, 1, 0]];
        this.layer2Trans = [[1, 0, 0], [0, 1, 0]];
        this.coroTransRev = [[1, 0, 0], [0, 1, 0]];
        this.layer0TransRev = [[1, 0, 0], [0, 1, 0]];
        this.layer1TransRev = [[1, 0, 0], [0, 1, 0]];
        this.layer2TransRev = [[1, 0, 0], [0, 1, 0]];
        this.coroBB = [0, 0];
        this.layer0BB = [0, 0];
        this.layer1BB = [0, 0];
        this.layer2BB = [0, 0];
        this.animateList = [];
        this.animateIdx = 0;
        this.animateMax = 0;
        this.animateCnvs = null;
        this.animateCtx = null;
        this.animateRegistry = [];
    }

    DemoInit()
    {
        //Add stripes to panel pieces
        for (let iIdx = 0; iIdx < this.demoCoroplast.used.length; iIdx++)
        {
            let panelPiece = this.demoCoroplast.used[iIdx];
            panelPiece.stripes = this.makeStripes(panelPiece.path);
        }
        let coroCnvs = document.createElement('canvas');
        this.pnlCoro = SSPanel.panelFactory('pnlCoroplast', coroCnvs);
        coroCnvs.id = 'coroCnvs';
        this.pnlCoro.hdrLeft.innerHTML = 'Text and Coroplast Panel';
        //let coroCnvs = document.createElement('canvas');
        //this.pnlCoro = SSPanel.panelFactory('pnlCoroplast', coroCnvs
        //        coroCnvs.id = 'coroCnvs';

        let layer0Cnvs = document.createElement('canvas');
        this.pnlLayer0 = SSPanel.panelFactory('pnlLayer0', layer0Cnvs);
        this.pnlLayer0.hdrLeft.innerHTML = 'Shutter Front Layer';

        let layer1Cnvs = document.createElement('canvas');
        this.pnlLayer1 = SSPanel.panelFactory('pnlLayer1', layer1Cnvs);
        this.pnlLayer1.hdrLeft.innerHTML = 'Shutter Inner Layer';

        let layer2Cnvs = document.createElement('canvas');
        this.pnlLayer2 = SSPanel.panelFactory('pnlLayer2', layer2Cnvs);
        this.pnlLayer2.hdrLeft.innerHTML = 'Shutter Back Layer';

        let panelScale = this.calcScale(this.pnlCoro.lwrCnvs, this.demoCoroplast);
        let shutterScale = this.calcScale(this.pnlLayer0.lwrCnvs, this.demoShutter);
        this.scale = Math.min(panelScale, shutterScale);

        // The intent here is for the animation canvas to be above the other canvases. The animation canvas is used to move
        // the objects between the canvases. The animation canvas is the same scaling as the other canvases. It is to fill the
        // entire display area. The getBoundingClientRect method returns the size and position of the element relative to the
        // viewport. Since the animation frame fills the viewport, the getBoundingClientRect method for the other canvases will
        // give us the translation to the animation canvas. The translations are the left and top of the canvas.
        let animateDiv = document.getElementById('animate');
        let animateCnvs = document.createElement('canvas');
        animateDiv.style.height = '100%';
        animateDiv.style.width = '100%';
        animateDiv.appendChild(animateCnvs);
        animateCnvs.id = 'animateCnvs';
        animateCnvs.style.position = 'absolute';
        animateCnvs.style.left = '10px';
        animateCnvs.style.top = '50px';
        animateCnvs.style.height = '650px';
        animateCnvs.style.width = '1750px';
        animateCnvs.width = parseInt(animateCnvs.style.width, 10);
        animateCnvs.height = parseInt(animateCnvs.style.height, 10);
        animateCnvs.style.display = 'block';
        animateDiv.style.zIndex = '100';
        animateCnvs.style.zIndex = '101';

        // Looking up the documentation for getBoundingClientRect, it returns the coordinates of the element relative to the viewport.
        // However it doesn't mention the array that is returned. I am assuming that the array is [left, top, width, height].
        // And each of those an array element. i.e. coroBB[0] is the left edge of the coroCnvs. coroBB[1] is the top edge.
        // What is the advantage of using array elements instead of named elements? I think it is that the array elements are
        // more easily used in calculations. The named elements are more easily understood. These comments make it OK to use the
        // array elements. I can guarantee that my future self was going to be confused by this. (Actually my present self is the
        // future self from when this code was written.) I had thought that the animation canvas would be the same size as the
        // viewport. Turns out it is not. The solution is to use the getBoundingClientRect method for the animation canvas. The
        //translations we need are the difference between the animation canvas and the other canvases.
        this.coroBB = this.pnlCoro.lwrCnvs.getBoundingClientRect();

        this.layer0BB = this.pnlLayer0.lwrCnvs.getBoundingClientRect();

        this.layer1BB = this.pnlLayer1.lwrCnvs.getBoundingClientRect();

        this.layer2BB = this.pnlLayer2.lwrCnvs.getBoundingClientRect();

        this.coroTrans = [[this.scale, 0, 80 + coroCnvs.width / 2], [0, -this.scale, coroCnvs.height / 2]];
        this.layer0Trans = [[this.scale, 0, layer0Cnvs.width / 2], [0, -this.scale, layer0Cnvs.height / 2]];
        this.layer1Trans = [[this.scale, 0, layer1Cnvs.width / 2], [0, -this.scale, layer1Cnvs.height / 2]];
        this.layer2Trans = [[this.scale, 0, layer2Cnvs.width / 2], [0, -this.scale, layer2Cnvs.height / 2]];

        // We need the getBoundingClientRect for the animation canvas. I believe the translation we need is the difference between
        // the animation canvas and the other canvases
        this.animBB = animateCnvs.getBoundingClientRect();

        // We need to create a transform for the animation canvas. The animation canvas is a canvas that is above the other
        // canvases. It is used to move the objects between the canvases. The animation canvas is the same scaling as the
        // other canvases. What we need is a translation that takes the coordinates of the display panel and moves them
        // to the animation canvas. This transform will be appended to the other transforms to make the final transform.
        this.coroAnimTrans = Affine.getTranslateATx({ x: this.coroBB.left - this.animBB.left, y: this.coroBB.top - this.animBB.top });
        this.layer0AnimTrans = Affine.getTranslateATx({ x: this.layer0BB.left - this.animBB.left, y: this.layer0BB.top - this.animBB.top });
        this.layer1AnimTrans = Affine.getTranslateATx({ x: this.layer1BB.left - this.animBB.left, y: this.layer1BB.top - this.animBB.top });
        this.layer2AnimTrans = Affine.getTranslateATx({ x: this.layer2BB.left - this.animBB.left, y: this.layer2BB.top - this.animBB.top });
        console.log('coroAnimTrans', this.coroAnimTrans);

        this.coroTransRev = Affine.getInverseATx(this.coroTrans);
        this.layer0TransRev = Affine.getInverseATx(this.layer0Trans);
        this.layer1TransRev = Affine.getInverseATx(this.layer1Trans);
        this.layer2TransRev = Affine.getInverseATx(this.layer2Trans);
        //For ease of use. It would be good to access the layer transforms by index.  We will create an array of the layer transforms.
        this.layerTrans = [this.layer0Trans, this.layer1Trans, this.layer2Trans];
        this.layerTransRev = [this.layer0TransRev, this.layer1TransRev, this.layer2TransRev];
        // We will create an array of the layer canvases.  This will allow us to access the layer canvases by index.
        this.layerCnvs = [this.pnlLayer0.lwrCnvs, this.pnlLayer1.lwrCnvs, this.pnlLayer2.lwrCnvs];
        // We will create an array of the layer animation transforms.  This will allow us to access the layer animation transforms by index.
        this.layerAnimTrans = [this.layer0AnimTrans, this.layer1AnimTrans, this.layer2AnimTrans];
        // We will create an array of the layer BBs.  This will allow us to access the layer BBs by index.
        this.layerBB = [this.layer0BB, this.layer1BB, this.layer2BB];
        //Let's get the layer display contexts in an array.  This will allow us to access the layer display contexts by index.
        this.pnlLayer0.lwrCtx = this.pnlLayer0.lwrCnvs.getContext('2d');
        this.pnlLayer1.lwrCtx = this.pnlLayer1.lwrCnvs.getContext('2d');
        this.pnlLayer2.lwrCtx = this.pnlLayer2.lwrCnvs.getContext('2d');
        this.layerCtx = [this.pnlLayer0.lwrCtx, this.pnlLayer1.lwrCtx, this.pnlLayer2.lwrCtx];

        //Let's precalculate things for shutters and their layers
        let shutter = this.demoShutter;
        shutter.parentDesign = this.demoCoroplast;
        let layers = shutter.layers;
        for (let iIdx = 0; iIdx < layers.length; iIdx++)
        {
            let layer = layers[iIdx];
            let panelPieces = layer.panelPieces;
            for (let jIdx = 0; jIdx < panelPieces.length; jIdx++)
            {
                //We have a lot of redirecting happening. The layer panel pieces are the panel pieces for the layer. What is stored at the layer
                //are indexes into the panel pieces. The panel pieces are stored in the parent design. The parent design has the panels that the
                //panel pieces are associated with.
                let layerPanelPiece = panelPieces[jIdx];
                //Note at this time, layerPanelPiece.panelIdx is not used. It is the index into the parent design panels. We only have one panel
                let panelPiece = shutter.parentDesign.used[layerPanelPiece.panelPieceIdx];
                let textTrans = panelPiece.textTrans;
                let text = panelPiece.text;
                let textSvg = VectorText.svgText(text, 1);
                panelPiece.textPath = utils.svgTransform(textSvg, textTrans);
                panelPiece.panelTrans = layerPanelPiece.panelTrans;
                layerPanelPiece.path = utils.svgTransform(panelPiece.path, panelPiece.panelTrans);
                layerPanelPiece.textPath = utils.svgTransform(panelPiece.textPath, panelPiece.panelTrans);
                layerPanelPiece.stripes = utils.svgTransform(panelPiece.stripes, panelPiece.panelTrans);
                //panelPiece.panelTransRev = Affine.getInverseATx(panelPiece.panelTrans);
            }
        }

        for (let iIdx = 0; iIdx < this.demoCoroplast.used.length; iIdx++)
            //let text = this.demoCoroplast.used[iIdx].text;
        {
            this.text.push(new TextElementClass(iIdx, this));
        }
        //We will create an array of starting and ending operations for the animation.  We will interpolate between the starting and ending operations.
        let textOps = this.animationSegs();
        for (let iIdx = 0; iIdx < this.text.length; iIdx++)
        {
            let text = this.text[iIdx];
            text.segOps = textOps[iIdx];
        //    let segTrans = text.segTrans;
        //    //Let's make a double indexed array of the segment transformations.  This will allow us to access the segment transformations by index.
        //    let segOps = [];
        //    for (let jIdx = 0; jIdx < segTrans.length; jIdx++)
        //    {
        //        let start = segTrans[jIdx].start;
        //        let end = segTrans[jIdx].end;
        //        let dx = end[0][2] - start[0][2];
        //        let dy = end[1][2] - start[1][2];
        //        let dist = Math.sqrt(dx * dx + dy * dy);
        //        let steps = Math.ceil(dist / animPixelsPerStep);
        //        segTrans[jIdx].animSteps = steps;
        //        let startops = Affine.extractOps(start);
        //        //textOps.push(ops);
        //        let endops = Affine.extractOps(end);
        //        segOps.push({ start: startops, end: endops });
        //        //textOps.push(ops);
        //    }
        //    textOps.push(segOps);
        }
        //console.log('textOps', JSON.stringify(textOps));
        // Testing animation
        this.animateIdx = 0;
        this.text[this.animateIdx].startAnimation();
        this.animateRegistry = [];
        this.animateRegistry.push(this.text[this.animateIdx].displayAnim.bind(this.text[this.animateIdx]));
        this.displayCoro();
        this.displayLayers();
        this.displayAnimation();
    }

    makeStripes(path)
    {
        let polys = utils.svg2Polys(path);
        let stripes = '';
        for (let iIdx = 0; iIdx < polys.length; iIdx++)
        {
            let poly = polys[iIdx];
            let bbox = poly.bbox();
            bbox.x.min = Math.round(bbox.x.min);
            bbox.x.max = Math.round(bbox.x.max);
            //console.log('bbox', bbox);
            // We need the stripes to be consistently on 2" units within the coordinate system.  We will
            // round the min and max to the nearest 2" unit. In fact, things are a little more complicated
            // We want the first stripe to be at the first 2" line that is greater than the min.  For example,
            // if the min is -48.5 we want the first stripe to be at -48.  If the min is -48 we want
            // the first stripe to be at -46.  We want the last stripe to be at the last 2" line that is less than
            // the max.  For example, if the max is 48.5 we want the last stripe to be at 48.  If the max is 48
            // we want the last stripe to be at 46.
            bbox.x.min = Math.ceil(bbox.x.min / 2) * 2;
            bbox.x.max = Math.floor(bbox.x.max / 2) * 2;

            for (let iVert = bbox.x.min + 2; iVert < bbox.x.max; iVert += 2)
            {
                //We need to call makeStripe to do the intersection of the poly with the vertical line
                stripes += this.makeStripe(poly, iVert);
            }
        }
        return stripes;
    }


    /*
    * This makes a single vertical stripe.  This function is called every 2 inches for a given poly
    * A stripe is a vertical line that starts above an 8 foot panel (48 inches) and ends below the panel.
    * The poly by definition comes from the panel and will be within the panel dimension. One finds the
    * intersection points of the poly with the vertical line.  The intersection points are sorted. Since
    * the stripe starts outside the poly, at the first intersection point we are entering the poly.  We
    * start a section of the stripe.  At the second intersection point we are leaving the poly and end the
    * section.  The stripe is a series of sections.  The sections are drawn as a series of lines.  They go
    * between every other intersection point.
    */

    makeStripe(poly, xDim)
    {
        let stripe = '';
        let intersections = [];
        let line = { p1: { x: xDim, y: -50 }, p2: { x: xDim, y: 50 } };
        for (let iIdx = 0; iIdx < poly.curves.length; iIdx++)
        {
            //console.log(poly.curves[iIdx].lineIntersects(line));
            let intersects = poly.curves[iIdx].lineIntersects(line);
            //console.log('intersects', intersects);
            for (let iJdx = 0; iJdx < intersects.length; iJdx++)
            {
                let p = poly.curves[iIdx].get(intersects[iJdx]);
                intersections.push(p.y);
            }
        }
        intersections.sort((a, b) => { return a - b; });
        //console.log('intersections', intersections);
        for (let iIdx = 0; iIdx < intersections.length; iIdx++)
        {
            if (iIdx % 2 == 0)
            {
                stripe += 'M ';
            } else
            {
                stripe += 'L ';
            }
            // stripe += xDim.toString() + ' ' + intersections[iIdx].toString() + ' ';
            stripe += xDim.toFixed(2) + ' ' + intersections[iIdx].toFixed(2) + ' ';
        }
        //if(intersections.length != 0)console.log(intersections);
        return stripe;
    }

    displayAnimation()
    {
        let animateCnvs = document.getElementById('animateCnvs');
        let ctx = animateCnvs.getContext('2d');
        ctx.clearRect(0, 0, animateCnvs.width, animateCnvs.height);
        ctx.save();
        let notDone = false;
        if (this.animateRegistry.length > 0)
        {
            for (let iIdx = 0; iIdx < this.animateRegistry.length; iIdx++)
            {
                notDone ||= this.animateRegistry[iIdx](ctx);
            }
        }
        ctx.restore();
        if (notDone)
        {
            requestAnimationFrame(this.displayAnimation.bind(this));
        } else
        {
            this.animateIdx++;
            this.animateRegistry = [];
            if (this.animateIdx < this.text.length)
            {
                this.text[this.animateIdx].startAnimation();
                this.animateRegistry.push(this.text[this.animateIdx].displayAnim.bind(this.text[this.animateIdx]));
                requestAnimationFrame(this.displayAnimation.bind(this));
            } else
            {
                console.log('done');
            }
        }
    }

    displayCoro()
    {
        let coroCnvs = this.pnlCoro.lwrCnvs;
        let ctx = coroCnvs.getContext('2d');
        ctx.clearRect(0, 0, coroCnvs.width, coroCnvs.height);
        ctx.save();
        Affine.ctxTransform(ctx, this.coroTrans);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2 / this.scale;
        let outline = new Path2D(this.demoCoroplast.outline);
        ctx.stroke(outline);
        for (let iIdx = 0; iIdx < this.demoCoroplast.used.length; iIdx++)
        {
            let path = new Path2D(this.demoCoroplast.used[iIdx].path);
            ctx.strokeStyle = 'black';
            ctx.stroke(path);
            let textTrans = this.demoCoroplast.used[iIdx].textTrans;
            let text = this.demoCoroplast.used[iIdx].text;
            let textSvg = VectorText.svgText(text, 1);
            let textPath = utils.svgTransform(textSvg, textTrans);
            textPath = new Path2D(textPath);
            ctx.stroke(textPath);
            path = new Path2D(this.demoCoroplast.used[iIdx].stripes);
            ctx.strokeStyle = 'lightgray';
            ctx.stroke(path);
        }
        ctx.restore();
        for (let iIdx = 0; iIdx < this.demoCoroplast.used.length; iIdx++)
        {
            ctx.save();
            Affine.ctxTransform(ctx, this.text[iIdx].textDisplayTrns);
            ctx.lineWidth = 2 / this.scale
            // Draw a box around the text
            let box = new Path2D("M -0.5 -0.25 L 20.5 -0.25 L 20.5 1.25 L -0.5 1.25 L -0.5 -0.25 Z");
            ctx.stroke(box);
            let textSvg = VectorText.svgText(this.demoCoroplast.used[iIdx].text, 1);
            let textPath = new Path2D(textSvg);
            ctx.stroke(textPath);
            ctx.restore();
            //this.text[iIdx].displayCoro(ctx);
        }
    }

    displayLayers()
    {
        for (let iIdx = 0; iIdx < this.demoShutter.layers.length; iIdx++)
        {
            let layer = this.demoShutter.layers[iIdx];
            let ctx = this.layerCtx[iIdx];
            //Clear the canvas
            ctx.clearRect(0, 0, this.layerCnvs[iIdx].width, this.layerCnvs[iIdx].height);
            ctx.save();
            Affine.ctxTransform(ctx, this.layerTrans[iIdx]);
            ctx.lineWidth = 2 / this.scale;
            let panelPieces = layer.panelPieces;
            for (let jIdx = 0; jIdx < panelPieces.length; jIdx++)
            {
                let panelPiece = panelPieces[jIdx];
                let path = new Path2D(panelPiece.path);
                ctx.strokeStyle = 'black';
                ctx.stroke(path);
                let textPath = new Path2D(panelPiece.textPath);
                ctx.stroke(textPath);
                path = new Path2D(panelPiece.stripes);
                ctx.strokeStyle = 'lightgray';
                ctx.stroke(path);
            }
            ctx.restore();
        }
    }

    //DemoAnimate()
    //{
    //    this.animateCnvs = document.getElementById('animateCnvs');
    //    this.animateCtx = this.animateCnvs.getContext('2d');
    //    this.animateCtx.clearRect(0, 0, this.animateCnvs.width, this.animateCnvs.height);
    //    this.animateCtx.save();
    //    this.animateCtx.strokeStyle = 'black';
    //    this.animateCtx.strokeRect(100, 100, this.animateCnvs.width, this.animateCnvs.height);
    //    this.animateCtx.restore();
    //    this.animateMax = this.animateList.length;
    //    this.animateIdx = 0;
    //    this.animate();
    //}

    //animate()
    //{
    //    if (this.animateIdx < this.animateMax)
    //    {
    //        let obj = this.animateList[this.animateIdx];
    //        this.animateIdx++;
    //        this.animateCtx.clearRect(0, 0, this.animateCnvs.width, this.animateCnvs.height);
    //        this.animateCtx.save();
    //        this.animateCtx.fillStyle = 'black';
    //        this.animateCtx.fillRect(-5, -5, 10, 10);
    //        this.animateCtx.strokeStyle = 'black';
    //        this.animateCtx.strokeRect(100, 100, this.animateCnvs.width, this.animateCnvs.height);
    //        this.animateCtx.restore();
    //        requestAnimationFrame(this.animate.bind(this));
    //    } else
    //    {
    //        this.animateCtx.clearRect(0, 0, this.animateCnvs.width, this.animateCnvs.height);
    //    }
    //}

    calcScale(panel, design)
    {
        let hscale = (panel.width - 10) / (design.maxX - design.minX);
        let vscale = (panel.height - 10) / (design.maxY - design.minY);
        return Math.min(hscale, vscale);
    }

    //Animation segments
    animationSegs()
    {
        let segs =
        [
            [
                {
                    "start": { "angle": 0, "scale": { "x": 8.53125, "y": -8.53125 }, "translate": { "x": 12, "y": 22 } },
                    "end": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } }
                }, {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": -1.5707963267948966, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 209.83125, "y": 29.587500000000034 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 1.5707963267948966, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 940.0875, "y": 53.906250000000014 } }
                }
            ],
            [
                {
                    "start": { "angle": 0, "scale": { "x": 8.53125, "y": -8.53125 }, "translate": { "x": 12, "y": 39.0625 } },
                    "end": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": -1.5707963267948966, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 347.79375, "y": 31.86250000000001 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 1.5707963267948966, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 1569.4375, "y": 196.09375 } }
                }
            ],
            [
                {
                    "start": { "angle": 0, "scale": { "x": 8.53125, "y": -8.53125 }, "translate": { "x": 12, "y": 56.125 } },
                    "end": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 3.141592653589793, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 446.5125, "y": 435.91875 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": -3.141592653589793, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 802.9375, "y": 632.59375 } }
                }
            ],
            [
                {
                    "start": { "angle": 0, "scale": { "x": 8.53125, "y": -8.53125 }, "translate": { "x": 12, "y": 73.1875 } },
                    "end": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": -1.5707963267948966, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 445.8625, "y": 322.65625 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 3.141592653589793, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 1075.9375, "y": 501.78125 } }
                }
            ],
            [
                {
                    "start": { "angle": 0, "scale": { "x": 8.53125, "y": -8.53125 }, "translate": { "x": 12, "y": 90.25 } },
                    "end": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 0, "scale": { "x": 1.6875, "y": -1.6875 }, "translate": { "x": 178.3375, "y": 328.28281250000003 } }
                },
                {
                    "start": { "angle": 0, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 330, "y": 280 } },
                    "end": { "angle": 2.4492935982947064e-16, "scale": { "x": 5.6875, "y": -5.6875 }, "translate": { "x": 1075.9375, "y": 434.2421875 } }
                }
            ]
        ];
        return segs;
    }

}

document.addEventListener('DOMContentLoaded', () =>
{
    const AffineAnimate = new AffineAnimateClass();
    console.log('AffineAnimate', AffineAnimate);
    AffineAnimate.DemoInit();
    //AffineAnimate.DemoAnimate();
});

export { AffineAnimateClass };
export default AffineAnimateClass;
