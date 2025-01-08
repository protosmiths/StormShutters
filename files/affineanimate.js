/*
* I want to demonstrate the use of affine transformations in the Storm Shutter App design.
* One good way is using aniamtions to show how the various parts of a shutter are assembled.
* We will create a sample system where there is one shutter sized so that it can be populated
* with pieces from one panel. We will animate the various transformations to show how they work.
* The most interesting transformation is the text positioning. We will show how the text is
* positioned on the coroplast panel and moved into position on the shutter.  We will also show
* how the text is edited relative to the shutter, but the actions are relative to the coroplast
* panel.
*/
const AffineAnimate = new (function ()
    {var demoCoroplast = {
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
        }
        ],
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
                "textTrans": [[1, 0, -35.457142857142856], [0, 1, -8.489285714285717]],
                "sIdx": 0,
                "layerIdx": 1,
                "ppIdx": 2
            }
        ]
    };
    var demoShutter = {
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
                }
                ],
                "uncovered": []
            }, {
                "panelPieces": [{
                    "panelIdx": 0,
                    "panelPieceIdx": 1,
                    "panelTrans": [[6.123233995736766e-17, -1, 21], [1, 6.123233995736766e-17, -12.500000000000004], [0, 0, 1], [0, 0, 1]],
                }
                ],
                "uncovered": []
            }
        ]
    };

    this.pnlCoro = null;
    this.pnlLayer0 = null;
    this.pnlLayer1 = null;
    this.pnlLayer2 = null;

    var scale = 1;

    this.DemoInit = function ()
    {
        let coroCnvs = document.createElement('canvas');
        AffineAnimate.pnlCoro = SSPanel.panelFactory('pnlCoroplast', coroCnvs);

        let layer0Cnvs = document.createElement('canvas');
        AffineAnimate.pnlLayer0 = SSPanel.panelFactory('pnlLayer0', layer0Cnvs);

        let layer1Cnvs = document.createElement('canvas');
        AffineAnimate.pnlLayer1 = SSPanel.panelFactory('pnlLayer1', layer1Cnvs);

        let layer2Cnvs = document.createElement('canvas');
        AffineAnimate.pnlLayer2 = SSPanel.panelFactory('pnlLayer2', layer2Cnvs);

        let panelScale = calcScale(AffineAnimate.pnlCoro.lwrCnvs, demoCoroplast);
        let shutterScale = calcScale(AffineAnimate.pnlLayer0.lwrCnvs, demoShutter);
        scale = Math.min(panelScale, shutterScale);

        let animateDiv = document.getElementById('animate');
        let animateCnvs = document.createElement('canvas');
        animateCnvs.id = 'animateCnvs';
        animateCnvs.width = animateDiv.clientWidth;
        animateCnvs.height = animateDiv.clientHeight;
        animateCnvs.style.width = animateDiv.clientWidth;
        animateCnvs.style.height = animateDiv.clientHeight;
        animateDiv.appendChild(animateCnvs);

        //We need to have locations for the center points of the coroplast panel and the shutter layer displays in
        //the animate canvas.  We will use the center points to position the displays.
        coroCenter = AffineAnimate.pnlCoro.lwrCnvs.getBoundingClientRect();
        coroCenter[0] = coroCenter[0] + coroCenter[2] / 2;
        coroCenter[1] = coroCenter[1] + coroCenter[3] / 2;

        layer0Center = AffineAnimate.pnlLayer0.lwrCnvs.getBoundingClientRect();
        layer0Center[0] = layer0Center[0] + layer0Center[2] / 2;
        layer0Center[1] = layer0Center[1] + layer0Center[3] / 2;

        layer1Center = AffineAnimate.pnlLayer1.lwrCnvs.getBoundingClientRect();
        layer1Center[0] = layer1Center[0] + layer1Center[2] / 2;
        layer1Center[1] = layer1Center[1] + layer1Center[3] / 2;

        layer2Center = AffineAnimate.pnlLayer2.lwrCnvs.getBoundingClientRect();
        layer2Center[0] = layer2Center[0] + layer2Center[2] / 2;
        layer2Center[1] = layer2Center[1] + layer2Center[3] / 2;

        //We may move this to separate function, but I believe it only needs to be done once.
        //Calculate the affine transformations for the coroplast panel and the shutter layer displays.
        //I believe the corCenters are for the animate canvas.
        //coroTrans is the transformation from the coroplast panel to the coroCnvs
        //AKA AffineAnimate.pnlCoro.lwrCnvs
        //layer0Trans is the transformation from the shutter layer 0 to the layer0Cnvs
        //AKA AffineAnimate.pnlLayer0.lwrCnvs
        //layer1Trans is the transformation from the shutter layer 1 to the layer1Cnvs
        //AKA AffineAnimate.pnlLayer1.lwrCnvs
        //layer2Trans is the transformation from the shutter layer 2 to the layer2Cnvs
        //AKA AffineAnimate.pnlLayer2.lwrCnvs
        //coroTransRev is the reverse transformation from the coroCnvs to the coroplast panel
        //layer0TransRev is the reverse transformation from the layer0Cnvs to the shutter layer 0
        //layer1TransRev is the reverse transformation from the layer1Cnvs to the shutter layer 1
        //layer2TransRev is the reverse transformation from the layer2Cnvs to the shutter layer 2

        coroTrans = [[scale, 0, coroCnvs.width / 2], [0, -scale, coroCnvs.height / 2]];
        layer0Trans = [[scale, 0, layer0Cnvs.width / 2], [0, -scale, layer0Cnvs.height / 2]];
        layer1Trans = [[scale, 0, layer1Cnvs.width / 2], [0, -scale, layer1Cnvs.height / 2]];
        layer2Trans = [[scale, 0, layer2Cnvs.width / 2], [0, -scale, layer2Cnvs.height / 2]];

        coroTransRev = Affine.getInverseATx(coroTrans);
        layer0TransRev = Affine.getInverseATx(layer0Trans);
        layer1TransRev = Affine.getInverseATx(layer1Trans);
        layer2TransRev = Affine.getInverseATx(layer2Trans);

        displayCoro();
    }
    var coroTrans = [[1, 0, 0], [0, 1, 0]];
    var layer0Trans = [[1, 0, 0], [0, 1, 0]];
    var layer1Trans = [[1, 0, 0], [0, 1, 0]];
    var layer2Trans = [[1, 0, 0], [0, 1, 0]];
    var coroTransRev = [[1, 0, 0], [0, 1, 0]];
    var layer0TransRev = [[1, 0, 0], [0, 1, 0]];
    var layer1TransRev = [[1, 0, 0], [0, 1, 0]];
    var layer2TransRev = [[1, 0, 0], [0, 1, 0]];
    var coroCenter = [0, 0];
    var layer0Center = [0, 0];
    var layer1Center = [0, 0];
    var layer2Center = [0, 0];

    var displayCoro = function ()
    {
        let coroCnvs = AffineAnimate.pnlCoro.lwrCnvs;
        let ctx = coroCnvs.getContext('2d');
        ctx.clearRect(0, 0, coroCnvs.width, coroCnvs.height);
        ctx.save();
        Affine.ctxTransform(ctx, coroTrans);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2/scale;
        let outline = new Path2D(demoCoroplast.outline);
        ctx.stroke(outline);
        for (let iIdx = 0; iIdx < demoCoroplast.used.length; iIdx++)
        {
            let path = new Path2D(demoCoroplast.used[iIdx].path);
            ctx.stroke(path);
            let textTrans = demoCoroplast.used[iIdx].textTrans;
            let text = demoCoroplast.used[iIdx].text;
            let textSvg = VectorText.svgText(text, 1);
            //console.log('textSvg', text, textSvg, textTrans);
            let textPath = utils.svgTransform(textSvg, textTrans);
            textPath = new Path2D(textPath);
            ctx.stroke(textPath);
        }
        ctx.restore();
    }
    /*
    * We need a collection of affine transformations for the displays. We will forward and reverse for the following
    * 1. Coroplast Panel to display canvas
    * 2. Layer 0 to display canvas
    * 3. Layer 1 to display canvas
    * 4. Layer 2 to display canvas
    *    (NOTE: The three layers are all the same size and position.
    *    If we keep the same size canvas, we can use the same affine transformation for all three layers.)
    * 
    * We also have transformations stored in the design objects for the coroplast panel and the shutter.
    * These are for the text elements and the panel pieces.  They can be used directly from the model.
    * We will add the reverse transformations to the model.
    * 
    * Animation has some other considerations.  We need to know the start and end points of the animation.
    * We are going to have a div with the id "overall" that has a canvas that is the size of the screen.
    * We are going to give it a z-index of 5 so that it is above the other panels. The animated objects will
    * be drawn on this canvas.  We will use the requestAnimationFrame to animate the objects. When an object
    * is animated, we need to remove it from the lower canvas and add it to the upper canvas.  We will need
    * to keep track of the objects that are animated so that we can remove them from the upper canvas when
    * the animation is complete. Our first animation technique will be to have a starting transformation
    * and an ending transformation.  We will interpolate the transformations to get the intermediate
    * transformations.  We will then draw the object at each intermediate transformation.  We will use
    * the requestAnimationFrame to animate the object.  We will need to keep track of the objects that are
    * being animated so that we can remove them from the upper canvas when the animation is complete.
    */
    var animateList = [];
    var animateIdx = 0;
    var animateMax = 0;
    var animateCnvs = null;
    var animateCtx = null;

    this.DemoAnimate = function ()
    {
        animateCnvs = document.getElementById('animateCnvs');
        animateCtx = animateCnvs.getContext('2d');
        animateMax = animateList.length;
        animateIdx = 0;
        animate();
    }

    var animate = function ()
    {
        //We will use the requestAnimationFrame to animate the objects.
        //When an object is animated, we need to remove it from the lower canvas and add it to the upper canvas.
        //We will need to keep track of the objects that are animated so that we can remove them from the upper canvas when the animation is complete.
        if (animateIdx < animateMax)
        {
            let obj = animateList[animateIdx];
            animateIdx++;
            animateCtx.clearRect(0, 0, animateCnvs.width, animateCnvs.height
            );
            animateCtx.save();
            animateCtx.transform(obj
            );
            animateCtx.fillStyle = 'black';
            animateCtx.fillRect(-5, -5, 10, 10);
            animateCtx.restore();
            requestAnimationFrame(animate);

        } else
        {
            animateCtx.clearRect(0, 0, animateCnvs.width, animateCnvs.height);
        }

    }

    //Find the scale factor that will fit the design into the panel
    //panel is a canvas object and design is a design object
    //HJave padding of 5 pixels
    var calcScale = function (panel, design)
    {
        let hscale = (panel.width - 10) / (design.maxX - design.minX);
        let vscale = (panel.height - 10) / (design.maxY - design.minY);
        return Math.min(hscale, vscale);
    }

    return this;
})();
