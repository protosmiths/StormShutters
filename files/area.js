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
* Similar to the Java java.awt.geom.area class.
*/
const Area = new(function(){

class Area
{
	
	constructor(shape)
	{
		this.solids = [];
		this.holes = [];
		if(shape == undefined)return;
		
		if(shape.constructor.name == 'Area')
		{
			for(let iIdx = 0; iIdx < shape.solids.length; iIdx++)
			{
				this.solids.push(new PolyBezier(shape.solids[iIdx]));
			}
			return;
		}
		
		if(shape.constructor.name == 'PolyBezier')
		{
			let clone = new PolyBezier(shape);
			//console.log("we have a shape");
			if(!clone.cw)clone.reverse(); //All areas are defined by a clockwise boundary
			this.solids.push(clone);
		}
	}
	isEmpty()
	{
		if(this.solids.length == 0)return true;
		
		return false;
	}
	transform(aTx)
	{
		for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		{
			utils.transformPoly(this.solids[iIdx], aTx);
		}
	}
	
	add(area2)
	{
		
	}
	subtract(area2)
	{
		console.log("Area Subtract");
		let newSolids = [];
		let newHoles = [];
		let area2Fixed = [];
		for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		{
			let poly1 = this.solids[iIdx];
			//console.log('poly1', poly1);
			for(let iJdx = 0; iJdx < area2.solids.length; iJdx++)
			{
				console.log('Start cw', area2.solids[iJdx].cw);
				let poly2 = new PolyBezier(area2.solids[iJdx]);
				console.log('poly2 to fix', poly2.cw, new PolyBezier(poly2));
				this.fixCoincidents(poly1, poly2, 5);
				console.log('Fixed poly2', poly2.cw, new PolyBezier(poly2));
				area2Fixed[iJdx] = poly2;
				//newSolids.push(poly2);
			}
		}
		// console.log('newSolids', newSolids);
		// this.solids = newSolids;
		// return;
		for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		{
			let poly1 = this.solids[iIdx];
			console.log('poly1', iIdx, poly1);
			for(let iJdx = 0; iJdx < area2Fixed.length; iJdx++)
			{
				let poly2 = area2Fixed[iJdx];
				//For subtraction the subtracting path should go ccw
				poly2.reverse(); //All areas are cw, no need to test
				//Coincidental lines are a problem, so search for them and expand the subtracting area
				// along the line slightly
				console.log('poly2', iJdx, poly2);
				let polyIntersects = this.intersectPolys(poly1, poly2);
				if(polyIntersects.length > 200)return;
				//Get linked list header
				let header = polyIntersects.pop();
				//let polyIntersects = poly1.curves[iIdx].intersects(poly2.curves[iJdx], 0.05);
				if(polyIntersects.length <= 0)
				{
					// console.log('No intersections');
					// console.log(poly1.contains(poly2.curves[0].points[0]));
					// console.log(poly2.contains(poly1.curves[0].points[0]));
					//Is a point in shape2 inside shape 1
					if(poly1.contains(poly2.curves[0].points[0]))
					{
						newHoles.push(poly2);
						newSolids.push(poly1);
						continue;
					}
					//Is a point in shape1 inside shape 2
					if(poly2.contains(poly1.curves[0].points[0]))
					{
						//Poly2 subtracts it all we are empty
						continue;
					}
					//No interaction, no subtraction keep the original shape
					newSolids.push(poly1);
					continue;
				}else
				{
					console.log('header', header);
					//console.log('polyIntersects', polyIntersects);
					for(let iPdx = 0; iPdx < polyIntersects.length; iPdx++)
					{
						let pa = poly1.curves[polyIntersects[iPdx].idx[0]].get(polyIntersects[iPdx].t[0]);
						let pb = poly2.curves[polyIntersects[iPdx].idx[1]].get(polyIntersects[iPdx].t[1]);
						console.log('Intersection',pa.x,pa.y,pb.x,pb.y,polyIntersects[iPdx].xp);
					}
					//We have intersections, create a new shape.  We should be able to walk the
					//segments and create a closed shape.
					//
					//In a subtraction operation, we keep all segments of A outside B and all B within A
					//Instead of doing outside inside test at every node we will use the cross product
					// This means that at each intersection we have two
					//paths entering and two exiting.  We will be following one of the two exiting paths.
					//The cross product will tell us which path to follow.
					//
					//The rules are that we start on the B path, when we get to an intersection with a
					//negative xp, we start a new path with the A segment that follows  We follow the
					//A path to an intersection with a positive xp (should be next one).  Rejoin the
					//B path adding segments until we close the path. Then rejoin the B path until another
					//negative xp
					//
					//State 0 moving from intersection to intersection looking for positive xp. When found
					//        a path is started
					//State 1 at positive intersection flipping to A and adding to path from A, Check next
					//        intersection if on same A segment. If so add A segment and go to state 3. If
					//        next intersection not on this segment add from t to end (1.0) and go to state 2;
					//State 2 Adding segments from A. Add up to segment with intersection, go to state 3
					//State 3 at negative intersection, flipping to B and adding from B. Check if next
					//        intersection is on this segment. If so add B segment and go to state 5.
					//        If intersection not on this B segment. Add from t to end (1.0) and got to state 4
					//State 4 Adding segments from B. Add to segment with intersection go to state 5
					//State 5 At positive intersection, Check for segment end, if so go to negative
					//        intersection, check for looped and go to state 0.  If not go to state 1
					//We start with the first intersection on B. We test if that segment is inside or outside B.
					//If it is outside it will be added, but we will let it be the last segment added. If
					//it is on the inside it is an exception and should be the only case where we enter an intersection
					//on a segment not included.
					//The possibilities at each intersection follow
					// Enter XP leave
					//   A   -   B
					//   A   +   A
					//   B   -   B
					//   B   +   A
					//When we leave the intersection we will be on the path that goes inside.
					//At each intersection the inside path will be on the opposite shape in the
					//direction determined by the cross product.  In between intersections we follow
					//the curve in the direction determined
					let segments = [];
					//This allows us to reference the two shapes by index allowing math
					//Start with both cw.  This makes the algorithm much easier.  First of all we need no cross product.
					//All intersections act the same.  We will always take the right hand branch.  Another advantage
					//is that we are walking both curves in the forward direction.  No flipping needed.
					// if(!poly1.cw)poly1.reverse();
					// if(!poly2.cw)poly2.reverse();
					let shapes = [poly1, poly2];
					//console.log('cws', poly1.cw, poly2.cw);
					//This could be done with the above array
					let curveLens = [poly1.curves.length, poly2.curves.length];
					//Start on shape 0 (poly1)
					//let shpIdx = 0;
					//Get the curve index for the first intersection
					//let curveIdx = polyIntersects[0].idx[shpIdx];
					//Find the intersection above, or one closer, it doesn't matter we choose the curveIdx
					//of the first intersection to find a curve that definitely had an intersection.
					//We don't necessarily need that intersection
					//We search forward on that line
					//let IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, 0, 1, [-1,-1]);
					//console.log('IntersectInfo 1st time', IntersectInfo);
					// let c1 = poly1.curves[IntersectInfo.seg.idx[0]];
					// let c2 = poly2.curves[IntersectInfo.seg.idx[1]];
					//Record the info on this first intersection.  We are done when we get back to it
					//let startInfo = IntersectInfo;
					//let splitCurve = poly1.curves[curveIdx].split(IntersectInfo.t);
					//Defensive programming, stop any possible endless loops. 
					let limit = 2*(poly1.curves.length + poly2.curves.length);
					//Counter to compare with limit
					let iCnt = 0;
					
					//When we get to the first intersection, we will be picking up the segment on
					//the inside. It will be on the opposite shape from the shpIdx. We have
					//assumed the segment on shpIdx = 0 is outside and that we will be picking
					//up shpIdx = 1;  This test shows that shpIdx is on the inside and that we
					//must flip to shpIdx = 1
					// if(!poly2.contains(poly1.curves[curveIdx].points[0]))
					// {
						// console.log('Start 0n curve 0');
						// shpIdx = 1;
						// //dir[1] = -1;
						
					// }
					// console.log('test', poly2.contains(poly1.curves[curveIdx].points[0]));
					let state = 0;
					//1st intersection on path B
					//Start on B
					//Start with 1st intersection on curve B
					let thisIntersection = header.next[1];
					let looped = false;
					let segStart = 0;
					let curveIdx = 0;
					let t1 = 0;
					let t2 = 0;
					let splitCurve;
					let pa;
					while((iCnt++ < limit) && (state >= 0))
					{
						console.log('state',state);
						//This first section handles an intersection
						switch(state)
						{
							case 0:
							//Traveling B looking for positive xp. If not we can just jump to next intersection
							if(looped)
							{
								console.log('Leaving state machine');
								state = -1;
								break;
							}
							while((polyIntersects[thisIntersection].xp < 0) && (iCnt++ < limit)){
								//Go find a positive xp
								thisIntersection = polyIntersects[thisIntersection].next[1];
								console.log('Go to next intersection on path B looking for positive xp thisIntersection xp', thisIntersection, polyIntersects[thisIntersection].xp);
								if(thisIntersection == header.next[1])looped = true;
							}
							pa = poly2.curves[polyIntersects[thisIntersection].idx[1]].get(polyIntersects[thisIntersection].t[1]);
							console.log('Going to state 1 thisIntersection xp', pa.x, pa.y, thisIntersection, polyIntersects[thisIntersection].xp);
							state = 1; //Found positive
							//Record that this is the starting intersection for this path
							segStart = thisIntersection;
							segments = [];
							break;
							
							case 1:
							//Add segment from path on A, we are at an intersection, there are two possibilities
							//A 2nd intersection on this segment or not
							//Get the t value for the first intersection
							t1 = polyIntersects[thisIntersection].t[0];
							//get index for path A
							curveIdx = polyIntersects[thisIntersection].idx[0];
							//This intersection is recorded, prepare for next
							thisIntersection = polyIntersects[thisIntersection].next[0];
							//Don't check while adding segments
							//if(thisIntersection == header.next[1])looped = true;
							console.log('Go to next intersection on path A thisIntersection (negative) xp', thisIntersection, polyIntersects[thisIntersection].xp);
							t2 = polyIntersects[thisIntersection].t[0];
							//Is the next intersection on this curve?
							if((curveIdx == polyIntersects[thisIntersection].idx[0]) && (t2 > t1))
							{
								//The next segment has polyIntersects at both ends.
								splitCurve = shapes[0].curves[curveIdx].split(t1,t2);
								segments.push(splitCurve); //Add this segment
								//Next state is an intersection to flip to B
								state = 3;
								break;
							}
							//Next intersection is not on this segment
							splitCurve = shapes[0].curves[curveIdx].split(t1,1.0);
							segments.push(splitCurve);
							curveIdx++;
							if(curveIdx >= curveLens[0])curveIdx = 0;
							//This state adds segments from A
							state = 2;
							break;
							
							case 2:
							//At side A curve to be added
							//Add curves up to next intersection, we moved to next intersection in state 1
							while((curveIdx != polyIntersects[thisIntersection].idx[0]) && (iCnt++ < limit))
							{
								pa = shapes[0].curves[curveIdx].points[0];
								console.log('State 2', pa.x, pa.y);
								//No intersection on this curve add it all
								segments.push(shapes[0].curves[curveIdx]);
								//go to next curve on path
								curveIdx++;
								//Wrap if needed
								if(curveIdx >= curveLens[0])curveIdx = 0;
								//Last segment on A
							}
							//Added curves up to next intersection
							splitCurve = shapes[0].curves[curveIdx].split(0, polyIntersects[thisIntersection].t[0]);
							//Add the last segment on A
							segments.push(splitCurve);
							//Go flip to B
							state = 3;
							break;
							
							case 3:
							//Flipping to B to add segments
							if(thisIntersection == segStart)
							{
								//Shouldn't happen
								console.log('Unexpected segment end ');
								state = 5;
								break;
							}
							//Flipping to B to add segments, xp should be negative
							if(polyIntersects[thisIntersection].xp > 0)
							{
								console.log("Positive XP while adding A segments xp, curveIdx, thisIntersection", polyIntersects[thisIntersection].xp, curveIdx, thisIntersection);
								state = 5;
								break;
							}
							//Error tests done, find starting end of this segment
							curveIdx = polyIntersects[thisIntersection].idx[1];
							t1 = polyIntersects[thisIntersection].t[1];
							thisIntersection = polyIntersects[thisIntersection].next[1];
							console.log('Go to next intersection on path B xp should now be positive thisIntersection xp', thisIntersection, polyIntersects[thisIntersection].xp);
							//Don't check while adding segments
							//if(thisIntersection == header.next[1])looped = true;
							//Is the other end of this segment the next intersection
							t2 = polyIntersects[thisIntersection].t[1];
							if((curveIdx == polyIntersects[thisIntersection].idx[1]) &&(t2 > t1))
							{
								
								splitCurve = shapes[1].curves[curveIdx].split(t1,t2);
								segments.push(splitCurve); 
								//Next state is an intersection that might be end of path
								state = 5;
								break;
							}
							splitCurve = shapes[1].curves[curveIdx].split(t1,1.0);
							//Add curve from B
							segments.push(splitCurve);
							curveIdx++;
							if(curveIdx >= curveLens[1])curveIdx = 0;
							//Adding segments from B
							state = 4;
							break;
							
							case 4:
							//Adding segments from B
							while((curveIdx != polyIntersects[thisIntersection].idx[1]) && (iCnt++ < limit))
							{
								segments.push(shapes[1].curves[curveIdx]);
								curveIdx++;
								if(curveIdx >= curveLens[1])curveIdx = 0;
								//Last segment on B
							}
							//We have added segments up to next intersection
							splitCurve = shapes[1].curves[curveIdx].split(0,polyIntersects[thisIntersection].t[1]);
							segments.push(splitCurve);
							state = 5;
							break;
							
							case 5:
							//Time to flip back to A, now it is possible we have completed a closed shape
							if(thisIntersection == segStart)
							{
								//We have a complete shape
								newSolids.push(new PolyBezier(segments));
								//Now follow B to next positive xp intersection
								thisIntersection = polyIntersects[thisIntersection].next[1];
								console.log('Complete shape, go to next intersection on path B thisIntersection xp', thisIntersection, polyIntersects[thisIntersection].xp);
								if((polyIntersects.length <= 3) || (thisIntersection == header.next[1]))looped = true;
								state = 0;
								break;
							}
							//We have not completed a shape go back to following A
							state = 1;
							break;
						}
					}
				}
			}
		}
		this.solids = newSolids;
		this.holes = newHoles;
	}
	/*
	* One can find the intersections by pairs.  If a pair does not share edges then one can
	* find the intersections and break the shapes up at the intersections. The outside
	* segments of the intersect shape are the segments of one shape that are inside the other
	* shape.
	*
	* If the pairs share edges, things are more difficult. We will make a rule that the points
	* where the lines join are considered intersections.  As long as they follow each other,
	* even if there are other segments, there are no intersections.  Finally, there is one
	* special case, that is two shapes that share all edges. Our rule says that they have no
	* intersections. But if we detect this case, then the intersection is either shape.
	*
	* The detection of whether a shared edge is inside or outside the shape.  An edge takes
	* the state of the following segment.  This leads to an interesting realization.  The
	* logic will also work if there is no intersection. So shared edges are parallel lines
	* and parallel lines do not intersect.
	*
	* NOTE the above logic works for subtract and intersect.  It does not work for add.
	*/
	intersect(area2)
	{
		console.log("Area Intersect");
		let newSolids = [];
		let newHoles = [];
		let area2Fixed = [];
		for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		{
			let poly1 = this.solids[iIdx];
			//console.log('poly1', poly1);
			for(let iJdx = 0; iJdx < area2.solids.length; iJdx++)
			{
				let poly2 = new PolyBezier(area2.solids[iJdx]);
				//Coincidental lines are a problem, so search for them and expand the intersecting area
				// along the line slightly
				this.fixCoincidents(poly1, poly2, 1);
				area2Fixed[iJdx] = poly2;
				//newSolids.push(poly2);
			}
		}
		// this.solids = newSolids;
		// return;
		for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		{
			let poly1 = this.solids[iIdx];
			//console.log('poly1', iIdx, new PolyBezier(poly1));
			//console.log('poly1');
			//SSDisplay.logPoly(poly1);
			for(let iJdx = 0; iJdx < area2Fixed.length; iJdx++)
			{
				let poly2 = area2Fixed[iJdx];
				console.log('poly2');
				//SSDisplay.logPoly(poly2);
				//console.log('poly2', iJdx, new PolyBezier(poly2));
				let polyIntersects = this.intersectPolys(poly1, poly2);
				if(polyIntersects.length > 200)return;
				// for(let iPdx = 0; iPdx < polyIntersects.length; iPdx++)
				// {
					// let pa = poly1.curves[polyIntersects[iPdx].idx[0]].get(polyIntersects[iPdx].t[0]);
					// let pb = poly2.curves[polyIntersects[iPdx].idx[1]].get(polyIntersects[iPdx].t[1]);
					// console.log('Intersection',pa.x,pa.y,pb.x,pb.y,polyIntersects[iPdx].xp);
				// }
				//Get linked list header
				let header = polyIntersects.pop();
				//let polyIntersects = poly1.curves[iIdx].intersects(poly2.curves[iJdx], 0.05);
				if(polyIntersects.length <= 1)
				{
					// console.log('No intersections');
					// console.log(poly1.contains(poly2.curves[0].points[0]));
					// console.log(poly2.contains(poly1.curves[0].points[0]));
					//Is a point in shape2 inside shape 1
					if(poly1.contains(poly2.curves[0].points[0]))
					{
						newSolids.push(poly2);
						continue;
					}
					//Is a point in shape1 inside shape 2
					if(poly2.contains(poly1.curves[0].points[0]))
					{
						newSolids.push(poly2);
						continue;
					}
					continue;
				}else
				{
					console.log('header', header);
					//console.log('polyIntersects', polyIntersects);
					//We have intersections, create a new shape.  We should be able to walk the
					//segments and create a closed shape.
					//
					//In a intersection operation, we keep all segments of A inside B and all B within A
					//Instead of doing outside inside test at every node we will use the cross product
					//First of all we have both curves going clockwise.  We will only be following each
					//path in the forward direction.  This means that at each intersection we have two
					//paths entering and two exiting.  We will be following one of the two exiting paths.
					//The cross product will tell us which path to follow.
					//
					//We start at the first intersection on A Based on the
					//
					//State 0 moving from intersection to intersection looking for positive xp. When found
					//        a path is started
					//State 1 at positive intersection flipping to A and adding to path from A, Check next
					//        intersection if on same A segment. If so add A segment and go to state 3. If
					//        next intersection not on this segment add from t to end (1.0) and go to state 2;
					//State 2 Adding segments from A. Add up to segment with intersection, go to state 3
					//State 3 at negative intersection, flipping to B and adding from B. Check if next
					//        intersection is on this segment. If so add B segment and go to state 5.
					//        If intersection not on this B segment. Add from t to end (1.0) and got to state 4
					//State 4 Adding segments from B. Add to segment with intersection go to state 5
					//State 5 At positive intersection, Check for segment end, if so go to negative
					//        intersection, check for looped and go to state 0.  If not go to state 1
					//We start with the first intersection on B. We test if that segment is inside or outside B.
					//If it is outside it will be added, but we will let it be the last segment added. If
					//it is on the inside it is an exception and should be the only case where we enter an intersection
					//on a segment not included.
					//The possibilities at each intersection follow
					// Enter XP leave
					//   A   -   B
					//   A   +   A
					//   B   -   B
					//   B   +   A
					//When we leave the intersection we will be on the path that goes inside.
					//At each intersection the inside path will be on the opposite shape in the
					//direction determined by the cross product.  In between intersections we follow
					//the curve in the direction determined
					let segments = [];
					//This allows us to reference the two shapes by index allowing math
					//Start with both cw.  This makes the algorithm much easier.  First of all we need no cross product.
					//All intersections act the same.  We will always take the right hand branch.  Another advantage
					//is that we are walking both curves in the forward direction.  No flipping needed.
					// if(!poly1.cw)poly1.reverse();
					// if(!poly2.cw)poly2.reverse();
					let shapes = [poly1, poly2];
					//console.log('cws', poly1.cw, poly2.cw);
					//This could be done with the above array
					let curveLens = [poly1.curves.length, poly2.curves.length];
					//Start on shape 0 (poly1)
					//let shpIdx = 0;
					//Get the curve index for the first intersection
					//let curveIdx = polyIntersects[0].idx[shpIdx];
					//Find the intersection above, or one closer, it doesn't matter we choose the curveIdx
					//of the first intersection to find a curve that definitely had an intersection.
					//We don't necessarily need that intersection
					//We search forward on that line
					//let IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, 0, 1, [-1,-1]);
					//console.log('IntersectInfo 1st time', IntersectInfo);
					// let c1 = poly1.curves[IntersectInfo.seg.idx[0]];
					// let c2 = poly2.curves[IntersectInfo.seg.idx[1]];
					//Record the info on this first intersection.  We are done when we get back to it
					//let startInfo = IntersectInfo;
					//let splitCurve = poly1.curves[curveIdx].split(IntersectInfo.t);
					//Defensive programming, stop any possible endless loops. 
					let limit = 2*(poly1.curves.length + poly2.curves.length);
					//Counter to compare with limit
					let iCnt = 0;
					
					//When we get to the first intersection, we will be picking up the segment on
					//the inside. It will be on the opposite shape from the shpIdx. We have
					//assumed the segment on shpIdx = 0 is outside and that we will be picking
					//up shpIdx = 1;  This test shows that shpIdx is on the inside and that we
					//must flip to shpIdx = 1
					// if(!poly2.contains(poly1.curves[curveIdx].points[0]))
					// {
						// console.log('Start 0n curve 0');
						// shpIdx = 1;
						// //dir[1] = -1;
						
					// }
					// console.log('test', poly2.contains(poly1.curves[curveIdx].points[0]));
					let state = 0;
					//1st intersection on path B
					//Start on B
					//Start with 1st intersection on curve A
					let thisIntersection = header.next[0];
					let looped = false;
					let segStart = 0;
					let curveIdx = 0;
					let t1 = 0;
					let t2 = 0;
					let splitCurve;
					let pa;
					segments = [];
					while((iCnt++ < limit) && (state >= 0))
					{
						console.log('state',state);
						//This first section handles an intersection
						switch(state)
						{
							case 5:
							if(thisIntersection == header.next[0])
							{
								console.log('Leaving state machine');
								if(segments.length != 0)newSolids.push(new PolyBezier(segments));
								state = -1;
								break;
							}
							case 0:
							//Even though intersections should alternate. We go to this state at every
							//intersection and decide here which way to go
							if(polyIntersects[thisIntersection].xp >= 0){
								state = 1;
								break;
							}
							state = 3;
							break;
							
							case 1:
							//Add segment from path on A, we are at an intersection, there are two possibilities
							//A 2nd intersection on this segment or not
							//Get the t value for the first intersection
							t1 = polyIntersects[thisIntersection].t[0];
							//get index for path A
							curveIdx = polyIntersects[thisIntersection].idx[0];
							//This intersection is recorded, prepare for next
							thisIntersection = polyIntersects[thisIntersection].next[0];
							//Don't check while adding segments
							//if(thisIntersection == header.next[1])looped = true;
							console.log('Go to next intersection on path A thisIntersection (negative) xp', thisIntersection, polyIntersects[thisIntersection].xp);
							t2 = polyIntersects[thisIntersection].t[0];
							//Is the next intersection on this curve?
							if((curveIdx == polyIntersects[thisIntersection].idx[0]) && (t2 > t1))
							{
								//The next segment has polyIntersects at both ends.
								splitCurve = shapes[0].curves[curveIdx].split(t1,t2);
								segments.push(splitCurve); //Add this segment
								//Next state is an intersection to flip to B
								SSDisplay.logPoint(splitCurve.points[0]);
								state = 5;
								break;
							}
							//Next intersection is not on this segment
							splitCurve = shapes[0].curves[curveIdx].split(t1,1.0);
							segments.push(splitCurve);
							SSDisplay.logPoint(splitCurve.points[0]);
							curveIdx++;
							if(curveIdx >= curveLens[0])curveIdx = 0;
							//This state adds segments from A
							state = 2;
							break;
							
							case 2:
							//At side A curve to be added
							//Add curves up to next intersection, we moved to next intersection in state 1
							while((curveIdx != polyIntersects[thisIntersection].idx[0]) && (iCnt++ < limit))
							{
								pa = shapes[0].curves[curveIdx].points[0];
								console.log('State 2', pa.x, pa.y);
								//No intersection on this curve add it all
								segments.push(shapes[0].curves[curveIdx]);
								SSDisplay.logPoint(shapes[0].curves[curveIdx].points[0]);
								//go to next curve on path
								curveIdx++;
								//Wrap if needed
								if(curveIdx >= curveLens[0])curveIdx = 0;
								//Last segment on A
							}
							//Added curves up to next intersection
							splitCurve = shapes[0].curves[curveIdx].split(0, polyIntersects[thisIntersection].t[0]);
							//Add the last segment on A
							segments.push(splitCurve);
							SSDisplay.logPoint(splitCurve.points[0]);
							//Go flip to B
							state = 5;
							break;
							
							case 3:
							curveIdx = polyIntersects[thisIntersection].idx[1];
							t1 = polyIntersects[thisIntersection].t[1];
							thisIntersection = polyIntersects[thisIntersection].next[1];
							console.log('Go to next intersection on path B xp should now be positive thisIntersection xp', thisIntersection, polyIntersects[thisIntersection].xp);
							//Don't check while adding segments
							//if(thisIntersection == header.next[1])looped = true;
							//Is the other end of this segment the next intersection
							t2 = polyIntersects[thisIntersection].t[1];
							if((curveIdx == polyIntersects[thisIntersection].idx[1]) &&(t2 > t1))
							{
								
								splitCurve = shapes[1].curves[curveIdx].split(t1,t2);
								segments.push(splitCurve);
								SSDisplay.logPoint(splitCurve.points[0]);
								//Next state is an intersection that might be end of path
								state = 5;
								break;
							}
							splitCurve = shapes[1].curves[curveIdx].split(t1,1.0);
							//Add curve from B
							segments.push(splitCurve);
							SSDisplay.logPoint(splitCurve.points[0]);
							curveIdx++;
							if(curveIdx >= curveLens[1])curveIdx = 0;
							//Adding segments from B
							state = 4;
							break;
							
							case 4:
							//Adding segments from B
							while((curveIdx != polyIntersects[thisIntersection].idx[1]) && (iCnt++ < limit))
							{
								segments.push(shapes[1].curves[curveIdx]);
								SSDisplay.logPoint(shapes[1].curves[curveIdx].points[0]);
								curveIdx++;
								if(curveIdx >= curveLens[1])curveIdx = 0;
								//Last segment on B
							}
							//We have added segments up to next intersection
							splitCurve = shapes[1].curves[curveIdx].split(0,polyIntersects[thisIntersection].t[1]);
							segments.push(splitCurve);
							SSDisplay.logPoint(splitCurve.points[0]);
							state = 5;
							break;
						}
					}
				}
			}
		}
		this.solids = newSolids;
		this.holes = newHoles;
	}
	//This gives us the index to the next intersection on the given line.
	//intersections - array of intersections
	//shpIdx - 0->1st curve, 1-> 2nd curve
	//curveIdx - curve index of segment
	//lastT - t of last intersection
	//direction - 1 to search in direction of curve, 0 to go backwards
	//
	//If search up we need to find the first point greater than the lastT
	nextIntersection(intersections, shpIdx, curveIdx, lastT, direction, lastI)
	{
		console.log('shpIdx, curveIdx, lastT, direction lastI', shpIdx, curveIdx, lastT, direction, lastI);
		//let ret = {resIdx:-1, intIdx:-1, t:[0, 0]}; //Nothing found
		let ret = {seg:null, t:[0, 0], last:lastI}; //Nothing found
		let searchT = direction; //Searching up start at 1, searching down at 0
		for(let iIdx = 0; iIdx < intersections.length; iIdx++)
		{
			let seg = intersections[iIdx];
			//console.log('seg',seg);
			if(seg.idx[shpIdx] != curveIdx)continue;
			//console.log('seg match',seg);
			for(let iJdx = 0; iJdx < seg.intersects.length; iJdx++)
			{
				if((lastI[0] == iIdx) && (lastI[1] == iJdx))continue; //Skip the matching one
				let t = seg.intersects[iJdx].split("/").map(v => parseFloat(v));
				//console.log('t',t);
				if(direction != 0)
				{
					//Working up (direction is 1
					//console.log('t lastT searchT', t, lastT, searchT);
					if((t[shpIdx] >= lastT) && (t[shpIdx] <= searchT))
					{
						searchT = t[shpIdx];
						//ret = {resIdx:iIdx, intIdx:iJdx, t:t};
						ret = {seg:seg, t:t, last:[iIdx, iJdx]};
					}
					continue;
				}
				
				if((t[shpIdx] <= lastT) && (t[shpIdx] >= searchT))
				{
					searchT = t[shpIdx];
					//ret = {resIdx:iIdx, intIdx:iJdx, t:t};
					ret = {seg:seg, t:t, last:[iIdx, iJdx]};
				}
			}
		}
		return ret;
	}
	
	intersectPolys(poly1, poly2)
	{
		let intersections = [];
		let tol = 0.05;
		let iCnt = 0;
		do
		{
			iCnt = 0;
			intersections = [];
			//let iAdx = 0;
			for(let iIdx = 0; iIdx < poly1.curves.length; iIdx++)
			{
				let c1 = poly1.curves[iIdx];
				//console.log('c1', c1.points[0].x, c1.points[0].y, c1.points[3].x, c1.points[3].y);
				//console.log('c1', JSON.stringify(c1.points));
				for(let iJdx = 0; iJdx < poly2.curves.length; iJdx++)
				{
					let c2 = poly2.curves[iJdx];
					let xp = utils.crossProdBezier(c1, c2);
					//console.log('c2', c2.points[0].x, c2.points[0].y, c2.points[3].x, c2.points[3].y, xp);
					//console.log('c2',JSON.stringify(c2.points));
					let results = c1.intersects(c2, tol);
					//console.log('results', results);
					for(let iKdx = 0; iKdx < results.length; iKdx ++)
					{
						let t = results[iKdx].split("/").map(v => parseFloat(v));
						intersections.push({t:t, idx:[iIdx, iJdx, iCnt++], xp:xp, prev:[-1,-1],next:[-1,-1]});
					}
					// iCnt += results.length;
					// if(results.length != 0)
					// {
						// intersections.push({intersects:results, idx:[iIdx, iJdx, iAdx++], xp:xp});
					// }
					//console.log('curves', poly1.curves[iIdx].intersects(poly2.curves[iJdx], 0.05));
					//intersections = intersections.concat(poly1.curves[iIdx].intersects(poly2.curves[iJdx], 0.05));
					//console.log('curves', poly1.curves[iIdx], poly2.curves[iJdx]);
				}
			}
			tol /= 2.0;
		}while((tol > 0.05/8) && ((iCnt)%2 != 0) && ((iCnt) != 1));
		if(intersections.length == 0)return intersections;
		//Now we have all the intersections, we will sort them into order along each path and create linked lists
		// First make shallow copies
		let interPoly1 = intersections.slice();
		let interPoly2 = intersections.slice();
		//Now sort these two into path order
		interPoly1.sort(function(a,b){
			if(a.idx[0] == b.idx[0])
			{
				return a.t[0] - b.t[0];
			}
			return a.idx[0] - b.idx[0];
		});
		interPoly2.sort(function(a,b){
			if(a.idx[1] == b.idx[1])
			{
				return a.t[1] - b.t[1];
			}
			return a.idx[1] - b.idx[1];
		});
		//Now we have two sorted lists, build the linked list
		console.log('interPoly1', interPoly1);
		console.log('interPoly2', interPoly2);
		//Index 0 is the header/tail
		let header = {prev:[0,0],next:[0,0]};
		header.next = [interPoly1[0].idx[2], interPoly2[0].idx[2]];
		header.prev = [interPoly1.at(-1).idx[2], interPoly2.at(-1).idx[2]];
		for(let iIdx = 0; iIdx < intersections.length - 1; iIdx++)
		{
			interPoly1[iIdx].next[0] = interPoly1[iIdx + 1].idx[2];
			interPoly2[iIdx].next[1] = interPoly2[iIdx + 1].idx[2];
			interPoly1[iIdx + 1].prev[0] = interPoly1[iIdx].idx[2];
			interPoly2[iIdx + 1].prev[1] = interPoly2[iIdx].idx[2];
		}
		//Close the loops
		interPoly1.at(-1).next[0] = header.next[0];
		interPoly2.at(-1).next[1] = header.next[1];
		interPoly1[0].prev[0] = header.prev[0];
		interPoly2[0].prev[1] = header.prev[1];
		
		//console.log(intersections);
		intersections.push(header);
		return intersections;
	}
	
	logOrient(line)
	{
		if(Math.abs(line.p1.x - line.p2.x) < 0.1)console.log('Vertical', line.p1.x);
		if(Math.abs(line.p1.y - line.p2.y) < 0.1)console.log('Horizontal', line.p1.y);
	}
	
	clonePt(point)
	{
		return {x:point.x, y:point.y};
	}
	
	fixCoincidents(poly1, poly2, dir)
	{
		for(let iP1 = 0; iP1 < poly1.curves.length; iP1++)
		{
			let curve1 = poly1.curves[iP1];
			if(!curve1._linear)continue; //Only lines are checked
						
				
			for(let iP2 = 0; iP2 < poly2.curves.length; iP2++)
			{
				let curve2 = poly2.curves[iP2];
				if(!curve2._linear)continue; //Only lines are checked

				let line1 = {p1:curve1.points[0], p2: curve1.points[curve1.order] };

				let line2 = {p1:curve2.points[0], p2: curve2.points[curve2.order] };
				// console.log('line1', line1.p1.x, line1.p1.y,line1.p2.x,line1.p2.y, curve1.order);
				// console.log('line2', line2.p1.x, line2.p1.y,line2.p2.x,line2.p2.y,curve2.order);
				// this.logOrient(line1);
				// this.logOrient(line2);
				
				let aligned = utils.align(curve2.points, line1);
				//console.log('aligned', aligned);
				//console.log(aligned.some((p) => Math.abs(p.y) > 0.05));
				if(aligned.some((p) => Math.abs(p.y) > 0.1))continue;;
				
				console.log('line1', line1.p1.x, line1.p1.y,line1.p2.x,line1.p2.y, curve1.order);
				console.log('line2', line2.p1.x, line2.p1.y,line2.p2.x,line2.p2.y,curve2.order);
				this.logOrient(line1);
				this.logOrient(line2);
				// console.log('lines intercept match', (line2.p1.y-line1.p1.y));
				
				// console.log('lines');
				// console.log(line1.p1.x, line1.p1.y,line1.p2.x,line1.p2.y);
				// console.log(line2.p1.x, line2.p1.y,line2.p2.x,line2.p2.y);
				
				//The two overlapping lines are on  the same infinite line. Nudge the 2nd line
				//
				poly2.curves[iP2] = curve2.offset(dir)[0];
				curve2 = poly2.curves[iP2];
				console.log('offset', new Bezier(curve2)); //Create a new curve so that it is the only reference
				let lastIdx = iP2 - 1;
				if(lastIdx < 0)lastIdx = poly2.curves.length - 1;
				//Modifiy line1 and 2 to be short connections. line2 has the previous end points
				//line1 = {p1:line2.p1, p2:curve2.points[0]};
				//line2 = {p1:curve2.points[order], p2:line2.p2};
				//console.log('line2',utils.makeline(line2.p1, curve2.points[0]));
				//Is the start point of the new offset in line with the previous line?
				aligned = utils.align([this.clonePt(curve2.points[0])], {p1:this.clonePt(poly2.curves[lastIdx].points[0]), p2:this.clonePt(poly2.curves[lastIdx].points[2])});
				console.log('last curve', poly2.curves[lastIdx], aligned);
				let p1 = this.clonePt(poly2.curves[lastIdx].points[poly2.curves[lastIdx].order]);
				if((Math.abs(aligned[0].y) > 0.1) || (!poly2.curves[lastIdx]._linear))
				{
					//Not in line or previous curve is not a line make link
					console.log('last link');
					poly2.curves.splice(iP2++, 0, utils.makeline(p1, this.clonePt(curve2.points[0])));
				}else
				{
					//poly2.curves.splice(iP2++, 0, utils.makeline(line2.p1, curve2.points[0]));
					//Previous curve is a line and new starting point is in line, extend the previous line
					poly2.curves[lastIdx].points[poly2.curves[lastIdx].order] = this.clonePt(curve2.points[0]);
				}
				let nextIdx = iP2 + 1;
				if(nextIdx >= poly2.curves.length)
				{
					nextIdx = 0;
				}
				//Is the end point of the new curve in line with the next line
				aligned = utils.align([this.clonePt(curve2.points[curve2.order])], {p1:poly2.curves[nextIdx].points[0], p2:poly2.curves[nextIdx].points[3]});
				console.log('next curve', poly2.curves[nextIdx], aligned);
				if((Math.abs(aligned[0].y) > 0.1) || (!poly2.curves[nextIdx]._linear))
				{
					//Not in line or next curve is not a line make link
					console.log('next link');
					poly2.curves.splice(++iP2, 0, utils.makeline(this.clonePt(curve2.points[curve2.order]), this.clonePt(line2.p2)));
				}else
				{
					//Start next line at the end of new offset
					//poly2.curves.splice(++iP2, 0, utils.makeline(curve2.points[curve2.order], line2.p2));
					poly2.curves[nextIdx].points[0] = this.clonePt(curve2.points[curve2.order]);
				}
				
				//poly2.curves.splice(iP2+1, 0, utils.makeline(curve2.points[curve2.order], line2.p2));
				//iP2 += 2; //Step past the inserted segments
			}
			//utils.combineLines(poly2);
		}
	}
}
return Area;
})();
				// if(!curve1.overlaps(curve2))continue; //No overlap
				
				

				// let line1 = {p1:curve1.points[0], p2: curve1.points[curve1.order] };
				// console.log('line1', line1.p1.x, line1.p1.y,line1.p2.x,line1.p2.y, curve1.order);

				// let line2 = {p1:curve2.points[0], p2: curve2.points[curve2.order] };
				// console.log('line2', line2.p1.x, line2.p1.y,line2.p2.x,line2.p2.y,curve2.order);
				
				// let u1 = utils.line_unit_unit(line1);
				// let u2 = utils.line_unit_unit(line2);
				// console.log('u1 u2', u1.x, u1.y, u2.x, u2.y);
				// //Looking for lines going 180
				// if(Math.sign(u1.x) != Math.sign(u2.x))
				// {
					// //If they are 180, this will make them match, if they are perpendicular no
					// u1.x *= -1;
					// u1.y *= -1;
				// }
				// //Now test for the same vector
				// if(Math.abs(u1.x - u2.x) > 0.01)continue;
				// if(Math.abs(u1.y - u2.y) > 0.01)continue;

				// console.log('lines slope match');
				
				// //Now look for 90 degree vector
				// //(if(u1.x*u2.x*u1.y*u2.y < 0)continue;//lines are perpendicular
				// console.log('lines intercept test', u1.y,'*',(line1.p1.x-line2.p1.x),'+',u1.x,'*',(line2.p1.y-line1.p1.y));
				// //console.log('lines intercept match', (line2.p1.y-line1.p1.y));
				
				// //We have parallel lines, the formula below basically compares the intercepts
				// //It has been rearranged to avoid divide by 0
				// if(Math.abs(u1.y*(line1.p1.x-line2.p1.x) + u1.x*(line2.p1.y-line1.p1.y)) > 0.01)continue;
				
				// //console.log('lines intercept match', u1.x*(line1.p1.x-line2.p1.x) + u1.y*(line2.p1.y-line1.p1.y));
				// console.log('lines intercept match', (line1.p1.x-line2.p1.x));

						// let splitCurve;
						// let c1 = poly1.curves[IntersectInfo.seg.idx[0]];
						// let c2 = poly2.curves[IntersectInfo.seg.idx[1]];
						// let cs = [c1, c2];
						// //Get the cross product to determine the direction of the next
						// let xp = (utils.crossProdBezier(c1, c2) >= 0)?1:0;
						// //console.log('xp c1 c2', xp, c1, c2);
						// //We are switching sides at the intersection
						// shpIdx = xp; //Flip between 0 and 1
						// //Get the t for the side we are interested in
						// let lastT = IntersectInfo.t[shpIdx];
						// //Get the curve index for that side
						// curveIdx = IntersectInfo.seg.idx[shpIdx];
						// //We have point one on a curve, check for a second point on that curve
						// IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, 1, IntersectInfo.last);
						// console.log('IntersectInfo 2nd end', IntersectInfo);
						// if(IntersectInfo.seg != null)
						// {
							// splitCurve = shapes[shpIdx].curves[curveIdx].split(lastT, IntersectInfo.t[shpIdx]);
							// console.log('splitCurve',splitCurve);
							// segments.push(splitCurve);
							// if((IntersectInfo.last[0] == startInfo.last[0]) && (IntersectInfo.last[0] == startInfo.last[0]))break;
							// continue;
						// }
						// splitCurve = shapes[shpIdx].curves[curveIdx].split(lastT, 1);
						// //let curves = [splitCurve.left, splitCurve.right];
						// //console.log('xp', xp, curves);
						// //Add the segment in the direction we are going
						// //Note this doesn't work if there is another intersection on this line
						// //Also if we have another intersection we flip to the other curve
						// segments.push(splitCurve);
						
						// //At this point we are at an end point and must move to the next segment

						// //This loop walks to the next intersection, adding segments along the way
						// do
						// {
							// //When we enter this loop, lastT should be set with the t of the intersection
							// //We search for another
							// // IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, xp^1, IntersectInfo.last);
							// // if(IntersectInfo.seg != null)break; //We have a second intersection, go handle it
							
							// // lastT = xp;
							// //Add or subtract based on direction
							// curveIdx += 1;
							// //Do wraparounds
							// //if(curveIdx < 0)curveIdx = curveLens[shpIdx] - 1;
							// if(curveIdx >= curveLens[shpIdx])curveIdx = 0;
							// IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, 1, IntersectInfo.last);
							// console.log('IntersectInfo new end', IntersectInfo);
							// if(IntersectInfo.seg == null)
							// {
								// segments.push(shapes[shpIdx].curves[curveIdx]);
								// lastT = 0;
								// if(iCnt++ >= limit) break;
							// }
						// }while(IntersectInfo.seg == null);
						
						// splitCurve = shapes[shpIdx].curves[curveIdx].split(0, IntersectInfo.t[shpIdx]);
						// segments.push(splitCurve);
						
						// if((IntersectInfo.last[0] == startInfo.last[0]) && (IntersectInfo.last[0] == startInfo.last[0]))break; //We are done
						
						// //There are 4 possibilities
						// // switch(xp+shpIdx)
						// // {
							// // case 0: //On poly1 cross positive
							// // //splitCurve = poly2.curves[iPointcurveIdx].split(ResInfo.t);
							// // break;
							
							// // case 1:
							// // break;
							
							// // case 2:
							// // break;
							
							// // case 3:
							// // break;
						// // }
						// // shpIdx = shpIdx;
						
					// }; //Stop if the loop doesn't close
					// console.log('segments',segments);
					// if(iCnt < limit)
					// {
						// newSolids.push(new PolyBezier(segments));
					// }
				// }
				// newSolids.push(poly2);
		// let newSolids = [];
		// for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		// {
			// let poly1 = this.solids[iIdx];
			// //console.log('poly1', poly1);
			// for(let iJdx = 0; iJdx < area2.solids.length; iJdx++)
			// {
				// let poly2 = area2.solids[iJdx];
				// this.fixCoincidents(poly1, poly2);
				// area2.solids[iJdx] = poly2;
				// //newSolids.push(poly2);
			// }
		// }
		// //this.solids = newSolids;
		// //return;
		
		// for(let iIdx = 0; iIdx < this.solids.length; iIdx++)
		// {
			// let poly1 = this.solids[iIdx];
			// //console.log('poly1', poly1);
			// for(let iJdx = 0; iJdx < area2.solids.length; iJdx++)
			// {
				// let poly2 = area2.solids[iJdx];
				// let polyIntersects = this.intersectPolys(poly1, poly2);
				// //let polyIntersects = poly1.curves[iIdx].intersects(poly2.curves[iJdx], 0.05);
				// if(polyIntersects.length <= 0)
				// {
					// // console.log('No intersections');
					// // console.log(poly1.contains(poly2.curves[0].points[0]));
					// // console.log(poly2.contains(poly1.curves[0].points[0]));
					// //Is a point in shape2 inside shape 1
					// if(poly1.contains(poly2.curves[0].points[0]))
					// {
						// newSolids.push(poly2);
						// continue;
					// }
					// //Is a point in shape1 inside shape 2
					// if(poly2.contains(poly1.curves[0].points[0]))
					// {
						// newSolids.push(poly1);
						// continue;
					// }
				// }else
				// {
					// console.log('polyIntersects', polyIntersects);
					// //We have intersections, create a new shape.  We should be able to walk the
					// //segments and create a closed shape.  We start with the first intersection.
					// //When we leave the intersection we will be on the path that goes inside.
					// //At each intersection the inside path will be on the opposite shape in the
					// //direction determined by the cross product.  In between intersections we follow
					// //the curve in the direction determined
					// let segments = [];
					// //This allows us to reference the two shapes by index allowing math
					// //Start with both cw.  This makes the algorithm much easier.  First of all we need no cross product.
					// //All intersections act the same.  We will always take the right hand branch.  Another advantage
					// //is that we are walking both curves in the forward direction.  No flipping needed.
					// // if(!poly1.cw)poly1.reverse();
					// // if(!poly2.cw)poly2.reverse();
					// let shapes = [poly1, poly2];
					// //console.log('cws', poly1.cw, poly2.cw);
					// //This could be done with the above array
					// let curveLens = [poly1.curves.length, poly2.curves.length];
					// //Start on shape 0 (poly1)
					// let shpIdx = 0;
					// //Get the curve index for the first intersection
					// let curveIdx = polyIntersects[0].idx[shpIdx];
					// //Find the intersection above, or one closer, it doesn't matter we choose the curveIdx
					// //of the first intersection to find a curve that definitely had an intersection.
					// //We don't necessarily need that intersection
					// //We search forward on that line
					// let IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, 0, 1, [-1,-1]);
					// console.log('IntersectInfo 1st time', IntersectInfo);
					// // let c1 = poly1.curves[IntersectInfo.seg.idx[0]];
					// // let c2 = poly2.curves[IntersectInfo.seg.idx[1]];
					// //Record the info on this first intersection.  We are done when we get back to it
					// let startInfo = IntersectInfo;
					// //let splitCurve = poly1.curves[curveIdx].split(IntersectInfo.t);
					// //Defensive programming, stop any possible endless loops. 
					// let limit = poly1.curves.length + poly2.curves.length;
					// //Counter to compare with limit
					// let iCnt = 0;
					// //The direction we are walking along the curve
					// //let dir =[1, -1];
					// //let cws = [poly1.cw?1:0, poly2.cw?1:0];
					// //if(cws[1])dir[1] = 1;
					// //The direction determines how the cross product works. When curve 1 is
					// // Curve  Dir in/out inside oppCurveDir
					// //  1     CW   out     left
					// //  1     CW    in     left
					// //
					// // Dir 1 dir 2  xp
					// // F     r-l    +
					// // B     r-l    -
					// // F     l-r    =
					// // B     l-r    +
					// //let xp = poly1.cw?0:1;
					
					// //Direction is determined by cross product and direction we are approaching
					
					// //let t = result.split("/").map(v => parseFloat(v));
					// //When we get to the first intersection, we will be picking up the segment on
					// //the inside. It will be on the opposite shape from the shpIdx. We have
					// //assumed the segment on shpIdx = 0 is outside and that we will be picking
					// //up shpIdx = 1;  This test shows that shpIdx is on the inside and that we
					// //must flip to shpIdx = 1
					// if(!poly2.contains(poly1.curves[curveIdx].points[0]))
					// {
						// console.log('Start 0n curve 0');
						// shpIdx = 1;
						// //dir[1] = -1;
						
					// }
					// // console.log('test', poly2.contains(poly1.curves[curveIdx].points[0]));
					// while(iCnt++ < limit)
					// {
						// //This first section handles an intersection
						// let splitCurve;
						// let c1 = poly1.curves[IntersectInfo.seg.idx[0]];
						// let c2 = poly2.curves[IntersectInfo.seg.idx[1]];
						// let cs = [c1, c2];
						// //Get the cross product to determine the direction of the next
						// //xp = dir[shpIdx]^(utils.crossProdBezier(c1, c2) >= 0)?0:1;
						// //console.log('xp c1 c2', xp, c1, c2);
						// //We are switching sides at the intersection
						// shpIdx = shpIdx ^ 1; //Flip between 0 and 1
						// //Get the t for the side we are interested in
						// let lastT = IntersectInfo.t[shpIdx];
						// //Get the curve index for that side
						// curveIdx = IntersectInfo.seg.idx[shpIdx];
						// //We have point one on a curve, check for a second point on that curve
						// IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, 1, IntersectInfo.last);
						// console.log('IntersectInfo 2nd end', IntersectInfo);
						// if(IntersectInfo.seg != null)
						// {
							// splitCurve = shapes[shpIdx].curves[curveIdx].split(lastT, IntersectInfo.t[shpIdx]);
							// console.log('splitCurve',splitCurve);
							// segments.push(splitCurve);
							// if((IntersectInfo.last[0] == startInfo.last[0]) && (IntersectInfo.last[0] == startInfo.last[0]))break;
							// continue;
						// }
						// splitCurve = shapes[shpIdx].curves[curveIdx].split(lastT, 1);
						// //let curves = [splitCurve.left, splitCurve.right];
						// //console.log('xp', xp, curves);
						// //Add the segment in the direction we are going
						// //Note this doesn't work if there is another intersection on this line
						// //Also if we have another intersection we flip to the other curve
						// segments.push(splitCurve);
						
						// //At this point we are at an end point and must move to the next segment

						// //This loop walks to the next intersection, adding segments along the way
						// do
						// {
							// //When we enter this loop, lastT should be set with the t of the intersection
							// //We search for another
							// // IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, xp^1, IntersectInfo.last);
							// // if(IntersectInfo.seg != null)break; //We have a second intersection, go handle it
							
							// // lastT = xp;
							// //Add or subtract based on direction
							// curveIdx += 1;
							// //Do wraparounds
							// //if(curveIdx < 0)curveIdx = curveLens[shpIdx] - 1;
							// if(curveIdx >= curveLens[shpIdx])curveIdx = 0;
							// IntersectInfo = this.nextIntersection(polyIntersects, shpIdx, curveIdx, lastT, 1, IntersectInfo.last);
							// console.log('IntersectInfo new end', IntersectInfo);
							// if(IntersectInfo.seg == null)
							// {
								// segments.push(shapes[shpIdx].curves[curveIdx]);
								// lastT = 0;
								// if(iCnt++ >= limit) break;
							// }
						// }while(IntersectInfo.seg == null);
						
						// splitCurve = shapes[shpIdx].curves[curveIdx].split(0, IntersectInfo.t[shpIdx]);
						// segments.push(splitCurve);
						
						// if((IntersectInfo.last[0] == startInfo.last[0]) && (IntersectInfo.last[0] == startInfo.last[0]))break; //We are done
						
						// //There are 4 possibilities
						// // switch(xp+shpIdx)
						// // {
							// // case 0: //On poly1 cross positive
							// // //splitCurve = poly2.curves[iPointcurveIdx].split(ResInfo.t);
							// // break;
							
							// // case 1:
							// // break;
							
							// // case 2:
							// // break;
							
							// // case 3:
							// // break;
						// // }
						// // shpIdx = shpIdx;
						
					// }; //Stop if the loop doesn't close
					// console.log('segments',segments);
					// if(iCnt < limit)
					// {
						// newSolids.push(new PolyBezier(segments));
					// }
				// }
					// //intersections.push({ia:results, idx1:iIdx, idx2:iJdx});
				// //intersections.concat(this.intersectPolys(this.solids[iIdx], area2.solids[iJdx]));
			// }
			// this.solids = newSolids;
		// }
		
		// // if(interssections.length == 0)
		// // {
			// // //WAIT!! we need to handle one curve enclosing the other. The test is reasonably simple
			// // //Actually that needs to be determined in every case where there are no intersections
			// // //It should be done above
			// // this.solids = [];
			// // return;
		// // }

		// // In an intersection operation, we keep all
		// // segments of A within B and all B within A
		// // (The rest must be redundant)
		// // We outsideness-test only one segment in each path
		// // and the segments before and after any node
		// //let newSolids = [];
		// // for(let iIdx = 0; iIdx <)
		// // {
			
		// // }

