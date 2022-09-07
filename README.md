 # Storm Shutters
 
 This README is under construction
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/Storm_Shutter_Assy.png)
 
 ## Introduction and Links
 
 This repository has files for a program to design storm shutters using coroplast sign material. The files are hosted at
 
 https://protosmiths.github.io/StormShutters/
 
 The program runs in the browser using javascript. It allows one to determine how to cut up 4 foot x 8 foot coroplast
 panels to make a collection of storm shutters with 3 layers of coroplast.  Coroplast is like plastic cardboard and has
 directional cores.  It is intended that the inner layer of the 3 layers is at 90 degrees to the outside layers.  The
 program will generate instructions for a Shopbot to mark and cut up the coroplast panels.  The program can also simulate
 the Shopbot to allow one to verify the Shopbot code.
 
 There are videos about this project at the Protosmiths YouTube Channel
 
 https://www.youtube.com/channel/UC_g5Fewg9zGV6_WykECYXpw
 
 There will be other instructional videos associated with this project.  One upcoming video discusses the use of affine
 transforms.  There is demonstration code for affine transforms at.
 
 https://protosmiths.github.io/StormShutters/affine-demo.html
 
 ## Operation
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/screen.png)
 
 The program comes up with two windows and an example design.  The left window is the Main window and it has one of the shutters
 in the design.  One can move between shutters and layers using the buttons in the header.  The right window is the Avail panel.
 It has all the panels that are available for adding to the shutter.  The unused parts have stripes that indicate the direction
 of the cores.
 
 ### New Project
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/NewProject.png)
 
 To start a new project, click on the New button at the top of the Avail panel. Enter a description of the project.
 When one clicks Ok, the example panels will disappear.  The upper left corner is the blank panel.
 
 ### New Shutter
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/NewShutter.png)
 
 After creating a new project, the main window will still have an example shutter.  One will need to click on the New button on that window
 to describe a new shutter.  After the first shutter has been defined, the example shutter will be replaced by it.  One should repeat this 
 operation until all the shutters in the design have been defined.
 
 ### Cut Panel
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/CutPanelSnap.png)
 
 Now that the shutters have been defined it is time for the main reason for the program.  The concept behind the program is to virtually
 determine how to cut up the blank panels to fill in all the shutter layers. As discussed above the upper left panel in the Avail window
 is a blank panel.  Initially, this is the only panel available.  Because more windows are wider than a panel width, we normally make
 the outside layers horizontal.  One rotates the panels to change the core orientation using the Rot button.  The program will snap to
 points (corners).  One should grab the panel to be cut at a corner and dragt it close to a corner on the shutter.  When one releases the
 mouse, the panel will snap to the corner.
 
 ![](https://github.com/protosmiths/StormShutters/blob/master/CutPanelAfter.png)
 
 Now that the panel to be cut is in position, one can click the Cut button.  When one cuts a section from the blank panel a new panel will
 be added to the available panels.  Now that panel is available to have sections cut out of it.
 
 ## Design
 
 The Storm Shutter program is based on 5 panels which act as floating windows.  The panels are called Main, Avail, CNC, 3D 
 and Entry.  The Main panel is used to display and work with a given shutter.  The Avail panel shows the 4 x 8 coroplast panels.
 One can see and select a panel to be cut for a layer on a shutter.  The CNC panel shows the individual panels with the designs
 that the Shopbot will draw and cut.  It has an export bvutton which will generate and export Shopbot code.  It also has a
 button to simulate the Shopbot.  The 3D panel is where the Shopbot simulation runs.  The entry panel is used for entry dialogs.
 It allows for user input.
 
 Each javascript file has an IIFE (Immediately Invoked Function Expression) which creates a global object to encapsulate it functionality.
 
 ### ss_tools.js
 
 The ss_tools.js IIFE creates the SSTools global object.  Its main method is `getElements` which is called in the body onload event after 
 the DOM is ready to be accessed.  It calls functions to initialize the 5 panels.
 
 ### ss_panel.js
 
 The ss_panel.js IIFE creates the SSPanel global object. The main method is the `panelFactory` which creates an object to represent a panel.
 The panels are built around DIVs which are declared in index.html.  One passes the ID and optional DOM elements.  The Main and Avail panels
 pass two canvases.  These canvases are aligned. The upper canvas has a transparent background.  This allows that layer to have objects that
 move (dragged by mouse) with stationary objects on the lower canvas. Canvases are not the only DOM element that can be appended.  The Entry
 panel for example has different DOM elements to implement various dialogs.  Each panel has a header that can have text, buttons, etc.  The
 SSPanel object also has mouse event handlers to support dragging and resizing of the panel.
 
 ### ss_main.js
