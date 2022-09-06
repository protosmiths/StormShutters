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
 The panels are built around DIVs which are declared in index.html.
