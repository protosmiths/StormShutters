/*
* Routines for 3D simulation
*/
const SS3D = new(function()
{
	this.pnlObj = null;
	this.drawMode = true;
	this.panelIdx = 0;
	this.stop = false;
	
	this.init = function()
	{
		let lwrCnvs = document.createElement('canvas');
		SS3D.pnlObj = SSPanel.panelFactory('pnl3D', lwrCnvs); //no overlay
		//this.pnlObj.redraw = SS3D.load3DPanel;
		//SSPanel.setPanelDrag(SS3D.pnlObj);
		//SSPanel.setPanelResize(SS3D.pnlObj);
		//This panel is hidden at first
		SS3D.pnlObj.panel.style.display = "none";

		
		let btnStart = SSPanel.createButton('Start', SS3D.start);
		btnStart.style.width = '50px';
		
		let btnStop = SSPanel.createButton('Stop', SS3D.stopFunc);
		btnStop.style.width = '50px';
		
		let btnSlower = SSPanel.createButton('<', SS3D.slower);
		btnSlower.style.width = '20px';
		let lblSpeed = document.createElement('span');
		lblSpeed.innerHTML = 'Speed';
		let btnFaster = SSPanel.createButton('>', SS3D.faster);
		btnFaster.style.width = '20px';
		
		let btnMode = SSPanel.createButton('Mode', SS3D.switch3DMode);
		btnMode.style.width = '50px';
		
		let btnPrevPanel = SSPanel.createButton('<', SS3D.prevPanel);
		btnPrevPanel.style.width = '20px';
		let lblPanel = document.createElement('span');
		lblPanel.innerHTML = 'Panel';
		let btnNextPanel = SSPanel.createButton('>', SS3D.nextPanel);
		btnNextPanel.style.width = '20px';
		
		let btnClose = SSPanel.createButton('Close', SS3D.close);
		btnClose.style.width = '80px';
		
		SS3D.pnlObj.hdrRight.appendChild(btnStart);
		SS3D.pnlObj.hdrRight.appendChild(btnStop);
		SS3D.pnlObj.hdrRight.appendChild(btnSlower);
		SS3D.pnlObj.hdrRight.appendChild(lblSpeed);
		SS3D.pnlObj.hdrRight.appendChild(btnFaster);
		SS3D.pnlObj.hdrRight.appendChild(btnMode);
		SS3D.pnlObj.hdrRight.appendChild(btnPrevPanel);
		SS3D.pnlObj.hdrRight.appendChild(lblPanel);
		SS3D.pnlObj.hdrRight.appendChild(btnNextPanel);
		SS3D.pnlObj.hdrRight.appendChild(btnClose);
		
		let width = SS3D.pnlObj.panel.clientWidth - 20;
		let height = SS3D.pnlObj.panel.clientHeight - 50;
		//console.log('width, height', width, height);
		SS3D.pnlObj.lwrCnvs.width = width;
		SS3D.pnlObj.lwrCnvs.height = height;
		SS3D.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		SS3D.pnlObj.lwrCnvs.style.height = height.toString()+'px';

		SS3D.rewriteSS3DHeader();
		//SS3D.load3DPanel(); //Load the 3D model once
	}
	
	this.rewriteSS3DHeader = function()
	{
		SS3D.pnlObj.hdrLeft.innerHTML = 'Panel: ' + SS3D.panelIdx.toString();
	}
	
	this.close = function()
	{
		SS3D.pnlObj.panel.style.display = "none";
		
		//Also stop and clean up any running animation
	}
	
	this.start = function()
	{
		SS3D.stop = false;
		if(SS3D.animationRun != 0)return;
		console.log('Run animation', SS3D.animate);
		if(SS3D.animate != null)SS3D.animate();
	}
	
	this.stopFunc = function()
	{
		if(SS3D.animationRun != 0)
		{
			cancelAnimationFrame(SS3D.animationRun);
			SS3D.animationRun = 0;
		}
		SS3D.stop = true;
	}
	
	var modelLoaded = false;
	this.focus3D = function()
	{
		SS3D.panelIdx = SSAvail.avs[SSAvail.availSelect.idx].i;
		SS3D.rewriteSS3DHeader();
		//SS3D.panelIdx = SSAvail.availSelect.idx;
		SS3D.pnlObj.panel.style.display = "block";
		let width = SS3D.pnlObj.panel.clientWidth - 20;
		let height = SS3D.pnlObj.panel.clientHeight - 50;
		console.log('SS3D width, height', width, height);
		SS3D.pnlObj.lwrCnvs.width = width;
		SS3D.pnlObj.lwrCnvs.height = height;
		SS3D.pnlObj.lwrCnvs.style.width = width.toString()+'px';
		SS3D.pnlObj.lwrCnvs.style.height = height.toString()+'px';
		SSPanel.getFocus(SS3D.pnlObj);
		if(!modelLoaded)
		{
			SS3D.load3DPanel(); //Load the 3D model once
			modelLoaded = true;
		}
		SS3D.stopFunc();
		SS3D.setMode(SS3D.drawMode);
		SS3D.start();
		//SS3D.load3DPanel();
	}

	this.switch3DMode = function()
	{
		SS3D.stopFunc();
		SS3D.drawMode = !SS3D.drawMode;
		//console.log(SSCNC.drawMode);
		SS3D.setMode(SS3D.drawMode);
		SS3D.start();
	}
	
	this.speed = 2;
	this.slower = function()
	{
		SS3D.speed /= 2;
		if(SS3D.speed < 1)SS3D.speed = 1;
	}
	
	this.faster = function()
	{
		//SS3D.speed++;
		SS3D.speed *= 2;
	}
	
	this.prevPanel = function()
	{
		do
		{
			SS3D.panelIdx--;
			if(SS3D.panelIdx < 0)SS3D.panelIdx = SSAvail.avs.length - 1;
		}while(SSAvail.avs[SS3D.panelIdx].t != 1);
		SS3D.rewriteSS3DHeader();
		SS3D.stopFunc();
		SS3D.setMode(SS3D.drawMode);
		SS3D.start();
		// SS3D.load3DPanel();
	}
	
	this.nextPanel = function()
	{
		do
		{
			SS3D.panelIdx++;
			if(SS3D.panelIdx >= SSAvail.avs.length)SS3D.panelIdx = 0;
		}while(SSAvail.avs[SS3D.panelIdx].t != 1);
		SS3D.rewriteSS3DHeader();
		SS3D.stopFunc();
		SS3D.setMode(SS3D.drawMode);
		SS3D.start();
		// SS3D.load3DPanel();
	}
	var scene = null;
	var camera = null;
	var knife = null;
	var pen = null;
	this.animate = null;
	this.animationRun = 0;
	this.setMode = null;
	
	var makeCanvasTexture = function(iPdx, draw)
	{
		let canvas = document.createElement('canvas');
		// canvas.width = 480;
		// canvas.height = 960;
		canvas.width = 960;
		canvas.height = 480;
		let scale = canvas.width/96;
		canvas.style.backgroundColor = 'white';
		//document.body.appendChild(canvas);
		let ctx = canvas.getContext("2d");
		//ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = '#ddddff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1/scale;
		ctx.save();
		ctx.translate(canvas.width/2, canvas.height/2);
		ctx.scale(scale, -scale);
		//ctx.rotate(Math.PI/2);
		let svg = SSCNC.getPanelPaths(iPdx, draw);
		svg += ' ' + SSCNC.getPanelText(iPdx) + ' ';
		svg += SSCNC.getPanelHoles(iPdx) + ' ';
		let Atx = Affine.getRotateATx(Math.PI/2);
		svg = utils.svgTransform(svg, Atx);
		let path = new Path2D(svg);
		ctx.stroke(path);
		// let sbp = SSCNC.generateDrawingFile(iPdx, false);
		// svg = SSCNC.sbp2svg(sbp);
		// Atx = Affine.getRotateATx(Math.PI);
		// Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:-48, y:-24}));
		// svg = utils.svgTransform(svg, Atx);
		// ctx.strokeStyle = '#ff0000';
		// path = new Path2D(svg);
		//ctx.stroke(path);
		ctx.restore();
		return canvas;
	}
	
	/*
	* The basic concept of drawing a line is using BufferGeometry with the entire line
	* and drawing part of it with setDrawRange. The thing is it must be a contiguous line
	* without gaps or even different colors. We want line segments that are determined by
	* z values.
	*
	* Turns out you can't set the line width wider than 1 pixel which is not wide enough.
	* We are going to make our own line. We are going to do triangular faces.  In this
	* case they can be parallel to the x/y plane. The vertices will be normal to the
	* line with equal zs.
	*/
	var penTrack = function(play, lWidth, materials)
	{
		let segments = [];
		let points = [];
		let groups = [];
		let count = 0;
		let start = 0;
		let lastZ = false;
		let dx = play[1][0] - play[0][0];
		let dy = play[1][1] - play[0][1];
		let dz = play[1][2] - play[0][2];
		let len = Math.sqrt(dx*dx + dy*dy + dz*dz);
		let lastNorm = {x:dy/len, y:-dx/len};
		let lastPt = play[0];
		let prevZ = 0;
		for(let iIdx = 1; iIdx < play.length; iIdx++)
		{
			let point = play[iIdx];
			//console.log('point', point);
			for (let iKdx = 0; iKdx < 4; iKdx++)
			{
				if(Number.isNaN(point[iKdx]))console.log('Nan at', iIdx, iKdx);
			}
			let thisZ = Math.sign(point[2] - (0.1 * 25.4));
			while(thisZ != lastZ)
			{
				if(count == 0)break;
				// let colorIdx = 0;
				// if(!lastZ)colorIdx = 1; //Really light blue
				// materials.push( new THREE.LineBasicMaterial( { color: color, linewidth:10, scale:2 } ));
				//materials.push( new THREE.LineDashedMaterial( { color: color, linewidth:10, scale:2 } ));
				//materials.push( new THREE.MeshBasicMaterial( { color: color} ));
				groups.push({start:start, count:count, materialIndex:lastZ + 1});
				lastZ = thisZ;
				count = 0;
				start = 6*(iIdx);
			}
			dx = point[0] - lastPt[0];
			dy = point[1] - lastPt[1];
			dz = point[2] - lastPt[2];
			len = Math.sqrt(dx*dx + dy*dy + dz*dz);
			if(len == 0)continue;
			let thisNorm = {x:dy/len, y:-dx/len};
			let seenZ = point[2] > 0?point[2]:0;
			let p1 = {x:lastPt[0]+(lWidth/2)*lastNorm.x, y:lastPt[1]+(lWidth/2)*lastNorm.y, z:prevZ};
			let p2 = {x:lastPt[0]-(lWidth/2)*lastNorm.x, y:lastPt[1]-(lWidth/2)*lastNorm.y, z:prevZ};
			let p3 = {x:point[0]+(lWidth/2)*thisNorm.x,  y:point[1]+(lWidth/2)*thisNorm.y,  z:seenZ};
			let p4 = {x:point[0]-(lWidth/2)*thisNorm.x,  y:point[1]-(lWidth/2)*thisNorm.y,  z:seenZ};
			//console.log('ps', p1, p2, p3, p4);
			points.push(new THREE.Vector3( p1.x, p1.y, p1.z));
			points.push(new THREE.Vector3( p3.x, p3.y, p3.z));
			points.push(new THREE.Vector3( p2.x, p2.y, p2.z));
			points.push(new THREE.Vector3( p2.x, p2.y, p2.z));
			points.push(new THREE.Vector3( p3.x, p3.y, p3.z));
			points.push(new THREE.Vector3( p4.x, p4.y, p4.z));
			// points.push(new THREE.Vector3( lastPt[0]+(lWidth/2)*lastNorm.x, lastPt[1]+(lWidth/2)*lastNorm.y, prevZ));
			// points.push(new THREE.Vector3( point[0]+(lWidth/2)*thisNorm.x, point[1]+(lWidth/2)*thisNorm.y, seenZ));
			// points.push(new THREE.Vector3( lastPt[0]-(lWidth/2)*lastNorm.x, lastPt[1]-(lWidth/2)*lastNorm.y, prevZ));
			// points.push(new THREE.Vector3( lastPt[0]-(lWidth/2)*lastNorm.x, lastPt[1]-(lWidth/2)*lastNorm.y, prevZ));
			// points.push(new THREE.Vector3( point[0]+(lWidth/2)*thisNorm.x, point[1]+(lWidth/2)*thisNorm.y, seenZ));
			// points.push(new THREE.Vector3( point[0]-(lWidth/2)*thisNorm.x, point[1]-(lWidth/2)*thisNorm.y, seenZ));
			lastPt = play[iIdx];
			prevZ = seenZ;
			lastNorm = {x:thisNorm.x, y:thisNorm.y};
			count += 6;
		}
		//Handle last group
		// let colorIdx = 0;
		// if(!lastZ)colorIdx = 1; // 
		// materials.push( new THREE.LineBasicMaterial( { color: color, linewidth:10, scale:2 } ));
		//materials.push( new THREE.LineDashedMaterial( { color: color, linewidth:10, scale:2 } ));
		//materials.push( new THREE.MeshBasicMaterial( { color: color} ));
		groups.push({start:start, count:count, materialIndex:lastZ + 1});
		//console.log('points', points);
		for(let iKdx = 0; iKdx < points.length; iKdx++)
		{
			if(Number.isNaN(points[iKdx].x))console.log('NaN at x', iKdx);
			if(Number.isNaN(points[iKdx].y))console.log('NaN at y', iKdx);
			if(Number.isNaN(points[iKdx].z))console.log('NaN at z', iKdx);
		}
		const geometry = new THREE.BufferGeometry().setFromPoints( points );
		for(let iIdx = 0; iIdx < groups.length; iIdx++)
		{
			let group = groups[iIdx];
			geometry.addGroup(group.start, group.count, group.materialIndex);
		}
		//return new THREE.Line( geometry, materials );
		return new THREE.Mesh( geometry, materials );
		// let segments = [];
		// let points = [];
		// let lastZ = 0;
		// for(let iIdx = 0; iIdx <= play.length; iIdx++)
		// {
			// while(((point[2] != 0) != lastZ) || (iIdx == play.length))
			// {
				// lastZ = (point[2] != 0);
				// if(points.length == 0)break;
				// //We have a new segment
				// let color = 0x000000;
				// if(lastZ)color = 0xddddff; //Really light blue
				// const material = new THREE.LineBasicMaterial( { color: color } );
				// const geometry = new THREE.BufferGeometry().setFromPoints( points );
				// segments.push(new THREE.Line( geometry, material ));
				// if(iIdx == play.length)return segments;
				// points = []; //Get ready for next segment
			// }
			// let point = play[iIdx];
			// points.push(new THREE.Vector3( point[0], point[1], point[2] ));
			// //if(
		// }
	}
	/*
	* In our case, a 3D panel is a little different than a 2D panel in that it is animated.
	* We must take into account that an animation might be running and stop it gracefully.
	* Setting the scene has several possible components.  First is the moving part, which is
	* the drag knife or the pen. We could also create a moving line showing the path of the
	8 part, in particular the pivot point on the drag knife.  The next changeable component
	* is the canvas used as a texture to show the design being penned or cut.  Finally, the
	* thing that are pretty much same, the camera, lights, background and renderer.
	*/
	this.load3DPanel = function()
	{
		console.log('load3DPanel');
		let draw = false;
		//Is there an animation running? Stop it and use a callback (or promise await) to
		//avoid stomping on the next animation frame.
		if(scene == null) scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x72645b );
		//scene.fog = new THREE.Fog( 0x72645b, 2, 15 );
		// const light = new THREE.AmbientLight( 0x404040 ); // soft white light
		// scene.add( light );
		let directionalLight = addShadowedLight( 1, -100, 100, 0xffffff, 1.9 );
		scene.add( directionalLight );

		if(camera == null)camera = new THREE.PerspectiveCamera( 75, SS3D.pnlObj.lwrCnvs.clientWidth/SS3D.pnlObj.lwrCnvs.clientHeight, 0.1, 2500 );

		camera.position.set( 0, -200, 30 );
		// camera.rotation.x = Math.PI/2;
		// camera.rotation.y = Math.PI/2;
		//let canvas = makeCanvasTexture(0, true);
		//const texture = new THREE.CanvasTexture(canvas);
		const geometry = new THREE.PlaneGeometry( 96*25.4, 48*25.4 ); //new THREE.PlaneGeometry( 96*25.4/4, 48*25.4/4 ),
		//const material = new THREE.MeshBasicMaterial( {color: 0xffffff, map:texture, side:THREE.DoubleSide} )// color: 0x888888,
		const material = new THREE.MeshBasicMaterial( {color: 0xdddddd/*, map:texture*/} )// color: 0x888888,
		//const material = new THREE.MeshBasicMaterial( {map:texture} )// color: 0x888888,
		const plane = new THREE.Mesh( geometry, material);
		plane.position.z = -0.1;
		scene.add(plane);		
		if(knife == null)knife = loadDragKnife();
		console.log('knife.children.length',knife.children.length);
		scene.add(knife);
		if(pen == null)pen = loadPen();
		//pen.rotation.x = Math.PI/2;
		scene.add(pen);
		const renderer = new THREE.WebGLRenderer({canvas:SS3D.pnlObj.lwrCnvs});
		renderer.setSize( SS3D.pnlObj.lwrCnvs.clientWidth, SS3D.pnlObj.lwrCnvs.clientHeight);
		const controls = new THREE.OrbitControls( camera, renderer.domElement );
		// controls.addEventListener( "change", event => {  
			// console.log( controls.object.position ); 
		// });
		let play;
		let line = null;
		let playIdx = 0;
		SS3D.setMode = setMode;
		//setMode(draw);
		// for(let iIdx = 0; iIdx < segments.length; iIdx++)
		// {
			// let line = segments[iIdx];
			// scene.add(line);
			// line.geometry.setDrawRange( 0, 0 );
		// }
		console.log('3d', renderer, scene, camera);
		//renderer.render( scene, camera );
		//SS3D.stop = false;
		SS3D.animate = animate;
		//animate();
		
		function setMode(mode){
			draw = mode;
			if(line != null)
			{
				scene.remove(line);
				line.geometry.dispose();
				line.material[1].dispose();
				line.material[0].dispose();
				line = null;
			}
			let lWidth = 3; //Line width in mm
			let sbp = SSCNC.generateDrawingFile(SS3D.panelIdx, draw);
			play = SSCNC.animateSBP(sbp);
			for(let iIdx = 0; iIdx < play.length; iIdx++)
			{
				play[iIdx][0] -= 48; //translate 48 inches on x
				play[iIdx][1] -= 24; //translate 24 inches on y
				
				play[iIdx][0] *= -25.4;
				play[iIdx][1] *= -25.4;
				play[iIdx][2] *= 25.4;
			}
			if(draw)
			{
				let materials = [
					new THREE.MeshBasicMaterial( { color: 0x000000} ), 
					new THREE.MeshBasicMaterial( { color: 0x000000} ), 
					new THREE.MeshBasicMaterial( { color: 0xaaaaff} )
					];
				line = penTrack(play, lWidth, materials);
			}else
			{
				let materials = [
					new THREE.MeshBasicMaterial( { color: 0xff0000} ), 
					new THREE.MeshBasicMaterial( { color: 0x00ff00} ), 
					new THREE.MeshBasicMaterial( { color: 0xaaaaff} )
					];
				line = penTrack(play, lWidth, materials);
			}
			line.scale.set(1, 1, 1);
			line.geometry.setDrawRange( 0, 0 );
			console.log('line', line);
			scene.add(line);
			//renderer.setSize( SS3D.pnlObj.lwrCnvs.clientWidth, SS3D.pnlObj.lwrCnvs.clientHeight);
			playIdx = 0;
		}
		
		function animate() {
			SS3D.animationRun = 0;
			if(SS3D.stop){
				SS3D.animationRun = requestAnimationFrame( animate );
				controls.update();
				renderer.render( scene, camera );
				return;
			}
			SS3D.animationRun = requestAnimationFrame( animate );
			
			//console.log('Frame', playIdx.toString());
			//controls.update();
			let frm = play[playIdx];
			if(draw)
			{
				pen.position.set(frm[0], frm[1], frm[2]);
				knife.position.set(49*25.4, 26*25.4, 10);
			}else
			{
				knife.position.set(frm[0], frm[1], frm[2]);
				knife.rotation.z = frm[3];
				if(knife.children.length > 3)
				{
					if(frm[2] <= 0.1 * 25.4)
					{
						knife.children[3].position.setZ(0.2*25.4-frm[2]);
					}else
					{
						knife.children[3].position.setZ(0);
					}
				}
				pen.position.set(49*25.4, 25*25.4, 10);
			}
			//knifeGroup.position.set(0, 0, 0);
			//knifeGroup.rotation.y = frm[3];
			
			camera.position.set( frm[0]-15,  frm[1]-200, 100 );
			//camera.lookAt(-frm[0], -frm[2], frm[1]);
			camera.lookAt(frm[0]-15, frm[1], 0);
			line.geometry.setDrawRange( 0, 6*playIdx );
			// let segLen = 0;
			// for(let iIdx = 0; iIdx < segments.length; iIdx++)
			// {
				// let line = segments[iIdx];
				// line.geometry.setDrawRange( 0, 0 );
			// }

			playIdx += SS3D.speed;
			if(playIdx >= play.length)
			{
				playIdx = 0;
				pen.position.set(49*25.4, 25*25.4, 10);
				knife.position.set(49*25.4, 26*25.4, 10);
				camera.position.set( 0,  -600, 800 );
				camera.lookAt(0, -200, 0);
				SS3D.stop = true;
			}
			
			renderer.render( scene, camera );
		};

		function addShadowedLight( x, y, z, color, intensity ) {

			const directionalLight = new THREE.DirectionalLight( color, intensity );
			directionalLight.position.set( x, y, z );
			// scene.add( directionalLight );

			directionalLight.castShadow = true;

			const d = 1;
			directionalLight.shadow.camera.left = - d;
			directionalLight.shadow.camera.right = d;
			directionalLight.shadow.camera.top = d;
			directionalLight.shadow.camera.bottom = - d;

			directionalLight.shadow.camera.near = 1;
			directionalLight.shadow.camera.far = 4;

			directionalLight.shadow.bias = - 0.002;
			return directionalLight;
		}
		// const renderer = new THREE.WebGLRenderer();
		// renderer.setSize( SS3D.pnlObj.lwrCnvs.clientWidth, SS3D.pnlObj.lwrCnvs.clientHeight);
		// SS3D.pnlObj.panel.appendChild(renderer.domElement);
		//renderer.render( scene, camera );
	}

	var loadPen = function()
	{

		let penFiles =
		[
			'./files/PenHolder.stl',
			'./files/Pen.stl'
		];

		const penGroup = new THREE.Group();
		const loader = new STLLoader();
		//Load the body of the drag knife
		loader.load( penFiles[0], function ( geometry ) {

			const material = new THREE.MeshPhongMaterial( { color: 0x885533, specular: 0x111111, shininess: 200 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( 0, 0, 13 );

			penGroup.add( mesh );
		} );
		//Load the shaft of the drag knife
		loader.load( penFiles[1], function ( geometry ) {
			const material = new THREE.MeshPhongMaterial( { color: 0x555555, specular: 0x111111, shininess: 200 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( 0, 0, 8 );

			penGroup.add( mesh );
		} );
		return penGroup;
	}

	var loadDragKnife = function()
	{
		//The STL files were created with the knife tip at the origin.  We want the pivot point
		//(the shaft) over the origin. The tip offset is the distance from the pivot point to
		//the tip.
		let tipOffset = SSCNC.tipOff * 25.4;

		let knifeFiles =
		[
			'./files/DragKnifeWplunger.stl',
			'./files/Shaft.stl',
			'./files/Blade.stl',
			'./files/Lo-resPlunger.stl'
		];

		const knifeGroup = new THREE.Group();
		const loader = new STLLoader();
		//Load the body of the drag knife
		loader.load( knifeFiles[0], function ( geometry ) {

			const material = new THREE.MeshPhongMaterial( { color: 0x885533, specular: 0x111111, shininess: 200 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( tipOffset, 0, 0 );

			knifeGroup.add( mesh );
		} );
		//Load the shaft of the drag knife
		loader.load( knifeFiles[1], function ( geometry ) {
			const material = new THREE.MeshPhongMaterial( { color: 0x555555, specular: 0x111111, shininess: 200 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( tipOffset, 0, 0 );

			knifeGroup.add( mesh );
		} );
		//Load the blade
		loader.load( knifeFiles[2], function ( geometry ) {
			const material = new THREE.MeshPhongMaterial( { color: 0x777777, specular: 0x111111, shininess: 400 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( tipOffset, 0, 0 );

			knifeGroup.add( mesh );
		} );
		loader.load( knifeFiles[3], function ( geometry ) {
			const material = new THREE.MeshPhongMaterial( { color: 0x777777, specular: 0x111111, shininess: 400 } );
			const mesh = new THREE.Mesh( geometry, material );
			mesh.scale.set( 1, 1, 1 );
			mesh.rotation.x = Math.PI/2;
			//Move the pivot point to the origin
			mesh.position.set( tipOffset, 0, 0 );

			knifeGroup.add( mesh );
		} );
		return knifeGroup;
	}
	
	var test3D = function()
	{
		const scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x72645b );
		//scene.fog = new THREE.Fog( 0x72645b, 2, 15 );
		// const light = new THREE.AmbientLight( 0x404040 ); // soft white light
		// scene.add( light );

		const camera = new THREE.PerspectiveCamera( 75, SS3D.pnlObj.lwrCnvs.clientWidth/SS3D.pnlObj.lwrCnvs.clientHeight, 0.1, 2500 );

		camera.position.set( 3, 30, 3 );

		//cameraTarget = new THREE.Vector3( 0,  0.25, 0 );

		let canvas = document.createElement('canvas');
		// canvas.width = 480;
		// canvas.height = 960;
		canvas.width = 960;
		canvas.height = 480;
		let scale = canvas.width/96;
		canvas.style.backgroundColor = 'white';
		//document.body.appendChild(canvas);
		let ctx = canvas.getContext("2d");
		//ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = '#ddddff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1/scale;
		ctx.save();
		ctx.translate(canvas.width/2, canvas.height/2);
		ctx.scale(scale, -scale);
		//ctx.rotate(Math.PI/2);
		let iPanelIdx = 0;
		let svg = SSCNC.getPanelPaths(iPanelIdx, true);
		svg += ' ' + SSCNC.getPanelText(iPanelIdx) + ' ';
		svg += SSCNC.getPanelHoles(iPanelIdx) + ' ';
		//let Atx = Affine.getScaleATx({x:25.4, y:25.4});
		//let Atx = Affine.getScaleATx({x:10, y:10});
		let Atx = Affine.getRotateATx(Math.PI/2);
		svg = utils.svgTransform(svg, Atx);
		let path = new Path2D(svg);
		ctx.stroke(path);
		let sbp = SSCNC.generateDrawingFile(iPanelIdx, false);
		svg = SSCNC.sbp2svg(sbp);
		// Atx = Affine.getTranslateATx({x:-48, y:-24});
		// Atx = Affine.affineAppend(Atx, Affine.getRotateATx(Math.PI));
		Atx = Affine.getRotateATx(Math.PI);
		Atx = Affine.affineAppend(Atx, Affine.getTranslateATx({x:-48, y:-24}));
		svg = utils.svgTransform(svg, Atx);
		ctx.strokeStyle = '#ff0000';
		path = new Path2D(svg);
		//ctx.stroke(path);
		ctx.restore();
		// Atx = Affine.getScaleATx({x:25.4, y:25.4});
		// svg = utils.svgTransform(svg, Atx);
		//svg = SSCNC.getPanelPaths(iPanelIdx, false);
		//console.log('svg', svg);
		let play = SSCNC.animateSBP(sbp);
		//console.log('play', play);
		//We need to do a transform on these points.  The shopbot has the origin in the lower left
		//We have it in the middle.  There may also be a rotation at 90 degree increments we will
		//handle those by how we assign values to axis in the animation step
		for(let iIdx = 0; iIdx < play.length; iIdx++)
		{
			play[iIdx][0] -= 48; //translate 48 inches on x
			play[iIdx][1] -= 24; //translate 24 inches on y
			
			//Scale all 3 axis to mm
			// play[iIdx][0] *= 25.4;
			// play[iIdx][1] *= 25.4;
			play[iIdx][0] *= 25.4;
			play[iIdx][1] *= 25.4;
			play[iIdx][2] *= 25.4;
			//play[iIdx][2] = 0;
		}
		//console.log('play', play);
		let playIdx = 0;
		//const texture = new THREE.CanvasTexture({canvas:canvas});
		//const texture = new THREE.Texture(canvas);
		//const texture = new THREE.CanvasTexture(canvas);
		//const texture = new THREE.TextureLoader().load(canvas.toDataURL(), function(texture){
		new THREE.TextureLoader().load(canvas.toDataURL(), function(texture){
			//const geometry = new THREE.BoxGeometry(1024, 512, 1);
			//const geometry = new THREE.PlaneGeometry( 960, 480 ); //new THREE.PlaneGeometry( 96*25.4/4, 48*25.4/4 ),
			const geometry = new THREE.PlaneGeometry( 96*25.4, 48*25.4 ); //new THREE.PlaneGeometry( 96*25.4/4, 48*25.4/4 ),
			// const material = new THREE.MeshBasicMaterial( {/*color: 0xffffff, */opacity:1.0, map:texture, side:THREE.DoubleSide /*, shadowSide:THREE.BackSide*/ } )// color: 0x888888,
			//const material = new THREE.MeshBasicMaterial( {color: 0xdddddd/*, map:texture*/} )// color: 0x888888,
			const material = new THREE.MeshBasicMaterial( {map:texture} )// color: 0x888888,
			const plane = new THREE.Mesh( geometry, material);		
			plane.dynamic = true;
			//plane.material.map = texture;
			texture.needsUpdate = true;
			//plane.material.transparent = true;
			plane.material.needsUpdate = true;
			plane.rotation.x = -Math.PI / 2;
			plane.position.z = 0;
			scene.add( plane );
		});
		//texture.needsUpdate = true;
		// const material = new THREE.MeshBasicMaterial( {/*color: 0xffffff, */opacity:1.0, map:texture, side:THREE.DoubleSide /*, shadowSide:THREE.BackSide*/ } )// color: 0x888888,
		// //const material = new THREE.MeshPhongMaterial( {/*color: 0xffffff, */opacity:1.0, map:texture, side:THREE.DoubleSide /*, shadowSide:THREE.BackSide*/ } )// color: 0x888888,
		// //material.map.minFilter = THREE.LinearFilter;
		// const plane = new THREE.Mesh( geometry, material);
		// plane.dynamic = true;
		// texture.needsUpdate = true;
		// //plane.material.transparent = true;
		// plane.material.needsUpdate = true;
		// plane.rotation.x = -Math.PI / 2;
		// //plane.position.z = 0;
		// scene.add( plane );

		//plane.receiveShadow = true;
		
		scene.add( new THREE.HemisphereLight( 0x443333, 0x111122 ) );

		const renderer = new THREE.WebGLRenderer();
		renderer.setSize( SS3D.pnlObj.lwrCnvs.clientWidth, SS3D.pnlObj.lwrCnvs.clientHeight);
		SS3D.pnlObj.lwrCnvs.appendChild( renderer.domElement );
		const controls = new THREE.OrbitControls( camera, renderer.domElement );
		// const geometry = new THREE.BoxGeometry( 1, 1, 1 );
		// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		// const cube = new THREE.Mesh( geometry, material );
		// scene.add( cube );
		
		let tipOffset = SSCNC.tipOff * 25.4;
		//console.log('cube', cube);
		scene.add(knifeGroup);

		camera.position.z = 100;
		
		knifeGroup.rotation.y = Math.PI;
		//knifeGroup.position.y = 10;
		
		// let svg = SSCNC.getPanelPaths(0, true);
		// svg += ' ' + SSCNC.getPanelText(0) + ' ';
		// let Atx = Affine.getScaleATx({x:25.4, y:25.4});
		// //let Atx = Affine.getScaleATx({x:10, y:10});
		// svg = utils.svgTransform(svg, Atx);
		// const svgloader = new THREE.SVGLoader();
		// const paths = svgloader.parse('<path d=\"' + svg + '\"/>');
		// console.log('paths', paths);
		// const group = new THREE.Group();
		// for ( let i = 0; i < paths.paths.length; i ++ ) {

			// const path = paths.paths[ i ];
			// console.log('path', path);
			// const lineMaterial = new THREE.MeshBasicMaterial( {
				// //color: path.color,
				// color: 0x555555,
				// side: THREE.DoubleSide,
				// wireframe: true,
				// depthWrite: false
			// } );
			// // const shapes = THREE.SVGLoader.createShapes( path );		
			// // for ( let j = 0; j < shapes.length; j ++ ) {

				// // const shape = shapes[ j ];
				// // //console.log('shape', shape);
				// // const geometry = new THREE.ShapeGeometry( shape );
				// // const mesh = new THREE.Mesh( geometry, lineMaterial );
				// // group.add( mesh );

			// // }
		// }
		// group.rotation.x = - Math.PI / 2;
		// group.rotation.z = - Math.PI / 2;
		// //group.position.set( 0, 0, 1 );
		// scene.add( group );
		
		function animate() {
			requestAnimationFrame( animate );
			
			controls.update();
			let frm = play[playIdx];
			knifeGroup.position.set(-frm[0], frm[2], frm[1]);
			//knifeGroup.position.set(0, 0, 0);
			knifeGroup.rotation.y = frm[3];
			
			camera.position.set( -frm[0]-200, 100, frm[1]+200 );
			//camera.lookAt(-frm[0], -frm[2], frm[1]);
			camera.lookAt(-frm[0], 0, frm[1]);

			// cube.rotation.x += 0.01;
			// cube.rotation.y += 0.01;

			renderer.render( scene, camera );
			playIdx += 1;
			//if(frm[2] > 0)playIdx += 3; //Jogging move faster
			if(playIdx >= play.length)playIdx = 0;
			//console.log('!!');
		};

		function addShadowedLight( x, y, z, color, intensity ) {

			const directionalLight = new THREE.DirectionalLight( color, intensity );
			directionalLight.position.set( x, y, z );
			// scene.add( directionalLight );

			directionalLight.castShadow = true;

			const d = 1;
			directionalLight.shadow.camera.left = - d;
			directionalLight.shadow.camera.right = d;
			directionalLight.shadow.camera.top = d;
			directionalLight.shadow.camera.bottom = - d;

			directionalLight.shadow.camera.near = 1;
			directionalLight.shadow.camera.far = 4;

			directionalLight.shadow.bias = - 0.002;
			return directionalLight;
		}
		let directionalLight = addShadowedLight( 1, 1, 1, 0xffffff, 2.35 );
		scene.add( directionalLight );

		animate();
		// const scene = new THREE.Scene();
		// const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

		// const renderer = new THREE.WebGLRenderer();
		// renderer.setSize( SSTools.pnlObj.lwrCnvs.clientWidth, SSTools.pnlObj.lwrCnvs.clientHeight);
		// SSTools.pnlObj.lwrCnvs.appendChild( renderer.domElement );		
		// camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 15 );
		// camera.position.set( 3, 0.15, 3 );

		// cameraTarget = new THREE.Vector3( 0, - 0.25, 0 );

		// scene = new THREE.Scene();
		// scene.background = new THREE.Color( 0x72645b );
		// scene.fog = new THREE.Fog( 0x72645b, 2, 15 );

		// const plane = new THREE.Mesh(
			// new THREE.PlaneGeometry( 40, 40 ),
			// new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
		// );
		// plane.rotation.x = - Math.PI / 2;
		// plane.position.y = - 0.5;
		// scene.add( plane );

		// plane.receiveShadow = true;
		
		// renderer = new THREE.WebGLRenderer( { antialias: true } );
		// renderer.setPixelRatio( window.devicePixelRatio );
		// renderer.setSize( this.pnlObj.lwrCnvs.clientWidth, this.pnlObj.lwrCnvs.clientHeight );
		// renderer.outputEncoding = THREE.sRGBEncoding;

		// renderer.shadowMap.enabled = true;

		// this.pnlObj.lwrCnvs.appendChild( renderer.domElement );
		// render();
		console.log('3D test?');
	}
	return this;
	
})();
