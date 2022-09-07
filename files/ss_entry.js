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
* Create and manage a panel for entering text and other things.  Effectively a dialog box.
*
*
*/

const SSEntry = new(function()
{
	this.pnlObj = null;
	this.designDiv = null;
	this.designTxt = null;
	this.shutterDiv = null;
	this.shutterTxt = null;
	this.shutterWidthTxt = null
	this.shutterHeightTxt = null

	this.divList = [];
	
	this.init = function()
	{
		//Entry div becomes the lwrcnvs and is formatted to be in the panel working area
		let entryDiv = document.createElement('div');
		SSEntry.pnlObj = SSPanel.panelFactory('pnlEntry', entryDiv); //no overlay
		
		//Resize the panel to a 
		SSEntry.pnlObj.panel.style.width = '500px';
		SSEntry.pnlObj.panel.style.height = '250px';
		
		//We create a div for each use
		SSEntry.designDiv = document.createElement('div');
		let lblDesign = document.createElement('label');
		lblDesign.for = 'designTxt';
		lblDesign.innerHTML = 'Enter the design name and description';
		SSEntry.designTxt = document.createElement('textarea');
		SSEntry.designTxt.id = 'designTxt';
		SSEntry.designTxt.style.width = '100%';
		SSEntry.designDiv.appendChild(lblDesign);
		SSEntry.designDiv.appendChild(SSEntry.designTxt);
		entryDiv.appendChild(SSEntry.designDiv);
		SSEntry.divList.push(SSEntry.designDiv);

		//Use a table for layout
		let tblShutterEntry = document.createElement('table');
		let rowDesc = tblShutterEntry.insertRow();
		let rowWidth = tblShutterEntry.insertRow();
		let rowHeight = tblShutterEntry.insertRow();
		
		SSEntry.shutterDiv = document.createElement('div');
		let lblShutter = document.createElement('label');
		lblShutter.for = 'shutterTxt';
		lblShutter.innerHTML = 'Enter a short description of shutter';
		SSEntry.shutterTxt = document.createElement('textarea');
		SSEntry.shutterTxt.id = 'shutterTxt';
		SSEntry.shutterTxt.style.width = '100%';

		let lblWidth = document.createElement('label');
		lblWidth.innerHTML = 'Shutter Width (in) ';
		lblWidth.for = 'shutterWidthTxt';
		SSEntry.shutterWidthTxt = document.createElement('input');
		SSEntry.shutterWidthTxt.setAttribute("type", "text");
		SSEntry.shutterWidthTxt.id = 'shutterWidthTxt';

		let lblHeight = document.createElement('label');
		lblHeight.innerHTML = 'Shutter Height (in) ';
		lblHeight.for = 'shutterWidthTxt';
		SSEntry.shutterHeightTxt = document.createElement('input');
		SSEntry.shutterHeightTxt.setAttribute("type", "text");
		SSEntry.shutterHeightTxt.id = 'shutterHeightTxt';
		rowDesc.appendChild(lblShutter);
		rowDesc.appendChild(SSEntry.shutterTxt);
		rowWidth.appendChild(lblWidth);
		rowWidth.appendChild(SSEntry.shutterWidthTxt);
		rowHeight.appendChild(lblHeight);
		rowHeight.appendChild(SSEntry.shutterHeightTxt);
		SSEntry.shutterDiv.appendChild(tblShutterEntry);
		entryDiv.appendChild(SSEntry.shutterDiv);
		SSEntry.divList.push(SSEntry.shutterDiv);
		
		//SSEntry.pnlObj = SSPanel.panelFactory('pnlEntry'); //no overlay
		// SSEntry.pnlObj.panel.appendChild(txtAreaDiv);
		// txtAreaDiv.appendChild(txtArea);
		// txtAreaDiv.style.position='absolute';
		// txtAreaDiv.style.top='40px';
		// txtAreaDiv.style.left='0px';
		// txtAreaDiv.style.width='100px';
		// txtAreaDiv.style.height='40px';
		// txtArea.style.width='100px';
		// txtArea.style.height='40px';
		// txtArea.value = 'testy';
		// txtArea.readOnly = false;
		//txtArea.style.readOnly = false;
		//this.pnlObj.redraw = SS3D.load3DPanel;
		//SSPanel.setPanelDrag(SS3D.pnlObj);
		//SSPanel.setPanelResize(SS3D.pnlObj);
		//This panel is hidden at first
		SSEntry.pnlObj.panel.style.display = "none";

		
		
		let btnOk = SSPanel.createButton('OK', SSEntry.ok);
		btnOk.style.width = '50px';

		let btnCancel = SSPanel.createButton('Cancel', SSEntry.cancel);
		btnCancel.style.width = '50px';
		
		// let btnStop = SSPanel.createButton('Stop', SS3D.stopFunc);
		// btnStop.style.width = '50px';
		
		// let btnSlower = SSPanel.createButton('<', SS3D.slower);
		// btnSlower.style.width = '20px';
		// let lblSpeed = document.createElement('span');
		// lblSpeed.innerHTML = 'Speed';
		// let btnFaster = SSPanel.createButton('>', SS3D.faster);
		// btnFaster.style.width = '20px';
		
		// let btnMode = SSPanel.createButton('Mode', SS3D.switch3DMode);
		// btnMode.style.width = '50px';
		
		// let btnPrevPanel = SSPanel.createButton('<', SS3D.prevPanel);
		// btnPrevPanel.style.width = '20px';
		// let lblPanel = document.createElement('span');
		// lblPanel.innerHTML = 'Panel';
		// let btnNextPanel = SSPanel.createButton('>', SS3D.nextPanel);
		// btnNextPanel.style.width = '20px';
		
		// let btnClose = SSPanel.createButton('Close', SS3D.close);
		// btnClose.style.width = '80px';
		
		SSEntry.pnlObj.hdrRight.appendChild(btnOk);
		SSEntry.pnlObj.hdrRight.appendChild(btnCancel);
		// SS3D.pnlObj.hdrRight.appendChild(btnSlower);
		// SS3D.pnlObj.hdrRight.appendChild(lblSpeed);
		// SS3D.pnlObj.hdrRight.appendChild(btnFaster);
		// SS3D.pnlObj.hdrRight.appendChild(btnMode);
		// SS3D.pnlObj.hdrRight.appendChild(btnPrevPanel);
		// SS3D.pnlObj.hdrRight.appendChild(lblPanel);
		// SS3D.pnlObj.hdrRight.appendChild(btnNextPanel);
		// SS3D.pnlObj.hdrRight.appendChild(btnClose);
		
		// let width = SS3D.pnlObj.panel.clientWidth - 20;
		// let height = SS3D.pnlObj.panel.clientHeight - 50;
		// //console.log('width, height', width, height);
		// SS3D.pnlObj.lwrCnvs.width = width;
		// SS3D.pnlObj.lwrCnvs.height = height;
		// SS3D.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		// SS3D.pnlObj.lwrCnvs.style.height = height.toString()+'px';

		// SS3D.rewriteSS3DHeader();
		//SS3D.load3DPanel(); //Load the 3D model once
	}
	
	this.hideAll = function()
	{
		for(let iIdx = 0; iIdx < SSEntry.divList.length; iIdx++)
		{
			SSEntry.divList[iIdx].style.display = "none";
		}
	}
	
	this.newShutter = function()
	{
		SSEntry.hideAll();
		SSEntry.focusEntry();
		SSEntry.pnlObj.hdrLeft.innerHTML = 'New Shutter Entry';
		OkFunc = OkShutter;
		SSEntry.shutterDiv.style.display = 'block';
	}
	
	this.newDesign = function()
	{
		SSEntry.hideAll();
		SSEntry.focusEntry();
		SSEntry.pnlObj.hdrLeft.innerHTML = 'New Design Entry';
		OkFunc = OkDesign;
		SSEntry.designDiv.style.display = 'block';
	}
	
	var OkDesign = function()
	{
		SSTools.design = new ShutterDesign('');
		SSTools.design.addBlank('M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z');
		SSMain.setWorkingShutter(-1);
		SSTools.design.file.description = SSEntry.designTxt.value;
		console.log('OK text', SSTools.design.file.description);
		SSAvail.recalcAvailPanels();
		SSMain.rewriteMainHeader();
		SSMain.redrawMainPanel();
		SSMain.redrawMainOverlay();
		SSAvail.rewriteAvailHeader();
		SSAvail.redrawAvailPanel();
	}

	var OkShutter = function()
	{
		let sWidth = parseFloat(SSEntry.shutterWidthTxt.value);
		let sHeight = parseFloat(SSEntry.shutterHeightTxt.value);
		SSTools.design.addShutter(SSEntry.shutterTxt.value, utils.svgRect(-sWidth/2, -sHeight/2, sWidth, sHeight)); 
		SSMain.setWorkingShutter(SSTools.design.file.shutters.length - 1);
	}
	
	var OkFunc = null;
	 
	this.ok = function()
	{
		if(OkFunc != null)OkFunc();
		SSEntry.pnlObj.panel.style.display = "none";
	}
	
	this.cancel = function()
	{
		SSEntry.pnlObj.panel.style.display = "none";
	}
	
	this.focusEntry = function()
	{
		SSEntry.pnlObj.panel.style.display = "block";
		SSPanel.getFocus(SSEntry.pnlObj);
	}

	return this;
	
})();
