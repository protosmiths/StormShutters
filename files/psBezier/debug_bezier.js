/*
* Some tools to debug the bezier curve library. The first functions are a wway to display the bezier curves in a canvas.
*
* I think the approach is to have a list to store bezier related object to display. I think that one could have a function
* to add objects to the list and another to display the objects in the list. The display function would be called in with the
* list. The list would have beziers and points to display. And colors to use for the display.
*
* The biggest problem is trying to visualize the bezier curves. I think the best way is to scale the bezier curves to fit in the
* display area. We need to find the bounding box of the bezier curves to set the scale and origin of the display. The bounding
* box is the smallest rectangle that contains the bezier curves. We also need to include the points in the bounding box. Include
* PolyBeziers as possible objects.
*
* Display is the first step. The next step is to allow the user to interact with the bezier curves. The user should be able to
* select a bezier curve and see the control points. We don't need manipulate the beziers, we need to inspect them. We need to
* be able to see which bezier (index) we are inspecting. The thing is that the beziers themselves are not necessarily the thing
* we are debugging.  In fact, this debugging tool is being considered because of Area.js. The idea is that bezier curves are
* are the basis for the area.js library. There are other bezier related functions to be debugged in the future. For example,
* the offset function presently does work well doing offsets of contiguous bezier curves. In fact, the offset function will
* have some of the same issues as the area.js library.
*
* In any case, I hope to brainstorm a system that will be easily extended to other bezier related functions. Part of the system
* will be showing text information based on mouse operation. I have implemented a hover tooltip like system in the past. One could
* go to a click system. The mouse location is the key. We should use the reverse transform to get the real world coordinates.
* It is pretty easy to have point based information. The bezier curve information is a little more difficult. We have the project
* function to get the distance from the bezier curve. We can use the project function to get the distance from the bezier curve.
* We could build a list of objects that are close to the mouse. We could put up the information for the closest object. We could
* a way to step through the list. We should have a way to indicate which object we are inspecting.
*
* Instead of static functions, we will have a class and associated instaniated objects. Each object will have its own display list
* and display context. The display context will be the canvas context. The display list will be the list of objects to display. We
* will have an affine transform to scale and translate the bezier curves to fit in the display area and the associated inverse
* transform to get the real world coordinates. We will have a list of objects to display. The objects will be bezier curves and
* points. The points and beziers can use the bezier library for various functions. One function is to calculate the distance to
* build a list of objects that are close to the mouse. We can use the project function to get the distance from the bezier curve.
* Each object could have the text to display at the mouse click location. We could have a way to step through the list. We will
* have higher level structures like loops and areas. We will have a way to link the lower level structure to the higher levels
* and to display info about the higher level structures. I am thinking that perhaps we should add structures that can be filled
* with color. We could have a way to display the filled structures. Sticky with the theme of the bezier curves, we could have
* PolyBeziers that are filled with color. We could have a way to display the filled PolyBeziers. We could have a way to display
*
* The information that is stored in the list stroke color, fill color, text, object, and type. The type is bezier, polybezier or
* point. The text is the text to display at the mouse click location. The object is the bezier related object. There is base text
* to be displayed for each object. For one location and curve index.
*
* There can be objects that overlap. It would be nice to have a way to rotate through the order of the list. Related, we cou7ld add
* a name to the object. The names could be displayed in a floating window. The names could be used to select the object to display.
* We could also move objects around in the list changing their order. We could have a way to delete or hide objects in the list.
*
* A new plan/design is to build a jstree structure. In writing the code, an interesting wrinkle popped up. I generated svg at nodes
* where it could be used. This means my debug tools don't need any knowledge of the bezier library. However, we have linked to the
* bezier objects and could use them for things like bounding boxes.
*
* The jstree structure is a very good way to visualize the bezier objects. Trying to design it for various use cases. Here are some
* design considerations. Svg has become the mechanism to represent bezier curves in a human readable form. It is also a form that
* can be displayed in a canvas. The jstree structure is a way to visualize the bezier objects. We are going to use svg to display
* the bezier objects. Part of the idea of having a jstree structure is that there is an heirarchy in the way that beziers are
* used. Objects that can be filled are loops that are constructed from bezier curves. That gives a heirarchy to the bezier objects.
*/

// files/psBezier/debug_bezier.js
import { Bezier, PolyBezier } from './bezier.js';
import { Affine } from "./affine.js";

class BezierDebugTools
{
    constructor(context)
    {
        this.ctx = context;
        this.displayAffine = Affine.getIdentityATx();
        this.inverseAffine = Affine.getIdentityATx();
        //this.tree = { text: 'root', children: [] };
        //this.tree = { text: 'root', children: [], obj: null, info: '', tselected: false };
        this.tree = {
            "text": "root", "children": [], data: { "obj": null, "info": '', "selected": false } };
        this.scale = 1;
    }

    // Start with the simplest node. Add to it as needed
    static makeNode(object, name)
    {
        let selected = { sel: false };
        //object = null;
    //    return { text: name, li_attr: {}, children: [] };
        //    return { text: name, children: [], obj: object, info: '', tselected: false };
        let node = {
            "text": name, "children": [],
            data: { "obj": object, "info": '', "selected": false }
        };
        return node;
    }

    static makeCircle(point, radius)
    {
        //console.log('makeCircle', point, radius);
        let unitCircle = utils.unitCircle();

        let affine = Affine.getTranslateATx(point);
        affine = Affine.append(affine, Affine.getScaleATx({ x: radius, y: radius }));

        unitCircle.transform(affine);

        let ucSvg = unitCircle.toSVG();
        return ucSvg
    }

    /**
     * Adds a bezier related object to the display list.
     * @param {Object} object - The object to add to the display list.
     * @param {string} color - The color to use for the display.
     * @param {list} displayList - The list of objects to display. User supplied list.
     */
    addBezierDisplayObject(node)
    {
        this.tree.children.push(node);
    }

    /*
    * After we have populated the tree, we can calculate an affine transform to fit the tree in the display area.
    * This is when having the bezier objects would be useful. We will calculate the bounding box of the bezier objects
    */
    calculateAffine()
    {
        //Trees and reentrant functions go together
        let bbox = this.tree.children[0].data.obj.bbox();
        //let bbox = this.tree.children[0].data.obj;
        for (let i = 1; i < this.tree.children.length; i++)
        {
            //utils.expandbox(bbox, this.tree.children[i].data.obj);
            utils.expandbox(bbox, this.tree.children[i].data.obj.bbox());
        }
        // We need to scale the bezier curves to fit in the display area.
        // We need to translate the bezier curves to the origin of the display area.
        let hscale = (this.ctx.canvas.width - 20) / (bbox.x.size);
        let vscale = (this.ctx.canvas.height - 20) / (bbox.y.size);
        this.scale = Math.min(hscale, vscale);
        //Put the origin at the center of the display area
        this.displayAffine = Affine.getTranslateATx({ x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 });
        this.displayAffine = Affine.append(this.displayAffine, Affine.getScaleATx({ x: this.scale, y: -this.scale }));
        this.displayAffine = Affine.append(this.displayAffine, Affine.getTranslateATx({ x: -bbox.x.mid, y: -bbox.y.mid }));
        this.inverseAffine = Affine.getInverseATx(this.displayAffine);
    }

    /*
    * Display the tree. Travel down the tree until svg is found. Display the svg. The svg will be transformed by the affine
    * transform. Tricky thing is that the higher level svg can be a closed path and can be filled.  But there may be times
    * when we want to continue down the tree to indicate that we are inspecting a lower level object. We could have a way
    * to indicate that we are inspecting a lower level object.
    *
    * We will display the tree in the canvas. We will use the affine transform to scale and translate the bezier curves to
    * fit in the display area. We will use the inverse affine transform to get the real world coordinates. We will display
    */
    displayTree(treeId)
    {
        //return;
        //First some defensive programming. We must run the guantlet of the tree of verification.
        //Is this id in the DOM?
        let tree = $(`#${treeId}`).jstree();
        //let tree = document.getElementById(treeId);
        if (!tree) return;

        //console.log('tree', tree);
        //return;

        let treeData = tree._model.data;

        //Passed the first test. Now we need to get the tree data
        //let treeData = tree.jstree(true).get_json('#', { flat: false });
        //let treeData = $('#treeContainer').jstree().get_json('#', { flat: true });
        //let treeData = $(`#${treeId}`).jstree().get_json('#', { flat: true });
        if (!treeData) return;

        //console.log('treeData', treeData);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.save();
        Affine.ctxTransform(this.ctx, this.displayAffine);
        this.ctx.lineWidth = 2 / this.scale;
        let reentrantDisplayNode = function (node, ctx, displayed = false)
        {
            node = treeData[node];
            //console.log('node', node);
            if (node.data.svg)
            {
                //console.log('svg', node.text);
                if (!displayed)
                {
                    //We have a svg path to display
                    let ctxPath = new Path2D(node.data.svg);
                    ctx.strokeStyle = 'black';
                    if (node.data.strokeColor) ctx.strokeStyle = node.data.strokeColor;
                    ctx.stroke(ctxPath);
                    //return; //For now
                    //displayed = true;
                }
                if (node.data.selected)
                {
                    console.log('selected', node.text);
                    //We have a svg path to display
                    ctx.save();
                    ctx.lineWidth = 4 / this.scale;
                    let ctxPath = new Path2D(node.data.svg);
                    ctx.strokeStyle = 'blue';
                    ctx.stroke(ctxPath);
                    ctx.restore();
                }
            }
            //node.children.forEach(child =>
            for (let i = 0; i < node.children.length; i++)
            {
                let child = node.children[i];
                reentrantDisplayNode(child, ctx, displayed);
            }
        };
        //bind reentrant function to this
        reentrantDisplayNode = reentrantDisplayNode.bind(this);
        reentrantDisplayNode(treeData['#'].children[0], this.ctx, false);
        this.ctx.restore();
    }

    /**
     * Displays the bezier related objects in the display list.
     * @param {ctx} ctx - The canvas context to use for the display.
     * @param {list} displayList - The list of objects to display. User supplied list.
     */
    static displayBezierObjects(ctx, list)
    {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // We need to find the bounding box of the bezier curves to set the scale and origin of the display.
        // The bounding box is the smallest rectangle that contains the bezier curves.
        // We also need to include the points in the bounding box. Include PolyBeziers as possible objects
        let bbox = null;
        let beziers = [];
        let bcolors = [];
        let points = [];
        //let pcolors = [];
        list.forEach(item =>
        {
            let _bbox = null;
            if (item.object instanceof Bezier)
            {
                _bbox = item.object.bbox();
                beziers.push(item.object);
                bcolors.push(item.color);
            }
                //test for {x: number, y: number}
            else if (item.object.x !== undefined && item.object.y !== undefined)
            {
                _bbox = { x: { min: item.object.x, max: item.object.x }, y: { min: item.object.y, max: item.object.y } };
                points.push(item);
                //pcolors.push(item.color);
            }
            else if (item.object.constructor.name == 'PolyBezier')
            {
                console.log('PolyBezier', item.object);
                _bbox = item.object.bbox();
                item.object.curves.forEach(curve =>
                {
                    beziers.push(curve);
                    bcolors.push(item.color);
                });
            }
            if (bbox)
            {
                utils.expandbox(bbox, _bbox);
                return;
            }
            bbox = _bbox;
        });
        // We need to scale the bezier curves to fit in the display area.
        // We need to translate the bezier curves to the origin of the display area.
        let hscale = (ctx.canvas.width - 20) / (bbox.x.size);
        let vscale = (ctx.canvas.height - 20) / (bbox.y.size);
        let scale = Math.min(hscale, vscale);
        //Put the origin at the center of the display area
        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.scale(scale, -scale);
        ctx.translate(-bbox.x.mid, -bbox.y.mid);
        // Display the bezier curves
        let svgPath = Bezier.toSVG(beziers);
        let ctxPath = new Path2D(svgPath);
        ctx.strokeStyle = 'black';
        ctx.stroke(ctxPath);
        // Display the points
        points.forEach(point =>
        {
            ctx.beginPath();
            ctx.arc(point.object.x, point.object.y, 2, 0, 2 * Math.PI);
            ctx.fillStyle = point.color;
            ctx.fill();
        });
        ctx.restore();

    }
}
export { BezierDebugTools };
export default BezierDebugTools;