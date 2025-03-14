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
* Affine transforms makes going between coordinate system easier.
*
*
* Affine transforms are matrices that can take a set of points and modify them so that they maintain
* a relationship.  The two most important relationships are: Points in a line remain in a line. Parallel
* lines remain parallel.
*
* There are other useful transformations that do not maintain these relationships.  For example, if one is
* interested in perspective, parallel lines might not remain parallel after a transformation. This brings up
* another point.  Perspective is generally associated with 3 dimensions.  Affine transforms can also be in
* 3 dimensions.  But we will be interested in 2D transforms in the X/Y plane.
*
* There are several operations that will maintain the relationships for an affine transformation. The ones we
* are interested in are translation, rotation and scaling. Note that rotation and scaling are relative to the
* origin.  That is the origin is the one point that does not change.  For rotation the origin is the axis of
* rotation. For scaling all other points  move in or out from the origin based on the scale factor. Note that
* when translation is involved the order of operation matters, because a different order can result in a 
* different location for the origin and therefore different results
*
* Note that one can have different scaling factors for X and Y direction. In general, to maintain the proper
* aspect ratio one would want the two directions to have the same magnitude. In the case of the display
* coordinates the sign for the Y axis is negative because in the screen coordinate system in the Y direction
* is opposite to the standard Cartesian system.
*
* One common use case for affine transforms is displaying objects. For the storm shutter system we have
* panels and shutters that are measured in inches. We want to map them to displays that are in pixels. 
* Additionally, the y coordinates go in opposite direction.  Affine transforms handle the mapping between
* these two systems with ease.
*
* Let us create an affine transform to display a panel.  We have chosen a coordinate system where the panel
* is 48 inches wide by 96 inches tall.  We have chosen a display that is 1000 pixels wide by 500 pixels tall.
* Let's determine our scaling.  We will choose to display an area in the panel coordinate system that is 50" by
* 100" this will give us a 1" margin on all sides. Let us calculate the magnitude of the scale in each direction.
* The Y scale is 500 pixels divided by 100" giving us 5 pixels/in. The X scale is 1000 pixels divided by 50"
* giving us 20 pixels/in.  In order to fit the entire panel in the display we must use 5 pixels/in.  Let us
* consider rotating the panel. If we rotate, we have a Y scale of 500 pixels/50" giving us 10 pixels/in. For X
* scale we have 1000 pixels/100", also 10 pixels/in. So if we rotate and use a scale of magnitude 10 pixels/in
* the entire panel will fill the greatest display space.  
*
* In this display, we are going to implement a zoom and panning feature. So our first operation will be to
* translate to the location we want centered in the display.  The next operation is a 90 degree or Pi/2 radian
* rotation.  Mentally these two operations occur in the panel coordinate system.  Now we want to scale into
* the display system so we apply the 10 pixel/in scale times a zooming factor. Now we have a representation
* of the panel in the display coordinates around the upper left corner of the display.  Our final operation is
* to translate the origin from the upper left to the center of the display. This happens in the display 
* coordinate units, we can use pixel width/2 for X translation and - pixel height/2 for Y translation.
*
* One of the cool things about using transforms is that they can go both ways.  If one has a transform one can
* find the inverse.  Using the inverse, one can transform mouse coordinates into panel coordinates.  This would
* give us the panel point we want to center on for a pan or zoom operation.
{
	"parentDesign": "",
	"blankIdx": 0,
	"unused": [{
			"parentPanel": "",
			"path": "M 24 10 L 24 -10 L -24 -10 L -24 -5 L 14 -5 L 14 48 L 19.5 48 L 19.5 10 L 24 10 Z",
			"stripes": ""
		}
	],
	"used": [{
			"parentPanel": "",
			"path": "M -24 -5 L -24 48 L 14 48 L 14 -4.5 L -24 -4.5 Z",
			"stripes": "",
			"sIdx": 0,
			"layerIdx": 0,
			"textTrans": [[-1.8369701987210297e-16, 1, -19.083333333333332], [-1, -1.8369701987210297e-16, 44.16666666666666]],
			"ppIdx": 0
		}, {
			"parentPanel": "",
			"path": "M 24 -10 L 24 -48 L -24 -48 L -24 -10 L 24 -10 Z",
			"stripes": "",
			"sIdx": 0,
			"layerIdx": 1,
			"textTrans": [[1, 2.4492935982947064e-16, -20.499999999999996], [-2.4492935982947064e-16, 1, -43.25]],
			"ppIdx": 0
		}, {
			"parentPanel": "",
			"path": "M 19.5 48 L 24 48 L 24 10 L 19.5 10 L 19.5 48 Z",
			"stripes": "",
			"sIdx": 0,
			"layerIdx": 1,
			"textTrans": [[-1.8369701987210297e-16, 1, 20.250000000000004], [-1, -1.8369701987210297e-16, 43.75]],
			"ppIdx": 1
		}
	]
}
*/
//const Affine = (function()
//{
	export const Affine =
	{
		//Abbreviated affine transforms. There are the top 2 rows of 3x3 matrices
		//The 3rd row is assumed to be 0,0,1
		//The order of transforms AxB is B happens first.  A is by row B is by cols
		//The ata transform is first
		
		//Used when one doesn't want a reference but an actual copy
		clone: function(atOrg)
		{
			let atNew = Affine.getIdentityATx();
			for(let iIdx = 0; iIdx < atOrg.length; iIdx++)
			{
				for(let iJdx = 0; iJdx < atOrg[iJdx].length; iJdx++)
				{
					atNew[iIdx][iJdx] = atOrg[iIdx][iJdx];
				}
			}
			return atNew;
		},

		/*
		* A few comments about this function. First it used to be named affineAppend. Since it is a static function
		* using the Affine class the name has been changed to append.  The function is used to append two affine
		* transforms.  The transforms are 2x3 matrices.  The 3rd row is assumed to be 0,0,1.  The order of the
		* transforms is that the second transform is applied first.  This is because the second transform is
		* applied by column.  The first transform is applied by row.  The function is used to combine two
		* transforms.  The result is a new transform that is the result of applying the second transform and then
		* the first transform.
		*
		* NOTE there was a bug in the original code.  The implied row was added to the transforms by reference. This
		* would result in the implied row being added to the original transforms.  This would cause the original
		* transforms to be modified.  This is not the desired behavior.  If fact, it could result in multiple rows being
		* added when append was called multiple times. The fix was to make a copy of the original transforms and add the 
		* implied row to the copy.  The copy is then used to calculate the new transform.
		*/
		append: function(at1, ata)
		{
			//Add implied rows
			let at1a = [...at1];
			let ataa = [...ata];
			at1a.push([0,0,1]);
			ataa.push([0,0,1]);
			//console.log("append at1a, ataa", at1a, ataa);
			let newAT = [];
			for(let iRow = 0; iRow < 3; iRow++){
				let newRow = [];
				for(let iCol = 0; iCol < 3; iCol++){
					let newItem = 0;
					for(let iIdx = 0; iIdx < 3; iIdx++){
						newItem += at1a[iRow][iIdx] * ataa[iIdx][iCol];
					}
					//If there were an iIdxToken = 2 we would have
					//newItem += at1a[iRow][2] * ataa[2][iCol];
					//But ataa[2][iCol] would be 0 for iCol < 2
					//ataa[2][2] = 1, but it is part of the implied row
					newRow.push(newItem);
				}
				//console.log("append newRow", newRow);
				newAT.push(newRow);
			}
			//console.log("append newAT", newAT);
			newAT.pop();
			return newAT;
		},
		
		getIdentityATx: function(){
			return [[1,0,0],[0,1,0]];  //Identity matrix
		},
		
		getTranslateATx: function(vec){
			return [[1,0,vec.x],[0,1,vec.y]];
		},
		
		getScaleATx: function(vec){
			return [[vec.x,0,0],[0,vec.y,0]];
		},
		
		/*
		* One major use case for skew is correcting for mechanical errors.  One style of CNC has the ends of a
		* gantry being moved along two tracks. Those tracks should be parallel and at right angles to the other
		* axis. Skew can correct for misalignment. Another example is plotter drift.  One major source of drift
		* is that material is not square (at right angle) to the line between the rollers. The material travels
		* at an angle.  This angle can be small, but "skews the design relative to the edge over a long distance.
    *
    * Skew correction is almost always along one axis. In the 2D case, If there is skew correction needed along
    * both axis, then there is a rotation component and it would be better to determine the rotation needed to
    * get the skew correction to be along one axis. For correction on one axis, one of the skew factors will be 0.
    *
		* The formula for a transform calculation is
		*	transformedPt.x = orgPt.x*ATx[0][0] + orgPt.y*ATx[0][1] + ATx[0][2];
		*	transformedPt.y = orgPt.x*ATx[1][0] + orgPt.y*ATx[1][1] + ATx[1][2];
		*
		*   ATx[0][1] is the skew factor for x using skew*y
		*   ATx[1][0] is the skew factor for y using skew*x
		*
		*  The parameter below vecFactor has in x the factor that is multiplied by y to be added to x
		*  The parameter below vecFactor has in y the factor that is multiplied by x to be added to y
		*
		* The value 0 gives no skew. Typically the skew factor will be small
		*
		* Note this is calculated with absolute value (relative to the origin.
		*/
		getSkewATx: function(vecSkew){
			return [[1, vecSkew.x, 0],[vecSkew.y, 1, 0]];
		},
		
		/*
		* Skew correction almost always has a known point where the correction is 0. The above skew
		* correction is relative to (0, 0). We can apply the correction relative to a reference point
		* by translating that point to (0, 0) applying skew and translating back.
		*/
		getSkewWithOffsetATx: function(vecOffset, vecSkew){
			let atx = Affine.getTranslateATx(vecOffset);
			atx = Affine.append(atx, Affine.getSkewATx(vecSkew));
			atx = Affine.append(atx, Affine.getTranslateATx({x:-vecOffset.x, y:-vecOffset.y}));
			return atx;
		},		

		//https://en.wikipedia.org/wiki/Rotation_matrix
		//Rotation matrix -> cos, -sin, sin, cos -> x:x cos - y sin, y:x sin + y cos
		//Rotation around origin
		getRotateATx: function(ang){
			let ATsin = Math.sin(ang);
			let ATcos  = Math.cos(ang);
			return [[ATcos,-ATsin,0],[ATsin,ATcos,0]];
		},
		
		//Get the rotation matrix to rotate from quad 1 to the given quadrant
		//quad 1 => 0, quad 2 => 1, quad 3 => 2, quad 4 => 3
		//let qrot = [[[1,0,0],[0,1,0]],[[0,-1,0],[1,0,0]],[[-1,0,0],[0,-1,0]],[[0,1,0],[-1,0,0]]];
		//Note this is CCW like positive angles quad 1 upper left quad 2 lower left quad 3 lower right
		getQuadRotATx: function(qn){
			switch(qn){
				case 1:
				return [[0,-1,0],[1,0,0]];
				case 2:
				return [[-1,0,0],[0,-1,0]];
				case 3:	
				return [[0,1,0],[-1,0,0]];			
			}
			return utils.getIdentityATx();  //Identity matrix
		},

		//Assumes no skewing or distortion by scaling, etc. Just rotation and translation
		//Trying a change to assume that scaling happens second. If we back out scaling we should have normalized
        //rotation.  This is the order that is used in the SVG transform attribute
		//https://en.wikipedia.org/wiki/Rotation_matrix
		getRotateAngle: function (atx)
		{
			//NOTE We were trying to normalize the rotation.  The assumption was that transforms are created in the order
			//of rotation, scale, translate.  This is the order that is used in the SVG transform attribute.  In particular,
			//we were trying to deal with the negative scale factor that is used to flip the Y axis for display coordinates.
			//Turns out that when we have rotation with multiples of 90 degrees the cos or sin are 0 or 1.  This means that
			//we lose the sign of the scale factor.  We can't determine the sign of the scale factor from the rotation matrix.
			//Instead of complicating this function we will assume that the scale factor is positive.  If the calling function
			//wants deal with scaling they have the option.
			//let scale = Affine.getScale(atx);
			//let unscaled = Affine.append(atx, Affine.getScaleATx({ x: 1 / scale.x, y: 1 / scale.y }));
			//let angle = Math.atan2(unscaled[1][0], unscaled[0][0]);
            let angle = Math.atan2(atx[1][0], atx[0][0]);
            return angle;
			//return Math.atan2(atx[1][0], atx[0][0]);
		},

		//BUYER BEWARE: The sign of the scale is not determined by the rotation matrix.  We are trying to guess the sign.
        //we are leaving it to future users to determine what works for them.  The user is responsible for valid transforms
		getScale: function (atx)
		{
            //console.log('atx arctans', atx, Math.atan2(atx[1][0], atx[0][0]), Math.atan2(atx[0][1], atx[1][1]));
            let signx = Math.sign(atx[0][0])
			if (signx == 0) signx = 1;
			if (Math.sign(atx[1][0]) != 0) signx *= Math.sign(atx[1][0]);
			let signy = Math.sign(atx[1][1]);
			if (signy == 0) signy = 1;
			if (Math.sign(atx[0][1]) != 0) signy *= Math.sign(atx[0][1]);
			//We can only dertermine if the signs are the same or different. If they are the same we assume they are both positive
			//If they are different we assume we have a transformation from cartesian to display coordinates.  The Y axis is flipped
			//in display coordinates.  If we have a rotation of 90 degrees the cos is 0 and the sin is 1.  In this case we end up with the
			//same sign for the sin and cos when scaley is negative.
            //NOTE for the most part this is just a guess.  The user is responsible for valid transforms
			if (signx != signy)
			{
				signx = 1;
				signy = -1;
            //Below we are looking for +/- 90 rotation. In that case, the flipped y axis looks like a flipped x axis
			} else if (atx[0][0] == 0 && atx[1][1] == 0)
			{
				signx = 1;
                signy = -1;
			}else
			{
				signx = 1;
				signy = 1;
			}
            //let signy = Math.sign(atx[1][1]) * Math.sign(atx[0][1]);
			//if (signy == 0) signy = 1;
			//console.log('signx, signy', signx, signy, { x: signx * Math.sqrt(atx[0][0] * atx[0][0] + atx[1][0] * atx[1][0]), y: signy * Math.sqrt(atx[0][1] * atx[0][1] + atx[1][1] * atx[1][1]) });
            return { x: signx * Math.sqrt(atx[0][0] * atx[0][0] + atx[1][0] * atx[1][0]), y: signy * Math.sqrt(atx[0][1] * atx[0][1] + atx[1][1] * atx[1][1]) };
			//return { x: Math.sqrt(atx[0][0] * atx[0][0] + atx[1][0] * atx[1][0]), y: Math.sqrt(atx[0][1] * atx[0][1] + atx[1][1] * atx[1][1]) };
		},

		getTranslate: function (atx)
		{
            return { x: atx[0][2], y: atx[1][2] };
		},

		/*
		* From mathworld
		* https://mathworld.wolfram.com/MatrixInverse.html
		*
		* a11 a12 a13
		* a21 a22 a23
		* a31 a32 a33
		*
		* Each 2x2 matrix below is a determinant. The terms are all divided by
		* the determinant of the matrix to be inverted
		* 
		* a22 a23   a13 a12   a12 a13 
		* a32 a33   a33 a32   a22 a23
		*
		* a23 a21   a11 a13   a13 a11
		* a33 a31   a31 a33   a23 a21
		*
		* a21 a22   a12 a11   a11 a12
		* a31 a32   a32 a31   a21 a22
		*
		* Our terms are elements in a zero based array.  It is easier to track if
		* we change to 0 based as shown below
		*
		* a00 a01 a02
		* a10 a11 a12
		* a20 a21 a22
		* 
		* a11 a12   a02 a01   a01 a02 
		* a21 a22   a22 a21   a11 a12
		*
		* a12 a10   a00 a02   a02 a00
		* a22 a20   a20 a22   a12 a10
		*
		* a10 a11   a01 a00   a00 a01
		* a20 a21   a21 a20   a10 a11
		*/
		// Given a transform of the form
		//cos(α), -sin(α), Tx
		//sin(α), cos(α),  Ty
		//The inverse will be
		//cos(α), sin(α), −Txcos(α)−Tysin(α)
		//−sin(α), cos(α), −Tycos(α)+Txsin(α)
		//NOTE: This has the same bug as the append function.  The implied row is added by reference.  This will modify the
        //original transform.  The fix is to make a copy of the original transform and add the implied row to the copy.
		getInverseATx: function (atx)
		{
            let atxCopy = [...atx];
			//Add the implied row to square the matrix
			atxCopy.push([0,0,1]);
			let det = Affine.determinant(atxCopy);
			if(det == 0)return null; //There is no inverse
			
			//console.log('det', det);
			//Create 2 x 3 matrix to receive the inverted matrix
			let inv = [[1,1,1],[1,1,1]];
			
			//Rather than try to deduce the pattern we will just brute force this
			//using the formulas above. We only need to do the 1st two rows if we
			//assume that we have been operating on affine transforms
			//The user is responsible for valid transforms
			inv[0][0] = (atxCopy[1][1] * atxCopy[2][2] - atxCopy[1][2]*atxCopy[2][1])/det;
			inv[0][1] = (atxCopy[0][2] * atxCopy[2][1] - atxCopy[0][1]*atxCopy[2][2])/det;
			inv[0][2] = (atxCopy[0][1] * atxCopy[1][2] - atxCopy[0][2]*atxCopy[1][1])/det;

			inv[1][0] = (atxCopy[1][2] * atxCopy[2][0] - atxCopy[1][0]*atxCopy[2][2])/det;
			inv[1][1] = (atxCopy[0][0] * atxCopy[2][2] - atxCopy[0][2]*atxCopy[2][0])/det;
			inv[1][2] = (atxCopy[0][2] * atxCopy[1][0] - atxCopy[0][0]*atxCopy[1][2])/det;

			// inv[2][0] = (atxCopy[1][0] * atxCopy[2][1] - atxCopy[1][1]*atxCopy[2][0])/det;
			// inv[2][1] = (atxCopy[0][1] * atxCopy[2][0] - atxCopy[0][0]*atxCopy[2][1])/det;
			// inv[2][2] = (atxCopy[0][0] * atxCopy[1][1] - atxCopy[0][1]*atxCopy[1][0])/det;
			// inv.pop(); //Remove last row assuming it is [0,0,1]
			//console.log(inv);
			return inv;
		},
		//Note this is an abbreviated affine transform.  We are not doing perspectives, so the final row
		//is omitted and understood to be 0,0,1.  The 3rd column is the translation column
		//NOTE we are both transforming in place and returning the transformed point
		//If the calling routine wants to keep the original point it should make a copy
		//The reason for the transform in place is that beziers and polybeziers are usually easier to transform
        //in place. In most cases, that is what we want.
		transformPoint: function(pt, ATx){
			//Make a copy so that when one calculates pt.y it isn't affected by calculated pt.x or visa versa
			let orgPt = {x:pt.x, y:pt.y};
			//console.log("transformPoint pt, ATx", pt, ATx);
			//Do transform in place
			//abbreviated affine has 2 rows of 3 element
			pt.x = orgPt.x*ATx[0][0] + orgPt.y*ATx[0][1] + ATx[0][2];
			pt.y = orgPt.x*ATx[1][0] + orgPt.y*ATx[1][1] + ATx[1][2];
			return {x:pt.x, y:pt.y};
			//console.log("transformPoint pt", pt);
	//		return {x:pt.x*ATx[0][0] + pt.y * ATx[0][1] + ATx[0][2], y:pt.x*ATx[1][0] + pt.y*ATx[1][1] + ATx[1][2]};
		},
		/*
		* NOTE: It is assumed that a 3 x 3 matrix is passed.
		*
		* From mathworld 
		* https://mathworld.wolfram.com/Determinant.html
		*
		* a1 a2 a3
		* b1 b2 b3
		* c1 c2 c3
		*
		* = a1 b2 c3 - a1 b3 c2 - a2 b1 c3 + a2 b3 c1 + a3 b1 c2 - a3 b2 c1
		*/
		determinant: function(atx){
			//console.log('atx', atx);
			let det = atx[0][0] * atx[1][1] * atx[2][2];
			det -= atx[0][0] * atx[1][2] * atx[2][1];
			det -= atx[0][1] * atx[1][0] * atx[2][2];
			det += atx[0][1] * atx[1][2] * atx[2][0];
			det += atx[0][2] * atx[1][0] * atx[2][1];
			det -= atx[0][2] * atx[1][1] * atx[2][0];
			return det;
		},

		/*
		* This function is used to set the transform for a display context. 
		*/
		ctxTransform:function(ctx, at)
		{
			ctx.transform(at[0][0], at[1][0], at[0][1], at[1][1], at[0][2], at[1][2]);
		},

		/*
		* Related to  the interpolation of affine transforms below is an idea of of extracting the
		* operations that make up the transform.  This is useful for animation.  The operations are
		* translation, rotation, scaling and skew.  The skew is not a common operation, but it is
		* useful for correcting mechanical errors.  The skew is almost always along one axis.  If
		* skew is needed along both axis, then it is better to determine the rotation that will
		* make the skew along one axis.  The skew is relative to the origin.  The skew is calculated
		* with the absolute value of the skew factor.  The reason for this is that the skew is
		* calculated with the absolute value of the skew factor.  The skew is almost always small.
		* We can simplify by assuming there is no skew. Another complication is that when we transform
		* between cartesian and display coordinates the Y axis is flipped.  This is handled by the
		* scale factor.  The scale factor is the square root of the sum of the squares of the elements
		* of the rotation matrix.  The sign of the scale is determined by the sign of the elements in
		* the rotation matrix.  
		*/
		extractOps: function (at)
		{
			//let's assume order was rotate, scale, translate
			let scale = Affine.getScale(at);
            //let unscale = Affine.append(at, Affine.getScaleATx({ x: 1 / scale.x, y: 1 / scale.y }));
			let angle = Math.atan2(at[1][0], at[0][0]);
            //let angle = Math.atan2(unscale[1][0], unscale[0][0]);
			//let unrotate = Affine.append(at, Affine.getRotateATx(-angle));
			//let unrotate = Affine.getRotateATx(-angle);
   //         unrotate = Affine.append(unrotate, at);
			//let scale = Affine.getScale(unrotate);
			let translate = Affine.getTranslate(at);
			return { angle: angle, scale: scale, translate: translate };
		},

		//For animation we want to interpolate between two transforms
		//We are changing scale during rotation when the scale is the same on both ends. It appears that
        //simple interpolation will not work.  We need to interpolate the scale and the rotation separately
        interpolate: function (at1, at2, t)
		{
			let ops1 = Affine.extractOps(at1);
			let ops2 = Affine.extractOps(at2);
			let rotnew = ops1.angle + (ops2.angle - ops1.angle) * t;
			let scalenew = { x: ops1.scale.x + (ops2.scale.x - ops1.scale.x) * t, y: ops1.scale.y + (ops2.scale.y - ops1.scale.y) * t };
			let transnew = { x: ops1.translate.x + (ops2.translate.x - ops1.translate.x) * t, y: ops1.translate.y + (ops2.translate.y - ops1.translate.y) * t };
			let atnew = Affine.getTranslateATx(transnew);
			atnew = Affine.append(atnew, Affine.getScaleATx(scalenew));
			atnew = Affine.append(atnew, Affine.getRotateATx(rotnew));
            return atnew;
			//Let's try an interpolation of the scale and rotation separately
			//let rot1 = Affine.getRotateAngle(at1);
			//let rot2 = Affine.getRotateAngle(at2);
			//let scale1 = Affine.getScale(at1);
			//let scale2 = Affine.getScale(at2);
			//let trans1 = Affine.getTranslate(at1);
			//let trans2 = Affine.getTranslate(at2);
			//let rotNew = rot1 + (rot2 - rot1) * t;
			//let scaleNew = { x: scale1.x + (scale2.x - scale1.x) * t, y: scale1.y + (scale2.y - scale1.y) * t };
			//let transNew = { x: trans1.x + (trans2.x - trans1.x) * t, y: trans1.y + (trans2.y - trans1.y) * t };
			//let atNew = Affine.getTranslateATx(transNew);
			//atNew = Affine.append(atNew, Affine.getScaleATx(scaleNew));
			//atNew = Affine.append(atNew, Affine.getRotateATx(rotNew));
   //         return atNew;
        //    let atNew = [];
        //    for (let iIdx = 0; iIdx < at1.length; iIdx++)
        //    {
        //        let newRow = [];
        //        for (let iJdx = 0; iJdx < at1[iIdx].length; iJdx++)
        //        {
        //            newRow.push(at1[iIdx][iJdx] + (at2[iIdx][iJdx] - at1[iIdx][iJdx]) * t);
        //        }
        //        atNew.push(newRow);
        //    }
        //    return atNew;
        },

	};
	
//	return AffineIns;
//})();
