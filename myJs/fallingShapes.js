
var startingY;
var boxMass = 100;

//create a random box in a random location
function Shape(scene, boxWidth, boxHeight, boxDepth, bolReadyForNewShape,
    width, height, numBoxesWide, onBlockCollision, fieldArray, numBoxesWide) {

    //numBoxesWide = 3;
    this.fieldArray = fieldArray;
    this.scene = scene;
    this.boxHeight = boxHeight;
    this.numBoxesWide = numBoxesWide;
    startingY = (height / -2) - 2 * boxHeight;

    //determine the color
    var colorIndex = getRandBetween(0, this.boxColors.length - 1);
    this.shapeColor = this.colors[colorIndex];
    // Box
    var shapeMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: this.boxColors[colorIndex]
        }),
        1.0,
        .0
        );
    this.physiShape = new Physijs.BoxMesh(
        new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth),
        shapeMaterial,
        boxMass

        );
    this.physiShape.collisions = 0;

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

    this.shapeID = this.currentID;
    ShapeProto.currentID++;
    this.bolIsDead = false;
    this.movementState = "falling";
}

var ShapeProto = {
    fieldArray: undefined,
    physiShape: undefined,
    boxColors: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
    colors: ["r", "y", "g", "b"],
    
//    boxColors: [0xff0000, 0xffff00],
//    colors: ["r", "y"],
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
    collisionState: undefined,
    

    update: function () {

        
    },

    //mark this blick as dead.  We'll remove all the dead blocks in one go
    kill: function () {
        this.bolIsDead = true;
    },
    
    //remove the dead blocks from the data matrix
    removeDeadBlocks: function (numBoxesWide, fieldArray, scene) {
        
        //remove dead blocks from the field array
        for (var i = 0; i < numBoxesWide; i++) {
            for (var j = fieldArray[i].length - 1; j >= 0; j--) {
                if (fieldArray[i][j].bolIsDead) {
                    //remove this block from the scene
                    console.log(i + "," + j + " : " + fieldArray[i][j].shapeID + " removed");
                    scene.remove(fieldArray[i][j].physiShape);
                    fieldArray[i].splice(j, 1);
                }
            }
        }

        var checkForMatches = [];
        //now make sure all block indexes are correct since we may have removed a block above it in he array
        for (var i = 0; i < numBoxesWide; i++) {
            for (var j = fieldArray[i].length - 1; j >= 0; j--) {
                if (fieldArray[i][j].index !== j) { //we have an older box that has shifted so check for new matches for it
                    checkForMatches.push(fieldArray[i][j]);
                }
                fieldArray[i][j].index = j;
            }
        }
        
        //check blocks that have moved for matches
        //check for matches
//        for (var i = 0; i < checkForMatches.lenght; i++) {
//            var matchStack = { color: checkForMatches[i].shapeColor, matches: {} };   //clear the match stack prior to checking for matches
//            matchStack = this.checkForMatches(matchStack, checkForMatches[i]);
//            this.killMatchStickMembers(matchStack);
//        }
    },
    
    //Set the evaluated flag of each block to false
    setAllBlocksToUnevaluated : function(numBoxesWide, fieldArray){
        //remove dead blocks from the field array
        for (var i = 0; i < numBoxesWide; i++) {
            for (var j = fieldArray[i].length - 1; j >= 0; j--) {
                if (fieldArray[i][j].bolIsDead) {
                    //remove this block from the scene
                    fieldArray[i][j].isEvaluated = false;
                    
                }
            }
        }
    },

    collisionHandler: function (source, collided_with, linearVelocity, angularVelocity) {
        
        if ((this.collidedWith !== collided_with) && (linearVelocity.y > 0) && (!this.collisionState)) {
            this.collisionState = 'initialCollision';
            console.log("* " + this.shapeID + " initial collision");
        }
        else if ((this.collidedWith !== collided_with) && (linearVelocity.y > 0)) {
            //console.log(this.shapeID + " followOnCollision collision");
            //this.collisionState = 'followOnCollision';
        }
        this.collidedWith = collided_with;
        
        //if this is a block's initial collision add it to the field array
        if (this.collisionState === 'initialCollision') {
            //place the shape in the field array
            this.index = this.fieldArray[this.columnNumber].length;
            this.fieldArray[this.columnNumber].push(this);
            this.addedToFieldArray = true;
            //this.collisionState = 'initialCollisionHandled';
            //console.log("* " + this.shapeID + " initialCollisionHandled");
        }

        //this is not a blocks initial collision, but still check to see if it has any matches
       if ((this.collisionState === 'followOnCollision')||(this.collisionState ==='initialCollisionHandled')){
            //check for matches
            var matchStack = { color: this.shapeColor, matches: {} };   //clear the match stack prior to checking for matches
            matchStack = this.checkForMatches(matchStack, this);
            this.killMatchStickMembers(matchStack);
            //this.collisionState === 'followOnCollisionHandled';
            //console.log(this.shapeID + " followOnCollisionHandled");
        }
    },

    killMatchStickMembers: function (matchStack) {
        //print out the nuber of matches
        var numMatches = Object.keys(matchStack.matches).length;
        if (numMatches > 1) {
            console.log(numMatches + " " + matchStack.color  + " matches found");
            
            //remove the matching blocks from the scene
            if (Object.keys(matchStack.matches).length > 2) {
                for (var key in matchStack.matches) {
                    if (matchStack.matches.hasOwnProperty(key)) {
                        matchStack.matches[key].kill();
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
            if (this.shapeColor === matchStack.color) {
                matchStack.matches[shape.shapeID] = this;
        
                //get the shape to the left
                if (this.fieldArray[shape.columnNumber - 1])
                    var leftNeighbor = this.fieldArray[shape.columnNumber - 1][shape.index];
                //get the shape to the right
                if (this.fieldArray[shape.columnNumber + 1])
                    var rightNeighbor = this.fieldArray[shape.columnNumber + 1][shape.index];
                //get the shape above   
                if (this.fieldArray[shape.columnNumber][shape.index - 1])
                    var aboveNeighbor = this.fieldArray[shape.columnNumber][shape.index - 1];
                //get the shape below   
                if (this.fieldArray[shape.columnNumber][shape.index + 1])
                    var belowNeighbor = this.fieldArray[shape.columnNumber][shape.index + 1];

                if (leftNeighbor) {
                    leftNeighbor.checkForMatches(matchStack, leftNeighbor);
                }
                if (rightNeighbor) {
                    rightNeighbor.checkForMatches(matchStack, rightNeighbor);
                }
                if (aboveNeighbor) {
                    aboveNeighbor.checkForMatches(matchStack, aboveNeighbor);
                }
                if (belowNeighbor) {
                    belowNeighbor.checkForMatches(matchStack, belowNeighbor);
                }
            }
        }
        //shape.isEvaluated = true;
        return matchStack;
    }
};

Shape.prototype = ShapeProto;