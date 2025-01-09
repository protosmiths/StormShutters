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
import { Area, Segment } from './psBezier/Area.js';
import SSMain from './ss_main.js';
import { SSAvail } from './ss_avail.js';
import SSCNC from './ss_cnc.js';
import SS3D from './ss_3d.js';
import SSEntry from './ss_entry.js';
import SSPanel from './ss_panel.js';
import { VectorText } from './vector_text.js';

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
        this.design.addBlank('M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z');
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
        //this.design.addShutter("Testy", utils.svgRect(-54 / 2, -54 / 2, 54, 54));
        console.log('design', this.design);
        //addHoles();
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
        document.addEventListener('focus', (e) =>
        {
            console.log('Capture Phase - Focus Event:', e.target);
        }, true);

        document.addEventListener('blur', (e) =>
        {
            console.log('Capture Phase - Blur Event:', e.target);
        }, true);

        document.addEventListener('mousedown', (e) =>
        {
            console.log('Capture Phase - Mousedown Event:', e.target);
        }, true);
    },
    testArea: function ()
    {
        const segment1 = new Segment("cubic", [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 0 }]);
        const segment2 = new Segment("cubic", [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 1 }]);

        const intersection = segment1.findIntersection(segment2);
        console.log(intersection);
        //const myArea = new Area();
        //console.log(myArea);
    }
};

SSTools.testArea();

document.addEventListener('DOMContentLoaded', () =>
{
    SSTools.getElements();
    //SSMain.getElements();
});
export default SSTools;
export { SSMain, SSTools, SSAvail, VectorText };
//export { Area, Segment, SSMain, SSAvail, SSCNC, SS3D, SSEntry, SSPanel };

///*
//*   Copyright 2022 Steven M Graves/Protosmiths
//*
//*   Licensed under the Apache License, Version 2.0 (the "License");
//*   you may not use this file except in compliance with the License.
//*   You may obtain a copy of the License at
//*
//*       http://www.apache.org/licenses/LICENSE-2.0
//*
//*   Unless required by applicable law or agreed to in writing, software
//*   distributed under the License is distributed on an "AS IS" BASIS,
//*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//*   See the License for the specific language governing permissions and
//*   limitations under the License.
//*/
///*
//github notes README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md
//* This program aids in laying out coroplast panels for storm panels.  Each panel is three layers with the inside layer
//* at 90 degrees to the outside layers.  The direction of the outside layer is chosen to allow the layer to be contiguous.
//* The inside layer can be non-contiguous multiple pieces.
//*
//* This program allows for taking virtual panels and determining how to cut them up.  The procedure is to create the outside
//* layers for all panels.  As each panel is created, one can chose a new panel from stock or from the left over pieces from
//* previously used panels. Stock is can be various sizes. One can create a new stock size as needed.  The standard size is
//* 4' x 8'.  As a panel is pulled from stock it is assigned a number to identify it.  Each stock panel is defined with the 
//* origin of a Cartesian coordinate system at the center of the panel.  Each storm shutter also has the origin of its own
//* Cartesian coordinate system at the center of the shutter.
//*
//* The data format is a system wide description and an array of panels.  Each panel has a panel description and an array of
//* three layers.  On each layer is an array of panel pieces.  Each piece has the panel number and the path for the piece in
//* the panel coor5dinate system and the affine transform to move the piece into position in the storm panel coordinate system.
//*
//* One can reconstruct the panels using the inverse of the affine transform.
//* 
//* In general, each piece has two possible rotations depending on the layer.  The 180 degree rotation of these two can also
//* be invoked as needed.  An example would be a storm panel with an arc on top.  If the panel took less than 1/2 a stock
//* panel.  One could use one edge of the stock panel and rotate 180 degrees and use the opposite edge for the third layer.
//8
//* The affine transform is displayed and will snap to shutter coordinates.
//*
//* UI
//* We have three working windows.
//*
//* The main window is the storm panel window.  At the top of that window is a box with the title/description of the panel. 
//* To the right of the title are three icons, next, prev and new.  Along the left edge and the bottom edge are tick marks
//* and labels to show scale.
//*
//* The next window is the to be placed (available) panels.  The panels are displayed in a square section and are rotated to
//* the orientation of the active layer.  Each panel has a light grey outline with the available pieces in black?. The used
//* pieces are in light red.  The squares are sized for the largest source panel.  The default is to use 4' x 8' panels.
//* A select button can toggle to make 4' x 10' available. The squares are 9' x 9' or 11' x 11'.  The available window is
//* square and starts out 2 x 2.  As panels are added it switches to 3 x 3, 4 x 4, 5 x 5, etc.  Tick marks on the edge of the
//* window show scale.
//*
//* The last window is a text window. It will display stats as needed.  In particular it will show the affine transforms of
//* various entities.  It will have radio buttons to chose what to display as well as the panel size select button discussed
//* above. The main reason for the text window is to allow values to be changed manually.
//*
//* Panel placement has four modes.  The first mode is a drawing mode to create the outline of a new panel.  The other three
//* modes are the placement of each layer.  In general layer 1 and layer 3 are placed first with layer 2 last.
//*
//* The drawing mode will be relatively simple.  Initially we will support rectangles.
//*
//* The placement modes are a little more complicated.  In these modes, the storm panel outline moves in the available panel
//* window. The storm panel window also shows the section of the available panel window. When we are aligned on the available
//* panel we wish to place, we click on the mouse and the section of available panel inside the storm panel outline is
//* captured.
//*
//* The files should be stored in text format.  They should be human editable.
//*
//* Topics to discuss. 
//*   Affine transforms and coordinate systems. 
//*     Origin in the middle.
//*     Move between coordinate system, main use for displaying graphics
//*     For graphics main operations are rotate, scale and translate
//*     Also used for zooming and panning
//*     Operations are in reverse order
//*
//*   Bezier library
//*     Find intersections
//*     Use of SVG path element as a text representation
//*     SVG path can be used as parameter for Path2D
//*     Save space with string join function
//*
//*  Area library
//*    Boolean operations
//*    Use CW and CCW to simplify
//*
//*  Drag Knife Tool Path
//*    These rules are for cutting thicker material. Rules for thin material i.e. vinyl are different
//*    Pivot point is along tangent to the curve at offset distance
//*    Try to always have some forward motion when cutting
//*    Knife must be aligned before cutting
//*    Drag simulation moves along line from previous knife point
//*    Tabbing is not necessary, but makes things easier
//*
//*/
//import { Area, Segment } from './psBezier/Area.js';
//import SSMain from './ss_main.js';
//export { SSMain };

//const SSTools = new (function()
//{	
	
//	var _this = this;
//	var iZoom = 1;
//	var virCenterX = 0;
//	var virCenterY = 0;
//	var topIdx = 0;
//	var topCIdx = 0;
//	var botIdx = 0;
//	var botCidx = 0;
//	var svg;
//	var poly;
//	var out1;
//	var cp;
//	//var ang = 20*Math.PI/180;
//	//var ang = 10*Math.PI/180;
//	var ang = 0;
//	var boomH = 2.0;
	
//	var charObj =
//	{
//		'0':'zero',
//		'1':'one',
//		'2':'two',
//		'3':'three',
//		'4':'four',
//		'5':'five',
//		'6':'six',
//		'7':'seven',
//		'8':'eight',
//		'9':'nine',
//		'A':'A',
//		'B':'B',
//		'C':'C',
//		'D':'D',
//		'E':'E',
//		'F':'F',
//		'G':'G',
//		'H':'H',
//		'I':'I',
//		'J':'J',
//		'K':'K',
//		'L':'L',
//		'M':'M',
//		'N':'N',
//		'O':'O',
//		'P':'P',
//		'Q':'Q',
//		'R':'R',
//		'S':'S',
//		'T':'T',
//		'U':'U',
//		'V':'V',
//		'W':'W',
//		'X':'X',
//		'Y':'Y',
//		'Z':'Z',
//		'a':'al',
//		'b':'bl',
//		'c':'cl',
//		'd':'dl',
//		'e':'el',
//		'f':'fl',
//		'g':'gl',
//		'h':'hl',
//		'i':'il',
//		'j':'jl',
//		'k':'kl',
//		'l':'ll',
//		'm':'ml',
//		'n':'nl',
//		'o':'ol',
//		'p':'pl',
//		'q':'ql',
//		'r':'rl',
//		's':'sl',
//		't':'tl',
//		'u':'ul',
//		'v':'vl',
//		'w':'wl',
//		'x':'xl',
//		'y':'yl',
//		'z':'zl',
//		'(':'parenleft',
//		')':'parenright'
//		// 'a':'lower\\a',
//		// 'b':'lower\\b',
//		// 'c':'lower\\c',
//		// 'd':'lower\\d',
//		// 'e':'lower\\e',
//		// 'f':'lower\\f',
//		// 'g':'lower\\g',
//		// 'h':'lower\\h',
//		// 'i':'lower\\i',
//		// 'j':'lower\\j',
//		// 'k':'lower\\k',
//		// 'l':'lower\\l',
//		// 'm':'lower\\m',
//		// 'n':'lower\\n',
//		// 'o':'lower\\o',
//		// 'p':'lower\\p',
//		// 'q':'lower\\q',
//		// 'r':'lower\\r',
//		// 's':'lower\\s',
//		// 't':'lower\\t',
//		// 'u':'lower\\u',
//		// 'v':'lower\\v',
//		// 'w':'lower\\w',
//		// 'x':'lower\\x',
//		// 'y':'lower\\y',
//		// 'z':'lower\\z'
//	}
	
//	this.objMain;	
//	this.objAvail;
//	//this.objCNC;
//	this.obj3D;
	
//	this.hdrH = 30;
	
//	this.design = null;
	
//	var svgRect = function(orgW, orgH, width, height)
//	{
//		let svg = 'M ' + orgW.toString() + ' ' + orgH.toString() + ' ';
//		svg += 'L ' + orgW.toString() + ' ' + (orgH + height).toString() + ' ';
//		svg += 'L ' + (orgW + width).toString() + ' ' + (orgH + height).toString() + ' ';
//		svg += 'L ' + (orgW + width).toString() + ' ' + (orgH).toString() + ' ';
//		svg += 'L ' + (orgW).toString() + ' ' + (orgH).toString() + ' ';
//		svg += 'Z';
//		return svg;
//	}
	
//	var testFile = function()
//	{
//		this.design = new ShutterDesign('Example Storm Shutter Project');
//		//Add the 4' x 8' blank
//		this.design.addBlank('M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z');
//		this.design.addShutter('Back 1A', svgRect(-52.5/2, -38/2, 52.5, 38));  //0
//		this.design.addShutter('Back 1B', svgRect(-52.5/2, -38/2, 52.5, 38)); //1
//		this.design.addShutter('Back 2', svgRect(-52.5/2, -38/2, 52.5, 38)); //2
//		this.design.addShutter('Back 3', svgRect(-52.5/2, -38/2, 52.5, 38)); //3
//		this.design.addShutter('Back 4', svgRect(-52.5/2, -38/2, 52.5, 38)); //4
//		this.design.addShutter('Back 5', svgRect(-36.5/2, -38/2, 36.5, 38)); //5 not 16, 0, -16
//		this.design.addShutter('North 1', svgRect(-52.5/2, -38/2, 52.5, 38)); //6
//		this.design.addShutter('North 2', svgRect(-52.5/2, -38/2, 52.5, 38)); //7
//		this.design.addShutter('Front 1', svgRect(-52.5/2, -38/2, 52.5, 38)); //8
//		this.design.addShutter('Front 2 (Bath)', svgRect(-36.5/2, -38/2, 36.5, 38)); //9 not 16, 0, -16
//		this.design.addShutter('Front 3 (Kitchen)', svgRect(-52.5/2, -38/2, 52.5, 38)); //10
//		this.design.addShutter('Front 4 (Garage)', svgRect(-26/2, -38/2, 26, 38)); //11 not 12, 0, -12
//		this.design.addShutter('South 1 (Garage)', svgRect(-52.5/2, -38/2, 52.5, 38)); //12
//		this.design.addShutter('South 2)', svgRect(-52.5/2, -38/2, 52.5, 38)); //13
//		this.design.addShutter('South 3', svgRect(-74.5/2, -38/2, 74.5, 38)); //14 not 32, 16, 0, -16, -32
		
//		SSMain.setWorkingShutter(0);
//	}
	
//	var parseChar = function(eps)
//	{
//		//Break into lines
//		let lines = eps.split('\n');
//		let state = 0;
//		let svg = [];
//		for(let iIdx = 0; iIdx < lines.length; iIdx++)
//		{
//			let tokens = lines[iIdx].trim().split(' ');
//			let last = tokens.length - 1;
//			switch(state)
//			{
//				case 0: //Looking for starting line
//				if(tokens[0] == 'gsave')state = 1;
//				break;
				
//				case 1: //Processing glyph
//				if(tokens[1] == 'grestore')
//				{
//					return svg.join(' ');
//				}
//				switch(tokens[last])
//				{
//					case 'moveto':
//					svg.push('M');
//					svg.push(tokens[0]);
//					svg.push(tokens[1]);
//					break;
					
//					case 'lineto':
//					svg.push('L');
//					svg.push(tokens[0]);
//					svg.push(tokens[1]);
//					break;
					
//					case 'curveto':
//					svg.push('C');
//					svg.push(tokens[0]);
//					svg.push(tokens[1]);
//					svg.push(tokens[2]);
//					svg.push(tokens[3]);
//					svg.push(tokens[4]);
//					svg.push(tokens[5]);
//					break;
					
//					case 'closepath':
//					svg.push('Z');
//					break;
//				}
//				break;
//			}
//		}
//		//Find line with start
//	}
//	var parseFile = async function(dirHandle, filename)
//	{
//		let handle = await dirHandle.getFileHandle(filename);
//		let file = await handle.getFile();
//		let contents = await file.text();
//		return parseChar(contents);
//	}
	
//	this.openDir = async function()
//	{
//		//console.log(Object.entries(charObj));
//		let charArr = Object.entries(charObj);
//		const dirHandle = await window.showDirectoryPicker();
//		let charMap = new Map();
//		for(let iIdx = 0; iIdx < charArr.length; iIdx++)
//		{
//			let filename = charArr[iIdx][1] + '_Eng_HelvLine.eps';
//			console.log(filename);
//			let handle = await dirHandle.getFileHandle(filename);
//			let file = await handle.getFile();
//			let contents = await file.text();
//			console.log(charArr[iIdx][0], parseChar(contents));
//			charArr[iIdx][1] = parseChar(contents);
//		}
//		let whandle =  await dirHandle.getFileHandle('linechar.txt', {create: true});
//		let writable = await whandle.createWritable();
//		//console.log(writeable);
//		await writable.write(JSON.stringify(charArr));
//		//console.log(charMap);
//		// Object.keys(charObj).forEach(await function(key) 
//		// {
//			// let filename = charObj[key].toString() + '_Eng_HelvLine.eps';
//			// //console.log(key, charObj[key] + '_Eng_HelvLine.eps');
//			// let svg = parseFile(dirHandle, filename);
//			// charMap.set(key, svg);
//		// });
//		console.log(JSON.stringify(charArr));
//	}
	
//	this.save = async function()
//	{
//		let handle = await window.showSaveFilePicker();
//		SSTools.design.writeFile(handle);
//	}


//	this.getElements = function ()
//	{
//		SSMain.init();
//		SSAvail.init();
//		SSCNC.init();
//		SS3D.init();
//		SSEntry.init();

//		SSPanel.displayOrder.push(SS3D.pnlObj);
//		SSPanel.displayOrder.push(SSCNC.pnlObj);
//		SSPanel.displayOrder.push(SSAvail.pnlObj);
//		SSPanel.displayOrder.push(SSMain.pnlObj);
//		SSPanel.setZOrder();
//		this.design = new ShutterDesign('Example Storm Shutter Project');
//		this.design.loadText(GRT);
//		//this.design.addShutter("Testy", utils.svgRect(-54 / 2, -54 / 2, 54, 54));
//		console.log('design', this.design);
//		//addHoles();
//		SSMain.setWorkingShutter(0);
//		SSAvail.recalcAvailPanels();

//		SSMain.rewriteMainHeader();
//		SSMain.redrawMainPanel();
//		SSMain.redrawMainOverlay();
//		SSAvail.rewriteAvailHeader();
//		SSAvail.redrawAvailPanel();

//		// SSMain.pnlObj.panel.addEventListener('keydown', SSMain.keydownEvent);
//		// SSAvail.pnlObj.panel.addEventListener('keydown', SSMain.keydownEvent);

//		//SSMain.getFocus(SSTools.obj3D);

//		//test3D();
//	}

//	this.testArea = function() {
//		const segment1 = new Segment("cubic", [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 0 }]);
//		const segment2 = new Segment("cubic", [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 1 }]);

//		const intersection = segment1.findIntersection(segment2);
//		console.log(intersection);
//		//const myArea = new Area();
//		//console.log(myArea);
//	}
	
//	return this;
	
//})();

//SSTools.testArea();
//SSTools.getElements();

//export default SSTools;
