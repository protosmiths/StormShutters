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
* This was in panel_tools which was growing.  Splitting up to manage better. This file contains the classes
* for a storm panel design.  A design file will be saved as a stringified Design class JSON.
*
* As part of the panel_tools file these classes were being over used.  They had taken on functions for display
* and design.  They are going to be refactored with the design and display functions separated.  There will now
* classes for design data to be stored and classes for displaying a working on a design.
*
* I created a new Area class to handle the cut operations, etc. It became apparent that an area should be defined
* by multiple loops. This is a change from the original design where an area was defined by a single loop and we had
* arrays for used and unused pieces.  The new design will use area objects to define the areas of the panel.  For example
* a panel starts with a single area that is the outline of the panel.  That area is the unused area.  As pieces are used
* for shutters they are removed from the unused area and added to the used area.  The used area is the area that is cut
* from the panel.  The unused area is the area that is not cut from the panel. The same applies to the shutters.  The
* shutters are defined by the outline. The difference will be that we call the areas covered and uncovered instead of
* used and unused.  The covered area is the area that is covered by pieces of panels.  The uncovered area is the area
* that is not covered by pieces of panels. Ultimately, all shutters will have no uncovered area.
*/
//import { Affine } from './psBezier/affine.js';

const SSDesign = (function()
{	
	//This class is for a piece of a panel. It has a path in the panel coordinate system
	//Every piece has stripes.  It is easier to create them by rule for every new piece
	//
	this.Piece = class
	{
		//When we have a piece that is being used on a shutter, the indexes and text have meaning.
		//However, when the piece is not being used the indexes are not used.  In those cases only
        //the panel and path parameters are used.
		constructor(panel, path, shIdx, llIdx, pIdx, txtDesc)
		{
			path = panel.parentDesign.path2grid(path);
			this.parentPanel = panel;
			this.path = path;
			this.stripes = panel.parentDesign.makeStripes(path);
            //is this piece not being used on a shutter? (shIdx == undefined)
			if (shIdx == undefined)
			{
				this.textTrans = [[1, 0, 0], [0, 1, 0]];
				this.text = '';
				this.sIdx = -1;
				this.layerIdx = -1;
				this.ppIdx = -1;
				return;
			}
            //We are being used on a shutter.  The text is the description of the piece
			//This transform allow us to position and scale the text.  The starting position
			//is at the panel origin and 1 inch height.  These are positions in the panel coord
			//system. To place the text on the shutter the panel transform is used.
			//Let's place it in the center of the path for now.
			let poly = utils.svg2Poly(path);
			let bbox = poly.bbox();
			this.textTrans = Affine.getTranslateATx({ x: bbox.x.mid, y: bbox.y.mid });
            this.text = txtDesc;
			this.sIdx = shIdx; //Index to shutter where used
			this.layerIdx = llIdx; //Index of layer
			this.ppIdx = pIdx;
		}
	}

	/*
	* A panel is a coroplast panel.  It starts as a blank panel of a given size. The iIdx is the index
	* to the blank panel in the blanks array.  The blank panel is a path in the panel coordinate system.
	* As pieaces are used to make shutters the blank panel is cut up into pieces.  The pieces are tracked
	* in the used array.  The unused array is the blank panel minus the used pieces, it is kept for legacy
	* reasons.  The unused area is the svg representation of the unused area.  The used area is the svg
	* representation of the used area.  The used area is the area that is cut from the panel.  The unused
	* area is the area that is available for cutting.
	*/
	this.CorrPanel = class
	{
		constructor(design, iIdx)
		{
			this.parentDesign = design;
			this.blankIdx = iIdx;
			this.unused = [];
			this.unused.push(new Piece(this, design.file.blanks[iIdx].path));
			//The unused area will be the svg representation of the unsed area it starts with the blank
			this.unusedArea = design.file.blanks[iIdx].path;
            this.unusedAreaStripes = design.file.blanks[iIdx].stripes;
            this.path = design.file.blanks[iIdx].path;
			this.used = []; //{path,stripes}
			this.usedArea = '';
		}
	}
	
	//Each layer piece indexes to a panel used piece and has the affine transform from the panel
	//coordinates to the shutter coordinates
	this.LayerPiece = class
	{
		constructor(pIdx, ppIdx, aTx)
		{
			this.panelIdx = pIdx;
			this.panelPieceIdx = ppIdx;
			this.panelTrans = aTx;
			//this.panelTrans = [[1,0,0],[0,1,0]];  //Identity matrix
		}
	}
	
	// A layer is an array of panel pieces
	this.Layer = class
	{
		constructor(outline)
		{
            //Array of LayerPiece objects
			this.panelPieces = [];
			this.uncovered = [outline];
            this.uncoveredArea = outline;
		}
	}
	
	this.Hole = class
	{
		constructor(dia, loc)
		{
			this.dia = dia;
			this.center = loc;
		}
	}
	
	// A shutter has a description. An SVG path describing the outline and an array of 3 layers
	this.Shutter = class
	{
		constructor(design, desc, path)
		{
			path = design.path2grid(path);
			this.parentDesign = design;
			this.description = desc;
			this.outline = path;
			let bbox = design.findMinMax(path);
            //console.log('bbox', bbox);
			this.minX = Math.floor(bbox.x.min);
			this.minY = Math.floor(bbox.y.min);
			this.maxX = Math.ceil(bbox.x.max);
			this.maxY = Math.ceil(bbox.y.max);
			this.layers = [new Layer(path), new Layer(path), new Layer(path)];
			//this.holes = [];
			this.holes = design.autoHoles(path);
		}
	}
	
	// A design is a description, an array of panel and an array of
	this.ShutterDesign = class
	{
		constructor(desc)
		{
            //This contains the design data that can be written to and from a file
			this.file =
			{
				description:desc,
				shutters:[],
				layerText:['Front', 'Inner', 'Back', 'Outline'],
				panels:[],
				blanks:[]
			};
			this.shutterIdx = 0;
			this.blankKOs = [];
		}
		
		/*
		* Previously the text was being generated in multiple places. Puttin it in one place
		* makes it consistent
		*/
		getShutterPieceText(iShutterIdx, iLayerIdx, iPieceIdx)
		{
            //console.log('getShutterPieceText', iShutterIdx, iLayerIdx, iPieceIdx);
			let shutter = this.file.shutters[iShutterIdx];
			let piece = shutter.layers[iLayerIdx].panelPieces[iPieceIdx];
            //console.log('shutter piece', shutter, piece);
			//let at = piece.panelTrans;
			//Now position the associated text
			return shutter.description + ' ' + this.file.layerText[iLayerIdx] + ' ' + iPieceIdx.toString() +' P' + piece.panelIdx.toString();
		}
		
		findMinMax(svg)
		{
			let poly = utils.svg2Poly(svg);
			return poly.bbox();
		}
		
		async writeFile(handle)
		{
			let writable = await handle.createWritable();
			//console.log(writeable);
			await writable.write(JSON.stringify(this.file, function( key, value){
				//console.log(key);
				if(key == 'parentDesign')return '';
				if(key == 'parentPanel')return '';
				if(key == 'stripes')return '';
				
				return value;
			}));
			await writable.close();
		}
		
		loadText(contents)
		{
			this.file = JSON.parse(contents);
            //console.log('loadText', this.file);
			//Fix circular references, at the higher level we know what they are.  The lower level
			//needs them to access higher level functions.  We didn't want to store methods in the
			//files.  So they exist above the level stored in files.
			for(let iIdx = 0; iIdx < this.file.shutters.length; iIdx++)
			{
				let shutter = this.file.shutters[iIdx];
				shutter.parentDesign = this;
				//let bbox = this.findMinMax(shutter.outline);
				//shutter.minX = Math.floor(bbox.x.min);
				//shutter.minY = Math.floor(bbox.y.min);
				//shutter.maxX = Math.ceil(bbox.x.size);
    //            shutter.maxY = Math.ceil(bbox.y.size);
				for(let iJdx = 0; iJdx < 3; iJdx++)
				{
 					for(let iKdx = 0; iKdx < shutter.layers[iJdx].panelPieces.length; iKdx++)
					{
						let piece = shutter.layers[iJdx].panelPieces[iKdx];
						let panelPiece = this.file.panels[piece.panelIdx].used[piece.panelPieceIdx];
						if (panelPiece.text == undefined)
						{
							panelPiece.text = this.getShutterPieceText(iIdx, iJdx, iKdx);
							//console.log('text', panelPiece.text);
                        }
						// //xref
						// this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].sIdx = iIdx;
						// this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].layerIdx = iJdx;
						panelPiece.ppIdx = iKdx;
						// //Put the text in the middle for now
						// let poly = utils.svg2Poly(this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].path);
						// let bbox = poly.bbox();
						// //this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = [[1,0,bbox.x.mid],[0,1,bbox.y.mid]];
						// //let textTx = Affine.affineAppend(piece.panelTrans, [[1,0,bbox.x.mid],[0,1,bbox.y.mid]]);
						// //this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = textTx;
						// //this.file.panels[piece.panelIdx].used[piece.panelPieceIdx].textTrans = [[1,0,bbox.x.mid],[0,1,bbox.y.mid]];
					}
					if (shutter.layers[iJdx].uncoveredArea == undefined)
					{
						let areaSVG = '';
						for (let iKdx = 0; iKdx < shutter.layers[iJdx].uncovered.length; iKdx++)
						{
							areaSVG += shutter.layers[iJdx].uncovered[iKdx] + ' ';
						}
                        shutter.layers[iJdx].uncoveredArea = areaSVG;
                    }
				}
			}
			//Temporary add panels for following
			//0 1 2 3 4 6 7 8 10 12 13
			// let populateShutterIdx = [1,2,3,4,6,7,8,10,12,13];
			// for(let iIdx = 0; iIdx < populateShutterIdx.length; iIdx++)
			// {
				// let sIdx = populateShutterIdx[iIdx];
				// let theShutter = this.file.shutters[sIdx];
				// let newIdx = this.file.panels.length;
				// //Two new panels per shutter
				// this.file.panels.push(new CorrPanel(this, 0));
				// this.file.panels.push(new CorrPanel(this, 0));
				// for(let iJdx = 0; iJdx < this.file.panels[0].used.length; iJdx++)
				// {
					// this.file.panels[newIdx].used[iJdx] = this.file.panels[0].used[iJdx];
				// }
				// for(let iJdx = 0; iJdx < this.file.panels[1].used.length; iJdx++)
				// {
					// this.file.panels[newIdx + 1].used[iJdx] = this.file.panels[1].used[iJdx];
				// }
				// for(let iJdx = 0; iJdx < this.file.panels[0].unused.length; iJdx++)
				// {
					// this.file.panels[newIdx].unused[iJdx] = this.file.panels[0].unused[iJdx];
				// }
				// for(let iJdx = 0; iJdx < this.file.panels[1].unused.length; iJdx++)
				// {
					// this.file.panels[newIdx + 1].unused[iJdx] = this.file.panels[1].unused[iJdx];
				// }
				// //The two panels are populated now refer to them in the shutter
				// //Do each layer
				// for(let iJdx = 0; iJdx < 3; iJdx++)
				// {
					// //theShutter.layers.push(new Layer(theShutter.outline));
					// theShutter.layers[iJdx].uncovered = [];
					// for(let iKdx = 0; iKdx <  this.file.shutters[0].layers[iJdx].panelPieces.length; iKdx++)
					// {
						// let pIdx = this.file.shutters[0].layers[iJdx].panelPieces[iKdx].panelIdx + newIdx;
						// let ppIdx = this.file.shutters[0].layers[iJdx].panelPieces[iKdx].panelPieceIdx;
						// let aTx = JSON.stringify(this.file.shutters[0].layers[iJdx].panelPieces[iKdx].panelTrans);
						// theShutter.layers[iJdx].panelPieces.push(new LayerPiece(pIdx, ppIdx, JSON.parse(aTx)));
					// }
				// }
			// }
			for(let iIdx = 0; iIdx < this.file.panels.length; iIdx++)
			{
				this.file.panels[iIdx].parentDesign = this;
				//Fix panel pieces references
				let areaSVG = '';
				for(let iJdx = 0; iJdx < this.file.panels[iIdx].unused.length; iJdx++)
				{
					this.file.panels[iIdx].unused[iJdx].parentPanel = this.file.panels[iIdx];
					this.file.panels[iIdx].unused[iJdx].stripes = this.makeStripes(this.file.panels[iIdx].unused[iJdx].path);
					areaSVG += this.file.panels[iIdx].unused[iJdx].path + ' ';
				}
				if (this.file.panels[iIdx].unusedArea == undefined)
				{
					this.file.panels[iIdx].unusedArea = areaSVG;
                    this.file.panels[iIdx].unusedAreaStripes = this.makeStripes(areaSVG);
				}
                areaSVG = '';
				for(let iJdx = 0; iJdx < this.file.panels[iIdx].used.length; iJdx++)
				{
					this.file.panels[iIdx].used[iJdx].stripes = this.makeStripes(this.file.panels[iIdx].used[iJdx].path);
                    areaSVG += this.file.panels[iIdx].used[iJdx].path + ' ';
				}
                if (this.file.panels[iIdx].usedArea == undefined)
                {
                    this.file.panels[iIdx].usedArea = areaSVG;
                }
			}
			this.blankKOs = [];
			for(let iIdx = 0; iIdx < this.file.blanks.length; iIdx++)
			{
				this.file.blanks[iIdx].stripes = this.makeStripes(this.file.blanks[iIdx].path);
                console.log('blank', this.file.blanks[iIdx].path);
				let poly = utils.svg2Poly(this.file.blanks[iIdx].path);
				console.log('poly', poly);
                //console.log('offset', poly.offset(-2, PolyBezier.NO_JOIN));
				//this.blankKOs.push(poly.offset(-2)[0]);
				this.blankKOs.push(poly.offset(-2, PolyBezier.NO_JOIN)[0]);
				//this.blankKOs.push(new PolyBezier(poly.curves[3].offset(-2)));
			}
            //console.log('blankKOs', this.blankKOs);
		}
		
		async readFile(handle)
		{
			console.log(handle);
			const file = await handle[0].getFile();
			const contents = await file.text();
			this.loadText(contents);
			console.log('readFile', this.file);
			SSMain.setWorkingShutter(0);

			SSAvail.recalcAvailPanels();
			SSMain.rewriteMainHeader();
			SSMain.redrawMainPanel();
			SSMain.redrawMainOverlay();
			SSAvail.rewriteAvailHeader();
			SSAvail.redrawAvailPanel();
			//console.log(contents);
		}
		
		addBlank(path)
		{
			path = this.path2grid(path);
			let poly = utils.svg2Poly(path);
			// let bbox = poly.bbox();
			// let stripes = '';
			// for(let iVert = bbox.x.min + 2; iVert < bbox.x.max; iVert += 2)
			// {
				// stripes += 'M ' + iVert.toString() + ' ' + bbox.y.min.toString() + ' ';
				// stripes += 'L ' + iVert.toString() + ' ' + bbox.y.max.toString() + ' ';
			// }
			//console.log(stripes);
			this.file.blanks.push({path:path, stripes:this.makeStripes(path)});
			this.blankKOs.push(poly.offset(-2, PolyBezier.NO_JOIN)[0]);
			//console.log('Blank added', this.blanks.length);
		}

		/*
		* The stripe is an svg path that is a series of vertical lines. The purpose is to indicate
		* the direction of the flutes.  The stripes are used to determine the prientation of the
		* coroplast. We are making a change to the design.  Previously, the path represented a single
		* polygon.  We are now allowing multiple polygons.  They will come from an area object and will 
		* be loops.
		*/
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
			let line = {p1:{x:xDim, y:-50}, p2:{x:xDim, y:50}};
			for(let iIdx = 0; iIdx < poly.curves.length; iIdx++){
				//console.log(poly.curves[iIdx].lineIntersects(line));
				let intersects = poly.curves[iIdx].lineIntersects(line);
				//console.log('intersects', intersects);
				for(let iJdx = 0; iJdx < intersects.length; iJdx++)
				{
					let p = poly.curves[iIdx].get(intersects[iJdx]);
					intersections.push(p.y);
				}
			}
			intersections.sort((a, b) => {return a-b;});
			//console.log('intersections', intersections);
			for(let iIdx = 0; iIdx < intersections.length; iIdx++)
			{
				if(iIdx%2 == 0)
				{
					stripe += 'M ';
				}else
				{
					stripe += 'L ';
				}
				// stripe += xDim.toString() + ' ' + intersections[iIdx].toString() + ' ';
				stripe += xDim.toFixed(2) + ' ' + intersections[iIdx].toFixed(2) + ' ';
			}
			//if(intersections.length != 0)console.log(intersections);
			return stripe;
		}
		
		getBlank(idx)
		{
			return this.file.blanks[idx];
		}
		
		addShutter(desc, path)
		{
			this.file.shutters.push(new Shutter(this, desc, path));
		}
		
		getShutter(idx)
		{
			return this.file.shutters[idx];
		}
		
		//For now we assume rectangular shutters.
		//We are 2" from edge
		autoHoles(path)
		{
			let poly = utils.svg2Poly(path);
			let bbox = poly.bbox();
			//console.log('bbox', bbox);
			let xCnt = Math.ceil((bbox.x.size - 4)/24);
			let yCnt = Math.ceil((bbox.y.size - 4)/24);
			let xSeg = (bbox.x.size - 4)/xCnt;
			let ySeg = (bbox.y.size - 4)/yCnt;
			//console.log('xCnt, yCnt, xSeg, ySeg', xCnt, yCnt, xSeg, ySeg);
			
			let holes = [];
			for(let iIdx = 0; iIdx <= yCnt; iIdx++)
			{
				for(let iKdx = 0; iKdx <= xCnt; iKdx++)
				{
					holes.push(new Hole(0.25, {x:bbox.x.min + 2 + iKdx * xSeg, y:bbox.y.max - 2 - iIdx * ySeg}));
				}
			}
			//console.log('holes', holes);
			return holes;
		}
		
		path2grid(path)
		{
			return path;
			let grid = 16.0; //1/16 inch grid
			let poly = utils.svg2Poly(path);
			for(let iIdx = 0; iIdx < poly.curves.length; iIdx++)
			{
				let curve = poly.curves[iIdx];
				if(!curve._linear)continue;
				for(let iJdx = 0; iJdx < curve.points.length; iJdx++)
				{
					curve.points[iJdx].x = Math.round(grid*curve.points[iJdx].x)/grid;
					curve.points[iJdx].y = Math.round(grid*curve.points[iJdx].y)/grid;
				}
			}
			return utils.poly2Svg(poly);
		}
				
	}
	return this;
	
})();