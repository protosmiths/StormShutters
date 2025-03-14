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
github notes README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md
* This program aids in laying out coroplast panels for storm panels.  Each panel is three layers with the inside layer
* at 90 degrees to the outside layers.  The direction of the outside layer is chosen to allow the layer to be contiguous.
* The inside layer can be non-contiguous multiple pieces.
*
* This program allows for taking virtual panels and determining how to cut them up.  The procedure is to create the outside
* layers for all panels.  As each panel is created, one can chose a new panel from stock or from the left over pieces from
* previously used panels. Stock is can be various sizes. One can create a new stock size as needed.  The standard size is
* 4' x 8'.  As a panel is pulled from stock it is assigned a number to identify it.  Each stock panel is defined with the 
* origin of a Cartesian coordinate system at the center of the panel.  Each storm shutter also has the origin of its own
* Cartesian coordinate system at the center of the shutter.
*
* The data format is a system wide description and an array of panels.  Each panel has a panel description and an array of
* three layers.  On each layer is an array of panel pieces.  Each piece has the panel number and the path for the piece in
* the panel coor5dinate system and the affine transform to move the piece into position in the storm panel coordinate system.
*
* One can reconstruct the panels using the inverse of the affine transform.
* 
* In general, each piece has two possible rotations depending on the layer.  The 180 degree rotation of these two can also
* be invoked as needed.  An example would be a storm panel with an arc on top.  If the panel took less than 1/2 a stock
* panel.  One could use one edge of the stock panel and rotate 180 degrees and use the opposite edge for the third layer.
8
* The affine transform is displayed and will snap to shutter coordinates.
*
* UI
* We have three working windows.
*
* The main window is the storm panel window.  At the top of that window is a box with the title/description of the panel. 
* To the right of the title are three icons, next, prev and new.  Along the left edge and the bottom edge are tick marks
* and labels to show scale.
*
* The next window is the to be placed (available) panels.  The panels are displayed in a square section and are rotated to
* the orientation of the active layer.  Each panel has a light grey outline with the available pieces in black?. The used
* pieces are in light red.  The squares are sized for the largest source panel.  The default is to use 4' x 8' panels.
* A select button can toggle to make 4' x 10' available. The squares are 9' x 9' or 11' x 11'.  The available window is
* square and starts out 2 x 2.  As panels are added it switches to 3 x 3, 4 x 4, 5 x 5, etc.  Tick marks on the edge of the
* window show scale.
*
* The last window is a text window. It will display stats as needed.  In particular it will show the affine transforms of
* various entities.  It will have radio buttons to chose what to display as well as the panel size select button discussed
* above. The main reason for the text window is to allow values to be changed manually.
*
* Panel placement has four modes.  The first mode is a drawing mode to create the outline of a new panel.  The other three
* modes are the placement of each layer.  In general layer 1 and layer 3 are placed first with layer 2 last.
*
* The drawing mode will be relatively simple.  Initially we will support rectangles.
*
* The placement modes are a little more complicated.  In these modes, the storm panel outline moves in the available panel
* window. The storm panel window also shows the section of the available panel window. When we are aligned on the available
* panel we wish to place, we click on the mouse and the section of available panel inside the storm panel outline is
* captured.
*
* The files should be stored in text format.  They should be human editable.
*
* Topics to discuss. 
*   Affine transforms and coordinate systems. 
*     Origin in the middle.
*     Move between coordinate system, main use for displaying graphics
*     For graphics main operations are rotate, scale and translate
*     Also used for zooming and panning
*     Operations are in reverse order
*
*   Bezier library
*     Find intersections
*     Use of SVG path element as a text representation
*     SVG path can be used as parameter for Path2D
*     Save space with string join function
*
*  Area library
*    Boolean operations
*    Use CW and CCW to simplify
*
*  Drag Knife Tool Path
*    These rules are for cutting thicker material. Rules for thin material i.e. vinyl are different
*    Pivot point is along tangent to the curve at offset distance
*    Try to always have some forward motion when cutting
*    Knife must be aligned before cutting
*    Drag simulation moves along line from previous knife point
*    Tabbing is not necessary, but makes things easier
*
*/
import { Area } from './psBezier/Area.js';
import { Bezier, PolyBezier, utils, Affine } from './psBezier/bezier.js';
import SSMain from './ss_main.js';
import { SSAvail } from './ss_avail.js';
import SSCNC from './ss_cnc.js';
import SS3D from './ss_3d.js';
import SSEntry from './ss_entry.js';
import SSPanel from './ss_panel.js';
import { VectorText } from './vector_text.js';
import { BezierDebugTools } from './psBezier/debug_bezier.js';

const SSTools = {
    iZoom: 1,
    virCenterX: 0,
    virCenterY: 0,
    topIdx: 0,
    topCIdx: 0,
    botIdx: 0,
    botCidx: 0,
    svg: null,
    poly: null,
    out1: null,
    cp: null,
    ang: 0,
    boomH: 2.0,
    charObj: {
        '0': 'zero',
        '1': 'one',
        '2': 'two',
        '3': 'three',
        '4': 'four',
        '5': 'five',
        '6': 'six',
        '7': 'seven',
        '8': 'eight',
        '9': 'nine',
        'A': 'A',
        'B': 'B',
        'C': 'C',
        'D': 'D',
        'E': 'E',
        'F': 'F',
        'G': 'G',
        'H': 'H',
        'I': 'I',
        'J': 'J',
        'K': 'K',
        'L': 'L',
        'M': 'M',
        'N': 'N',
        'O': 'O',
        'P': 'P',
        'Q': 'Q',
        'R': 'R',
        'S': 'S',
        'T': 'T',
        'U': 'U',
        'V': 'V',
        'W': 'W',
        'X': 'X',
        'Y': 'Y',
        'Z': 'Z',
        'a': 'al',
        'b': 'bl',
        'c': 'cl',
        'd': 'dl',
        'e': 'el',
        'f': 'fl',
        'g': 'gl',
        'h': 'hl',
        'i': 'il',
        'j': 'jl',
        'k': 'kl',
        'l': 'll',
        'm': 'ml',
        'n': 'nl',
        'o': 'ol',
        'p': 'pl',
        'q': 'ql',
        'r': 'rl',
        's': 'sl',
        't': 'tl',
        'u': 'ul',
        'v': 'vl',
        'w': 'wl',
        'x': 'xl',
        'y': 'yl',
        'z': 'zl',
        '(': 'parenleft',
        ')': 'parenright'
    },
    objMain: null,
    objAvail: null,
    obj3D: null,
    hdrH: 30,
    design: null,
    svgRect: function (orgW, orgH, width, height)
    {
        let svg = 'M ' + orgW.toString() + ' ' + orgH.toString() + ' ';
        svg += 'L ' + orgW.toString() + ' ' + (orgH + height).toString() + ' ';
        svg += 'L ' + (orgW + width).toString() + ' ' + (orgH + height).toString() + ' ';
        svg += 'L ' + (orgW + width).toString() + ' ' + (orgH).toString() + ' ';
        svg += 'L ' + (orgW).toString() + ' ' + (orgH).toString() + ' ';
        svg += 'Z';
        return svg;
    },
    testFile: function ()
    {
        this.design = new ShutterDesign('Example Storm Shutter Project');
        //Add the 4' x 8' blank
        this.design.addBlank('M 24 48 L 24 -48 L -24 -48 L -24 48 L 24 48 Z');
        this.design.addShutter('Back 1A', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38));  //0
        this.design.addShutter('Back 1B', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //1
        this.design.addShutter('Back 2', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //2
        this.design.addShutter('Back 3', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //3
        this.design.addShutter('Back 4', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //4
        this.design.addShutter('Back 5', this.svgRect(-36.5 / 2, -38 / 2, 36.5, 38)); //5 not 16, 0, -16
        this.design.addShutter('North 1', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //6
        this.design.addShutter('North 2', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //7
        this.design.addShutter('Front 1', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //8
        this.design.addShutter('Front 2 (Bath)', this.svgRect(-36.5 / 2, -38 / 2, 36.5, 38)); //9 not 16, 0, -16
        this.design.addShutter('Front 3 (Kitchen)', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //10
        this.design.addShutter('Front 4 (Garage)', this.svgRect(-26 / 2, -38 / 2, 26, 38)); //11 not 12, 0, -12
        this.design.addShutter('South 1 (Garage)', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //12
        this.design.addShutter('South 2)', this.svgRect(-52.5 / 2, -38 / 2, 52.5, 38)); //13
        this.design.addShutter('South 3', this.svgRect(-74.5 / 2, -38 / 2, 74.5, 38)); //14 not 32, 16, 0, -16, -32

        SSMain.setWorkingShutter(0);
    },
    parseChar: function (eps)
    {
        //Break into lines
        let lines = eps.split('\n');
        let state = 0;
        let svg = [];
        for (let iIdx = 0; iIdx < lines.length; iIdx++)
        {
            let tokens = lines[iIdx].trim().split(' ');
            let last = tokens.length - 1;
            switch (state)
            {
                case 0: //Looking for starting line
                    if (tokens[0] == 'gsave') state = 1;
                    break;

                case 1: //Processing glyph
                    if (tokens[1] == 'grestore')
                    {
                        return svg.join(' ');
                    }
                    switch (tokens[last])
                    {
                        case 'moveto':
                            svg.push('M');
                            svg.push(tokens[0]);
                            svg.push(tokens[1]);
                            break;

                        case 'lineto':
                            svg.push('L');
                            svg.push(tokens[0]);
                            svg.push(tokens[1]);
                            break;

                        case 'curveto':
                            svg.push('C');
                            svg.push(tokens[0]);
                            svg.push(tokens[1]);
                            svg.push(tokens[2]);
                            svg.push(tokens[3]);
                            svg.push(tokens[4]);
                            svg.push(tokens[5]);
                            break;

                        case 'closepath':
                            svg.push('Z');
                            break;
                    }
                    break;
            }
        }
        //Find line with start
    },
    parseFile: async function (dirHandle, filename)
    {
        let handle = await dirHandle.getFileHandle(filename);
        let file = await handle.getFile();
        let contents = await file.text();
        return this.parseChar(contents);
    },
    openDir: async function ()
    {
        //console.log(Object.entries(this.charObj));
        let charArr = Object.entries(this.charObj);
        const dirHandle = await window.showDirectoryPicker();
        let charMap = new Map();
        for (let iIdx = 0; iIdx < charArr.length; iIdx++)
        {
            let filename = charArr[iIdx][1] + '_Eng_HelvLine.eps';
            console.log(filename);
            let handle = await dirHandle.getFileHandle(filename);
            let file = await handle.getFile();
            let contents = await file.text();
            console.log(charArr[iIdx][0], this.parseChar(contents));
            charArr[iIdx][1] = this.parseChar(contents);
        }
        let whandle = await dirHandle.getFileHandle('linechar.txt', { create: true });
        let writable = await whandle.createWritable();
        //console.log(writeable);
        await writable.write(JSON.stringify(charArr));
        //console.log(charMap);
        // Object.keys(this.charObj).forEach(await function(key) 
        // {
        // let filename = this.charObj[key].toString() + '_Eng_HelvLine.eps';
        // //console.log(key, this.charObj[key] + '_Eng_HelvLine.eps');
        // let svg = this.parseFile(dirHandle, filename);
        // charMap.set(key, svg);
        // });
        console.log(JSON.stringify(charArr));
    },
    save: async function ()
    {
        let handle = await window.showSaveFilePicker();
        this.design.writeFile(handle);
    },
    getElements: function ()
    {
        SSMain.init();
        SSAvail.init();
        SSCNC.init();
        SS3D.init();
        SSEntry.init();

        SSPanel.displayOrder.push(SSEntry.pnlObj);
        SSPanel.displayOrder.push(SS3D.pnlObj);
        SSPanel.displayOrder.push(SSCNC.pnlObj);
        SSPanel.displayOrder.push(SSAvail.pnlObj);
        SSPanel.displayOrder.push(SSMain.pnlObj);
        SSPanel.setZOrder();
        this.design = new ShutterDesign('Example Storm Shutter Project');
        this.design.loadText(GRT);
        this.design.addShutter("Testy", utils.svgRect(-54 / 2, -34 / 2, 54, 34));
        //this.testFile();
        ////console.log('design', this.design);
        ////addHoles();
        SSMain.setWorkingShutter(0);
        SSAvail.recalcAvailPanels();

        SSMain.rewriteMainHeader();
        SSMain.redrawMainPanel();
        SSMain.redrawMainOverlay();
        SSAvail.rewriteAvailHeader();
        SSAvail.redrawAvailPanel();

        // SSMain.pnlObj.panel.addEventListener('keydown', SSMain.keydownEvent);
        // SSAvail.pnlObj.panel.addEventListener('keydown', SSMain.keydownEvent);

        //SSMain.getFocus(SSTools.obj3D);

        //test3D();
    //    document.addEventListener('focus', (e) =>
    //    {
    //        console.log('Capture Phase - Focus Event:', e.target);
    //    }, true);

    //    document.addEventListener('blur', (e) =>
    //    {
    //        console.log('Capture Phase - Blur Event:', e.target);
    //    }, true);

    //    document.addEventListener('mousedown', (e) =>
    //    {
    //        console.log('Capture Phase - Mousedown Event:', e.target);
        //    }, true);
        //SSTools.testArea();
    },
    testArea: function ()
    {
        //This represents the initial uncovered area of a 54" x 23" shutter.
        let uncovered = "M -27 -11.5 L -27 11.5 L 27 11.5 L 27 -11.5 L -27 -11.5 Z ";
        //This represents the area of a 4' x 8' panel that has been rotated and translated to the shutter coordinate system.
        //The corner of the panel aligns with the corner of the shutter.
        let unused = "M -27 36.5 L 69 36.49999999999999 L 69 -11.500000000000005 L -27 -11.499999999999998 L -27 36.5 Z ";
        let uncoveredArea = new Area(uncovered);
        let unusedArea = new Area(unused);
        //let intersectArea = uncoveredArea.intersect(unusedArea);
        console.log('uncoveredArea', uncoveredArea);
        //console.log('intersectArea', intersectArea);
        let intersectArea = unusedArea.subtract(uncoveredArea);

        //We are developing the debug-bezier.js file.  This will allow us to display the areas and the intersection.
        //Here we can setup things from the user perspective. In the Areas class we have PathArea and LoopArea objects.
        let ctx = SSMain.pnlObj.lwrCnvs.getContext("2d");
        let debugVisual = new BezierDebugTools(ctx);
        debugVisual.addBezierDisplayObject(uncoveredArea.makeDebugNode('uncovered'));
        debugVisual.addBezierDisplayObject(unusedArea.makeDebugNode('unused'));
        debugVisual.addBezierDisplayObject(intersectArea.makeDebugNode('intersect'));
        debugVisual.tree.children[0].children[0].children[0].data.strokeColor = 'red';
        debugVisual.tree.children[1].children[0].children[0].data.strokeColor = 'black';
        debugVisual.tree.children[2].children[0].children[0].data.strokeColor = 'green';
        //console.log('Bezier Debug', debugVisual);
        //var mytree = {
        //    text: 'Root', li_attr: {}, children: [uncoveredArea.makeDebugNode('uncovered'), unusedArea.makeDebugNode('unused'), intersectArea.makeDebugNode('intersect')] };

        //console.log('Bezier Debug', JSON.stringify(mytree));
        //let treeData = debugVisual.tree;
        let treeContainer = document.createElement('div');
        treeContainer.id = 'treeContainer';
        //document.body.appendChild(treeContainer);
        //document.body.appendChild(treeContainer);
        SSEntry.pnlObj.lwrCnvs.appendChild(treeContainer);
        SS3D.pnlObj.panel.style.left = '1100px';
        //treeContainer.style.width = '300px';
        //treeContainer.style.height = '300px';
        treeContainer.style.display = 'block';
        SSEntry.focusEntry();

        //let mytree = debugVisual.tree;
        // Initialize jstree
        $('#treeContainer').jstree({
            'core': {
                'data': [debugVisual.tree]
            }
        });
        //$('#treeContainer').jstree(true).settings.core.data = [mytree];
        //$('#treeContainer').jstree(true).refresh();

        //debugVisual.root = $('#treeContainer').jstree('get_node', '#');
        //console.log('Root', debugVisual.root);

        //Register for the loaded.jstree event
        $('#treeContainer').on('loaded.jstree', function (e, data)
        {
            console.log('Tree Loaded', e, data);
            //$('#treeContainer').jstree('open_all');

            console.log('Bezier Debug', debugVisual);
            debugVisual.calculateAffine();
            debugVisual.displayTree('treeContainer');
        });

        let lastNodeID = null;
        // Handle node selection
        $('#treeContainer').on('select_node.jstree', function (e, data)
        {
            if (lastNodeID)
            {
                let lastNode = $('#treeContainer').jstree('get_node', lastNodeID);
                lastNode.data.selected = false;
            }
            var node = data.node;
            //node.select.sel = true; 
            let thisNode = $('#treeContainer').jstree('get_node', node.id);
            thisNode.data.selected = true;
            lastNodeID = node.id;
            //$('#treeContainer').jstree('refresh');
            console.log('Selected node:', thisNode);
            debugVisual.displayTree('treeContainer');
            //console.log('Bezier Debug', debugVisual);
            // Display node data or perform other actions
        });
        console.log('Bezier Debug', debugVisual);

        //console.log('intersectArea', intersectArea.toSVG());
        //let ctx = SSMain.pnlObj.lwrCnvs.getContext("2d");
        //Area.displayAreas(ctx, [intersectArea]);
        //Area.displayAreas(ctx, [uncoveredArea, unusedArea, intersectArea]);
    }
};


document.addEventListener('DOMContentLoaded', () =>
{
    window.Bezier = Bezier;
    window.utils = utils;
    window.PolyBezier = PolyBezier;
    window.Affine = Affine;
    SSTools.getElements();
    //SSMain.getElements();
    //SSTools.testArea();
});
export default SSTools;
export { SSMain, SSTools, SSAvail, VectorText };
