//import { utils } from "./utils.js";
const PolyBezier = (function(){
/**
 * Poly Bezier
 * @param {[type]} curves [description]
 */
class PolyBezier {
  constructor(curves) {
    this.curves = [];
    this._3d = false;
    if (!!curves) {
		if(curves.constructor.name == 'PolyBezier')
		{
			//console.log('Cloning a PolyBezier', curves);
			for(let iIdx = 0; iIdx < curves.curves.length; iIdx++){
				this.curves.push(new Bezier(curves.curves[iIdx]));
			}
		}else
		{
			this.curves = curves;			
		}
      //if(this.curves[0]._3d != 'undefined')this._3d = this.curves[0]._3d;
    }
	let cwCnt = 0;
	//console.log(this.curves);
	let startp = this.curves[0].points[0];
	for(let iIdx = 1; iIdx < this.curves.length; iIdx++){
		let curve =  this.curves[iIdx];
	    let angle = utils.angle(curve.points[0], startp, curve.points[curve.order]);
		cwCnt += (angle > 0)?1:-1;		
		startp = curve.points[0];
	}

	// curves.forEach(function(curve){
		// //console.log("PolyBezier curve.clockwise", curve.clockwise);
		// cwCnt += (curve.clockwise)?1:-1;
	// });
	this.cw = (cwCnt >= 0);
	//console.log("PolyBezier cw", cwCnt, this.cw);
  }

  valueOf() {
    return this.toString();
  }

  toString() {
    return (
      "[" +
      this.curves
        .map(function (curve) {
          return utils.pointsToString(curve.points);
        })
        .join(", ") +
      "]"
    );
  }

  addCurve(curve) {
    this.curves.push(curve);
    this._3d = this._3d || curve._3d;
  }

  length() {
    return this.curves
      .map(function (v) {
        return v.length();
      })
      .reduce(function (a, b) {
        return a + b;
      });
  }

  curve(idx) {
    return this.curves[idx];
  }

  bbox() {
    const c = this.curves;
    var bbox = c[0].bbox();
    for (var i = 1; i < c.length; i++) {
      utils.expandbox(bbox, c[i].bbox());
    }
    return bbox;
  }
  
	//Some discussion, at an intersection we are crossing another curve.  There are four possible transitions for a curve
	//One, the curve was inside and passes to the outside.
	//Two, the curve was outside the closed shape and it passes to the inside.
	//Three, the curve is inside and stays inside.
	//Four, two outside lines cross. This is theoretically possible, but shouldn't occur in an offset shape
	//The second transition is always true if the curve is outside.
	//The third transition is always true if both curves are inside
	//The first transition is where the magic happens.  Defining it will be key.
	//We will code these transitions by using bits to represent the state of the line at that intersection.
	//Bit 0 is the state entering and bit 1 the state leaving. 0 indicates outside and 1 inside
	// a 0 initializes
	// 1 going from inside to out
	// 2 going from outside to in
	// 3 staying inside
	//
	// Another note at an intersection where an outside line goes inside the other line must pick
	// up and become the outside line.  The path goes in the same direction for all curves so
	// a 1 transition must be matched to a 2 transition and visa versa.  If that is not possible then
	// it must be a 3 to a 3
	//
	// Another factor is the cross product.  For a path going inside (transition 2) it is positive.
	// A path going outside (transition 1) is negative. For crossing paths that stay inside or
	// outside the 1st cross is negative. At any given intersection the number of positive crosses
	// must equal the number of negative in the path between the two intersecting segments.
	//
	// Let us walk a path with some possible transitions. The path will start outside and go inside
	// it will make a loop inside and then
	//
	// This routine is to be called twice.  On the first pass all transitions are 0 and can get no
	// information from the matching intersection.  The 2nd pass will resolve the
	determineTransitions(intersections, lastTransition) {
		for(let iIdx = 0; iIdx < intersections.length; iIdx++){
			let iThis = intersections[iIdx];
			if(iThis.iCode < 0){
				//Intersection with inner shape.  There is no xref
				//Just set the last transition to indicate we are inside for sure
				lastTransition = 3;
				continue;
			}
			switch(lastTransition){
				
				//These last transitions indicate the path went or stayed inside at the previous intersection
				case 2:
				case 3:
				let otherTransition = intersections[iThis.xref].transition;
				if(otherTransition == 3){
					iThis.transition = 3;
				}else{
					iThis.transition = 1;
					intersections[iThis.xref].transition = 2;
				}
				break;
				
				case 0: //Assumed to be outside
				case 1: //Went outside at the last transition
				iThis.transition = 2;  //Going inside
				intersections[iThis.xref].transition = 1; //Going outside
				break;
				
			}
			lastTransition = iThis.transition;
		}
		return lastTransition;
	}
	
	getOuterPath(offset, intersections){
		let outerOffset = [];
		let iCdx = 0;
		for(let iIdx = 0; iIdx < intersections.length; iIdx++){
			let inter1 = intersections[iIdx];
			if(inter1.routed != undefined)continue;
			
			inter1.routed = true;
			switch(inter1.transition){
				case 0: //Shouldn't happens
				//console.log("getOuterPath 0 transition found at intersection ", iIdx, inter1);
				continue;
				
				case 1:
				//Start of a path
				break;
				
				case 2:
				continue; //Going inside
				break;
				
				case 3:
				continue; //Not on a path
				break;
			}
			
			//We get here when we have an intersection where we are going to the outside
			//This intersection is in a curve, it could have another intersection on it.
			//If so the next intersection should be going inside
			//If not we should be following the path to the next intersection
			let nextIdx = iIdx + 1;
			if(nextIdx >= intersections.length)nextIdx = 0;
			
			while(nextIdx != iIdx){
				iCdx++;
				if(iCdx >= 20)return outerOffset;
				//console.log("getOuterPath inter1", inter1);
				let thisC = inter1.refC;
				let curve = offset[thisC];
				let nextInter2 = intersections[nextIdx];
				nextInter2.routed = true;
				//console.log("getOuterPath nextInter2", nextInter2);
				//console.log("getOuterPath inter1, nextInter2", inter1, nextInter2);
				//console.log("getOuterPath inter1.th, nextInter2.th", inter1.th, nextInter2.th);
				if(nextInter2.transition == 3){
					//We are going on the inside
					break;
				}
				if(nextInter2.transition != 2){
					console.log("getOuterPath intersection transition is not the expected 2", nextIdx, nextInter2);
				}
				if(thisC == nextInter2.refC){
					console.log("getOuterPath inter1.th, nextInter2.th", inter1.th, nextInter2.th);
					if(inter1.th != nextInter2.th)outerOffset.push(curve.split(inter1.th, nextInter2.th));
				}else{
					//console.log("getOuterPath curve.split(inter1.th, 1)", inter1.th, curve.split(inter1.th, 1));
					outerOffset.push(curve.split(inter1.th, 1));
					thisC++;
					if(thisC >= offset.length)thisC = 0; 
					while(thisC != nextInter2.refC){
						console.log("getOuterPath offset[thisC]", offset[thisC]);
						outerOffset.push(offset[thisC]);
						thisC++;
						if(thisC >= offset.length)thisC = 0; 
					}
					curve = offset[thisC];
				}
				//We are the curve with the next intersection
				if(inter1.refC == nextInter2.refC){
					if(inter1.iCode < 0){
						//We should not be
						console.log("trying to put inner path on outer path", inter1);
						return outerOffset;
					}
					console.log("getOuterPath curve.split(inter1.th, nextInter2.th)", inter1.th, nextInter2.th, curve.split(inter1.th, nextInter2.th));
					if(inter1.th != nextInter2.th)outerOffset.push(curve.split(inter1.th, nextInter2.th));
				}else{
					//console.log("getOuterPath curve.split(0, nextInter2.th)", nextInter2.th, curve.split(0, nextInter2.th));
					if(nextInter2.th != 0)outerOffset.push(curve.split(0, nextInter2.th));
				}
				
				nextIdx = nextInter2.xref;
				if(nextIdx == iIdx)break;
				inter1 = intersections[nextIdx];
				inter1.routed = true;
				if(inter1.transition != 1){
					console.log("getOuterPath linked intersection transition is not the expected 1", nextIdx, inter1);
				}
				
				nextIdx++;
				if(nextIdx >= intersections.length)nextIdx = 0;
			}
			//console.log("getOuterPath a path", outerOffset);
			return outerOffset;
		}
		return null;
	}

  static NO_JOIN = 0;
  static MITER_JOIN = 1;
  static CORNER_JOIN = 2;
  static RADIUS_JOIN = 3;
	
  /*
  * This function as written does not take into account the gaps and overlaps
  * between offset curves. The join parameter fixes this.
  *
  * Previously we did the join and then searched for intersections.  We are going
  * to reverse the order.  There are a couple of advantages. One the intersection
  * search will remove some joints.  Second it will leave simpler joints.
  *
  * The intersection search will do two things. One it will remove parts past the
  * odd number intersections. Two it will create new polys after even number.
  * The algorithm might need to be fine tuned, but initially it will be assumed
  * the starting point is on a curve to be saved.  The intersection numbering is
  * tricky.  The search algorithm searches forward from a given segment to find
  * other segments that intersect.  If there are no other intersections before
  8 getting to the second segment, then the intersection is odd and the segments
  * are removed.  If another intersection is found, it is even and the segments
  * following it are kept.
  *
  * We will do the intersection search in two steps.  First we will find and number.
  * Then we will split and remove and generate new polys.
  *
  * Looking at some curves and one can see that the numbering rule is not a complete
  * solution.  One can find examples where it does not work.  The clue is that there
  * is an "inside" and an "outside".  If the curve crosses into the inside both sides
  * of it are "inside". A curve that crosses it does not go "outside".  So one instead
  * of numbers one must track the "inside" and "outside" of a curve.
  *
  * Each intersection has two or more lines crossing.  These lines are all split at the
  * intersection. Of the 4 or more lines only lines are adjacent to a line that has the
  * "outside" on the same side. Normally, this means that at most two lines are on the
  * "outside". It is possible for multiple curves to kiss and have more than 2 "outside"
  * lines.  This would be very rare.  If the logic of adjacent "outsides" is applied
  * correctly, this condition would be detected.
  *
  * More discussion about algorithm.  As we travel around the loop, the first time we
  * get to an intersection we only "know" the
  *
  * At a higher level, winding rules would apply.  We are not going use them here. At
  * this level we will assume that "inside" is the side closest to the curve and the
  * "outside" is the side further out. By definition a positive offset is to the right
  * of the direction of travel.
  */
  offset(d, jtype, cp) {
//	if(jtype === undefined)var jtype = PolyBezier.NO_JOIN;

    const offset = [];
    this.curves.forEach(function (v) {
      offset.push(...v.offset(d)); //Equivalent to offset = offset.concat(segOffsets);
    });
	//This is the original offset
	if(jtype === undefined)return [new PolyBezier(offset)];
	
	let iIdx = 0;
	while(iIdx < offset.length){
		//iIdx = utils.join(offset, iIdx, PolyBezier.MITER_JOIN, d);
		iIdx = utils.join(offset, iIdx, jtype, d, this.cw, cp);
	}
	//return [new PolyBezier(offset)];
	if(jtype == PolyBezier.NO_JOIN)return [new PolyBezier(offset)];
	//We can clear out the obvious
	//Before looking for intersections remove paths that cross the offset curve
	//return new PolyBezier(offset);
	//Now we search for intersections
	// let inout = (d < 0)?-1:1;
	// for(iIdx = 0; iIdx < offset.length; iIdx++){
		// offset[iIdx].orient = {r:inout, l:-inout};
		// offset[iIdx].intersections = [];
	// }
	//Walk the curve segments looking for intersections with other segments
	let intersections = [];
	let points = [];
	let iCode = 0;
	for(let iC1dx = 0; iC1dx < offset.length; iC1dx++){
		let c1 = offset[iC1dx];
		//Look at all the segments that follow this one.  Don't need to look the one before
		//those intersections have already been found
		for(let iC2dx = iC1dx + 1; iC2dx < offset.length; iC2dx++){
			let c2 = offset[iC2dx];
			let intersect = c1.intersects(c2, Math.abs(d/100));
			for(let iIdx = 0; iIdx < intersect.length; iIdx++){
				let t = intersect[iIdx].split("/").map(v => parseFloat(v));
				//The sign of the cross product tells us which way the lines crossed.
				let xp = utils.crossProdBezier(c1, c2);
				intersections.push({th:t[0], tt:t[1], refC:iC1dx, cross:xp, transition:0, iCode:iCode});
				intersections.push({th:t[1], tt:t[0], refC:iC2dx, cross:-xp, transition:0, iCode:iCode});
				iCode++; //New code for next intersection
				points.push(c1.get(t[0]));
				//Record this intersection on 1st segment
				// let xref1 = c1.intersections.length;  //The next index on c1
				// let xref2 = c2.intersections.length;  //The next index on c2
				// //xrefC and xrefI allow one to find the same intersection on the other curve
				// c1.intersections.push({th:t[0], tt:t[1], xrefC:iC2dx, xrefI:xref2, cross:xp, out:true});
				// //Record this intersection on 2nd segment
				// c2.intersections.push({th:t[1], tt:t[0], xrefC:iC1dx, xrefI:xref1, cross:-xp, out:true});
			}
		}
	}
	let innerPoints = [];
	for(let iC1dx = 0; iC1dx < offset.length; iC1dx++){
		let c1 = offset[iC1dx];
		for(let iC2dx = 0; iC2dx < this.curves.length; iC2dx++){
			let cinner = this.curves[iC2dx];
			let intersect = c1.intersects(cinner, Math.abs(d/100));
			for(let iIdx = 0; iIdx < intersect.length; iIdx++){
				let t = intersect[iIdx].split("/").map(v => parseFloat(v));
				//The sign of the cross product tells us which way the lines crossed.
				let xp = utils.crossProdBezier(c1, cinner);
				intersections.push({th:t[0], tt:t[1], refC:iC1dx, cross:xp, transition:3, iCode:-1});
				innerPoints.push(c1.get(t[0]));
			}
		}
	}
	//Sort all the intersections by curve index and th.  They will be in the order that we would see walking the path
	intersections.sort(function(a,b){
		let idxDiff = a.refC - b.refC;
		if(idxDiff != 0)return idxDiff;
		
		return (a.th - b.th);
	});
	// for(let iC1dx = 0; iC1dx < offset.length; iC1dx++){
		// let c1 = offset[iC1dx];
		// c1.intersections.sort(function(a,b){
			// let idxDiff = a.refC - b.refC;
			// if(idxDiff != 0)return idxDiff;
			
			// return (a.th - b.th);
		// });
	// }
	//Use the codes to create xrefs
	for(iIdx = 0; iIdx < intersections.length; iIdx++){
		//
		let i1 = intersections[iIdx];
		if(i1.iCode < 0)continue; //Intersection with inner curves
		//console.log("Poly offset intersection ", i1);
		if(i1.xref != undefined)continue; //Already found
		for(let iI2dx = iIdx + 1; iI2dx < intersections.length; iI2dx++){
			let i2 = intersections[iI2dx];
			if(i2.iCode < 0)continue; //Intersection with inner curves
			if(i1.iCode == i2.iCode){
				//We have found the match
				i1.xref = iI2dx;
				i2.xref = iIdx;
				break;
			}
		}
	}
	let iT = "";
	for(iIdx = 0; iIdx < intersections.length; iIdx++){
		iT += intersections[iIdx].transition.toString();
	}
	console.log(iT);
	//We now have all the intersections recognized and organized
	//Let us find and mark all of the interior paths (paths that intersect
	//the curves being outlined)
	//Some tricky logic.  We want to make the transitions on the inner
	//intersections depend on the onInnerPath state
	let onInnerPath = false; //We start outside
	let bTransitionOut = false;;
	let iPrevInter = intersections[intersections.length - 1];
	for(iIdx = 0; iIdx < intersections.length; iIdx++){
		let iThis = intersections[iIdx];
		if(onInnerPath){
			//Looking for a transition out.
			if(iThis.iCode < 0){
				onInnerPath = false;
				bTransitionOut = true;
			}else{
				//Mark everything on inner path as in
				iThis.transition = 3;
				bTransitionOut = false;
			}
		}else{
			//Looking for a transition in.
			if(iThis.iCode < 0){
				onInnerPath = true;
				if(iPrevInter.iCode >= 0){
					iPrevInter.transition = 2;
				}
			}else{
				if(bTransitionOut){
					iThis.transition = 1;					
				}
			}
			bTransitionOut = false;
		}
		iPrevInter = iThis;
	}
	iT = "";
	for(iIdx = 0; iIdx < intersections.length; iIdx++){
		iT += intersections[iIdx].transition.toString();
	}
	console.log(iT);
	//We can remove all the paths that intersect the original shape
//	let innerIntersections = [];
	
	//Now we can adjust the curves and remove inner loops.
	let lastTransition = 0;
	//1st pass to populate transitions with tentative values 
	//lastTransition = this.determineTransitions(intersections, lastTransition);
	//2nd pass to resolve tentative values
	lastTransition = this.determineTransitions(intersections, lastTransition);
	let offsetCurves = [];
	let offsetCurve = this.getOuterPath(offset, intersections);
	while(offsetCurve != null){
		offsetCurves.push(new PolyBezier(offsetCurve));
		offsetCurve = this.getOuterPath(offset, intersections);
	}
    return [offsetCurves, points, innerPoints];
	// for(let iC1dx = 0; iC1dx < offset.length; iC1dx++){
		// let c1 = offset[iCdx];
		// for(iIdx = 0; iIdx < c1.intersections.length; iIdx++){
			// //Here we go
			// let c1i = c1.intersections[iIdx];
			// let c2i = offset[c1i.xrefC].intersections[c1i.xrefI];
		// }
	// }
	// let iIdx = 0;
	// while(iIdx < offset.length){
		// iIdx = utils.join(offset, iIdx);
	// }
	// if(jtype != 0){
		// let iIdx = 0;
		// while(iIdx < offset.length){
			// iIdx = utils.join(offset, iIdx);
		// }
		// //Now search for intersections
		// // iIdx = 0;
		// // let remove = true;
		// // for(; iIdx < offset.length; iIdx++){
			// // let c1 = offset[iIdx];
			// // //console.log("poly offset :", c1.points);
			// // for(let iKdx = iIdx + 2; iKdx < offset.length; iKdx++){
				// // let intersect = c1.intersects(offset[iKdx], 2);
				// // if(intersect.length == 0){
					// // //if(remove)offset.splice(iIdx, 1);
					// // continue;
				// // }
				// // //We have an intersections
				// // let t = intersect[0].split("/").map(v => parseFloat(v));
				// // let new1 = c1.split(0, t[0]);
				// // let new2 = offset[iKdx].split(t[1], 1);
				// // //console.log("offset join news :",iIdx,iKdx,new1,new2);
				// // offset.splice(iIdx, iKdx + 1 - iIdx, new1, new2);
				// // //iIdx++
				// // break;
			// // }
		// // }
	// }
    // return new PolyBezier(offset);
  }
  
  contains(p){
	  let bbox = this.bbox();
	  if(p.x < bbox.x.min)return false;
	  if(p.x > bbox.x.max)return false;
	  if(p.y < bbox.y.min)return false;
	  if(p.y > bbox.y.max)return false;
	  
	  //The point is inside the bounding box, it could be inside the shape
	  let intersections = [];
	  let line = {p1:p, p2:{x:p.x, y:bbox.y.max + 1}};
	  for(let iIdx = 0; iIdx < this.curves.length; iIdx++){
		  intersections = intersections.concat(this.curves[iIdx].lineIntersects(line));
	  }
	  if(intersections%2 == 0)return false;
	  
	  //Odd number of intersections
	  return true;
   }
   
   reverse(){
	   //console.log('PolyBezier.reverse');
	   this.curves.reverse();
	   for(let iIdx = 0; iIdx < this.curves.length; iIdx++){
		   this.curves[iIdx].reverse();
	   }
	   this.cw = !this.cw;
	   //console.log(this);
	   return this;
   }
}
return PolyBezier;
})();
//export { PolyBezier };
