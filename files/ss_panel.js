// File: files/ss_panel.js
class SSPanelClass
{
    constructor()
    {
        this.displayOrder = [];
        this.inButton = false; // Don't drag the panel if in a button
    }

    panelFactory(elmPanelDivID, lwrElm, upprElm)
    {
        const panelElement = document.getElementById(elmPanelDivID);
        if (!panelElement)
        {
            console.error(`Panel with ID "${elmPanelDivID}" not found.`);
            return null;
        }

        let objPanel = {
            header: null,
            hdrLeft: null,
            hdrRight: null,
            panel: panelElement,
            lwrCnvs: null,
            upprCnvs: null,
            posx: 0,
            posy: 0,
            isResizing: false,
            isDragging: false,
            resizeDir: null,
            redraw: null
        };

        this.populatePanel(objPanel, lwrElm, upprElm);
        this.bringToTopZ(objPanel); // Ensure the new panel is on top
        return objPanel;
    }

    populatePanel(objPanel, lwrElm, upprElm)
    {
        // Create Header
        objPanel.header = document.createElement('div');
        objPanel.header.className = 'hdr';
        objPanel.panel.appendChild(objPanel.header);

        // Create Header Table for Layout
        const hdrTbl = document.createElement('table');
        hdrTbl.style.width = '100%';
        objPanel.header.appendChild(hdrTbl);

        const hdrTblRow = document.createElement('tr');
        hdrTblRow.style.width = '100%';
        hdrTbl.appendChild(hdrTblRow);

        objPanel.hdrLeft = document.createElement('td');
        objPanel.hdrLeft.align = 'left';
        hdrTblRow.appendChild(objPanel.hdrLeft);

        objPanel.hdrMiddle = document.createElement('td');
        hdrTblRow.appendChild(objPanel.hdrMiddle);

        objPanel.hdrRight = document.createElement('td');
        objPanel.hdrRight.align = 'right';
        hdrTblRow.appendChild(objPanel.hdrRight);

        // Append Lower Canvas if Provided
        if (lwrElm)
        {
            objPanel.lwrCnvs = lwrElm;
            objPanel.lwrCnvs.className = 'lwrcnvs';
            objPanel.panel.appendChild(objPanel.lwrCnvs);
            this.setCanvasSize(objPanel.lwrCnvs, objPanel.panel);
        }

        // Append Upper Canvas if Provided
        if (upprElm)
        {
            objPanel.upprCnvs = upprElm;
            objPanel.upprCnvs.className = 'upprcnvs';
            objPanel.panel.appendChild(objPanel.upprCnvs);
            this.setCanvasSize(objPanel.upprCnvs, objPanel.panel);
        }

        // Initialize Drag and Resize
        this.setPanelDrag(objPanel);
        this.setPanelResize(objPanel);
    }

    setCanvasSize(canvas, panel)
    {
        const width = panel.clientWidth;
        const height = panel.clientHeight - 40; // Assuming header height is 40px
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }

    show(objPanel, visible)
    {
        objPanel.panel.style.display = visible ? "block" : "none";
        if (visible)
        {
            this.bringToTopZ(objPanel);
        }
    }

    setZOrder()
    {
        this.displayOrder.forEach((objPanel, index) =>
        {
            const baseZ = 1000; // Starting z-index to avoid conflicts
            objPanel.panel.style.zIndex = baseZ + index;
            if (objPanel.upprCnvs) objPanel.upprCnvs.style.zIndex = baseZ + index + 2;
            if (objPanel.lwrCnvs) objPanel.lwrCnvs.style.zIndex = baseZ + index + 1;
        });
    }

    bringToTopZ(objPanel)
    {
        const index = this.displayOrder.indexOf(objPanel);
        if (index > -1)
        {
            this.displayOrder.splice(index, 1);
        }
        this.displayOrder.push(objPanel);
        this.setZOrder();
    }

    createButton(btnText, clickFunc)
    {
        const button = document.createElement('div');
        button.className = 'buttonClass';
        button.textContent = btnText;
        button.addEventListener('click', clickFunc);

        button.addEventListener('mouseenter', () =>
        {
            this.inButton = true;
        });

        button.addEventListener('mouseleave', () =>
        {
            this.inButton = false;
        });

        return button;
    }

    setPanelResize(objPanel)
    {
        objPanel.panel.addEventListener('mousedown', (e) =>
        {
            if (this.isInResizeZone(e, objPanel))
            {
                this.startResizing(e, objPanel);
            }
        });
    }

    isInResizeZone(e, objPanel)
    {
        const resizerSize = 30; // Pixels from the edge to detect resize
        const rect = objPanel.panel.getBoundingClientRect();
        const inHorizontal = e.clientX > rect.right - resizerSize;
        const inVertical = e.clientY > rect.bottom - resizerSize;
        return inHorizontal || inVertical;
    }

    startResizing(e, objPanel)
    {
        e.preventDefault();
        this.bringToTopZ(objPanel);
        objPanel.isResizing = true;

        const onMouseMove = (event) => this.resizePanel(event, objPanel);
        const onMouseUp = () => this.stopResizing(objPanel, onMouseMove, onMouseUp);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    resizePanel(e, objPanel)
    {
        if (!objPanel.isResizing) return;

        const dx = e.clientX - objPanel.posx;
        const dy = e.clientY - objPanel.posy;
        objPanel.posx = e.clientX;
        objPanel.posy = e.clientY;

        const newWidth = objPanel.panel.clientWidth + dx;
        const newHeight = objPanel.panel.clientHeight + dy;

        objPanel.panel.style.width = `${Math.max(newWidth, 200)}px`; // Minimum width
        objPanel.panel.style.height = `${Math.max(newHeight, 100)}px`; // Minimum height

        // Update canvas sizes if applicable
        if (objPanel.lwrCnvs)
        {
            this.setCanvasSize(objPanel.lwrCnvs, objPanel.panel);
        }
        if (objPanel.upprCnvs)
        {
            this.setCanvasSize(objPanel.upprCnvs, objPanel.panel);
        }
    }

    stopResizing(objPanel, onMouseMove, onMouseUp)
    {
        objPanel.isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    setPanelDrag(objPanel)
    {
        objPanel.header.addEventListener('mousedown', (e) =>
        {
            if (this.inButton) return; // Prevent dragging when interacting with buttons
            this.startDragging(e, objPanel);
        });
    }

    startDragging(e, objPanel)
    {
        e.preventDefault();
        this.bringToTopZ(objPanel);
        objPanel.isDragging = true;

        objPanel.posx = e.clientX;
        objPanel.posy = e.clientY;

        const onMouseMove = (event) => this.dragPanel(event, objPanel);
        const onMouseUp = () => this.stopDragging(objPanel, onMouseMove, onMouseUp);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    dragPanel(e, objPanel)
    {
        if (!objPanel.isDragging) return;

        const dx = e.clientX - objPanel.posx;
        const dy = e.clientY - objPanel.posy;
        objPanel.posx = e.clientX;
        objPanel.posy = e.clientY;

        objPanel.panel.style.left = `${objPanel.panel.offsetLeft + dx}px`;
        objPanel.panel.style.top = `${objPanel.panel.offsetTop + dy}px`;
    }

    stopDragging(objPanel, onMouseMove, onMouseUp)
    {
        objPanel.isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

const SSPanel = new SSPanelClass();
export default SSPanel;
export { SSPanel };

//class SSPanelClass
//{
//    constructor()
//    {
//        this.displayOrder = [];
//        this.inButton = false; // Don't drag the panel if in a button
//    }

//    panelFactory(elmPanelDivID, lwrElm, upprElm)
//    {
//        let objPanel = {
//            header: null,
//            hdrLeft: null,
//            hdrRight: null,
//            panel: document.getElementById(elmPanelDivID),
//            lwrCnvs: null,
//            upprCnvs: null,
//            posx: 0,
//            posy: 0,
//            redraw: null
//        };
//        this.populatePanel(objPanel, lwrElm, upprElm);
//        return objPanel;
//    }

//    populatePanel(objPanel, lwrElm, upprElm)
//    {
//        objPanel.header = document.createElement('div');
//        objPanel.header.className = 'hdr';
//        objPanel.panel.appendChild(objPanel.header);

//        let hdrTbl = document.createElement('table');
//        hdrTbl.style.width = '100%';
//        objPanel.header.appendChild(hdrTbl);

//        let hdrTblRow = document.createElement('tr');
//        hdrTblRow.style.width = '100%';
//        hdrTbl.appendChild(hdrTblRow);

//        objPanel.hdrLeft = document.createElement('td');
//        objPanel.hdrLeft.align = 'left';
//        hdrTblRow.appendChild(objPanel.hdrLeft);

//        objPanel.hdrMiddle = document.createElement('td');
//        hdrTblRow.appendChild(objPanel.hdrMiddle);

//        objPanel.hdrRight = document.createElement('td');
//        objPanel.hdrRight.align = 'right';
//        hdrTblRow.appendChild(objPanel.hdrRight);

//        if (typeof lwrElm !== 'undefined')
//        {
//            objPanel.lwrCnvs = lwrElm;
//            objPanel.lwrCnvs.className = 'lwrcnvs';
//            objPanel.panel.appendChild(objPanel.lwrCnvs);
//            let width = objPanel.panel.clientWidth;
//            let height = objPanel.panel.clientHeight - 40;
//            objPanel.lwrCnvs.width = width;
//            objPanel.lwrCnvs.height = height;
//            objPanel.lwrCnvs.style.width = width;
//            objPanel.lwrCnvs.style.height = height;
//        }

//        if (typeof upprElm !== 'undefined')
//        {
//            objPanel.upprCnvs = upprElm;
//            objPanel.upprCnvs.className = 'upprcnvs';
//            objPanel.panel.appendChild(objPanel.upprCnvs);
//        }

//        this.setPanelDrag(objPanel);
//        this.setPanelResize(objPanel);
//    }

//    show(objPanel, visible)
//    {
//        objPanel.panel.style.display = visible ? "block" : "none";
//    }

//    setZOrder()
//    {
//        for (let iIdx = 0; iIdx < this.displayOrder.length; iIdx++)
//        {
//            if (this.displayOrder[iIdx].upprCnvs != null)
//            {
//                this.displayOrder[iIdx].upprCnvs.style.zIndex = 10 * iIdx + 2;
//            }
//            if (this.displayOrder[iIdx].lwrCnvs != null)
//            {
//                this.displayOrder[iIdx].lwrCnvs.style.zIndex = 10 * iIdx + 1;
//            }
//            this.displayOrder[iIdx].panel.style.zIndex = 10 * iIdx;
//        }
//    }

//    bringToTopZ(objPanel)
//    {
//        this.displayOrder.push(objPanel);
//        this.displayOrder.splice(objPanel.panel.style.zIndex / 10, 1);
//        this.setZOrder();
//    }

//    createButton(btnText, clickFunc)
//    {
//        let button = document.createElement('div');
//        button.className = 'buttonClass';
//        button.innerHTML = btnText;
//        button.onclick = clickFunc;

//        button.onmouseenter = () =>
//        {
//            this.inButton = true;
//        };

//        button.onmouseleave = () =>
//        {
//            this.inButton = false;
//        };

//        return button;
//    }

//    setPanelResize(objPanel)
//    {
//        objPanel.panel.onmousedown = (e) => this.resizeMouseDown(e, objPanel);
//    }

//    resizeMouseDown(e, objPanel)
//    {
//        e = e || window.event;
//        //e.preventDefault();

//        this.bringToTopZ(objPanel);

//        objPanel.posx = e.clientX;
//        objPanel.posy = e.clientY;

//        let relx = e.clientX - objPanel.panel.offsetLeft;
//        let rely = e.clientY - objPanel.panel.offsetTop;

//        objPanel.panel.resizeH = (relx > objPanel.panel.offsetWidth - 30);
//        objPanel.panel.resizeV = (rely > objPanel.panel.offsetHeight - 30);

//        if (!objPanel.panel.resizeH && !objPanel.panel.resizeV) return;

//        document.onmousemove = (e) => this.resizePanel(e, objPanel);
//        document.onmouseup = (e) => this.closeResizePanel(e, objPanel);

//        if (objPanel.panel.resizeH && objPanel.panel.resizeV)
//        {
//            objPanel.panel.style.cursor = 'nwse-resize';
//            return;
//        }

//        if (objPanel.panel.resizeH)
//        {
//            objPanel.panel.style.cursor = 'ew-resize';
//            return;
//        }

//        objPanel.panel.style.cursor = 'ns-resize';
//    }

//    resizePanel(e, objPanel)
//    {
//        e = e || window.event;
//        e.preventDefault();

//        let pos1 = objPanel.posx - e.clientX;
//        let pos2 = objPanel.posy - e.clientY;
//        objPanel.posx = e.clientX;
//        objPanel.posy = e.clientY;

//        if (!objPanel.panel.resizeH)
//        {
//            pos1 = 0;
//        }
//        if (!objPanel.panel.resizeV)
//        {
//            pos2 = 0;
//        }

//        objPanel.panel.style.width = (objPanel.panel.clientWidth - pos1) + "px";
//        objPanel.panel.style.height = (objPanel.panel.clientHeight - pos2) + "px";
//    }

//    closeResizePanel(e, objPanel)
//    {
//        objPanel.panel.style.cursor = 'default';
//        if (objPanel.redraw != undefined && objPanel.redraw != null) objPanel.redraw();

//        document.onmouseup = null;
//        document.onmousemove = null;
//    }

//    setPanelDrag(objPanel)
//    {
//        objPanel.header.onmousedown = (e) => this.dragMouseDown(e, objPanel);
//    }

//    dragMouseDown(e, objPanel)
//    {
//        e = e || window.event;
//        e.preventDefault();
//        if (this.inButton) return;

//        this.bringToTopZ(objPanel);

//        objPanel.posx = e.clientX;
//        objPanel.posy = e.clientY;
//        objPanel.header.style.cursor = 'move';
//        document.onmouseup = (e) => this.closeDragPanel(e, objPanel);
//        document.onmousemove = (e) => this.dragPanel(e, objPanel);
//    }

//    dragPanel(e, objPanel)
//    {
//        e = e || window.event;
//        e.preventDefault();

//        let pos1 = objPanel.posx - e.clientX;
//        let pos2 = objPanel.posy - e.clientY;
//        objPanel.posx = e.clientX;
//        objPanel.posy = e.clientY;

//        objPanel.panel.style.left = (objPanel.panel.offsetLeft - pos1) + "px";
//        objPanel.panel.style.top = (objPanel.panel.offsetTop - pos2) + "px";
//    }

//    closeDragPanel(e, objPanel)
//    {
//        objPanel.header.style.cursor = 'default';
//        document.onmouseup = null;
//        document.onmousemove = null;
//    }
//}

//const SSPanel = new SSPanelClass();
//export default SSPanel;
//export { SSPanel };
///*
//* Trying to make this reusable.
//* <span style="width:50px;margin-left:10px" class="buttonClass" onclick="closeSettleModal()">Cancel</span>
//*/
//const SSPanel = new(function()
//{			

//	this.panelFactory = function(elmPanelDivID, lwrElm, upprElm)
//	{
//		if(typeof overlay === 'undefined')overlay = true;
//		let objPanel = 
//		{
//			header:null,
//			hdrLeft:null,
//			hdrRight:null,
//			panel:document.getElementById(elmPanelDivID),
//			lwrCnvs:null,
//			upprCnvs:null,
//			posx:0,
//			posy:0,
//			redraw:null
//		};
//		//console.log('Factory', objPanel, lwrElm, upprElm);
//		populatePanel(objPanel, lwrElm, upprElm);
//		return objPanel;
//	}
	
//	/*
//	* We are structuring our display panels with a header that can contain text, buttons,etc.
//	* It is also where a mouse click can move the panel. The header height is fixed.
//	* Below the header are two overlapping canvases. The bottom has fixed elements drawn in it and
//	* the upper has animated elements.  Information
//	*/
//	var populatePanel = function(objPanel, lwrElm, upprElm)
//	{
//		//console.log('populatePanel', objPanel, lwrElm, upprElm);
//		objPanel.header = document.createElement('div');
//		objPanel.header.className = 'hdr';
//		//objPanel.header.display = 'flex';
//		objPanel.panel.appendChild(objPanel.header);
//		// objPanel.header.onclick = function()
//		// {
			
//		// }
		
//		let hdrTbl = document.createElement('table');
//		hdrTbl.style.width = '100%';
//		objPanel.header.appendChild(hdrTbl);
		
//		let hdrTblRow = document.createElement('tr');
//		hdrTblRow.style.width = '100%';
//		hdrTbl.appendChild(hdrTblRow);
		
//		objPanel.hdrLeft = document.createElement('td');
//		objPanel.hdrLeft.align = 'left';
//		hdrTblRow.appendChild(objPanel.hdrLeft);
		
//		objPanel.hdrMiddle = document.createElement('td');
//		//objPanel.hdrLeft.align = 'left';
//		hdrTblRow.appendChild(objPanel.hdrMiddle);
		
//		objPanel.hdrRight = document.createElement('td');
//		objPanel.hdrRight.align = 'right';
//		hdrTblRow.appendChild(objPanel.hdrRight);

//		// objPanel.hdrText = document.createElement('span');
//		// objPanel.hdrText.className = 'hdrtext';
//		// objPanel.hdrText.display = 'inline-block';
//		// objPanel.hdrText.textAlign = 'left';
//		// objPanel.hdrText.whiteSpace = 'nowrap';
//		// objPanel.header.appendChild(objPanel.hdrText);
//		if(typeof lwrElm !== 'undefined')
//		{
//			// objPanel.lwrCnvs = document.createElement('canvas');
//			objPanel.lwrCnvs = lwrElm;
//			objPanel.lwrCnvs.className = 'lwrcnvs';
//			objPanel.panel.appendChild(objPanel.lwrCnvs);
//			let width = objPanel.panel.clientWidth;
//			let height = objPanel.panel.clientHeight - 40;
//			//console.log('width, height', width, height);
//			objPanel.lwrCnvs.width = width;
//			objPanel.lwrCnvs.height = height;
//			objPanel.lwrCnvs.style.width = width;
//			objPanel.lwrCnvs.style.height = height;
//		}
		
//		if(typeof upprElm !== 'undefined')
//		{
//			// objPanel.upprCnvs = document.createElement('canvas');
//			objPanel.upprCnvs = upprElm;
//			objPanel.upprCnvs.className = 'upprcnvs';
//			objPanel.panel.appendChild(objPanel.upprCnvs);
//		}
//		SSPanel.setPanelDrag(objPanel);
//		SSPanel.setPanelResize(objPanel);
//	}
	
//	this.show = function(objPanel, visible)
//	{
//		if(visible)
//		{
//			objPanel.panel.style.display = "block";
//		}else
//		{
//			objPanel.panel.style.display = "none";
//		}
//	}
	
//	this.displayOrder = [];
	
//	this.setZOrder = function()
//	{
//		for(let iIdx = 0; iIdx < this.displayOrder.length; iIdx++)
//		{
//			//Do we have an overlay?
//			if(this.displayOrder[iIdx].upprCnvs != null)
//			{
//				this.displayOrder[iIdx].upprCnvs.style.zIndex = 10 * iIdx + 2;
//			}
//			if(this.displayOrder[iIdx].lwrCnvs != null)
//			{
//				this.displayOrder[iIdx].lwrCnvs.style.zIndex = 10 * iIdx + 1;
//			}
//			this.displayOrder[iIdx].panel.style.zIndex = 10 * iIdx;
//		}
//	}
	
//	//A little tricky. The Z order is the array index * 10.  Below we
//	//push the object to the back of the array and remove it from where it was
//	//based on its Z order (array index * 10)
//	this.getFocus = function(objPanel)
//	{
//		//console.log("Give focus to", objPanel);
//		this.displayOrder.push(objPanel);
//		this.displayOrder.splice(objPanel.panel.style.zIndex/10, 1);
//		//Now reset the z orders based on the present index the panel with focus will
//		//be the last index
//		this.setZOrder();
//	}
	
//	/*
//	* <span style="width:50px;margin-left:10px" class="buttonClass" onclick="closeSettleModal()">Cancel</span>
//	*/
//	this.inButton = false; //Don't drag the panel if in a button
//	this.createButton = function(btnText, clickFunc)
//	{
//		let button = document.createElement('div');
//		button.className = 'buttonClass';
//		button.innerHTML = btnText;
//		button.onclick = clickFunc;
		
//		//The following prevents the panel from being dragged during button clicks
//		button.onmouseenter = function(e)
//		{
//			SSPanel.inButton = true;
//		};
		
//		button.onmouseleave = function(e)
//		{
//			SSPanel.inButton = false;
//		};
		
		
//		return button;
//	}
	
//	this.setPanelResize = function(objPanel)
//	{
//		objPanel.panel.onmousedown = function(e){resizeMouseDown(e,objPanel);};
//	}
	
//	//This event is triggered when the mouse enters and leaves the panel.  It allows us
//	//to change the cursor when we are in the resize region (near an edge)
//	var resizeMouseEnterLeave = function(e, objPanel)
//	{
		
//	}
	
//	var resizeMouseDown = function(e, objPanel)
//	{
//		e = e || window.event;
//		//e.preventDefault();
		
//		SSPanel.getFocus(objPanel);

//		objPanel.posx = e.clientX;
//		objPanel.posy = e.clientY;

//		//First decide if we are in the resize area
//		let relx = e.clientX - objPanel.panel.offsetLeft;
//		let rely = e.clientY - objPanel.panel.offsetTop;
		
//		objPanel.panel.resizeH = (relx > objPanel.panel.offsetWidth - 30);
//		objPanel.panel.resizeV = (rely > objPanel.panel.offsetHeight - 30);
//		//console.log(objPanel.panel.resizeH, objPanel.panel.resizeV);
		
//		if(!objPanel.panel.resizeH && !objPanel.panel.resizeV)return;
		
//		document.onmousemove = function(e){resizePanel(e, objPanel);};
//		document.onmouseup = function(e){closeResizePanel(e, objPanel);};
//		//objMain.lwrCnvs.width = 100;
//		//objMain.lwrCnvs.height = 100;
		
//		if(objPanel.panel.resizeH && objPanel.panel.resizeV)
//		{
//			objPanel.panel.style.cursor = 'nwse-resize';
//			return;
//		}
		
//		if(objPanel.panel.resizeH)
//		{
//			objPanel.panel.style.cursor = 'ew-resize';
//			return;
//		}
		
//		objPanel.panel.style.cursor = 'ns-resize';
//	}
	
//	var resizePanel = function(e, objPanel)
//	{
//		e = e || window.event;
//		e.preventDefault();
//		// calculate the new cursor position:
//		let pos1 = objPanel.posx - e.clientX;
//		let pos2 = objPanel.posy - e.clientY;
//		objPanel.posx = e.clientX;
//		objPanel.posy = e.clientY;
//		// set the element's new size:
//		if(!objPanel.panel.resizeH)
//		{
//			pos1 = 0;
//		}
//		if(!objPanel.panel.resizeV)
//		{
//			pos2 = 0;
//		}
//		//console.log('pos1, pos2',pos1, pos2);
//		//console.log(objPanel.panel.clientWidth,objPanel.panel.clientHeight);
//		objPanel.panel.style.width = (objPanel.panel.clientWidth - pos1) + "px";
//		objPanel.panel.style.height = (objPanel.panel.clientHeight - pos2) + "px";
//		//objMain.lwrCnvs.width = objMain.panel.clientWidth - 10;
//		//objMain.lwrCnvs.height = objMain.panel.clientHeight - 30;;
//	}
	
//	var closeResizePanel = function(e, objPanel)
//	{
//		objPanel.panel.style.cursor = 'default';
//		//console.log(objPanel.redraw);
//		if(objPanel.redraw != undefined && objPanel.redraw != null)objPanel.redraw();
		
//		// stop moving when mouse button is released:
//		document.onmouseup = null;
//		document.onmousemove = null;
//	}
	
//	/*
//	*
//	*/
//	this.setPanelDrag = function (objPanel)
//	{
//		objPanel.header.onmousedown = function(e){dragMouseDown(e,objPanel);};
//	}
	
//	var dragMouseDown = function(e, objPanel)
//	{
//		e = e || window.event;
//		e.preventDefault();
//		if(SSPanel.inButton)return;
		
//		SSPanel.getFocus(objPanel);

//		// get the mouse cursor position at startup:
//		objPanel.posx = e.clientX;
//		objPanel.posy = e.clientY;
//		objPanel.header.style.cursor = 'move';
//		document.onmouseup = function(e){closeDragPanel(e, objPanel);};
//		// call a function whenever the cursor moves:
//		document.onmousemove = function(e){dragPanel(e, objPanel);};
//	}
	
//	var dragPanel = function(e, objPanel)
//	{
//		e = e || window.event;
//		e.preventDefault();
//		// calculate the new cursor position:
//		let pos1 = objPanel.posx - e.clientX;
//		let pos2 = objPanel.posy - e.clientY;
//		objPanel.posx = e.clientX;
//		objPanel.posy = e.clientY;
//		// set the element's new position:
//		objPanel.panel.style.left = (objPanel.panel.offsetLeft - pos1) + "px";
//		objPanel.panel.style.top = (objPanel.panel.offsetTop - pos2) + "px";
//	}
	
//	var closeDragPanel = function(e, objPanel)
//	{
//		objPanel.header.style.cursor = 'default';
//		// stop moving when mouse button is released:
//		document.onmouseup = null;
//		document.onmousemove = null;
//	}

//	return this;
	
//})();
