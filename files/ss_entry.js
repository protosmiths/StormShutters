import SSPanel from './ss_panel.js';
import SSTools  from './ss_tools.js';
import SSMain  from './ss_main.js';
import { SSAvail } from './ss_avail.js';
import { utils } from './psBezier/utils.js';
//import { ShutterDesign } from './shutter_design.js';

class SSEntryClass
{
    constructor()
    {
        this.pnlObj = null;
        this.entryDiv = null;
        this.designDiv = null;
        this.designTxt = null;
        this.shutterDiv = null;
        this.shutterTxt = null;
        this.shutterWidthTxt = null;
        this.shutterHeightTxt = null;
        this.divList = [];
        this.OkFunc = null;
    }

    init()
    {
        this.entryDiv = document.createElement('div');
        this.pnlObj = SSPanel.panelFactory('pnlEntry', this.entryDiv);

        this.pnlObj.panel.style.width = '500px';
        this.pnlObj.panel.style.height = '250px';

        this.designDiv = document.createElement('div');
        let lblDesign = document.createElement('label');
        lblDesign.htmlFor = 'designTxt';
        lblDesign.innerHTML = 'Enter the design name and description';
        this.designTxt = document.createElement('textarea');
        this.designTxt.id = 'designTxt';
        this.designTxt.style.width = '100%';
        this.designDiv.appendChild(lblDesign);
        this.designDiv.appendChild(this.designTxt);
        //entryDiv.appendChild(this.designDiv);
        this.divList.push(this.designDiv);

        let tblShutterEntry = document.createElement('table');
        let rowDesc = tblShutterEntry.insertRow();
        let rowWidth = tblShutterEntry.insertRow();
        let rowHeight = tblShutterEntry.insertRow();

        this.shutterDiv = document.createElement('div');
        let lblShutter = document.createElement('label');
        lblShutter.htmlFor = 'shutterTxt';
        lblShutter.innerHTML = 'Enter a short description of shutter';
        this.shutterTxt = document.createElement('textarea');
        this.shutterTxt.id = 'shutterTxt';
        this.shutterTxt.style.width = '100%';

        let lblWidth = document.createElement('label');
        lblWidth.innerHTML = 'Shutter Width (in) ';
        lblWidth.htmlFor = 'shutterWidthTxt';
        this.shutterWidthTxt = document.createElement('input');
        this.shutterWidthTxt.setAttribute("type", "text");
        this.shutterWidthTxt.id = 'shutterWidthTxt';

        let lblHeight = document.createElement('label');
        lblHeight.innerHTML = 'Shutter Height (in) ';
        lblHeight.htmlFor = 'shutterHeightTxt';
        this.shutterHeightTxt = document.createElement('input');
        this.shutterHeightTxt.setAttribute("type", "text");
        this.shutterHeightTxt.id = 'shutterHeightTxt';
        rowDesc.appendChild(lblShutter);
        rowDesc.appendChild(this.shutterTxt);
        rowWidth.appendChild(lblWidth);
        rowWidth.appendChild(this.shutterWidthTxt);
        rowHeight.appendChild(lblHeight);
        rowHeight.appendChild(this.shutterHeightTxt);
        this.shutterDiv.appendChild(tblShutterEntry);
        //entryDiv.appendChild(this.shutterDiv);
        this.divList.push(this.shutterDiv);
        this.shutterWidthTxt.addEventListener('mousedown', (e) =>
        {
            console.log('shutterWidthTxt mousedown', e);
            this.shutterWidthTxt.focus();
        });
        this.shutterWidthTxt.addEventListener('focus', (e) =>
        {
            console.log('shutterWidthTxt focus', e);
        });
        this.pnlObj.panel.style.display = "none";

        let btnOk = SSPanel.createButton('OK', this.ok.bind(this));
        btnOk.style.width = '50px';

        let btnCancel = SSPanel.createButton('Cancel', this.cancel.bind(this));
        btnCancel.style.width = '50px';

        this.pnlObj.hdrRight.appendChild(btnOk);
        this.pnlObj.hdrRight.appendChild(btnCancel);
    }

    hideAll()
    {
        for (let iIdx = 0; iIdx < this.divList.length; iIdx++)
        {
            this.divList[iIdx].style.display = "none";
        }
    }

    newShutter()
    {
        //this.hideAll();
        this.entryDiv.innerHTML = '';
        this.entryDiv.appendChild(this.shutterDiv);
        this.focusEntry();
        this.pnlObj.hdrLeft.innerHTML = 'New Shutter Entry';
        this.OkFunc = this.OkShutter.bind(this);
        this.shutterDiv.style.display = 'block';
        //Make sure the text area is focused
        this.shutterTxt.focus();
    }

    newDesign()
    {
        //this.hideAll();
        this.entryDiv.innerHTML = '';
        this.entryDiv.appendChild(this.designDiv);
        this.focusEntry();
        this.pnlObj.hdrLeft.innerHTML = 'New Design Entry';
        this.OkFunc = this.OkDesign.bind(this);
        this.designDiv.style.display = 'block';
        //Make sure the text area is focused
        this.designTxt.focus();
    }

    OkDesign()
    {
        SSTools.design = new ShutterDesign('');
        SSTools.design.addBlank('M -24 -48 L -24 48 L 24 48 L 24 -48 L -24 -48 Z');
        SSMain.setWorkingShutter(-1);
        SSTools.design.file.description = this.designTxt.value;
        console.log('OK text', SSTools.design.file.description);
        SSAvail.recalcAvailPanels();
        SSMain.rewriteMainHeader();
        SSMain.redrawMainPanel();
        SSMain.redrawMainOverlay();
        SSAvail.rewriteAvailHeader();
        SSAvail.redrawAvailPanel();
    }

    OkShutter()
    {
        let sWidth = parseFloat(this.shutterWidthTxt.value);
        let sHeight = parseFloat(this.shutterHeightTxt.value);
        SSTools.design.addShutter(this.shutterTxt.value, utils.svgRect(-sWidth / 2, -sHeight / 2, sWidth, sHeight));
        SSMain.setWorkingShutter(SSTools.design.file.shutters.length - 1);
        SSAvail.recalcAvailPanels();
        SSMain.rewriteMainHeader();
        SSMain.redrawMainPanel();
        SSMain.redrawMainOverlay();
        SSAvail.rewriteAvailHeader();
        SSAvail.redrawAvailPanel();
    }

    showStats(stats)
    {
        this.hideAll();
        this.focusEntry();
        this.pnlObj.hdrLeft.innerHTML = 'Statistics';
        let statDiv = document.createElement('div');
        statDiv.style.width = '100%';
        statDiv.style.height = '100%';
        statDiv.style.overflow = 'auto';
        statDiv.style.padding = '10px';
        statDiv.style.fontSize = '20px';
        statDiv.style.fontFamily = 'Arial';
        statDiv.style.color = 'black';
        statDiv.style.backgroundColor = 'white';
        statDiv.style.border = '1px solid black';
        statDiv.innerHTML =
            `Total Shutters: ${stats.shutters}<br>
            Total Panels: ${stats.panels}<br>
            Shelf Dims: width: ${stats.shelf.width}, height: ${stats.shelf.height}<br>`;
        this.pnlObj.lwrCnvs.appendChild(statDiv);

        this.OkFunc = () =>
        {
            this.pnlObj.lwrCnvs.removeChild(statDiv);
            this.pnlObj.panel.style.display = 'none';
            this.OkFunc = null;
        };
    }

    ok()
    {
        if (this.OkFunc != null) this.OkFunc();
        this.pnlObj.panel.style.display = "none";
    }

    cancel()
    {
        this.pnlObj.panel.style.display = "none";
    }

    focusEntry()
    {
        this.pnlObj.panel.style.display = "block";
        SSPanel.bringToTopZ(this.pnlObj);
    }
}

const SSEntry = new SSEntryClass();
export default SSEntry;

