/*
* This file works in conjunction with test.html to test the bezier curve library. In particular, the Area class.
* We will have a panel with shapes that can be dragged around and resized. The union and intersection of the shapes will be displayed.
* SWhapes will default to CW winding. One can reverse the winding by clicking on the shape with crtl key pressed. An arrow at the
* origin of the shape will indicate the winding direction.
*
* I think the circle and the square are the only shapes that we will need. The circle has four 3rd order bezier curves. The square has
* has four 1st order bezier curves. The square is a special case of the rectangle. The rectangle has 4 1st order bezier curves. We will
* to resize the shapes with the mouse. We will need to be able to drag the shapes around. We will need to be able to select the shapes.
* When selected, the shape will be highlighted. There will be the 8 resize handles. The shape will be resized by dragging the handles.
* The shapes will be stored in an array. The shapes will be drawn in the order that they are stored in the array. The shapes will be
* stored as an svg d parameter. Along with the d parameter will be a transform parameter. The transform parameter will be used to
* scale and translate the shape.
*
* We will create a panel with two canvases. The top canvas will be the dragging canvas. The bottom canvas will be the display canvas.
* The dragging canvas will be used to drag the shapes around. The display canvas will be used to display the shapes. The shapes will
* be drawn on the display canvas. The shapes will be dragged around on the dragging canvas. The shapes will be resized on the dragging
* canvas. The shapes will be selected on the dragging canvas. The shapes will be highlighted on the display canvas. The shapes will be
* drawn in the order that they are stored in the array. When a shape is selected and dragged, the bottom canvas will be cleared and
* the shapes will be redrawn without the selected shape. The selected shape will be drawn on the top canvas. The selected shape will
* be drawn on the top canvas. The mouse move event will be used to draw the selected shape on the top canvas. The mouse up event will
* be used to add the selected shape to the array and redraw the shapes on the bottom canvas. This time the shapes have the union and
* intersection displayed.
*/

import { Affine } from  "./psBezier/affine.js";
import { SSPanel } from "./ss_panel.js";
import { utils } from "./psBezier/utils.js";
import { Area } from "./psBezier/Area.js";
class Shape
{
    constructor(svg)
    {
        this.svg = svg;
        this.area = new Area(this.svg);
        //Let's kep the scale and translation separate. We will need to be able to get the scale and translation separately.
        this.scale = { x: 1, y: 1 };
        this.translation = { x: 0, y: 0 };
        this.transform = Affine.getIdentityATx();
        this.selected = false;
    }

    isInside(pt)
    {
        if (this.resizeMode)
        {
            let resizeHandleSize = 20;
            if (pt.x < this.bbox.x.min - resizeHandleSize) return false;
            if (pt.x > this.bbox.x.max + resizeHandleSize) return false;
            if (pt.y < this.bbox.y.min - resizeHandleSize) return false;
            if (pt.y > this.bbox.y.max + resizeHandleSize) return false;
            return true;
        }

        return this.area.isInside(pt);
    }

    getSVGPath()
    {
        //console.log('getSVGPath', this.svg);
        //let tranSvg = utils.svgTransform(this.svg, this.transform);
        //console.log('getSVGPath', tranSvg);
        return utils.svgTransform(this.svg, this.transform);
    }

    /*
    * This transformation is the mechanism we use to set the size and position of our shape.
    * Now we would like to make our shape resize handle aware. This will make it easier to resize the shape.
    */
    calculateTransform()
    {
        this.transform = Affine.getTranslateATx(this.translation);
        this.transform = Affine.append(this.transform, Affine.getScaleATx(this.scale));
        //Let's separate this from this method. This will allows us to drag the shape around without
        //generating a new area for each mouse move. Note that the inverse transform allows us to take
        //the mouse position in the display coordinate system and transform it to the shape's coordinate system.
        //We can set the translation to value from the inverse transform. Then we can call this method to update
        // the transforms.
        //this.area = new Area(this.getSVGPath());
    }

    /*
    * We discussed above making the shape resize handle aware. This will make it easier to resize the shape.
    * Since separated the area from the calculateTransform to make dragging more efficient, we can
    * create a function here to set the area when dragging has stopped. When we set the area we can get the
    * bounding box from the area object. From the bounding box we can determine where the resize handles should be.
    * We need a flag to indicate the shape is in resize mode. When in resize mode, the isInside method will return true
    * if the mouse is over a resize handle. We can also add a function to tell us which resize handle the mouse is over.
    * A super simple way to handle this is for the isInsidee function to use a bounding box expanded to include the
    * resize handles. isIside returns true if the mouse is inside the expanded bounding box. The function that tells us 
    * which resize handle the mouse is over can take the distances from the sides and corners of the mouse to determine 
    * which resize handle is being used.
    */
    setArea()
    {
        this.area = new Area(this.getSVGPath());
        console.log(this.area);
    }

    setResizeMode(mode)
    {
        this.resizeMode = mode;
        if (mode)
        {
            this.bbox = this.area.bbox();
        }
    }

    //Determine which resize handle the mouse is over.
    getResizeHandle(pt)
    {
        let bbox = this.bbox;
        let x = pt.x - bbox.x.mid;
        let y = pt.y - bbox.y.mid;
        //There are 8 possible resize handles. We can use the distances from the sides and corners
        //to determine which resize handle is being used. Alternately we could use the direction from the
        //center of the shape to determine which resize handle is being used. atan2 would work.
        //We can also use the mouse position to get the resize handle index.
        //Let's discuss a atan2 approach. atan2(y, x) gives us the angle from the center of the shape to the mouse position.
        //If we add 9 * Math.PI/8 to the angle and divide by Math.PI/4 we can get the index of the resize handle.
        //where 0 is the left, 1 is bottom left, 2 is bottom, 3 is bottom right, 4 is right, 5 is top right, 6 is top, 7 is top left.
        //We can also use the mouse position to get the resize handle index.
        let angle = Math.atan2(y, x) + 9 * Math.PI / 8;
        return Math.floor(angle / (Math.PI / 4)) % 8;
    }

    //Use resize handle index and mouse position to resize the shape.
    resizeShape(index, pt)
    {
        //We have to do the same thing over and over below. Let's make a function for it.
        //In this first function we are going to change the width of the shape. We are
        //also going to translate the shape to keep one edge in place. The sign of the edge
        //will determine which edge we are resizing from.
        let xChange = function (that, bbox, xDelta, edge)
        {
            that.scale.x *= (xDelta + bbox.x.size) / bbox.x.size;
            that.translation.x += edge * xDelta / 2;
        }
        //In this second function we are going to change the height of the shape. We are
        //also going to translate the shape to keep one edge in place. The sign of the edge
        //will determine which edge we are resizing from.
        let yChange = function (that, bbox, yDelta, edge)
        {
            that.scale.y *= (yDelta + bbox.y.size) / bbox.y.size;
            that.translation.y += edge * yDelta / 2;
        }
        let bbox = this.bbox;
        switch (index)
        {
            //We want to hold right side still and move the left side to the mouse position.
            //We rescale the shape in the x direction and translate the shape in the x direction by 1/2 the change
            //of the left side. This will make the left side move to the mouse position.
            case 0: //Left
                xChange(this, bbox, bbox.x.min - pt.x, -1);
                break;

            //Now we want to hold the upper right side still and move the left side to the mouse position.
            //We rescale the shape in the x direction and translate the shape in the x direction by 1/2 the change
            //of the left side. This will make the left side move to the mouse position.
            //We also rescale the shape in the y direction and translate the shape in the y direction by 1/2 the change
            //of the bottom side. This will make the bottom side move to the mouse position.
            case 1: //Bottom Left
                xChange(this, bbox, bbox.x.min - pt.x, -1);
                yChange(this, bbox, bbox.y.min - pt.y, -1);
                break;

            case 2: //Bottom
                yChange(this, bbox, bbox.y.min - pt.y, -1);
                break;

            case 3: //Bottom Right
                xChange(this, bbox, pt.x - bbox.x.max, 1);
                yChange(this, bbox, bbox.y.min - pt.y, -1);
                break;

            case 4: //Right
                xChange(this, bbox, pt.x - bbox.x.max, 1);
                break;

            case 5: //Top Right
                xChange(this, bbox, pt.x - bbox.x.max, 1);
                yChange(this, bbox, pt.y - bbox.y.max, 1);
                break;

            case 6: //Top
                yChange(this, bbox, pt.y - bbox.y.max, 1);
                break;

            case 7: //Top Left
                xChange(this, bbox, bbox.x.min - pt.x, -1);
                yChange(this, bbox, pt.y - bbox.y.max, 1);
                break;
        }
        this.calculateTransform();
        this.area = new Area(this.getSVGPath());
        this.bbox = this.area.bbox();
    }

    static getCircle(r)
    {
        //let circle = new Shape("M 1 0 C 1 0.551915 0.551915 1 0 1 C -0.551915 1 -1 0.551915 -1 0 C -1 -0.551915 -0.551915 -1 0 -1 C 0.551915 -1 1 -0.551915 1 0 Z");
        //We want a CW winding for the circle. The default is CCW.
        let circle = new Shape("M 1 0 C 1 -0.551915 0.551915 -1 0 -1 C -0.551915 -1 -1 -0.551915 -1 0 C -1 0.551915 -0.551915 1 0 1 C 0.551915 1 1 0.551915 1 0 Z");
        circle.scale = { x: r, y: r };
        circle.calculateTransform();
        return circle;
    }
    

    //new Bezier([{x:1, y:0}, {x:1, y:0.551915}, {x:0.551915, y:1}
    static getCirclexy(r, cx, cy)
    {
        //CW winding for the circle. The default is CW.
        let circle = new Shape("M 1 0 C 1 -0.551915 0.551915 -1 0 -1 C -0.551915 -1 -1 -0.551915 -1 0 C -1 0.551915 -0.551915 1 0 1 C 0.551915 1 1 0.551915 1 0 Z");
        circle.scale = { x: r, y: r };
        circle.translation = { x: cx, y: cy };
        circle.calculateTransform();
        circle.area = new Area(circle.getSVGPath());
        return circle;
    }

    //Make the center of the square the reference point.
    static getSquarexy(s, cx, cy)
    {
        let square = new Shape("M 0.5 0.5 L 0.5 -0.5 L -0.5 -0.5 L -0.5 0.5 Z");
        square.scale = { x: s, y: s };
        square.translation = { x: cx, y: cy };
        square.calculateTransform();
        square.area = new Area(square.getSVGPath());
        return square;
    }

    static getRectxy(w, h, cx, cy)
    {
        let rect = new Shape("M 0.5 0.5 L 0.5 -0.5 L -0.5 -0.5 L -0.5 0.5 Z");
        rect.scale = { x: w, y: h };
        rect.translation = { x: cx, y: cy };
        rect.calculateTransform();
        rect.area = new Area(this.getSVGPath());
        return rect;
    }

    static getTriangle()
    {
        let triangle = new Shape("M 1 0 L 1 1 L 0 1 Z");
        return triangle;
    }

    static getArrow()
    {
        let arrow = new Shape("M 0 0 L 0 1 L 0.5 0.5 L 1 1 L 1 0 Z");
        return arrow;
    }
}

class TestPanelClass
{
    constructor()
    {
        this.pnlObj = null;
        this.width = 0;
        this.height = 0;
        this.shapes = [];
        this.selectedShape = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.lastX = 0;
        this.lastY = 0;
        this.displayTransform = Affine.getIdentityATx();
        this.inverseDisplayTransform = Affine.getIdentityATx();
        this.draggingShape = null;
        this.resizeHandle = null;
        //this.resizeHandleIndex = -1;
        this.resizeHandleSize = 10;
        this.union = null;
        this.intersect = null;
        this.intersections = [];
    //    this.resizeHandleColor = 'black';
    //    this.resizeHandleFillColor = 'white';
    //    this.resizeHandleArray = [];
    //    this.resizeHandleShape = null;
    //    this.resizeHandleShapeIndex = -1;
    //    this.resizeHandleShapeSize = 10;
    //    this.resizeHandleShapeColor = 'black';
    //    this.resizeHandleShapeFillColor = 'white';
    //    this.resizeHandleShapeArray = [];
    //    this.resizeHandleShapeShape = null;
    //    this.resizeHandleShapeShapeIndex = -1;
    //    this.resizeHandleShapeShapeSize = 10;
    //    this.resizeHandleShapeShapeColor = 'black';
    }
    //Define some static consts to give meaning for the redraw parameter
    static get REDRAW_NONE() { return 0; }
    static get REDRAW_LOWER() { return 1; }
    static get REDRAW_UPPER() { return 2; }
    static get REDRAW_BOTH() { return 3; }

    initPanel()
    {
        let lwrCnvs = document.createElement('canvas');
        let upprCnvs = document.createElement('canvas');
        this.pnlObj = SSPanel.panelFactory('pnlMain', lwrCnvs, upprCnvs);
        //Do we need binding for redrawMainPanel?
        this.pnlObj.redraw = this.redrawMainPanel.bind(this);

        //this.pnlObj.redraw = this.redrawMainPanel;
        //SSPanel.setPanelDrag(this.pnlObj);
        //SSPanel.setPanelResize(this.pnlObj);
        this.width = this.pnlObj.panel.clientWidth;
        this.height = this.pnlObj.panel.clientHeight - 30;
        this.pnlObj.lwrCnvs.width = this.width;
        this.pnlObj.lwrCnvs.height = this.height;
        this.pnlObj.upprCnvs.width = this.width;
        this.pnlObj.upprCnvs.height = this.height;
        this.pnlObj.header.style.height = '30px';

        //Do we need to bind the button handlers?
        this.addCircle = this.addCircle.bind(this);
        this.addSquare = this.addSquare.bind(this);
        this.doUnion = this.doUnion.bind(this);
        this.doIntersect = this.doIntersect.bind(this);
        this.doSubtract = this.doSubtract.bind(this);

        //Create buttons to add shapes to the panel.
        let btnCircle = SSPanel.createButton('Circle', this.addCircle);
        this.pnlObj.header.appendChild(btnCircle);

        let btnSquare = SSPanel.createButton('Square', this.addSquare);
        this.pnlObj.header.appendChild(btnSquare);

        //Create a button to display the union of the shapes.
        let btnUnion = SSPanel.createButton('Union', this.doUnion);
        this.pnlObj.header.appendChild(btnUnion);

        //Create a button to display the intersection of the shapes.
        let btnIntersection = SSPanel.createButton('Intersect', this.doIntersect);
        this.pnlObj.header.appendChild(btnIntersection);

        //Create a button to subtract the shapes.
        let btnSubtract = SSPanel.createButton('Subtract', this.doSubtract);
        this.pnlObj.header.appendChild(btnSubtract);
    }

    doSubtract()
    {
        this.intersections = [];
        let area = new Area(this.shapes[0].getSVGPath());
        for (let i = 1; i < this.shapes.length; i++)
        {
            area = area.subtract(new Area(this.shapes[i].getSVGPath()));
        }
        this.union = area;
        this.intersect = null;
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
        return;
    }

    doUnion()
    {
        this.intersections = [];
        let area = new Area(this.shapes[0].getSVGPath());
        for (let i = 1; i < this.shapes.length; i++)
        {
            area = area.union(new Area(this.shapes[i].getSVGPath()));
        }
        this.union = area;
        this.intersect = null;
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
        return;
    }

    doIntersect()
    {
        this.intersections = [];
        let area = new Area(this.shapes[0].getSVGPath());
        for (let i = 1; i < this.shapes.length; i++)
        {
            area = area.intersect(new Area(this.shapes[i].getSVGPath()));
        }
        this.intersect = area;
        this.union = null;
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
        return;
    }

    //Let's define the event handlers here.
    //We want to be able to drag the shapes around.
    //We want to be able to resize the shapes.
    //We want to be able to select the shapes.
    //We want to be able to highlight the shapes when selected.
    //We want to be able to draw the shapes in the order that they are stored in the array.
    //We want to be able to display the union and intersection of the shapes.
    //We want to be able to reverse the winding of the shapes.
    //We want to be able to display the winding direction of the shapes.
    //We want to be able to display the resize handles for the shapes.
    //Some notes on approach. On mouse down, we will check if the mouse is over a shape.
    //If it is, we will set the selected shape to the shape that was clicked on. We will
    //also set the dragging flag to true. We can use the mouse position and the inverse
    //transform to get the mouse position in the shape's coordinate system. We can then
    //use the shape's isInside method to check if the mouse is inside the shape. If it is, we will
    //set the dragging shape to the shape that was clicked on. We will also set the last mouse position
    //to the current mouse position. On mouse move, we will check if the dragging flag is true. If it is,
    //we will check if the dragging shape is not null. If it is not null, we will get the current mouse
    //position and the last mouse position. We will then calculate the difference between the two positions.
    //We will then update the dragging shape's translation by adding the difference to the translation.
    //We will also update the last mouse position to the current mouse position. On mouse up, we will set
    //the dragging flag to false. We will also set the dragging shape to null. We can also regenerate the area for the shape.
    //Then we set the selected shape to null. Then we can call the redraw method to update the display.
    //I am not sure about deselecting at this point. We have to have a way to do resizing. It certainly involves
    //selecting the shape. We can do this by checking if the mouse is over a resize handle. If we are dragging, the
    //shape will be selected and moving. I would expect that the resize handles would be visible in this case, but moving
    //along with the shape. We won't be able to move over the resize handles. We have to have a way to stop dragging or to
    //not start dragging. We can do this by checking if the mouse is over a resize handle. We can't mouse over a resize handle while dragging!
    //We can't get the mouse to the rctangle because it will move with the shape when we are dragging. We need to way to stop dragging.
    //Let's stop dragging on mouse up but don't deselect. We deselect by clicking on the background.
    addEventListeners()
    {
        this.pnlObj.upprCnvs.addEventListener('mousedown', this.mouseDown);
        this.pnlObj.upprCnvs.addEventListener('mousemove', this.mouseMove);
        this.pnlObj.upprCnvs.addEventListener('mouseup', this.mouseUp);
    //    window.addEventListener('keydown', this.keyDown);
    //    window.addEventListener('keyup', this.keyUp);
    }
    removeEventListeners()
    {
        this.pnlObj.upprCnvs.removeEventListener('mousedown', this.mouseDown);
        this.pnlObj.upprCnvs.removeEventListener('mousemove', this.mouseMove);
        this.pnlObj.upprCnvs.removeEventListener('mouseup', this.mouseUp);
        window.removeEventListener('keydown', this.keyDown);
        window.removeEventListener('keyup', this.keyUp);
    }
    keyDown = (e) =>
    {
        if (e.key == 'Control')
        {
            for (let i = 0; i < this.shapes.length; i++)
            {
                if (this.shapes[i].selected)
                {
                    let area = new Area(this.shapes[i].getSVGPath());
                    area.reverse();
                    this.shapes[i].svg = area.toSVG();
                    //We need a redraw to flip the arrow
                    this.pnlObj.redraw(TestPanel.REDRAW_BOTH);
                    break;
                }
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    keyUp = (e) =>
    {
        if (e.key == 'Control')
        {
            for (let i = 0; i < this.shapes.length; i++)
            {
                if (this.shapes[i].selected)
                {
                    let area = new Area(this.shapes[i].getSVGPath());
                    area.reverse();
                    this.shapes[i].svg = area.getSVGPath();
                    break;
                }
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    //We would like to "grab" the shape where the mouse is clicked.
    //That is as opposed to the center of the shape.. The delta method does this.
    //But we want to implement the inverse transform to get the mouse position in
    //the shape's coordinate system. This allows for completely different coordinate
    //systems for the shapes. We can also use the mouse position to get the resize handle.
    //We can also use the mouse position to get the resize handle index.
    mouseDown = (e) =>
    {
        e = e || window.event;

        //Get the mouse position in the display coordinate system.
        let pt = { x: e.offsetX, y: e.offsetY };;
        //console.log('Mouse Down', pt, this.inverseDisplayTransform);
        pt = Affine.transformPoint(pt, this.inverseDisplayTransform);
        //pt is mouse position in shape's coordinate system.
        //Let's find out if we are doing a resize or a drag.

        for (let i = 0; i < this.shapes.length; i++)
        {
            if (this.shapes[i].isInside(pt))
            {
                //Check for ctrl key to reverse the winding.
                if (e.ctrlKey)
                {
                    console.log('Control Key Pressed', this.shapes[i].svg);
                    let area = new Area(this.shapes[i].svg);
                    area.reverse();
                    this.shapes[i].svg = area.toSVG();
                    this.shapes[i].setArea();
                    console.log('Control Key Pressed', this.shapes[i].svg);
                    //We need a redraw to flip the arrow
                    this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
                    return;
                }
                console.log('Mouse Down', pt, this.isResizing, i, this.shapes, this.shapes[i].selected);
                //Is this shape already selected? We shouldn't be dragging. This is our mechanism for resizing.
                //On mouse up we should have stopped dragging and did a rewdraw that gave us resize handles.
                if (!this.isResizing && this.shapes[i].selected)
                {
                    //We are in resize mode.
                    this.resizeHandle = this.shapes[i].getResizeHandle(pt);
                    this.isResizing = true;
                    return;
                }
                //We are going to modify the shape object to make the resize handles easier.
                this.selectedShape = this.shapes[i];
                this.selectedShape.selected = true;
                this.dragging = true;
                //Get the mouse position in the shape's coordinate system.
                //pt = Affine.transformPoint(this.selectedShape.transform, pt);
                //pt from above is in the shape's coordinate system.. The offset is the distance from the
                //mouse position and the shape's center. We can use this to get the resize handle.
                this.dragOffset.x = this.shapes[i].translation.x - pt.x;
                this.dragOffset.y = this.shapes[i].translation.y - pt.y;
                //We can use the delta method to get the mouse position in the shape's coordinate system.
                //This allows for completely different coordinate systems for the shapes.
                //We can also use the mouse position to get the resize handle.
                //We can also use the mouse position to get the resize handle index.
                //let delta = this.selectedShape.area.getDelta(pt);
                //if (delta)
                //{
                //    this.resizeHandle = delta.handle;
                //    this.resizeHandleIndex = delta.index;
                //    this.dragging = false;
                //    break;
                //}
                //this.lastX = pt.x;
                //this.lastY = pt.y;
                this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
                return;
            }
        }
        //Not in a shape. Deselect all shapes.
        this.selectedShape = null;
        for (let i = 0; i < this.shapes.length; i++)
        {
            this.shapes[i].selected = false;
        }
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
    }

    mouseMove = (e) =>
    {
        //console.log('Mouse Move', this.dragging, this.selectedShape);
        let pt = { x: e.offsetX, y: e.offsetY };;
        pt = Affine.transformPoint(pt, this.inverseDisplayTransform);
        if (this.dragging && this.selectedShape)
        {
            //console.log('Mouse Move', pt);
            this.selectedShape.translation.x = this.dragOffset.x + pt.x;
            this.selectedShape.translation.y = this.dragOffset.y + pt.y;
            this.selectedShape.calculateTransform();
            this.pnlObj.redraw(TestPanelClass.REDRAW_UPPER);
            return;
        }
        if (this.isResizing && this.selectedShape)
        {
            this.selectedShape.resizeShape(this.resizeHandle, pt);
            this.pnlObj.redraw(TestPanelClass.REDRAW_UPPER);
            return;
        }

        for (let i = 0; i < this.intersections.length; i++)
        {
            const intersection = this.intersections[i];
            const distance = Math.sqrt(
                Math.pow(pt.x - intersection.path1.thisPoint.x, 2) +
                Math.pow(pt.y - intersection.path1.thisPoint.y, 2)
            );
            //console.log('Distance', distance);
            if (distance < 15)
            { // Adjust the radius as needed
                //The data needs to be formatted to be the innerHTML of the tooltip. For now we want the exit code from each path
                //intersection.path1 = { start_t: path1_start_t, end_t: path1_end_t, entry_t: path1_start_t, exit_t: path1_end_t, next: null, exit_code: 0 };
                //intersection.path2 = { start_t: path2_start_t, end_t: path2_end_t, entry_t: path2_start_t, exit_t: path2_end_t, next: null, exit_code: 0 };

                let data = `No. ${i}<br>Path 1 Exit Code: ${intersection.path1.exit_code} x:${intersection.path1.midPoint.x} y:${intersection.path1.midPoint.y}<br>Path 2 Exit Code: ${intersection.path2.exit_code} x:${intersection.path2.midPoint.x} y:${intersection.path2.midPoint.y}`;

                this.showTooltip(data, { x: e.offsetX, y: e.offsetY });
                return;
            }
        }
        this.hideTooltip();
    }

    mouseUp = (e) =>
    {
        this.dragging = false;
        this.isResizing = false;
        if (this.selectedShape)
        {
            //Now we want to prepare for a possoble resize.
            //Here we display the resize handles.
            this.selectedShape.calculateTransform();
            this.selectedShape.setArea();
            this.selectedShape.setResizeMode(true);
            this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
        }
        //this.selectedShape = null;
    }
    //We want to be able to add shapes to the panel.

    addCircle = (r = 50, x = 50, y = 50) =>
    {
        let circle = Shape.getCirclexy(r, x, y);
        this.shapes.push(circle);
        console.log(this.shapes);
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
    }

    addSquare = (s = 50, x = 30, y = 30) =>
    {
        let square = Shape.getSquarexy(s, x, y);
        this.shapes.push(square);
        console.log(this.shapes);
        this.pnlObj.redraw(TestPanelClass.REDRAW_BOTH);
    }

    drawShape(ctx, shape)
    {
        let path = new Path2D(shape.getSVGPath());
        ctx.strokeStyle = 'black';
        if (!shape.area.path.loops[0].direction)
        {
            //CCW is red
            ctx.strokeStyle = 'red';
        }
        ctx.lineWidth = 1;
        ctx.stroke(path);
    }

    /*
    * The setup has two canvases. We either need two redraw methods or a parameter to indicate which canvas to redraw.
    * I think a parameter is better. This way we can have one method to redraw both canvases. The redraw call when a
    * shape is selected will need to redraw both canvases. Use a bit map? Bit 0 for lower canvas, bit 1 for upper canvas.
    */
    redrawMainPanel = (canvasRedraw = TestPanelClass.REDRAW_BOTH) =>
    {
        //console.log('redrawMainPanel', canvasRedraw, TestPanelClass.REDRAW_LOWER, TestPanelClass.REDRAW_UPPER);
        if ((canvasRedraw & TestPanelClass.REDRAW_LOWER) != 0)
        {
            //console.log('redrawLowerCanvas');
            let ctx = this.pnlObj.lwrCnvs.getContext('2d');
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.save();
            Affine.ctxTransform(ctx, this.displayTransform);
            for (let i = 0; i < this.shapes.length; i++)
            {
                //Skip the selected shapes.
                if (this.shapes[i].selected) continue;

                //console.log(this.shapes[i].getSVGPath());
                this.drawShape(ctx, this.shapes[i]);
            }
            //Draw the union of the shapes. The union is an Area object.
            if (this.union && this.union.path)
            {
                let path = new Path2D(this.union.path.toSVG());
                ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
                ctx.fill(path);
                //Stroke the union in blue, line width 2.
                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 5;
                ctx.stroke(path);
            }
            //Draw the intersection of the shapes. The intersection is an Area object.
            //if (this.intersect && !this.intersect.isEmpty())
            if (this.intersect && this.intersect.path)
            {
                console.log(this.intersect);
                let iPath = new Path2D(this.intersect.path.toSVG());
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fill(iPath);
                //Storke the intersection in green, line width 2.
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 5;
                ctx.stroke(iPath);
            }
            for (let i = 0; i < this.intersections.length; i++)
            {
                let intersection = this.intersections[i];
                //Now draw little arcs at the intersection points.
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(intersection.path1.thisPoint.x, intersection.path1.thisPoint.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.closePath();
                //Now draw little red arcs at the midPoints
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(intersection.path1.midPoint.x, intersection.path1.midPoint.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(intersection.path2.midPoint.x, intersection.path2.midPoint.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.closePath();
            }
            ctx.restore();
        }

        if ((canvasRedraw & TestPanelClass.REDRAW_UPPER) != 0)
        {
            let ctx = this.pnlObj.upprCnvs.getContext('2d');
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.save();
            Affine.ctxTransform(ctx, this.displayTransform);
            for (let i = 0; i < this.shapes.length; i++)
            {
                //this.drawShape(ctx, this.shapes[i]);
                if (this.shapes[i].selected)
                {
                    ctx.strokeStyle = 'blue';
                    ctx.lineWidth = 2;
                    ctx.stroke(new Path2D(this.shapes[i].getSVGPath()));
                    //Draw the resize handles if we are not dragging
                    if (!this.dragging)
                    {
                        this.drawResizeHandles(ctx, this.shapes[i]);
                    }
                }
            }
            ctx.restore();
        }
    }

    //We want to draw 8 resize handles. One in each corner and one in the middle of each side.
    //We want litle arrows to indicate the resize handles. The ctx passed has the shape to display
    //transform set
    drawResizeHandles(ctx, shape)
    {
        let path = new Path2D(shape.getSVGPath());
        let bbox = shape.area.bbox();
        let x = bbox.x;
        let y = bbox.y;
        //Create an array of rotation and translations for the resize handles.
        //We are in shape's coordinate system.
        let handleArray = [
            { x: x.min, y: y.max, r: Math.PI/4 }, //Left Top
            { x: x.mid, y: y.max, r: 0 }, //Top
            { x: x.max, y: y.max, r: -Math.PI/4 }, //Right Top
            { x: x.max, y: y.mid, r: -Math.PI/2 }, //Right
            { x: x.max, y: y.min, r: -3*Math.PI/4 }, //Right Bottom
            { x: x.mid, y: y.min, r: -Math.PI }, //Bottom
            { x: x.min, y: y.min, r: 3*Math.PI/4 }, //Left Bottom
            { x: x.min, y: y.mid, r: Math.PI/2 }  //Left
        ];
        for (let i = 0; i < handleArray.length; i++)
        {
            ctx.save();
            let path = new Path2D('M 7 5 L 0 19 L -7 5 Z ');
            ctx.translate(handleArray[i].x, handleArray[i].y);
            ctx.rotate(handleArray[i].r);
            ctx.fillStyle = 'black';
            ctx.fill(path);
            ctx.restore();
        }
    }

    //We want the display to have its origin in the middle of the canvas.
    //We are going to keep the display scale for the shapes, but we do want the shapes to be cartesian.
    //So a -1 scale in the y direction will flip the shapes.
    setDisplayTransform()
    {
        console.log(this.width, this.height);
        this.displayTransform = Affine.getTranslateATx({ x: this.width / 2, y: this.height / 2 } );
        this.displayTransform = Affine.append(this.displayTransform, Affine.getScaleATx({ x: 1, y: -1 }));
        this.inverseDisplayTransform = Affine.getInverseATx(this.displayTransform);
        console.log(this.displayTransform, this.inverseDisplayTransform);
    }

    //handleMouseMove = (e) =>
    //{
    //    const mousePos = { x: e.offsetX, y: e.offsetY };
    //    const transformedPos = Affine.transformPoint(mousePos, this.inverseDisplayTransform);

    //    for (let i = 0; i < this.intersections.length; i++)
    //    {
    //        const intersection = this.intersections[i];
    //        const distance = Math.sqrt(
    //            Math.pow(transformedPos.x - intersection.x, 2) +
    //            Math.pow(transformedPos.y - intersection.y, 2)
    //        );

    //        if (distance < 5)
    //        { // Adjust the radius as needed
    //            this.showTooltip(intersection.data, mousePos);
    //            return;
    //        }
    //    }

    //    this.hideTooltip();
    //}

    showTooltip(data, pos)
    {
        //console.log('showTooltip', data, pos);
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) {
            console.error('Tooltip element not found');
            return;
        }
        //Bring the tooltip to the front
        tooltip.style.zIndex = 1;
        tooltip.style.display = 'block';
        tooltip.style.left = `${pos.x + 10}px`; // Adjust position as needed
        tooltip.style.top = `${pos.y + 10}px`;  // Adjust position as needed
        //tooltip.style.left = `${10}px`; // Adjust position as needed
        //tooltip.style.top = `${10}px`;  // Adjust position as needed
        tooltip.innerHTML = data;
    }

    hideTooltip()
    {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.display = 'none';
    }
}

let TestPanel = new TestPanelClass();
window.onload = () =>
{
    TestPanel.initPanel();
    TestPanel.setDisplayTransform();
    TestPanel.addEventListeners();

    //TestPanel.addSquare();
    //s = 50, x = 30, y = 30
    TestPanel.addSquare(100, 55, 55);
    //TestPanel.addCircle();
    TestPanel.addSquare();
    //TestPanel.addCircle(100, 50, 50);
    TestPanel.doIntersect();
    /*TestPanel.doUnion();*/
    //TestPanel.doSubtract();
}
export { TestPanel };
export default TestPanel;