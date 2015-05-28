
var startingY;
var boxMass = 100;
var useNumberTexture = true;   //display shape ID's on the blocks
var numBlocksToMatch = 3;

//create a random box in a random location
function Shape(scene, boxWidth, boxHeight, boxDepth, height, numBoxesWide) {

    //numBoxesWide = 3;
    this.scene = scene;
    this.boxHeight = boxHeight;
    this.numBoxesWide = numBoxesWide;
    startingY = (height / -2) - 2 * boxHeight;

    this.shapeID = this.currentID;
    ShapeProto.currentID++;

    //determine the color
    var colorIndex = getRandBetween(0, this.boxColors.length - 1);
    this.shapeColor = this.colors[colorIndex];
    // Box

    var mat;
    if(useNumberTexture){
        // create a canvas element
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.fillStyle="#FF0000";

        var tex = new THREE.Texture(this.canvasTexture(this.shapeID, this.colors[colorIndex]));
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        mat = new THREE.MeshBasicMaterial( {map: tex, side:THREE.DoubleSide } );
    }
    else{
        mat = new THREE.MeshLambertMaterial({
            color: this.boxColors[colorIndex]
        });
    }
    var shapeMaterial = Physijs.createMaterial(
        mat,
        1.0,
        .1
    );
    this.physiShape = new Physijs.BoxMesh(
        new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth),
        shapeMaterial,
        boxMass

    );
    this.physiShape.collisions = 0;
    this.physiShape.parentID = this.shapeID;

    var that = this;
    var onReady = function () {
        //console.log("shape ready");
        that.readyHandler();
    };

    var onCollision = function (collided_with, linearVelocity, angularVelocity) {
        that.collisionHandler(that, collided_with, linearVelocity, angularVelocity);
    };

    this.physiShape.addEventListener('ready', onReady);
    this.physiShape.addEventListener('collision', onCollision);

    this.columnNumber = Math.floor(Math.random() * numBoxesWide);
    this.physiShape.position.x = boxWidth * (this.columnNumber - numBoxesWide / 2);
    this.physiShape.position.y = startingY;

    scene.add(this.physiShape);

    this.physiShape.__dirtyPosition = true;


    this.bolIsDead = false;
    this.movementState = "falling";
}

var ShapeProto = {
    physiShape: undefined,
    boxColors: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
    colors: ["red", "yellow", "green", "blue"],

    //boxColors: [0xff0000, 0xffff00],
    //colors: ["red", "yellow"],
    shapeID: undefined,
    currentID: 0,
    shapes: {},
    columnNumber: undefined,
    shapeColor: undefined,
    index: undefined,   //the position of this shape in its column
    bolIsDead: false,
    scene: undefined,
    bolIsFirstFrame: true,
    lastVel: new THREE.Vector3(),
    boxHeight: undefined,   //height of a box
    //hold the previous and currnt collision locations so that we only get one collision
    //event per actuall collision even if there is a bounce
    prevHeight: new THREE.Vector3(),
    curHeight: new THREE.Vector3(),
    bolIsDead: false,
    isEvaluated: false, //flag set to true whenever a shape has been evaluated for matches
    hasHadInitialCollision: false,
    movementState: undefined,
    collisionState: 'none',


    update: function () {


    },

    //mark this blick as dead.  We'll remove all the dead blocks in one go
    kill: function (id) {
        ShapeProto.shapes[id].bolIsDead = true;
    },

    //remove the dead blocks from the data matrix
    removeDeadBlocks: function (scene) {

        //loop through the shapes and update
        for (var key in ShapeProto.shapes) {
            if (ShapeProto.shapes.hasOwnProperty(key)) {
                var shape = ShapeProto.shapes[key];
                if(shape.bolIsDead){
                    scene.remove(shape.physiShape);
                    delete ShapeProto.shapes[key];

                }
            }
        }
    },

    collisionHandler: function (source, collided_with, linearVelocity, angularVelocity) {

        if ((this.collidedWith !== collided_with) && (linearVelocity.y > 0) && (this.collisionState==='none')){
            this.collisionState = 'initialCollision';

        }
        else if ((this.collidedWith !== collided_with) && (linearVelocity.y > 0)) {
            //console.log(this.shapeID + " followOnCollision collision");
            this.collisionState = 'followOnCollision';
        }
        this.collidedWith = collided_with;

        //this is not a blocks initial collision, but still check to see if it has any matches
        if ((this.collisionState === 'followOnCollision')||(this.collisionState ==='initialCollision')){
            //check for matches
            console.log(this.collisionState + " for ID: " + this.shapeID + " | col# " + this.columnNumber + ", " + this.index);
            var matchStack = { color: this.shapeColor, matches: {}, checkedShapes: {} };   //clear the match stack prior to checking for matches
            matchStack = this.checkForMatches(matchStack, this);
            this.killMatchStickMembers(matchStack);
            this.collisionState = 'collisionHandled';

        }
    },

    killMatchStickMembers: function (matchStack) {
        //print out the nuber of matches
        var numMatches = Object.keys(matchStack.matches).length;
        if (numMatches > 1) {
            //console.log(numMatches + " " + matchStack.color  + " matches found");

            //remove the matching blocks from the scene
            if (Object.keys(matchStack.matches).length >= numBlocksToMatch) {
                for (var key in matchStack.matches) {
                    if (matchStack.matches.hasOwnProperty(key)) {
                        ShapeProto.kill(key);
                    }
                }
            }
        }
    },

    readyHandler: function () {
        bolReadyForNewShape = true;
        this.physiShape.setAngularFactor(new THREE.Vector3());
        this.physiShape.setLinearFactor(new THREE.Vector3(1, 1, 0));
    },

    /************************************
     * checkForMatches
     *  recursively checks for color matches in the blocks above, below, to the left, and the right.  If a match is found
     *  then place it in the matchStack and then search its neighbors
     * Parameters:
     *  matchStack: the stack of matching shapes, contains the color that we are looking for as "color"
     *  shape: the shape who's neighbors will be examined
     * Returns:
     *  matchStack
     */
    checkForMatches: function (matchStack, shape) {
        //check to see if this shape is already in the match stack
        // if it is then just return the stack
        if (!matchStack.matches[shape.shapeID]) {
            console.log("checking " + matchStack.color + " at " + shape.columnNumber + ", " + shape.index);
            if (this.shapeColor === matchStack.color) {
                matchStack.matches[shape.shapeID] = this;
                matchStack.checkedShapes[shape.shapeID] = true;

                var originPoint = shape.physiShape.position.clone();
                var myRays = {};

                myRays.left = new THREE.Raycaster( originPoint, new THREE.Vector3(-this.boxHeight/2, 0, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.right = new THREE.Raycaster( originPoint, new THREE.Vector3(this.boxHeight/2, 0, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.top = new THREE.Raycaster( originPoint, new THREE.Vector3(0, this.boxHeight/2, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.bottom = new THREE.Raycaster( originPoint, new THREE.Vector3(0, -this.boxHeight/2, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );


                for (var rayKey in myRays) {
                    //loop through the shapes and update
                    for (var key in ShapeProto.shapes) {
                        if (ShapeProto.shapes.hasOwnProperty(key)) {
                            if(ShapeProto.shapes[key].shapeID !== shape.shapeID) { 
                                var collisionResults = myRays[rayKey].intersectObject( ShapeProto.shapes[key].physiShape);
                                if(collisionResults.length>0){
                                    if(!matchStack.checkedShapes[ShapeProto.shapes[key].shapeID]) {
                                        console.log("adjacent Found: " + shape.shapeID + " : " + ShapeProto.shapes[key].shapeID );
                                        if(ShapeProto.shapes[key].shapeColor === shape.shapeColor) {
                                            this.checkForMatches(matchStack, ShapeProto.shapes[key]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                ////get the shape to the left
                //if (ShapeProto.fieldArray[shape.columnNumber - 1])
                //    var leftNeighbor = ShapeProto.fieldArray[shape.columnNumber - 1][shape.index];
                ////get the shape to the right
                //if (ShapeProto.fieldArray[shape.columnNumber + 1])
                //    var rightNeighbor = ShapeProto.fieldArray[shape.columnNumber + 1][shape.index];
                ////get the shape above
                //if (ShapeProto.fieldArray[shape.columnNumber][shape.index - 1])
                //    var aboveNeighbor = ShapeProto.fieldArray[shape.columnNumber][shape.index - 1];
                ////get the shape below
                //if (ShapeProto.fieldArray[shape.columnNumber][shape.index + 1])
                //    var belowNeighbor = ShapeProto.fieldArray[shape.columnNumber][shape.index + 1];
                //
                //if (leftNeighbor) {
                //    leftNeighbor.checkForMatches(matchStack, leftNeighbor);
                //}
                //if (rightNeighbor) {
                //    rightNeighbor.checkForMatches(matchStack, rightNeighbor);
                //}
                //if (aboveNeighbor) {
                //    aboveNeighbor.checkForMatches(matchStack, aboveNeighbor);
                //}
                //if (belowNeighbor) {
                //    belowNeighbor.checkForMatches(matchStack, belowNeighbor);
                //}
            }
        }
        //shape.isEvaluated = true;
        return matchStack;
    },

    canvasTexture: function(id,color) {
        var size = 257;
        var canvas = document.createElement('canvas');

        canvas.width = canvas.height = size;
        var context = canvas.getContext('2d');
        context.font = '100pt Arial';
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
        context.fillStyle = 'black';
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(id, canvas.width / 2, canvas.height / 2);

        return canvas;
    }
};

Shape.prototype = ShapeProto;