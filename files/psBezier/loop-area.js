/*
* loop-area.js
* { start_t: global_t, end_t: global_t + length, PolyBezier: poly, direction: poly.cw, firstIntersection: null }
* Using the bezier library convention of adding a dash to the file name, this file is named loop-area.js. It is a utility class
* that it used to track information about loops in the Path class. It is a utility class that does not need to maintain any state.
* The Path class is used to define an Area. By definition an area is a closed loop. This class is used to track information about
* loops in the Path class.
*
* We are going to change the LoopArea class to have greater resposibilites. We have decided to change the Area class to operate on
* loops. This will allow us to use the Area class to operate on the loops in the Path class. Now we will want to find the intersections
* between two loops. We would like to have the same functionality for loops that we have for paths. We will need to track the
* intersections between loops. We will need to track the direction of the loop. We will need to track if the loop has been intersected.
* We will have global 't' values for the loop. We will have the getPoint and the split methods for the loop.
*
* At its core a Path is an array of bezier curves. The beziers are grouped into closed loops. Each closed loop also has an associated
* PolyBezier object. This allows for bezier library operations. In particular, the PolyBezier class has the contains method that can
* be used to determine if a point is inside the loop. One can operate on Beziers using the 't' parameter. This is useful for things
* like getting a point on the bezier or splitting the bezier between two 't' values. We have extended the 't' parameter to the the
* array of beziers in the Path. This allows us to operate on the entire Path using the 't' parameter. It is useful to describe the
* loop's position in the array by global 't' values. This is one of the things that the LoopArea class does.
*
* Another important thing that the LoopArea class does is to track the direction of the loop. This is important because the direction
* of the loop determines the inside and outside of the loop. The bezier library uses the convention that the inside of the loop is
* clockwise. This is the convention used by the SVG path data.
*
* When we find the intersections of a Path with another Path, we have implemented a linked list of intersections. The linked list
* is looped. The LoopArea class is used to track the first intersection in the loop giving us a way to get into the loop and iterate
* through the intersections.
*
* Lastly, if the loop has no intersections with the other path, we need to know that to proper process the loop. The LoopArea class
* is used to track this information.
*/
// files/psBezier/loop-area.js
/**
 * Utility class to track information about loops in the Path class.
 */
import { Intersection } from './intersection-area.js';
import { PolyBezier } from "./poly-bezier.js";
import { utils } from "./utils.js";
import BezierDebugTools from './debug_bezier.js';


class LoopArea
{
    /**
     * @param {number} loop_start_t - The global 't' value of the start of the loop.
     * @param {number} loop_end_t - The global 't' value of the end of the loop.
     * @param {PolyBezier} poly - The PolyBezier object of the loop.
     * @param {boolean} direction - The direction of the loop (true if clockwise).
     * @param {Intersection} firstIntersection - The first intersection in the loop.
     * @param {Intersected} intersected - Boolean indicating if the loop has been intersected.
     */

    //We changed start_t to loop_start_t and end_t to loop_end_t to avoid confusion with the variable
    //names in the Intersection class
    constructor(loop_start_t, loop_end_t, poly, direction, firstIntersection, intersected = false)
    {
        this.intersections = [];
        //Clone constructor
        if (loop_start_t instanceof LoopArea)
        {
            let loop = loop_start_t;
            this.loop_start_t = loop.loop_start_t;
            this.loop_end_t = loop.loop_end_t;
            this.poly = new PolyBezier(loop.poly);
            this.poly.removeZeroLengthSegments(0.01);
            this.direction = loop.direction;
            this.firstIntersection = loop.firstIntersection;
            this.intersected = loop.intersected;
            this.unchanged = loop.unchanged;
            return;
        }
        //Implied else

        this.loop_start_t = loop_start_t;
        this.loop_end_t = loop_end_t;
        this.poly = poly;
        poly.removeZeroLengthSegments(0.01);
        this.direction = direction;
        this.firstIntersection = firstIntersection;
        this.intersected = intersected;
        this.unchanged = false;
    }

    toSVG()
    {
        return this.poly.toSVG();
    }

    bbox()
    {
        return this.poly.bbox();
    }

    isInside(point)
    {
        return this.poly.contains(point);
    }

    getPoint(global_t)
    {
        return this.poly.get(global_t);
    }

    getMidPoint(firstT, secondT)
    {
        if (firstT < secondT)
        {
            return this.getPoint((firstT + secondT) / 2);
        }
        //Implied else

        //This is the wrap around case. We need to find the start of the overlap
        //The average of the two t values is the midpoint at exactly 1/2 around the loop
        //We need to find the midpoint at 1/2 around the loop
        //If we are in the first half of the loop, we need to add 1/2 to the average
        //If we are in the second half of the loop, we need to subtract 1/2 from the average
        //Note that this logic will handle the case of equal t values
        let average = (firstT + secondT) / 2;
        let midT = this.loop_end_t / 2;
        if (average > midT) return this.getPoint(average - midT);

        return this.getPoint(average + midT);

    }

    split(global_t1, global_t2)
    {
        return this.poly.split(global_t1, global_t2);
    }

    /*
    * This function should ultimately be part of the PolyBezier class. The idea of a global_t should be part of the PolyBezier class.
    * At this time we have implemented the global_t as a property of the LoopArea class. More importantly, is the method of finding the
    * overlaps. Part of that is the bezierLocalToGlobal function. This function is used to find the raw intersections between two loops.
    * We are using the bezier library to find the intersections. We depend on the way that overlaps are handled. The bezier library will
    * return the intersections between two curves. It will also return the overlaps. The overlaps are returned as a series of intersections
    * that indicate the overlap. There are ways to detect overlaps more efficiently. In particular, if we have two lines that overlap, we
    * can mathematically determine the overlap. We need a different way to encode the overlap. We need to know the start and end of the overlap.
    * In fact, doing some of the overlap processing earlier will make the processIntersections function simpler and more efficient. For example,
    * two curves that have the same start, end nad control points are the same curve. We can detect this and avoid the intersection calculation.
    * This is not an uncommon case. For example, the Area operation will do splits on loops and use parts of the loops to create new loops.
    * The new loop may be used against the original loop. When we 'cut' a loop to match a shutter, the intercepted area is the area to be removed.
    * When we 'remove' the are, we do a subtraction. The area to be removed is the area to be subtracted. That area will have coincidental edges
    * with the original area. It is likely that some curves are the same. Detecting this will make the process more efficient. We can also detect
    *
    * We have added a mechanism to encode overlaps. The intersection following an overlap will have the ov property set to true. This will be
    * equivalent to being closer than the gap tolerance. I am going to change the ov property to encode a little more. Instead of the boolean
    * two states, I am going to use three states. The three states are 0, 1, and 2. 0 will indicate that the intersection is not part of an overlap.
    * 1 will indicate the start of an overlap. 2 will indicate the end of an overlap. This will allow us to detect overlaps more efficiently. More 
    * importantly it will help identify if the intersection order gets scrambled. It is possible when we sort the intersections that the overlap
    * gets split. By definition that shouldn't happen, but there could be some logic error that causes it. This will help us detect that.
    */
    bezierLocalToGlobal(otherLoop, tol = 0.01)
    {
        let gap = 5 * tol;
        let rawIntersections = [];
        for (let iIdx = 0; iIdx < this.poly.curves.length; iIdx++)
        {
            let curve = this.poly.curves[iIdx];
            for (let iJdx = 0; iJdx < otherLoop.poly.curves.length; iJdx++)
            {
                let otherCurve = otherLoop.poly.curves[iJdx];
                console.log('curve', iIdx, curve.toSVG(), 'otherCurve', iJdx, otherCurve.toSVG());

                //We need an interim object to hold the raw intersections with converted global t values
                //We have bypassed the intersect function and called the curveintersects function directly. We need it
                //for the possibility of an overlap. The intersect function will not return an overlap when there are
                //lines. Ironically, lines are more likely to have an overlap. The curveintersects function will return
                //the series of intersections that indicate an overlap.
                //Let's handle the case where the curves are the same. This is a common case when we are cutting a loop
                //to match a shutter. The last intersection is an overlap that wraps around the loop. The logic is simple.
                if (curve.equals(otherCurve, tol))
                {
                    //We have two curves that are the same. We can skip the intersection calculation
                    rawIntersections.push({ global_t1: iIdx, global_t2: iJdx, ov: 1, pt: curve.get(0) });
                    rawIntersections.push({ global_t1: iIdx + 1, global_t2: iJdx + 1, ov: 2, pt: curve.get(1) });
                    continue;
                }

                //Now handle two lines. We have some fixing to do. Mentally the algorhtims below were derived visualizing the
                //two lines going the same direction. We need to handle the case where the lines are going in opposite directions
                //Rotating the lines to the x axis make it very clear what the relationship is.
                if (curve._linear && otherCurve._linear)
                {
                    //We have two lines. We can calculate the overlap
                    //For an overlap they must be on the same line.
                    //Setting up for also getting the endpoints of the line rotated to the x axis. align[2] and align[3]
                    //are the endpoints of the curve. align[0] and align[1] are the endpoints of the otherCurve rotated to the x axis
                    let points = [otherCurve.points[0], otherCurve.points[otherCurve.order], curve.points[0], curve.points[curve.order]];
                    let align = utils.align(points, { p1: points[2], p2: points[3] });
                    console.log('align', align);
                    let aligned = !align.some((p) => Math.abs(p.y) > tol);
                    if (!aligned)
                    {
                        //The lines are not aligned. They cannot overlap, But we can have an intersection
                        //By definition either align[0].y or align[1].y are not 0
                        //The align variable has simplified the logic. We can use that to determine if we have an intersection
                        //step one is to determine if the two align points have a x intercept
                        if ((Math.sign(align[0].y) === Math.sign(align[1].y))) continue; //No x intercept
                        //We have an x intercept. We need to determine if the x intercept is within the bounds of the two points
                        //We have a problem with lines at right angles tothe original curve. Align rotates to a vertical line
                        if (Math.abs(align[0].x - align[1].x) < tol)
                        {
                            //We have a vertical line. X intercept is align[0].x or align[1].x. Note that x is only calculated
                            //to calculate the t values

                            //It is possible for our line to cross beyond the endpoints
                            if (!utils.between(align[0].x, align[2].x, align[3].x)) continue; //X is not within the bounds of the two points

                            let t1 = (align[0].x - align[2].x) / (align[3].x - align[2].x);
                            //t2 must use y diff
                            let t2 = -align[0].y / (align[1].y - align[0].y);
                            console.log('single vert t1', t1, 't2', t2, 'x', align[0].x, curve.get(t1), otherCurve.get(t2));
                            //We have the t values. We can add the intersection to the rawIntersections
                            rawIntersections.push({ global_t1: iIdx + t1, global_t2: iJdx + t2, ov: 0, pt: curve.get(t1) });
                            continue;
                        }

                        //Possible intersecting line is not vertical
                        //Calculate the x intercept and the t value of the x intercept (x1 - x0)/(y1 - y0) = (x - x0)/-y0
                        // x = x0 - y0(x1 - x0)/(y1 - y0)
                        let x = align[0].x - align[0].y * (align[1].x - align[0].x) / (align[1].y - align[0].y);

                        //It is possible for our line to cross beyond the endpoints
                        if (!utils.between(x, align[2].x, align[3].x)) continue; //X is not within the bounds of the two points

                        //X is within the bounds of the two points. We have an intersection. We need to determine the t values
                        //The t value is the distance from the start point to the x intercept divided by the distance from the start
                        //point to the end point
                        let t1 = (x - align[2].x) / (align[3].x - align[2].x);
                        //That gives us the t value for the curve. We need to determine the t value for the otherCurve
                        let t2 = (x - align[0].x) / (align[1].x - align[0].x);
                        //We have a problem with lines at right angles tothe original curve. Align rotates to a vertical line
                        console.log('single t1', t1, 't2', t2, 'x', x, curve.get(t1), otherCurve.get(t2));
                        //We have the t values. We can add the intersection to the rawIntersections
                        rawIntersections.push({ global_t1: iIdx + t1, global_t2: iJdx + t2, ov: 0, pt: curve.get(t1) });
                        continue;
                    }
                    //Let's declare some variables to represent t values. We will give them some meaningful names.
                    //If we have an overlap, it will start and stop at align[0].x, align[1].x, align[2].x, or align[3].x
                    //For t values align[0].x is t = 0 in the otherCurve domain. align[1].x is t = 1 in the otherCurve domain
                    //align[2].x is t = 0 in the curve domain. align[3].x is t = 1 in the curve domain
                    //'These 4 values are known in theses domains, We need to calculate the t values for these points in the other domain
                    //So the code for the following is
                    //t[0][0] is the t value for align[0].x in the curve domain.
                    //t[0][1] is the t value for align[0].x in the otherCurve domain (0)
                    //t[1][0] is the t value for align[1].x in the curve domain.
                    //t[1][1] is the t value for align[1].x in the otherCurve domain (1)
                    //t[2][0] is the t value for align[2].x in the curve domain (0)
                    //t[2][1] is the t value for align[2].x in the otherCurve domain
                    //t[3][0] is the t value for align[3].x in the curve domain (1)
                    //t[3][1] is the t value for align[3].x in the otherCurve domain
                    //In fact, we will calculate them here to use as needed. Some values here may be bogus, but we will only use the
                    //values we need. The logic will determine if they are valid.
                    let tep = [
                        [(align[0].x - align[2].x) / (align[3].x - align[2].x), 0],
                        [(align[1].x - align[2].x) / (align[3].x - align[2].x), 1],
                        [0, (align[2].x - align[0].x) / (align[1].x - align[0].x)],
                        [1, (align[3].x - align[0].x) / (align[1].x - align[0].x)]
                    ];


                    //We can sort these to simplify the logic. We will sort them by x value
                    let sorted = [];
                    for (let i = 0; i < 4; i++)
                    {
                        sorted.push({ x: align[i].x, epi: i });
                    }
                    sorted.sort((a, b) => a.x - b.x);

                    //Now we know the order of the points. We can determine if we have an overlap
                    //First check for no overlap. Logically point 3 is below point4. We donn't know the order of 0 and 1
                    //There are two possible orders with no overlap 3 and 4 are adjacent and in front of 0 and 1.
                    //Or 3 and 4 are adjcent and after 0 and 1. We can determine this by checking the t values
                    //Actually there is an edge case where the lines are aligned. We can have an single point overlap
                    if (Math.abs(sorted[1].x - sorted[2].x) < 0.01)
                    {
                        //We have a possible single point overlap. By definition it is two endpoints. By design there are no zero length
                        //curves. These two points must be from different curves. We need to determine the t values
                        let tc = (sorted[1].epi == 3) || (sorted[2].epi == 3) ? 1 : 0;
                        let toc = (sorted[1].epi == 1) || (sorted[2].epi == 1) ? 1 : 0;

                        rawIntersections.push({ global_t1: iIdx + tc, global_t2: iJdx + toc, ov: 0, pt: curve.get(tc) });
                        continue;
                    }
                    //Edge case of single point overlap has been handled. We can now check for no overlap
                    if ((sorted[0].epi === 3) && (sorted[1].epi === 4)) continue; //No overlap
                    if ((sorted[2].epi === 3) && (sorted[3].epi === 4)) continue; //No overlap

                    //We have an overlap. The start is point 1, the end is point 2. We need to determine the t values
                    //There are some edge cases point 0 and 1 could be equal. Point 2 and 3 could be equal. We need to check for that
                    //The problem with equal is that the epi could be wrong. The answer is to change how the t values are defined
                    //With the t values defined as above, we can determine the overlap. We can determine the start and end of the overlap
                    //Now even if they are equal, the math will work. We can determine the start and end of the overlap
                    console.log('sorted', sorted);
                    console.log('get tep', curve.get(tep[0][0]), curve.get(tep[1][0]), otherCurve.get(tep[0][1]), otherCurve.get(tep[1][1]));
                    rawIntersections.push({ global_t1: iIdx + tep[sorted[1].epi][0], global_t2: iJdx + tep[sorted[1].epi][1], ov: 1, pt: curve.get(tep[sorted[1].epi][0]) });
                    rawIntersections.push({ global_t1: iIdx + tep[sorted[2].epi][0], global_t2: iJdx + tep[sorted[2].epi][1], ov: 2, pt: curve.get(tep[sorted[2].epi][0]) });
                    continue;

                }
                //Implied else, curves are not lines

                let localIntersections = curve.curveintersects([curve], [otherCurve], tol);
                if (localIntersections.length === 0) continue;

                //let intersection = localIntersections[0];
                //let t = intersection.split("/").map(v => parseFloat(v));
                ////Fudge the ts to guarantee that we don't have ts that are exactly on the boundary
                ////We probably don't need to fudge both ends, but it doesn't hurt
                //if (t[0] === 0) t[0] = 0.0001;
                //if (t[0] === 1) t[0] = 0.9999;
                //if (t[1] === 0) t[1] = 0.0001;
                //if (t[1] === 1) t[1] = 0.9999;
                //let global_t1 = iIdx + t[0]
                //let global_t2 = iJdx + t[1];
                //if (localIntersections.length === 1)
                //{
                //    //We have a single intersection. We can add it to the rawIntersections
                //    rawIntersections.push({ global_t1: global_t1, global_t2: global_t2, ov: 0 });
                //    continue;
                //}
                //Implied else

                //We have more than one intersection. We need to sort them by t values
                let globalIntersections = [];
                //First we need to extract the local t values and set the global t values
                for (let iKdx = 0; iKdx < localIntersections.length; iKdx++)
                {
                    intersection = localIntersections[iKdx];
                    t = intersection.split("/").map(v => parseFloat(v));
                    //Fudge the ts to guarantee that we don't have ts that are exactly on the boundary
                    //We probably don't need to fudge both ends, but it doesn't hurt
                    if (t[0] === 0) t[0] = 0.0001;
                    if (t[0] === 1) t[0] = 0.9999;
                    if (t[1] === 0) t[1] = 0.0001;
                    if (t[1] === 1) t[1] = 0.9999;
                    global_t1 = iIdx + t[0]
                    global_t2 = iJdx + t[1];
                    console.log('global_t1', global_t1, 'global_t2', global_t2);
                    globalIntersections.push({ global_t1: global_t1, global_t2: global_t2 });
                }

                if (globalIntersections.length === 1)
                {
                    //We have a single intersection. We can add it to the rawIntersections
                    rawIntersections.push({ global_t1: globalIntersections[0].global_t1, global_t2: globalIntersections[0].global_t2, ov: 0, pt: curve.get(globalIntersections[0].global_t1) });
                    continue;
                }

                //We have the global intersections with global t values. We need to sort them by global_t1
                globalIntersections.sort((a, b) => a.global_t1 - b.global_t1);
                //In theory they should have the same order as the local intersections.
                //Now we can prepare the first pass. Note that these have had no overlap processing. In this case they are
                //the raw intersections. The purpose of this section is to identify overlaps
                intersection = globalIntersections[0]
                let ov = 0;
                let startTime = [intersection.global_t1, intersection.global_t2];
                let lastTime = null;
                let lastPoint = this.getPoint(intersection.global_t1);
                for (let i = 1; i < globalIntersections.length; i++)
                {
                    intersection = globalIntersections[i];
                    //console.log('intersection', i, j, intersection);
                    //console.log(t);
                    let thisPoint = this.getPoint(intersection.global_t1);
                    if (utils.dist(thisPoint, lastPoint) < gap)
                    {
                        //The gap is less than the tolerance. We have two or more points closer than the gap
                        ov++;
                        //This could be the end of an overlap. Store it in case it is
                        lastTime = [intersection.global_t1, intersection.global_t2];
                        //On every pass, thisPoint becomes lastPoint
                        lastPoint = { x: thisPoint.x, y: thisPoint.y };
                        continue;
                    }
                    //Gap was greater than the tolerance. We have an intersection or overlap
                    if (ov > 0)
                    {
                        //More than one point in the gap. We have an overlap
                        //We need to store the start and end of the overlap
                        rawIntersections.push({ global_t1: startTime[0], global_t2: startTime[1], ov: 1, pt: this.getPoint(startTime[0]) });
                        rawIntersections.push({ global_t1: lastTime[0], global_t2: lastTime[1], ov: 2, pt: this.getPoint(lastTime[0]) });
                        //Reset the gap count and the start time
                        ov = 0;
                        startTime = [intersection.global_t1, intersection.global_t2];
                        //As stated above, thisPoint becomes lastPoint
                        lastPoint = { x: thisPoint.x, y: thisPoint.y };
                        continue;
                    }
                    //The potential overlap start is followed by a gap. We have an intersection
                    rawIntersections.push({ global_t1: startTime[0], global_t2: startTime[1], ov: 0, pt: this.getPoint(startTime[0]) });
                    //Reset the gap count and the start time. Note that logically ov should be 0
                    startTime = [intersection.global_t1, intersection.global_t2];
                    //As always, thisPoint becomes lastPoint
                    lastPoint = { x: thisPoint.x, y: thisPoint.y };
                }
                //Finished the loop. We have one last intersection or overlap
                if (ov > 0)
                {
                    //More than one point in the gap. We have an overlap
                    //We need to store the start and end of the overlap
                    rawIntersections.push({ global_t1: startTime[0], global_t2: startTime[1], ov: 1, pt: this.getPoint(startTime[0]) });
                    rawIntersections.push({ global_t1: lastTime[0], global_t2: lastTime[1], ov: 2, pt: this.getPoint(lastTime[0]) });
                    continue;
                }
                //The potential overlap start is followed by a gap. We have an intersection
                rawIntersections.push({ global_t1: startTime[0], global_t2: startTime[1], ov: 0, pt: this.getPoint(startTime[0]) });
            }
        }
        return rawIntersections;
    }

    /*
    * The processIntersections function is used to process the raw intersections between two loops.
    *
    * We need to modify the processIntersections function to handle the new overlap format. We are now processing the overlaps
    * between curves. Now we need to check to see if the local overlap is a global overlap. We need to check to see if two or more
    * local overlaps need to be combined. There is also a small chance that a single intersection is within a gap of an overlap or
    * another intersection. If so it needs to be incorporated into an overlap.
    * 
    * Another change that makes things simpler is handling wraparound. Now we will start from the beginning of the loop and go to the
    * end of the loop. We will handle the case where the last intersection is an overlap that wraps around the loop. This is an edge
    * case that will be more common than one might expect. For example, when my Storm Shutter completes a shutter, the last intersection
    * is an overlap that wraps around the loop.
    * 
    * Note it is possible for points to be inside an overlap. It is almost guaranteed when we fudge a point to slightly off the boundary.
    * we are generating overlaps at the boundaries. We need to handle this. We need to determine if the point is inside the overlap.
    * Presently our gap logic could see a difference greater than a gap when the point is at the far end of the overlap. We need to
    * skip all points that are inside an overlap. We need to determine if the point is inside the overlap. We can do this by checking
    */
    processIntersections(rawIntersections, tol = 0.01)
    {
        let intersections = [];
        if (rawIntersections.length === 0) return intersections;

        if (rawIntersections.length === 1)
        {
            //We have a single intersection. We can return it
            intersections.push(
                new Intersection(
                    rawIntersections[0].global_t1,
                    rawIntersections[0].global_t2,
                    this.getPoint(rawIntersections[0].global_t1),
                    false));
            return intersections;
        }

        //We need to sort the intersections by global_t1
        //Note somethinmg tricky can happen here. We can have an overlap that wraps around the loop. Now that we can mark overlaps
        //in rawIntersections, the sorting could split the overlap. This needs to be handled.
        rawIntersections.sort((a, b) => a.global_t1 - b.global_t1);
        console.log('rawIntersections', rawIntersections);
        //We need to convert the rawIntersections to Intersection objects and combine all the overlaps
        //Use a similar approach to the local overlap search.

        let gapTol = 5 * tol;

        this.intersected = true;
        let startTime = [rawIntersections[0].global_t1, rawIntersections[0].global_t2];
        let lastTime = null;
        //We have a discussion below about the overlap state machine. The overlap state machine is simple. We are looking for overlaps.
        //We are now going to use this state variable to indicate the ov=1 state. In that state we suspend gap detection until we see
        //an ov=2. We can also enter the overlap state with a gap detection. So let's have an ov=3 state. When in that state we are looking
        //for the end of an overlap. We can only exit the overlap state form ov=3 and a gap detection. Finding an ov=2 will put us in the
        //the ov=3 state. We can also exit the overlap state with an ov=0 detection and a gap.
        let ov = 0;
        let lastPoint = this.getPoint(startTime[0]);
        /*
        * We have set this loop up so that the intersections are only incremented in the loop. This would imply some kind of
        * state machine. The state machine is simple. We are looking for overlaps. We are looking for the start of an overlap.
        * The thing is that we can enter the "overlap" state with a gap detection or an ov=1 detection. We can exit the overlap
        * state with a gap detection or an ov=2 detection. We can also exit the overlap state with an ov=0 detection. The problem
        * is that we shouldn't exit the verlap state that was entered with an ov=1 detection with an ov=0 detection. Let us discuss
        * the states. The first state is obviously the "no overlap" state. We are looking for the start of an overlap. But there are
        * two ways we can entered the overlap state and these two different entries have different exit conditions. The tricky part
        * is that we can have the second entry while in the overlap state. Actually, we should always need a gap to exit the overlap.
        */
        for (let i = 1; i < rawIntersections.length; i++)
        {
            let intersection = rawIntersections[i];
            let thisPoint = this.getPoint(intersection.global_t1);
            let gap = (utils.dist(thisPoint, lastPoint) > gapTol);
            switch (ov)
            {
                case 0:
                    //We are not in an overlap. We are looking for the start of an overlap
                    if (intersection.ov === 1)
                    {
                        //We have the start of an overlap. We need to store the start time
                        startTime = [intersection.global_t1, intersection.global_t2];
                        ov = 1;
                        break;
                    }
                    if (intersection.ov === 2)
                    {
                        //This should never happen. But if it does we are going to attempt to handle it the best we can
                        startTime = [intersection.global_t1, intersection.global_t2];
                        ov = 3;
                        break;
                    }
                    if (gap)
                    {
                        //We have a gap. We need to add the intersection. Note I believe we could legitimately use lastTime as well as startTime
                        intersections.push(new Intersection(startTime[0], startTime[1], this.getPoint(startTime[0]), false));
                        //We need to reset the start time
                        startTime = [intersection.global_t1, intersection.global_t2];
                        break;
                    }
                    //Implied else
                    //We have detected an overlap. We need to store the start time
                    startTime = [intersection.global_t1, intersection.global_t2];
                    //We need to look for the end of the overlap
                    ov = 3;
                    break;
                case 1:
                    //We are in an overlap detected between two curves. We are looking for the detected end of the overlap
                    //All points in between are irrelevant. We need to store the end of the overlap
                    if (intersection.ov != 2) break;
                    //Implied else

                    //We have the detected overlap end. We need to start looking for a gap end
                    ov = 3;
                    break;

                case 3:
                    //We are in an overlap. We are looking for the end of the overlap
                    //we should check for ov = 1 and ov = 2 before we check the gap. The gap check should only happen if ov = 0
                    if (intersection.ov === 1)
                    {
                        //This is not an unusual event. It will happen whe we have two adjacent curves that both overlap
                        break;
                    }
                    if (intersection.ov === 2)
                    {
                        //This probably shouldn't happen. But if it does we need to handle it
                        break;
                    }
                    //We only get here if intersection.ov === 0
                    if (gap)
                    {
                        //We have a gap. We need to add the overlap
                        intersections.push(new Intersection(startTime[0], startTime[1], this.getPoint(startTime[0]), true));
                        //We need to add the end of the overlap
                        intersections.push(new Intersection(lastTime[0], lastTime[1], this.getPoint(lastTime[0]), true));
                        //We need to reset the start time
                        startTime = [intersection.global_t1, intersection.global_t2];
                        //We need go to the no overlap state
                        ov = 0;
                        break;
                    }
                    //Implied else
                    break;
            }
            //As always, thisPoint becomes lastPoint
            lastPoint = { x: thisPoint.x, y: thisPoint.y };
            lastTime = [intersection.global_t1, intersection.global_t2];
        }
        //Finished the loop. We have one last intersection or overlap
        if (ov > 0)
        {
            //More than one point in the gap. We have an overlap
            //We need to store the start and end of the overlap
            intersections.push(new Intersection(startTime[0], startTime[1], this.getPoint(startTime[0]), true));
            intersections.push(new Intersection(lastTime[0], lastTime[1], this.getPoint(lastTime[0]), true));
        } else
        {
            //The potential overlap start is followed by a gap. We have an intersection
            intersections.push(new Intersection(startTime[0], startTime[1], this.getPoint(startTime[0]), false));
        }
        //Now check for wraparound or sameLoops. It seems to me it is as simple as checking if the first and last points
        //are within the gap tolerance. If they are, we have a wraparound. We need to combine the first and last intersections
        let firstPoint = this.getPoint(intersections[0].path1.start_t);
        lastPoint = this.getPoint(intersections[intersections.length - 1].path1.start_t);
        if (utils.dist(firstPoint, lastPoint) < gapTol)
        {
            if (intersections.length === 2)
            {
                //These two loops are the same. We can remove the last intersection
                intersections = [new Intersection(0, 0, this.getPoint(0), false)];
                intersections[0].same_loop = true;
                return intersections;
            }

            //We have a wraparound. We need to combine the first and last intersections. If these are overlaps, we need to combine them
            //combine means removing the end of the first and the start of the last
            if (intersections[0].isOverlap && intersections[intersections.length - 1].isOverlap)
            {
                //We have two overlaps. We need to combine them
                //remove the first intersection
                intersections.shift();
                //We need to remove the last intersection
                intersections.pop();
                return intersections;
            }

            //One of the points is not an overlap. We need to combine the overlap with the intersection
            if (intersections[0].isOverlap)
            {
                //The first intersection is an overlap. We need to combine it with the last intersection
                //We need to remove the start of the last intersection
                intersections[0].path1.start_t = intersections[intersections.length - 1].path1.start_t;
                intersections[0].path2.start_t = intersections[intersections.length - 1].path2.start_t;
                //We need to remove the last intersection
                intersections.pop();
                return intersections;
            }
            //Implied else

            if (intersections[intersections.length - 1].isOverlap)
            {
                //The last intersection is an overlap. We need to combine it with the first intersection
                intersections[intersections.length - 1].path1.start_t = intersections[0].path1.start_t;
                intersections[intersections.length - 1].path2.start_t = intersections[0].path2.start_t;
                //We need to remove the first intersection
                intersections.shift();
                return intersections;
            }

            //we have two intersections that are closer than the gap. We need to combine them.
            //Let's combine them by removing the last intersection
            intersections.pop
        }


        return intersections;
    }

    //Creating a linked list of intersections. Was single linked, but now we need to go both ways
    populateIntersectionLinks(sorted)
    {
        //We should have handle the 0 and 1 length cases. Defensive programming
        if (sorted.length < 2) return;

        for (let i = 1; i < sorted.length - 1; i++)
        {
            sorted[i].path.next = sorted[i + 1].link;
            sorted[i].path.prev = sorted[i - 1].link;
        }
        //Now fixup the first and last
        sorted[0].path.prev = sorted[sorted.length - 1].link;
        sorted[0].path.next = sorted[1].link;
        sorted[sorted.length - 1].path.prev = sorted[sorted.length - 2].link;
        sorted[sorted.length - 1].path.next = sorted[0].link;
    }

    //Now to implement findIntersections for loops
    //We will need to track the intersections between loops
    //We will need to track the direction of the loop
    //We will need to track if the loop has been intersected
    //We will have global 't' values for the loop
    findIntersections(otherLoop, tol = 0.01)
    {
        let gap = 5 * tol;

        let rawIntersections = this.bezierLocalToGlobal(otherLoop, tol);

        this.intersections = [];
        otherLoop.intersections = [];

        //If there are no intersections, we can return
        if (rawIntersections.length == 0) return;

        //'The main purpose of this function is to take raw intersections and identify overlaps
        this.intersections = this.processIntersections(rawIntersections, tol);

        //Now that overlaps are two intersections, this is an actual touching intersection. The question is
        //Is one loop inside the other loop. We can use the contains method to determine this
        //The problem is that there are no longer two different valies of t. We need to use the mid point of the overlap
        if (this.intersections.length == 1)
        {
            let midPoint = this.getMidPoint(this.intersections[0].path1.start_t, this.intersections[0].path1.start_t);
            let contains = otherLoop.isInside(midPoint);
            this.intersections[0].path1.midPoint = midPoint;
            //if loop1 is cw and inside loop2 exit code is 1
            //if loop1 cw and outside loop2 exit code is -1
            //if loop1 is ccw and inside loop2 exit code is -1
            //if loop1 is ccw and outside loop2 exit code is 1
            this.intersections[0].path1.exit_code = this.calculateExitCode(contains, this.direction, otherLoop.direction);
            this.intersections[0].path1.next = this.intersections[0];
            midPoint = otherLoop.getMidPoint(this.intersections[0].path2.start_t, this.intersections[0].path2.start_t);
            contains = this.isInside(midPoint);
            this.intersections[0].path2.midPoint = midPoint;
            //if loop2 is cw and inside loop1 exit code is 1
            //if loop2 is cw and outside loop1 exit code is -1
            //if loop2 is ccw and inside loop1 exit code is -1
            //if loop2 is ccw and outside loop1 exit code is 1
            this.intersections[0].path2.exit_code = this.calculateExitCode(contains, otherLoop.direction, this.direction);
            this.intersections[0].path2.next = this.intersections[0];
            return;
        }
        //We need to sort the intersections by path1 start_t. Note we have at least two intersections
        this.intersections.sort((a, b) => a.path1.start_t - b.path1.start_t);
        //Take this opportunity to set the path1 idx values
        for (let i = 0; i < this.intersections.length; i++)
        {
            this.intersections[i].path1.idx = i;
        }
        let sorted = [];
        //We are creating an array of objects that contain the loop, the link, and the next intersection for path1
        for (let i = 0; i < this.intersections.length; i++)
        {
            sorted.push({ loop: this, link: this.intersections[i], path: this.intersections[i].path1 });
        }
        this.populateIntersectionLinks(sorted, tol);

        this.intersections.sort((a, b) => a.path2.start_t - b.path2.start_t);
        //Take this opportunity to set the path2 idx values
        for (let i = 0; i < this.intersections.length; i++)
        {
            this.intersections[i].path2.idx = i;
        }
        sorted = [];
        //We are creating an array of objects that contain the loop, the link, and the next intersection for path2
        for (let i = 0; i < this.intersections.length; i++)
        {
            sorted.push({ loop: otherLoop, link: this.intersections[i], path: this.intersections[i].path2 });
        }
        this.populateIntersectionLinks(sorted);
        sorted = null;
        this.intersections.sort((a, b) => a.path1.start_t - b.path1.start_t);
        let thisIntersection = this.intersections[0];
        //let firstT = thisIntersection.path1.start_t;
        //This code is not been calculated
        let nextIntersection = thisIntersection.path1.next;
        //console.log(nextIntersection);
        //We are going to calculated the exit codes for path1. Previously we did separate calculations for path2.
        //There must be two choices so path 2 is the opposite of path 1. We were do a step to validate that. We are leaving
        //it, but now it should never fail.
        while (thisIntersection.path1.exit_code == 0)
        {
            thisIntersection.path1.thisPoint = this.getPoint(thisIntersection.path1.start_t);
            thisIntersection.path2.thisPoint = otherLoop.getPoint(thisIntersection.path2.start_t);
            if (thisIntersection.isOverlap)
            {
                nextIntersection.path1.thisPoint = this.getPoint(nextIntersection.path1.start_t);
                nextIntersection.path2.thisPoint = otherLoop.getPoint(nextIntersection.path2.start_t);
                //Moving forward, and we have come to the start of an overlap
                /*
                * Now we have a overlap. By definition, we are entering on path1. We also know by definition that path1 exits
                * through the overlap. The question is, which way does path2 go? The answer is, it depends on the orientation
                * of the loops. If they are the same, path2 exits with path1 at the other end of the overlap. If they are different,
                * path2 exits at this end of the overlap. The exit codes depend only on topology. The points on the overlap are
                * not a good way to dtermine the topology. In fact, the reason for midpoints is to give the greatest chance of
                * using a point that is claerly in or out of the opposite loop. So path1 at the far end will give us a good
                * midpoint to determine topology. If path2 is going the same direction, then the path1 determination wiil
                * be sufficent to determine the exit codes for both intersections. If they are different, then path2 is exiting
                * at the near end of the overlap. We should use that to determine the exit code for that end of the overlap.
                */
                //We want to look along the path entering the overlap to find the midpoint. By definition that is path1
                //We need to find the midpoint of the path entering the overlap
                let nextNextIntersection = nextIntersection.path1.next;
                let nextNextMidPoint = this.getMidPoint(nextIntersection.path1.start_t, nextNextIntersection.path1.start_t);
                let nextContains = otherLoop.isInside(nextNextMidPoint);
                nextIntersection.path1.exit_code = this.calculateExitCode(nextContains, this.direction, otherLoop.direction);
                nextIntersection.path2.exit_code = -nextIntersection.path1.exit_code;
                nextIntersection.path1.midPoint = nextNextMidPoint;
                //Determine direction by comparing path2 idx values. We need to go both ways
                if (thisIntersection.path2.idx > nextIntersection.path2.idx)
                {
                    //path2 exits at the near end of the overlap
                    //Tricky stuff here. Path2 is going the other direction. On the exit we need the next intersection
                    let nextPath2Intersection = thisIntersection.path2.next;
                    let nextPath2MidPoint = otherLoop.getMidPoint(thisIntersection.path2.start_t, nextPath2Intersection.path2.start_t);
                    let nextPath2Contains = this.isInside(nextPath2MidPoint);
                    thisIntersection.path1.midPoint = this.getMidPoint(thisIntersection.path1.start_t, nextIntersection.path1.start_t);
                    thisIntersection.path2.midPoint = nextPath2MidPoint;
                    thisIntersection.path2.exit_code = this.calculateExitCode(nextPath2Contains, otherLoop.direction, this.direction);
                    thisIntersection.path1.exit_code = -thisIntersection.path2.exit_code;
                    nextIntersection.path2.midPoint = otherLoop.getMidPoint(nextIntersection.path2.start_t, thisIntersection.path2.start_t);
                } else
                {
                    //path2 exits at the far end of the overlap. Both path exit the first intersection via the overlap. In theory
                    //the exit code don't matter because both paths go to the same place. Since it is arbitrary, we flip them
                    //because that is the most common pattern.
                    thisIntersection.path1.exit_code = nextIntersection.path2.exit_code;
                    thisIntersection.path2.exit_code = nextIntersection.path1.exit_code;
                    thisIntersection.path1.midPoint = this.getMidPoint(thisIntersection.path1.start_t, nextIntersection.path1.start_t);
                    thisIntersection.path2.midPoint = otherLoop.getMidPoint(thisIntersection.path2.start_t, nextIntersection.path2.start_t);
                    nextIntersection.path2.midPoint = otherLoop.getMidPoint(nextIntersection.path2.start_t, nextNextIntersection.path2.start_t);
                }

                //We know that we have the other end of the overlap. We should handle now to keep things simple
                //thisIntersection.path1.thisPoint = this.getPoint(thisIntersection.path1.start_t);
                //thisIntersection.path2.thisPoint = otherLoop.getPoint(thisIntersection.path2.start_t);
                thisIntersection = nextIntersection;
                nextIntersection = thisIntersection.path1.next;
                continue; //Loop to do overlap check
                //This intersetion even though it is the other end of the overlap is calculated normally
                //We can just fall through to the next section. Important to fall through and avoid the isOverlap code
            }
            let midPoint = this.getMidPoint(thisIntersection.path1.start_t, nextIntersection.path1.start_t);
            let contains = otherLoop.isInside(midPoint);
            //thisIntersection.path1.thisPoint = this.getPoint(thisIntersection.path1.start_t);
            //thisIntersection.path2.thisPoint = otherLoop.getPoint(thisIntersection.path2.start_t);
            thisIntersection.path1.midPoint = midPoint;
            console.log('Path1 midPoint', contains, midPoint);
            midPoint = otherLoop.getMidPoint(thisIntersection.path2.start_t, nextIntersection.path2.start_t);
            thisIntersection.path2.midPoint = midPoint;

            //Now we can assign the exit code based on contains and CW or CCW for both loops
            thisIntersection.path1.exit_code = this.calculateExitCode(contains, this.direction, otherLoop.direction);
            thisIntersection.path2.exit_code = -thisIntersection.path1.exit_code;
            console.log('Path1 exit code', thisIntersection.path1.exit_code);
            //firstT = nextIntersection.path1.end_t;
            thisIntersection = nextIntersection;
            nextIntersection = thisIntersection.path1.next;
        }
        ////We have the path1 exit codes. We can now calculate the path2 exit codes
        ////We can use the same logic as above. We need to enter each loop using the firstIntersection
        //this.intersections.sort((a, b) => a.path2.entry_t - b.path2.entry_t);
        //thisIntersection = this.intersections[0];
        //firstT = thisIntersection.path2.exit_t;
        //while (thisIntersection.path2.exit_code == 0)
        //{
        //    //This code is not been calculated
        //    let nextIntersection = thisIntersection.path2.next;
        //    let nextT = nextIntersection.path2.entry_t;
        //    //We need to handle the edge case of one intersection in the loop
        //    //By definition it is a touching intersection
        //    ////This could be detected several ways, but the most effective is to compare the t values
        //    //if (nextT - firstT < gap)
        //    //{
        //    //    //nudge firstT
        //    //    firstT += gap;
        //    //    if (firstT > loop.end_t) firstT = loop.start_t;
        //    //}
        //    let midPoint = otherLoop.getMidPoint(firstT, nextT);
        //    let contains = this.isInside(midPoint);
        //    console.log('Path2 midPoint', contains, midPoint);
        //    //console.log(this.loops[thisLoop].poly);
        //    thisIntersection.path2.midPoint = midPoint;
        //    //Now we can assign the exit code based on contains and CW or CCW for both loops
        //    thisIntersection.path2.exit_code = this.calculateExitCode(contains, otherLoop.direction, this.direction);
        //    console.log('Path2 exit code', thisIntersection.path2.exit_code);
        //    firstT = nextIntersection.path2.exit_t;
        //    thisIntersection = nextIntersection;
        //}
        //return intersections;
        /*
        * Now to validate. There are some rules the intersections must meet. First, the exit codes must be symmetrical. That is the path 1 exit code
        * for the intersection must be the negative of the path 2 exit code. There must be an even number of crossings. Touching intersections will
        * have the same exit codes as the last intersection. The exit codes flip for a crossing. The must be an even number of flips. The symmetry
        * rule along with the even number of flips guarantees that the exit codes are correct for both paths if they are valid for one path. Note
        * that these rules are per loop. The loops must be disjoint. If they are not, they can be combined into a single loop. A future enhancment
        * will be to combine loops that are not disjoint when they are passed to the area.
        */
        let intersection = this.intersections[0];
        let flipCount = 0;
        let lastExitCode = intersection.path1.exit_code;
        while (intersection != null)
        {
            //console.log(intersection);
            if (intersection.path1.exit_code != lastExitCode)
            {
                flipCount++;
                lastExitCode = intersection.path1.exit_code;
            }
            if (intersection.path1.exit_code != -intersection.path2.exit_code)
            {
                let badPoint = this.getPoint(intersection.path1.end_t);
                let message = `Invalid intersection. The exit codes are not symmetrical at point ${badPoint.x}, ${badPoint.y}.`;
                console.warn(message);
                console.warn('Exit codes:', intersection.path1.exit_code, intersection.path2.exit_code);
            }
            intersection = intersection.path1.next;
            if (intersection == this.intersections[0]) break;
        }
        //We were missing the last intersection in the loop
        if (intersection.path1.exit_code != lastExitCode)
        {
            flipCount++;
        }
        if (flipCount % 2 != 0) console.warn(`Invalid number of crossings (${flipCount}). There must be an even number of crossings.`);
    }

    /*
    * Calculates the exit code for an intersection/overlap. It could also be called the entry code.
    * It depends on the perspective. The exit code is the code for the path that is exiting the intersection.
    * If one is on a CW path one gets the code of the area one is entering.  For example, the arae outside
    * a CW shape is -1. The area inside a CW shape is 1. The area inside a CCW shape is -1. The area outside
    * a CCW shape is 1. On a CCW path, the exit code is -1 times the code for the area one is entering.
    * This creates the table below.
    * 
    * A little more testing but it appears the rules ignore the opposite orientation.  The rules are:
    * a CW path entering a any path is 1
    * a CCW path entering a any path is -1
    * a CW path exiting a any path is -1
    * a CCW path exiting a any path is 1
    * 
    * Another rethink. When cuttin a panel to match a shutter, the intercepted area is the area to be removed.
    * By definition thosse aares will have coincideental edges. The paths to be followed are the outside of the
    * panel and the inside edges of the intercept area. That means we need to treat the coincidental overlap as
    * two intersections. The second loop is CCW and the overlap goes in opposite directions. This happens when
    * the overlap goes in opposite directions. In that case there is a exit at both ends. In a normal intersection
    * one will leave on path 1 or path 2. The choice results in one of the paths. In this type of overlap, the
    * choice is path1 on one end andd path 2 on the other end. Our present scheme doesn't handle this correctly
    */
    calculateExitCode(isInside, thisOrientation, oppositeOrientation)
    {
        //console.log('isInside', isInside, 'thisOrientation', thisOrientation, 'oppositeOrientation', oppositeOrientation);
        if (isInside)
        {
            if (thisOrientation && oppositeOrientation) return 1;
            if (thisOrientation && !oppositeOrientation) return 1;
            if (!thisOrientation && oppositeOrientation) return -1;
            if (!thisOrientation && !oppositeOrientation) return -1;
        } else
        {
            if (thisOrientation && oppositeOrientation) return -1;
            if (thisOrientation && !oppositeOrientation) return -1;
            if (!thisOrientation && oppositeOrientation) return 1;
            if (!thisOrientation && !oppositeOrientation) return 1;
        }
    }

    //We are trying to add visual debugging to the loop intersections. We have created a class BezierDebugTools to help visualize
    //things that use beziers. The idea is that the LoopArea class will have knowledge of the BezierDebugTools class. This is consistent
    //with it having knowledge of the PolyBezier class. The poly in the LoopArea is a PolyBezier object and is the bezier related object
    //Javascript objects allow one to arbritrarily add properties. We will add the BezierDebugTools object to the LoopArea object? Actually,
    //my first thought was to have a debugText property added to the LoopArea object.
    //Another technique could be registering functions for the LoopArea object with the BezierDebugTools object. There are several things
    //needed for a given object. A function to display it. A function to determine the distance from a point. A function to get debug text.
    //One design consideration is that the BezierDebugTools object could be a singleton. It is a utility object that is used by all the bezier
    //related objects. The BezierDebugTools object could have a register function that would allow the bezier related objects to register their
    //functions. The BezierDebugTools object could have a display function that would call the display functions of the registered objects. Note
    //the BezierDebugTools object is not necessarily a singleton. One could have instantiations of the BezierDebugTools object for different displays..
    //Another consideration is object decomposition. For example, a LoopArea object will have individual beziers and possibly individual intersections.
    //The intersections in particular should be displayed and debugged. Perhaps there should be a mechanism to add the individual beziers and intersections
    //to the display list. In fact, that could be the mechanism for the BezierDebugTools object. Our functions for objects like LoopArea could be passed
    //to the BezierDebugTools object. The LoopArea could add all the elements to the display list. Those objects on the list would have a way to show
    //what higher level objects they are a member of. This is a good way to debug the objects. The BezierDebugTools object could have a function to
    //display the list. The BezierDebugTools object could have a function to clear the list. The BezierDebugTools object could have a function to
    makeDebugNode(name)
    {
        let thisLoop = BezierDebugTools.makeNode(this.poly, name);
        //The text for loops is the SVG path data
        thisLoop.data.svg = this.toSVG();

        thisLoop.children.push(this.poly.makeDebugNode(name + "_poly"));
        console.log('intersections', this.intersections);
        for (let i = 0; i < this.intersections.length; i++)
        {
            console.log('intersection', i, this.intersections[i]);
            //let intersection = this.intersections[i];
            //let point = this.getPoint(intersection.path1.start_t);
            thisLoop.children.push(this.intersections[i].makeDebugNode(name + "_intersection_" + i));
        }
        return thisLoop;
    }

}

export { LoopArea };
export default LoopArea;