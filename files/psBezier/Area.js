/*
* This is the Area class. It is used to represent a 2D area defined by a set of paths.
* The code is written in ES6 and is intended to be used in a browser environment. It was generated
* by ChatGPT. Below are the prompts that were given to the model to generate the code.
*
* 2025 02 05 - Now that the class is largely written, I would like to discuss the concept of the Area class.
* The Area class is a collection of paths.  The paths are defined by a series of bezier segments. The beziers
* contiguously define the path.  The paths are closed loops.  The Area class is used to represent a 2D area.
* There can be multiple loops in the Area.  The loops can be positive (CW) or negative (CCW). The CW and CCW
* concept can be related to the idea that as one moves along the path the area is to the right.  The Area class
* is used to perform operations on the paths.  The operations include union, intersection and subtraction.  The
* operations are performed on the paths.  The result of the operation is a new Area object.  The new Area object
* is created from the paths that are the result of the operation.  The Area class is used to perform operations.
*
* More discussion of the concept of the Area class.  There should be restrictions on what is a valid Area. It is
* reasonable that an area must be realizable in reality. For example, one can argue that a CCW loop by itself is 
* not a valid area.  It is a hole in reality.  A CW loop with a CCW loop inside it is a valid area.  The CW loop 
* is the area and the CCW loop is a hole in the area.  It defines a doughnut topology. A CCW loop with a CW loop
* inside it is not a valid area. The thing is it is a valid internal representation.  The internal representation
* of a subtracted area is the reverse of the area to be subtracted.  The point of this discussion is to determine
* what are the valid combinations that we might have to handle. Part of this consideration is what are the
* possible results of an operation.  I think that one can argue that if one starts with a valid area, the
* result of an operation should be a valid area.  Note an empty area is a valid area.  It indicates that there is 
* no area. Kind of the point here is a result of an invalid are should be an empty area.  For example, if we subtract
* a CW loop (valid area) from an empty area (valid area) we should get an empty area (valid area).  But for the
* internal operation makes a CCW loop (invalid area).
*
* Actually, I have a use case and another level of objects and related methods that would better determine
* what I desire in defining how two curves and ultimately two shapes interact. I have an application where 
* I am cutting panels to cover windows.  I have a collection of windows of various sizes and 4' x 8' panels.  
* I want to virtually cut the panels to cover the windows. Part the process is to take the panel and line it 
* up with the window. To cut from the panel one would do an intersection with the uncovered area on the window 
* and the panel. The panel could be a partial panel that has already had pieces used for other windows. 
* The window could also be partially covered.  The core object I am looking at is an area object. The area is 
* defined by closed paths. An operation like the intersection of two areas is determined by the intersections 
* of the paths as described before.  I have developed some concepts. For example, paths have direction. 
* If we set up some rules related to direction, it makes the processing of operations like adding areas, 
* subtracting one area from another and the intersection of two areas simpler.  One rule is that the path is 
* clockwise around positive areas.  CCW paths represent holes or negative areas. For example, a CW circle 
* surrounding a CCW circle would be a donut shape with a hole in the middle.  A more general rule is that as 
* one travels a path the area is to the right and the "negative area" is to the left.  The idea of following 
* paths leads to the intersections between shapes.  Above we have overlaps and intersections. We can actually
* think of intersections as overlaps with the same starting and ending point.  Anyway every overlap and 
* intersection has two paths that enter and two paths that leave. If the paths follow the rule above of positive
* to the right and negative to the left then one can handle the three possible operations Addition, Subtraction 
* and Intersection. First, for Addition one starts an intersection and takes the path leaving that is the outermost 
* path. That should be the rule at every intersection.  For Intersections of the areas, one takes the innermost path 
* leaving each overlap/intersection. For Subtraction, one reverses the path of the area to be subtracted and then 
* just follows the addition rules.
* 
* Yes, I would definitely like a deeper dive. Actually, first I would like to both do a little more specifying and 
* discuss some concepts for validating the path overlaps/intersections. First, I am thinking the paths can be defined 
* using the SVG D parameter nomenclature.  We will convert these into the bezier model to do bezier library operations 
* as needed. Does this seem reasonable to you or should we use the bezier representation directly?
*
* In the past, I have used the d parameter technique and limited it to "M", "L", "C" and "Z".  If we are going to 
* expand support, should we cover them all? i.e "H" and "V". Are there others?
*
* Tell me about the "A" parameter. In the past, I used the cubic 
* [{x: 1.0, y: 0}, {x: 1.0, y: 0.551915}, {x: 0.551915, y: 1.0}, {x: 0, y: 1.0}] as an approximation for the first
* quadrant of the unit circle. Rotating, concatenating, using De Casteljau for the partial quadrant, rotating, scaling 
* and translating, one can create any arc at any angle and location. It seems to me that there is a way to modify this 
* for "A" parameters.
*
* I have tried to implement this already. My use case has intentionally aligned edges creating the coincidental sections. 
* I first tried small offsets and had some success, but was unhappy with the complexity I was creating.  I then started 
* thinking about how to directly handle the coincidental sections and I feel like once one gets the concepts it is a 
* simpler solution. I had already started to recognize the concept of positive and negative area based on direction.  
* All of this occurred before I knew about you.  After that I knew I wanted to bring you into working out the 
* implementation.
* * A few more of my concepts. Every intersection and coincidental sections have two entry paths and two exit paths. 
* The concept of CW and CCW is determined by a closed shape. An individual segment in those shape could be any segment
* in the space. That means that one can't determine CW or CCW looking at an individual shape.  That is why a created the 
* concept of positive to the right and negative to the left. Direction of a path is defined by the SVG and the order of 
* points. Going back to the entry and exits above. The order will determine direction and logically there will always be 
* two entries and two exits. To implement our area operations we "walk" the path moving from one intersection/coincidental
* section.  We will enter on the path will are walking at the moment. The logic that we need to develop is how to determine 
* which of the two exits do we take for the given operation. For example, for two shape with all crossing intersections we 
* will switch paths at every intersection. A more general rule is that we take the exit closest to our entrance. That is if 
* we order the entrances and exits by their tangents at the intersection.
*
* I like the intersection class, but lets expand it. Conceptually one can think of an intersection as a coincidental section
* with the same start and end point. We can create a class to handle both. Things do get a little more complicated in that 
* we need to assign entries and exits to start and end points.  Actually now that I think about it, the two paths on the same
* point are the closest exit or entrances to each other regardless of tangents. The paths at the other end is a little trickier
* because a coincidental section could change directions. We need to calculate our tangents relative to the tangents of the
* coincidental section at the start and endpoints. It is the relative tangents that tell use what we need to know. From those
* we can determine the other closest exit or entry.
* 
* One issue with walking the path is that there needs to be logic to insure that all possibilities have been covered. An example
* is subtracting an area that crosses over the area being subtracted from. The result is two closed areas. If one walks the path
* and finds one of the closed loops, there must be logic to start another walk to find the other loop.
*
* We might not have any problems, but I have had problems where two paths have very close tangents, it is possible to have them 
* ordered incorrectly. One can find these cases by walking both paths and checking the relationship between them. One must have 
* an even number of crossing intersections/coincidental sections. An odd number indicates a problem, in my experience when there 
* is a problem it is one of these close tangent issues. One way to fix it might be to validate by pairing up crossing 
* intersections. One could "fix" a close tangent problem by finding the intersection it should pair with.
*
* I had an epiphany. All loops are equal when we are doing area operations.  We can start at any loop and follow the rules. We can
* loops as pairs. Take the result from that with the next loop.  We can do this until we have processed all the loops.  We can start
* at the first loop and follow the rules.  We can then take the result and follow the rules with the next loop.  We can do this until
* we have processed all the loops.  There are several advantages to this.  We can do the processing for the pair including the
* intersection.  We can then move to the next pair.  We can also handle the case where we have a loop inside another loop.  We can
* handle the case where we have a loop that contains another loop.  We can handle the case where we have a loop that is disjoint
* from another loop.  We can handle the case where we have a loop that is coincidental with another loop. One tricky case is where
* the result is multiple loops. We need to process all the loops until there are no intersections, overlaps or encompassed loops with
* the same direction.  We can then create a new area object from the loops.  We can then process the new area object.
*/

/*
* I would like to make it so that one can import everything one needs for the Area class from this file.  I would like to
* export the Area class so that it can be imported into another file.  I would like to export the Path class so that it can
* be imported into another file.  I would like to export the Segment class so that it can be imported into another file.
*/

/**
 * Represents an Area composed of one or more Paths.
 * Supports SVG input, arrays of Paths, or cloning from another Area.
 * Facilitates Boolean operations (e.g., union, intersection) and manages Path traversal.
 */
import PathArea from './path-area.js';
import {bzTree, bzNode } from './shapeHierarchyBuilder.js';
import LoopArea from './loop-area.js';
import Bezier from './bezier.js';
import { BezierDebugTools } from './debug_bezier.js';
//import TestPanel from '../test.js';

class Area
{
    /**
     * Initializes the Area object.
     * @param {string|Array|PathArea|Area} source - Can be an SVG string, an array of Paths, or another Area object.
     */
    constructor(source)
    {
        //This is a Path object. It is a collection of closed loops.  The loops are defined by a series of bezier segments.
        this.path = null;
        //this.beziers = [];
        //An empty Area isd valid.  It indicates that there is no area.
        if (source === undefined) return;

        if (typeof source === 'string')
        {
            // Parse SVG and create Paths
            this.path = this.path = new PathArea(source);
        } else if (Array.isArray(source))
        {
            if (source.length === 0) return; //Empty Area

            if (source[0] instanceof Bezier)
            {
                //We have an array of beziers
                this.path = new PathArea(source);
            } else if (source[0] instanceof LoopArea)
            {
                //We have an array of loops.  We need to create a PathArea object from the loops.
                this.path = new PathArea(source);
            }
        } else if (source instanceof PathArea)
        {
            // Clone a Path
            this.path = new PathArea(source);
        } else if (source instanceof Area)
        {
            // Clone another Area
            this.path = new PathArea(source.path);
        } else if (source instanceof LoopArea)
        {
            //We have a tree of loops.  We need to create a PathArea object from the loops.
            this.path = new PathArea(source);
        }else
        {
            throw new Error('Invalid source type for Area constructor.');
        }
    }

    transform(affine)
    {
        this.path.transform(affine);
    }


    bbox()
    {
        return this.path.bbox();
    }

    /**
     * Performs a union operation on the Area.
     * Combines all Paths in this Area with the Paths in another Area.
     * @param {Area} otherArea - The Area to union with.
     * @returns {Area} A new Area representing the union.
     */
    union(otherArea)
    {
        return this.processLoops(otherArea, -1);
    }

    intersect(otherArea)
    {
        return this.processLoops(otherArea, 1);
    }

    subtract(otherArea)
    {
        let subArea = new Area(otherArea);
        subArea.reverse();
        return this.union(subArea);
    }

    isInside(pt)
    {
        for (let iIdx = 0; iIdx < this.path.loops.length; iIdx++)
        {
            if (this.path.loops[iIdx].isInside(pt)) return true;
        }
        return false;
    }

    //There is a need for a bounding box. The polygon class can do this. The utils have a function expandbox that can
    //be used for multiple boxes.
    bbox()
    {
        return this.path.bbox();
    }

    /*
    * We are changing the way we handle the area operations.  We are going to create an array of loops to be processed.
    * We will process the loops in pairs.  We will process the first pair aand remove them from the array. Then we will
    * take the result and process it with the next loop in the array.  We will continue this until we have processed all
    * the loops.  We will then create return a new Area object from the loops. Things get tricky when we have multiple
    * loops in the result.  We need to process all the loops until there are no intersections, overlaps or encompassed
    * loops with the same direction.  We can then create and return a new area object from the loops.
    * 
    * This function is called from the union and intersect functions.  It is called with the other path and the exit code.
    * It manages the processing of the loops in the two paths.  It returns a new Area object with the result of the operation.
    * 
    * The PathArea object is still at the core of the Area object. The PathArea object can take an array of beziers and
    * create a PathArea object.  That will identify the loops in the PathArea object.  The walkPath function will process
    * two loops and return the result as an array of beziers.  The PathArea object can take the array of beziers and create
    * a new PathArea object.  That PathArea object will have the loops identified.  If there is only one loop in the PathArea
    * we get the next loop in the array and process it with the result.  We continue this until we have processed all the loops.
    * However if there are multiple loops in the result we need to push all but one back into the array.  We then process the
    * loops in the array until there are no more intersections, overlaps or encompassed loops with the same direction. We can
    * add a flag to each loop to indicate when it was processed and unchanged. In order to implement this we need to do the
    * PathArea object in the walkPath function.  It is in that function that we will recognize that a loop has been processed
    * and unchanged.  We will then set the flag.  We will then process the loops in the array until all loops are marked as
    * processed and unchanged.  We will then create a new PathArea object from the loops.  We will then create a new Area
    * object from the PathArea object.
    * 
    * A little more discussion about the loops.  The walkPath function operates on intersections. There is a need for further
    * processing of disjoint areas. There are rules for combining them based on whether one area encompasses the other.  We
    * create a tree structure that represents the relationships between the loops. We then process the tree structure to
    * determine the loops that stay and the loops that go.  We can then create a new area object from the loops that stay.
    */
    processLoops(otherArea, exitCode)
    {
        console.log('processLoops', exitCode, this.toSVG(), otherArea.toSVG());
        let testLoops = [];
        testLoops.push(...this.path.loops);
        testLoops.push(...otherArea.path.loops);
        let resultLoops = [];
        let currentLoop = testLoops.shift();
        //Our logic is failing on the simplest case of two shapes and two intersections. We need to trouble shoot this.
        //We enter the following loop with the first loop in currentLoop and the rest of the loops in testLoops.  The idea is
        //move the loops to the resultLoops array.  We then process the loops in the resultLoops array. 
        while (testLoops.length != 0)
        {
            let nextLoop = testLoops.shift();
            console.log('currentLoop nextLoop', currentLoop.toSVG());
            console.log( nextLoop.toSVG());
            resultLoops = this.walkPath(currentLoop, nextLoop, exitCode);
            console.log('resultLoops', resultLoops);
            //The most common exit will be one loop in the resultLoops array.  If there is one or less loops in resultLoops and none
            //in testLoops we are done.  We can create a new Area object from the loops in resultLoops and return it.
            if ((testLoops.length === 0) && (resultLoops.length <= 1)) return new Area(resultLoops);
            //We have multiple loops in the resultLoops array or we have more loops in the testLoops array.  We need to process

            //This is where things are failing.  We are losing the currentLoop.  In our simple test case it is the only loop
            //In more complicated cases it still needs to be part of the result.  We need to push it back into the testLoops array
            currentLoop = resultLoops.shift();
            testLoops.push(...resultLoops);
            testLoops.unshift(currentLoop);
            //console.log('currentLoop testLoops', currentLoop, testLoops);
            //if (currentLoop && !currentLoop.unchanged) continue;
            //testLoops.push(currentLoop);
            console.log('testLoops before scan', testLoops);
            //Go though the testLoops aray and coninue if an unchanged loop is found.
            //If we make it though the loop, we have processed all the loops and we break out of the loop.
            let testIdx = 0;
            while (testIdx < testLoops.length)
            {
                if (!testLoops[testIdx].unchanged) break;
                testIdx++;
                if (testIdx === testLoops.length) break;
            }
            if (testIdx === testLoops.length) break;
            currentLoop = testLoops.shift();
        }
        resultLoops.push(...testLoops);
        //testLoops.push(...resultLoops);
        console.log('resultLoops', resultLoops);

        //For now bypass the tree structure and just return the loops.  We will come back to this.
        return new Area(resultLoops);

        //The tests for 0 and 1 are defensive. We should exit above if we have 0 or 1 loops in the resultLoops array.
        //An empty array is a valid return.  It indicates that there is no Area.
        if (resultLoops.length === 0) return new Area(resultLoops);

        if (resultLoops.length === 1) return new Area(resultLoops);

        //Now to build the tree structure.  We need to find the relationships between the loops.
        let tree = new bzTree(resultLoops[0]);
        while (resultLoops.length > 0)
        {
            let aLoop = resultLoops.shift();
            tree.addNode(aLoop.poly, aLoop);
        }
        console.log('tree', tree);
        //The tree is populated, now traverse it following the rules
        //resultLoops = [];
        if (exitCode == -1)
        {
            //We have a union, we need a reentrant function
            let unionWalk = function (node, cw, resultArr)
            {
                if (node.children.length == 0) return;

                //Nodes that match are skipped
                node.children.forEach(child =>
                {
                    // The shape is a PolyBezier
                    if (child.shape.cw != cw)
                    {
                        //Don't match, we have a different loop down this path
                        cw = !cw;
                        resultArr.push(child.object);
                    }
                    unionWalk(child, cw, resultArr);
                    return;
                });
            };
            //Now call from root
            unionWalk(tree.root, false, resultLoops);
        } else
        {
            //We have an intersect
            //Reentrant tree walk following intersect rules. Things are tricky here we need to probe down each branch to make our decision
            // An intercept is the innermost loop that is inside everything else. It is possible that there are two loops that are both inside
            // a bigger loop. At the root we set a parameter called cw to false. This parameter5 indicates if there is a cw loop toward the root
            //that would contain multiple inner loops. We make the reentrant call with the cw poarameter set to true when we get to a node that
            //has a cw loop. cw stays true all the way down the branch. If we get to a node that has a cw loop and cw is already true, we return
            //the new cw loop because the innermost loop is the one closest to the leaf. At this point it is clearer to follow what happens working
            //back from a leaf node. When we get to a leaf node and we have a cw loop, we return the cw loop. If we have a ccw loop we return the ccw
            //loop. This is done independent of the cw parameter. When we return from the leaf we go back to a level that potentially has two loops.
            //Now the cw parameter comes into play. If we have more than one branch with a cw loop on it and cw is false, we return an empty array.
            //The format of our returns is an arary of two element arrays.  Each of the two element arrays is a pair of loops.  The first element
            //is the cw loop and the second element is the ccw loop closest to it.  If there are multiple branches with a cw loop and cw is true we
            //return an array with two two element arrays.  There is a two element array with the cw loop and the ccw loop closest to it for each branch.
            //if there are multiple branches with a cw loop and cw is false we return an empty array.  The empty array indicates that we had two branches
            //that aren't surrounded by a cw loop.  When we have this case, there can be no intersection.  If we have a ccw loop and no cw loop toward the
            //
            /*
            * A little discussion about CCW loops. If we have a CW loop with one or more CCW loops inside the instersect includes the CCW loops. We can have
            * multiple CCW loops.
            */
            let intersectWalk = function (node, cw)
            {
                //We are at a leaf node
                if (node.children.length == 0)
                {
                    //We have a leaf node.  We need to know what is down each branch to make our decision
                    //Something is returned in the array. This will get passed back up the tree until we get to the root
                    //As we move back up and we detect a case with two or more disjoint loops, we return an empty array
                    //As long as we have a cw loop toward the root, we return the cw loop closest to the leaves and the ccw 
                    //loop closest to the cw loop
                    //index 0 is the CW branch, index 1 is the CCW branch
                    //Potentially the innermost loop is the one closest to the leaf
                    if (node.shape.cw) return [[node.object, []]];

                    //There is a cw loop toward the root. CCW loops are allowed inside the cw loop. Only the one closest to
                    //the cw loop is returned
                    if (cw) return [[null, [node.object]]];

                    //We have a ccw loop and no cw loop toward the root. We return nulls because a ccw loop must be inside a cw loop
                    return [[null, []]];
                }
                //Things are different for intersects. We need to know what is down each branch to make our decision
                //Nodes that match are skipped
                let cwcnt = 0;
                //Default no CW or CCW loops. After we process the children, and take the information they give us, we will
                //modify this array.  This array will be what is returned to the parent node.
                //There will be at least one element in the array for each child. It is possible that one child has multiple
                //CW loops to return. In that case there will be multiple elements in the array for that child.
                let intersectResultLoops = [[null, []]];
                node.children.forEach(child =>
                {
                    // Go down the branch indicating if there is a cw toward the root. We do an OR with the cw of the child
                    // at the top of this branch. Once cw is set to true it stays true all the way down the branch.
                    let childResult = intersectWalk(child, cw | child.shape.cw);

                    //An emtpty array indicates that there can be no intersection, we are on the express to the root
                    if (childResult.length == 0) return [];

                    let branchCnt = 0;
                    while ((branchCnt < childResult.length) && (childResult[branchCnt][0] != null))
                    {
                        //There is a cw loop toward the leaves.  We return the cw loop and the ccw loop closest to it
                        //CW loops are always at the front of the array
                        intersectResultLoops.unshift(childResult[branchCnt]);
                        branchCnt++;
                    }
                    //Something tricky here. We actually only want to count childern that have a cw loop.  We need a way to
                    //handle the case where a cw loop surrounds multiple cw loops.
                    if (branchCnt > 0) cwcnt++;

                    //Another case that can't have an intersection.  We have a ccw loop and cw loop toward the root
                    //and one or more cw loops down the branch. These are disjoint shapes.  We return an empty array.
                    if (!child.shape.cw && cw && (branchCnt > 0)) return [];

                    //Note that a non zero branchCnt indicates a CW loop from below
                    if (branchCnt == 0)
                    {
                        if(child.shape.cw)
                        {
                            //We have a cw loop and no cw loops toward the leaves.  We return the cw loop and the ccw loop closest to it
                            let ccwLoops = [];
                            while ((branchCnt < childResult.length) )
                            {
                                if(childResult[branchCnt][1].length > 0) ccwLoops.push(childResult[branchCnt][1][0]);
                                branchCnt++;
                            }
                            intersectResultLoops.unshift([child.object, ccwLoops]);
                        } else
                        {
                            //We have a ccw loop and no cw loops toward the leaves.  We return the ccw loop and null
                            intersectResultLoops.push([null, [child.object]]);
                        }
                    }

                });
                //We don't have a cw loop above this branch and there were two or more branches with a cw loop
                //There can be no intercects, take the express to the root
                if (!cw && cwcnt > 1) return [];

                //resultLoops should havee an entry for each branch.  The branches that have a cw loop are at the front
                //The next layer up will handle the multiple branches with a cw loop or ccw loops that are disjoint
                //and inside the cw loop.  
                return intersectResultLoops;
            };
            //Now call from root
            let result = intersectWalk(tree.root, false);
            result.forEach(branch =>
            {
                if (branch[0] != null)
                {
                    resultLoops.push(branch[0]);
                    if (branch[1] != null) resultLoops.push(...branch[1]);
                }
            });
        }

        return new Area(resultLoops);
    }

    isEmpty()
    {
        return this.path.beziers.length === 0;
    }

    /*
    * getReadyForWalk - This function is called from the walkPath function.  It is used to prepare the loops for processing.
    * It should help my future self understand what is going on. Never mind. Not much to put here. The place I need to look
    * at is findIntersections in the LoopArea class.
    */
    //getReadyForWalk(loop1, loop2)
    //{
    //}

    /**
     * Walks a Path to construct a union/intersect Path based on exit codes.
     * @param {PathArea} path - The other peth for the walk operation.
     * @param {number} exitCode - The exit code to use for the walk operation. (-1 for union, 1 for intersect)
     * @returns {PathArea} A new Path representing the union/intersect operation.
     */
    walkPath(loop1, loop2, exitCode)
    {
        loop1.findIntersections(loop2);
        console.log('intersections', loop1.intersections);

        if (loop1.intersections.length <= 1)
        {
            console.log('1 oe less intersections');
            //0 or 1 intersection.  We have three possibilities.  The two paths are disjoint or touching but neither inside the
            //other..This path is inside the other path. Or the other path is inside this path.  We can handle the last two cases
            //and the third case would what is left. Now what about exit codes and directions of paths.
            /*
            * A little discussion about the two casea where one loop is inside. I believe the way to visualize this is to
            * start with the case where two loops intersect. We know what happens there. We can then visualize the case where
            * one loop moves unil it is inside the other loop. We can then visualize the case where the loop moves until it is
            * touching the other loop on the inside. We can then visualize the case where the loop moves until it is completely
            * inside the other loop. For both loops CW we know that for a union we return the outside loop. For an intersection
            * we return the inside loop. What if both loops are CCW. We know that for a union we return the outside loop. We can
            * check this by visualizing the case where a CW loop crosses a CCW loop. We take a right turn at the intersection and
            * follow the CCW loop into the CW loop. Now if we are on a CCW loop and we cross a CCW loop we should take a left turn
            * and the other CCW loop out of the one we are on. We take the outside loop. Now for loops going in opposite directions.
            * In the case of a union and a CCW inside a CW loop we return both loops. One can visualize this happening using our
            * technique of moving the two together. This case represents a doughnut area. Which brings up another point. We would
            * like to represent any area that one can visualize.  The technique we are using of pairing loops means that our rules
            * should work for any area.  We have defined a doughnut area. How about an area inside the hole of a doughnut. When we
            * compare the two CW loops the inside one goes away which is not what we want. There is no way to do comparisons that
            * will work for all cases.  We need to have a way to handle the case where we have multiple loops in the result. Then
            * with knowledge of all the loops we can have something like a winding rule to determine which loops stay and which
            * loops go.  We can then create a new area object from the loops that stay.  We can then process the new area object.
            * 
            * I think the answer to this is to process the loops in pairs and return them both if there is no intersection. We keep
            * processing loops until there are no more intersections.  We then determine the relationship between the loops.  We can
            * can then define some rules based on thos relationships. One way to represent the relationships is to create a tree
            * structure.  We can then process the tree structure to determine the loops that stay and the loops that go.  For unions
            * I think it works like this.  You start at the root of the tree and follow the tree to the leaves.  You remove the 2nd 
            * loop of the same direction.  You keep the 2nd loop of the opposite direction.  At the root, your mode is CCW, so you
            * drop any CCW loops at the next level. You keep the CW loops and on the branches below them you keep the CCW loops and
            * drop the CW loops.  You continue this until you have processed all the loops.  You then create a new area object from
            * the loops that stay.  You then process the new area object.  For intersections it is a little different.  You start at
            * root and follow the tree to the leaves.  At any level, there can only be one CW loop.  If there are two CW loops at a
            * level, there can be no intersection.  The intersect by definition can have only one CW loop.  You keep the CW loop the
            * closest to a leaf. Any CCW loops inside the CW loop are kept.
            * 
            * Our tree solution has problems. Below is my prompt to ChatGPT.
            * I have been doing some testing and I have found some issues that are driving a new concept. My idea of doing subtraction
            * by negating a loop and doing a union has a problem with multiple loops. There are communitive issues. Let's take three loops
            * where two are CW and the third is to be subtracted and goes from CW to CCW. If the three loops are arranged so that the 
            * subtracting CCW loop is in the middle of one CW loop and it is on the edge of the other CW loop and it takes a bite out of it.  
            * The order which I perform the operations can result in three different results. If I union the two CW first and then do the CCW, 
            * it makes a hole that is the CCW loop. If I do the CW and the CCW where the CCW is in the middle and then union the other CW I 
            * end up with an area where the outside is the same but the holes in the center is the CCW shape with a bite from the second CW 
            * shape. If I do the subtraction with the bite out of the second CW shape and then do the union, I get a shape with no hole in the 
            * middle. Order matters, I get three different shapes depending on order.  My concept is that loops going in opposite directions 
            * must be paired. That is we must have a doughnut defined by the CW with the CCW hole as a defined shape. The CCW hole must be 
            * associated with the CW shape to define the doughnut topology. It can't be treated as an independent loop. What do you think?
            * 
            * The problem is that it makes finding intersections and exit codes a problem. (Exit codes is my technique for leaving an 
            * intersection on the path for a union or intersect.)  When I was finding intersections between two paths the problem is much 
            * simpler. And exit codes are binary with only two possibilities.  Exit codes are probably still binary. The topology must be 
            * shapes without intersections. If they have intersections they can be combined into one. This means that any intersection 
            * between two different entities that meet our definition must be between just two paths (except we could have coincidental 
            * sections and now there are three or four). I will have to think about how to handle this. In the meantime, I will have 
            * restrictions on my algorithm.
            * 
            * For Storm Shutters I won't need negative spaces. And I will have limited enclosed shapes. A very common case will be
            * edges that overlap.  I will need to handle that.  In fact in most cases we will have one overlap/intersection and we
            * will be invoking this code section to handle it.
            */
            // We aren't using these flags yet, but set them for now
            loop1.unchanged = true;
            loop2.unchanged = true;
            //If we have two different directions, we need to walk the paths to find the union/intersection
            //Not true any more
            //if (loop1.direction != loop2.direction) break;
            //{
            //    return [loop1, loop2];
            //}
            //it is an empty array for all cases of an intercept between a CW and CCW loop.
            //Reasoning is that the path rules will follow part of CCW loop and go CCW on a secition of the CW loop
            //Not true for a CCW loop outside a CW loop
            //The result is a CCW loop and is an invalid area.
            //if ((exitCode == 1) && (loop1.direction != loop2.direction)) return [];

            //if both loops are CCW, we need to return an empty array for a union and intersect
            //console.log('loop1 loop2', loop1.direction, loop2.direction);
            if (!loop1.direction && !loop2.direction) return [];

            console.log('loop1 loop2', loop1.toSVG(), loop2.toSVG());
            let oneInTwo = false;
            let twoInOne = false;
            if (loop1.intersections.length == 0)
            {
                oneInTwo = loop2.isInside(loop1.getPoint(0));
                twoInOne = loop1.isInside(loop2.getPoint(0));
                console.log('oneInTwo', oneInTwo);
                console.log('twoInOne', twoInOne);
            } else
            {
                //We have one intersection check for same loop
                if (loop1.intersections[0].same_loop)
                {
                    console.log('same loop');
                    //We have a same loop intersection.  We need to check the directions of the loops
                    //and for union or intersect. I understand the results for union. If both are CW we
                    //take one of the two loops (they are the same).  If both are CCW, we would return
                    //a CCW loop except that would not be a valid area to return. Could be valid internally
                    //but not externally.  For intersect, if both are CW we return one of the loops.  If both are CCW
                    //we return an empty array.  The tricky thing if they are opposite. Actually it is pretty simple
                    if (loop1.direction && loop2.direction) return [loop1];

                    //We handled both CCW above. We have a CCW loop and CW loop.  For union we return
                    //empty array.  For intersect we return the CW loop

                    if (exitCode === -1) return [];

                    if (loop1.direction) return [loop1];

                    return [loop2];
                }
                //Implied else if (loop2.intersections[0].sameLoop)

                oneInTwo = loop2.isInside(loop1.intersections[0].path1.midPoint);
                twoInOne = loop1.isInside(loop1.intersections[0].path2.midPoint);
            }
            //if loop1 is cw and inside loop2 exit code is 1
            //if loop1 cw and outside loop2 exit code is -1
            //if loop1 is ccw and inside loop2 exit code is -1
            //if loop1 is ccw and outside loop2 exit code is 1
            //if loop2 is cw and inside loop1 exit code is 1
            //if loop2 is cw and outside loop1 exit code is -1
            //if loop2 is ccw and inside loop1 exit code is -1
            //if loop2 is ccw and outside loop1 exit code is 1

            //We handled both CCW above.  We have both CW or one CW and one CCW
            if (loop1.direction && loop2.direction)
            {
                if (oneInTwo)
                {
                    //loop1 is inside loop2
                    if (exitCode === -1) return [loop2];
                    return [loop1];
                }

                if (twoInOne)
                {
                    //loop2 is inside loop1
                    if (exitCode === -1) return [loop1];
                    return [loop2];
                }

                //Disjoint loops
                if (exitCode === -1) return [loop1, loop2];
                return [];
            }
            //Implied else if (loop1.direction && !loop2.direction)

            //Loops are opposite, we only need to test one loop
            if (loop1.direction)
            {
                if (oneInTwo)
                {
                    //CW loop1 is inside CCW loop2
                    //Union is subtraction
                    if (exitCode === -1) return [];

                    //Weird logic here. If we walk a path with an outside CCW loop, and two intersewctions, we
                    //get more and more of the inside CW loop as we approach a single point intersection.
                    //We need to return the CW loop
                    return [loop1];
                }
                if (twoInOne)
                {
                    //CCW loop2 is inside CW loop1
                    //For union we have a doughnut.  We need to return both loops
                    if (exitCode === -1) return [loop1, loop2];

                    //Same sort of thing here.  We end up with the DDW loop as we approach a single point intersection.
                    //A CCW loop is invalid to return
                    return [];
                }

                //Disjoint loops where loop1 is CW and loop2 is CCW
                if (exitCode === -1) return [loop1];
                return [];
            }
            //Impledd else if (loop1.direction)

            //We have a CCW loop1 and CW loop2
            if (oneInTwo)
            {
                //CCW loop1 is inside CW loop2
                //For union we have a doughnut.  We need to return both loops
                if (exitCode === -1) return [loop2, loop1];
                //Same sort of thing here.  We end up with the DDW loop as we approach a single point intersection.
                //A CCW loop is invalid to return
                return [];
            }

            if (twoInOne)
            {
                //CW loop2 is inside CCW loop1
                //Union is subtraction
                if (exitCode === -1) return [];
                return [loop2];
            }
            //Disjoint loops where loop1 is CCW and loop2 is CW
            if (exitCode === -1) return [loop2];
            return [];
        }
        //Implied else if (loop1.intersections.length <= 1)

        //We have 1 or more intersections in our pair of loops.
        //TestPanel.intersections.push(...loop1.intersections);
        //TestPanel.redrawMainPanel();

        let resultSegments = [];
        let currentIntersection = loop1.intersections[0];
        let front = true;

        while (currentIntersection)
        {
            //console.log('currentIntersection', currentIntersection);
            if (currentIntersection.isProcessed())
            {
                //We have finished a processing loop
                //We have an issue to handle here. If the first intersection was an overlap, we may have processed all the intersections
                //but we started at the other end of the overlap. We have come around to the other end of the overlap and we have processed
                //all the intersections. We need to take the overlap and finish the loop by going to the other end.
                //If the last intersection was an overlap, we need to finish the overlap
                //if (currentIntersection.isOverlap())
                //{
                //    //There are actually two cases here which are kind of four that are actually three. The reason for three is that
                //    //there is the possibility of taking the overlap on path1 or path 2.  The other two possibilites are that we
                //    //take path1 or path 2.  An example is subtracting a rectangle from a rectangle where the edges are aligned.
                //    //From one end of the overlap one takes path1 to the other end of the overlap.  From the other end one takes path 2.
                //}

                let testIdx = 0;
                while (testIdx < loop1.intersections.length)
                {
                    currentIntersection = loop1.intersections[testIdx];
                    if (!currentIntersection.isProcessed()) break;
                    testIdx++;
                }
                if (testIdx === loop1.intersections.length)
                {
                    currentIntersection = null;
                    break;
                }
            }
            if (currentIntersection == null) break;
            let nextIntersection = null;
            let bounds = null;
            let nextSegs = [];
            // Determine the Path and direction to follow based on exit codes
            if (currentIntersection.path1.exit_code === exitCode)
            {
                //We are taking path1
                //console.log('Taking path1');
                nextIntersection = currentIntersection.path1.next;
                bounds = this.getPathBounds(currentIntersection, nextIntersection, 0, front);
                //Path 1 always goes to the front of the intersection/overlap
                front = true;
                //console.log('path1 bounds', bounds);
                //console.log('loop1', loop1.split(bounds.startT, bounds.endT));
                nextSegs = loop1.split(bounds.startT, bounds.endT);
                //console.log('loop1 nextSegs', Bezier.toSVG(nextSegs));
           } else
            {
                //Taking path 2
                //console.log('Taking path2');
                nextIntersection = currentIntersection.path2.next;
                bounds = this.getPathBounds(currentIntersection, nextIntersection, 1, front);
                //console.log('path2 bounds', bounds);
                //console.log('loop2 split', bounds.startT, bounds.endT, loop2.split(bounds.startT, bounds.endT));
                //Path 2 goes to the front if it is the same direction as path 1
                front = nextIntersection.sameDirection;
                nextSegs = loop2.split(bounds.startT, bounds.endT);
                //console.log('loop2 nextSegs', Bezier.toSVG(nextSegs));
            }
            //We made a change so that we could improve how segments connect. By definition the endpoint
            //of the last segment should be the same as the first point in the next segment. Because of the
            //way t values are calculated, this is not always the case. We need to adjust the two points by
            //calulating the average of the two points and setting both points to that value.
            if ((resultSegments.length > 0) && (nextSegs.length > 0))
            {
                let lastSeg = resultSegments[resultSegments.length - 1];
                let firstSeg = nextSegs[0];
                let lastPt = lastSeg.points[lastSeg.order];
                let firstPt = firstSeg.points[0];
                let avgX = (lastPt.x + firstPt.x) / 2;
                let avgY = (lastPt.y + firstPt.y) / 2;
                resultSegments[resultSegments.length - 1].points[lastSeg.order] = { x: avgX, y: avgY };
                nextSegs[0].points[0] = { x: avgX, y: avgY };
            }
            resultSegments.push(...nextSegs);
            currentIntersection.markProcessed();
            // Move to the next intersection
            currentIntersection = nextIntersection;
        }
        //TestPanel.intersect = new Area(resultSegments);
        //TestPanel.redrawMainPanel();
        //console.log('TestPanel.intersect', TestPanel.intersect.path.toSVG());
        //console.log('resultSegments', resultSegments);
        let resultPath = new PathArea(resultSegments);
        //console.log('resultPath', resultPath);
        return resultPath.loops;
    }

    // This gives us the bounds of the path between two intersections or overlaps (current and next)
    // pathIndex is 0 for path1 and 1 for path2
    // front is true if the path is at the front of the intersection/overlap
    //The reason for front is that path2. We always go to the entry point of the intersection/overlap because we won't know
    //the exit until the next decision point. We might exit without tranversing the entire intersection/overlap.
    //When path2 is going the other direction from path1, the entry point is the end of the intersection/overlap.
    getPathBounds(currentIntersection, nextIntersection, pathIndex, front)
    {
        //console.log('getPathBounds', currentIntersection, nextIntersection, pathIndex, front);
        if (pathIndex === 0)
        {
            return {
                startT: currentIntersection.path1.start_t,
                endT: nextIntersection.path1.start_t
            };
        } else
        {
            return {
                startT: currentIntersection.path2.start_t,
                endT: nextIntersection.path2.start_t
            };
        }
    }

    toSVG()
    {
        return this.path.toSVG();
    }

    /**
     * Creates a clone of the Area.
     * @returns {Area} A new Area object identical to the current one.
     */
    clone()
    {
        return new Area(this);
    }

    reverse()
    {
        this.path.reverse();
    }

    /**
     * Additional helper methods as needed.
     */
    /*
    * A handy debug function would be to display some Area. This could done by passing in an array of Areas to display.
    * The paths could be displayed in different colors.  One could also pass a display context to the function.  The function
    * would then draw the paths on the display context. 
    * 
    * One could take the paths and find the bounding box of the paths.  This could be used to scale the paths to fit in a
    * display area.  The paths could be scaled and translated to fit in the display area.  
    */
    static displayAreas(displayContext, areas)
    {
        let colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'black'];
        if (areas.length === 0) return;
        let bounds = utils.findbbox(areas[0].path.beziers);
        for (let i = 1; i < areas.length; i++)
        {
            utils.expandbox(bounds, utils.findbbox(areas[i].path.beziers));
        }
        //console.log(bounds);
        let hscale = (displayContext.canvas.width - 10) / bounds.x.size;
        let vscale = (displayContext.canvas.height - 10) / bounds.y.size;
        //console.log(hscale, vscale);
        let scale = (vscale < hscale) ? vscale : hscale;
        displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height);
        displayContext.save();
        //Standard display transfomation moves the center of the bounding box to 0,0
        //Then scales the bounding box to fit in the display area
        //Then translate the display area to the center of the display area
        displayContext.translate(displayContext.canvas.width / 2, displayContext.canvas.height / 2);
        displayContext.scale(scale, -scale);
        displayContext.translate(-bounds.x.mid, -bounds.y.mid);
        for (let i = 0; i < areas.length; i++)
        {
            let color = colors[i % colors.length];
            displayContext.strokeStyle = color;
            let svgPath = areas[i].toSVG();
            let path = new Path2D(svgPath);
            //Draw the path
            displayContext.stroke(path);
            //Draw the detected intersections and midpoints
            let intersections = areas[i].path.intersections;
            //Some area paths may not have intersections
            //intersections can be undefined or null
            if (intersections)
            {
                for (let j = 0; j < intersections.length; j++)
                {
                    let intersection = intersections[j];
                    displayContext.beginPath();
                    displayContext.arc(intersection.path1.midPoint.x, intersection.path1.midPoint.y, 3, 0, 2 * Math.PI);
                    displayContext.fillStyle = color;
                    displayContext.fill();
                    displayContext.beginPath();
                    displayContext.arc(intersection.path2.midPoint.x, intersection.path2.midPoint.y, 3, 0, 2 * Math.PI);
                    displayContext.fillStyle = 'black';
                    displayContext.fill();
                }
            }
        }
        displayContext.restore();
    }

    /*
    * We are developing a system to do visual debugging. It can be used along with our testing system.  The idea is to
    * generate a tree structure that represents the relationships between the areas/loops.  As we write the functions
    * to populate the tree, we can add text at each node to give us the info we want when inspecting the tree.  We can
    * then display that text when we select that node. We can also cause all the branchyes under that node to indicate
    * that they are the enitiy being inspected by turning blue. Ultimately, we can manipulate the tree in various ways.
    * One is to move children around so that they render in different order. Also we can change the render colors.
    */
    makeDebugNode(name)
    {
        let thisArea = BezierDebugTools.makeNode(this, name);
        thisArea.children.push(this.path.makeDebugNode(name + '_path'));
        return thisArea;
    }
}

export { Area };
export default Area;

