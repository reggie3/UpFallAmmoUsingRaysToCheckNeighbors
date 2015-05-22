document.addEventListener('DOMContentLoaded', function () {
    var frameCounter = 0;
    var stats, container, renderer, scene, camera, overlay;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;
    var bolReadyForNewShape = true;
    var shapes = [];

    var width, height;
    var boxWidth, boxHeight, boxDepth;
    var numBoxesWide = 12;
    var fieldArray = [];
    var matchedObjects;

    //setup options
    var usePerspective = true;

    init();


    function init() {
        //setup physijs
        Physijs.scripts.worker = './js/physijs_worker.js';
        Physijs.scripts.ammo = './ammo.js';

        setupOptions();
        setupContainer();
        setupRenderer();
        setupPhysicsWorld();
        setupCamera();
        setupStats();
        setupLights();
        addEventListeners();
        setupGeometry();
        setupFieldArray();  //an array that will hold the game data

        
        //start the animation loop
        animate();
        scene.simulate();
    }

    function setupOptions() {
        //setup the options
        if (usePerspective === true) {
            boxWidth = 1;
            boxHeight = 1;
            boxDepth = 1;
        }
        else {
            boxWidth = width / 10;
            boxHeight = width / 10;
            boxDepth = width / 10;
        }
    }

    function setupContainer() {
        container = document.createElement("div");
        document.body.appendChild(container);
    }

    function setupRenderer() {
        //renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
        renderer = new THREE.WebGLRenderer({ antialias: false, devicePixelRatio: 1 });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFShadowMap;
        container.appendChild(renderer.domElement);
    }

    function setupPhysicsWorld() {
        scene = new Physijs.Scene;
        scene.setGravity(new THREE.Vector3(0, 30, 0));
        scene.addEventListener(
            'update',
            function () {
                scene.simulate(undefined, 1);

            }
            );
    }

    function setupCamera() {
        //camera = new THREE.OrthographicCamera(
        //      width / -2, width / 2, height / 2, height / -2, -100, 1000);
        var aspectRatio = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(
            80, aspectRatio, 1, 1000);
        camera.position.set(0, 0, 15);
        //camera.lookAt( scene.position );

        var vFOV = camera.fov * Math.PI / 180;        // convert vertical fov to radians
        height = 2 * Math.tan(vFOV / 2) * camera.position.z; // visible height
        width = height * aspectRatio;

        //console.log("width | height : " + width + " | " + height);
        //boxWidth = boxHeight = boxDepth = width / numBoxesWide;
        //console.log("width / numBoxesWide " + width / numBoxesWide);
        //console.log("box dim: " + boxWidth + ", " + boxHeight + ", " + boxDepth);

        scene.add(camera);
    }

    function setupStats() {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild(stats.domElement);
    }

    function animate() {
        //console.log("frame: " + frameCounter);
        
        //only create a new shape if the first one has reached .25 of the screen
        if(ShapeProto.shapes[ShapeProto.currentID-1]){           
            if (ShapeProto.shapes[ShapeProto.currentID-1].physiShape.position.y > height/-2+2*boxHeight) {
                createFallingShape();
            }
        }
        else{
            createFallingShape();
        }



        //loop through the shapes and update
//        for (var key in ShapeProto.shapes) {
//            if (ShapeProto.shapes.hasOwnProperty(key)) {
//                var shape = ShapeProto.shapes[key];
//                if(shape.bolIsDead){
//                    scene.remove(fieldArray[shape.columnNumber][shape.index].physiShape);
//                    fieldArray[shape.columnNumber].splice(shape.index,1); 
//                    shape = undefined;
//                }
//            }
//        }
                
        render();
        requestAnimationFrame(animate);
        ShapeProto.removeDeadBlocks(numBoxesWide, fieldArray, scene);
    }

    function render() {
        renderer.render(scene, camera);
        stats.update();
        frameCounter++;
    }

    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function setupLights() {
        var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(ambientLight);

        var pointLight = new THREE.PointLight(0xff0000, 1, 100);
        pointLight.position.set(0, 0, 20);
        scene.add(pointLight);

        var dirLight = new THREE.DirectionalLight(0xffffff);
        // add shadow properties to light
        dirLight.castShadow = true;
        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;
        dirLight.shadowDarkness = 0.5;
        dirLight.shadowCameraNear = 5;
        dirLight.shadowCameraFar = 100;
        //light.shadowBias = 0.00001;
        // If this is too low, expect bright lines around objects
        dirLight.shadowBias = 0.0015;
        // This rectangle is the only place you will get shadows
        dirLight.shadowCameraRight = 20;
        dirLight.shadowCameraLeft = -20;
        dirLight.shadowCameraTop = 20;
        dirLight.shadowCameraBottom = -20;
        // For debugging
        //light.shadowCameraVisible = true;
        dirLight.position.set(15, 15, 20);
        scene.add(dirLight);
    }

    function addEventListeners() {
        // Generic setup
        window.addEventListener('resize', onWindowResize, false);
    }

    function setupGeometry() {

        var wallMaterial = Physijs.createMaterial(
            new THREE.MeshPhongMaterial({ color: 0x11ff00 }),
            1, // high friction
            .0 // low restitution
            );
        var ceiling = new Physijs.BoxMesh(
            new THREE.BoxGeometry(width, 1, 1),
            wallMaterial,
            0   //mass
            );
        //ceiling.receiveShadow = true;
        ceiling.position.y = height / 2;
        //console.log("ceiling y = " + ceiling.position.y);

        var rightWall = new Physijs.BoxMesh(
            new THREE.BoxGeometry(1, height, 1),
            wallMaterial,
            0   //mass
            );
        rightWall.position.x = width / 2 - .5;
        //console.log("rightWall x= " + rightWall.position.x);

        var leftWall = new Physijs.BoxMesh(
            new THREE.BoxGeometry(1, height, 1),
            wallMaterial,
            0   //mass
            );
        leftWall.position.x = width / -2 - .5;
        //console.log("leftWall x= " + leftWall.position.x);

        rightWall.__dirtyPosition = true;
        ceiling.__dirtyPosition = true;
        leftWall.__dirtyPosition = true;

        scene.add(ceiling);
        scene.add(leftWall);
        scene.add(rightWall);
    }

    function setupFieldArray() {
        for (var i = 0; i < numBoxesWide; i++) {
            fieldArray[i] = [];
        }
    }

    //check the filed to see if anything needs updating
    function onBlockCollision(otherObject, linear_velocity, angular_velocity) {

        matchStack = [];
        //begin the series of recursive calls looking for color matches
        checkLeftMatch(this);
        checkRightMatch(this);
        checkPreviouMatch(this);

        console.log("number of matches : " + matchStack.length);
        matchStack = [];
    }

    function createFallingShape() {
        var shape = new Shape(scene, boxWidth, boxHeight, boxDepth, bolReadyForNewShape,
            width, height, numBoxesWide, onBlockCollision, fieldArray, numBoxesWide);
        //add the smape to the protoypes list of shapes
        ShapeProto.shapes[shape.shapeID] = shape;
        shapes.push(shape);
    }

    function checkLeftMatch(shape) {
        //look to the left of this column at this shapes index to see if there are any matches
        if (fieldArray[shape.columnNumber - 1]) {
            if ((fieldArray[shape.columnNumber - 1][shape.index]) &&
                (!fieldArray[shape.columnNumber - 1][shape.index].bolIsDead) &&
                (fieldArray[shape.columnNumber - 1][shape.index].shapeColor === shape.shapeColor)) {
                var neighbor = fieldArray[shape.columnNumber - 1][shape.index];

                //if there is a color match then add this neighbor to the match stack
                //matchStack.push(neighbor);
                console.log("color:  " + fieldArray[shape.columnNumber - 1][shape.index].shapeColor +
                    " match found left");

                checkLeftMatch(neighbor);
                checkRightMatch(neighbor);
                checkPreviouMatch(neighbor);
            }
            else {

            }
        }
    }

    function checkRightMatch(shape) {
        //look right
        if (fieldArray[shape.columnNumber + 1]) {
            if ((fieldArray[shape.columnNumber + 1][shape.index]) &&
                (!fieldArray[shape.columnNumber + 1][shape.index].bolIsDead) &&
                (fieldArray[shape.columnNumber + 1][shape.index].shapeColor === shape.shapeColor)) {
                var neighbor = fieldArray[shape.columnNumber + 1][shape.index];
                matchStack.push(neighbor);
                console.log("color:  " + fieldArray[shape.columnNumber + 1][shape.index].shapeColor +
                    " match found right");

                checkLeftMatch(neighbor);
                checkRightMatch(neighbor);
                checkPreviouMatch(neighbor);
            }
            else {

            }
        }
    }

    function checkPreviouMatch(shape) {
        //look at the previous row
        if (fieldArray[shape.columnNumber][shape.index - 1]) {
            if ((!fieldArray[shape.columnNumber][shape.index - 1]) &&
                (!fieldArray[shape.columnNumber][shape.index - 1].bolIsDead) &&
                (fieldArray[shape.columnNumber][shape.index - 1].shapeColor === shape.shapeColor)) {
                var neighbor = fieldArray[shape.columnNumber][shape.index - 1];
                matchStack.push(neighbor);
                console.log("color:  " + fieldArray[shape.columnNumber - 1][shape.index].shapeColor +
                    " match found above");

                checkLeftMatch(neighbor);
                checkRightMatch(neighbor);
                checkPreviouMatch(neighbor);
            }
            else {

            }
        }
    }
});