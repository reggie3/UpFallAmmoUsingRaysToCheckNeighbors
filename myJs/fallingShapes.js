
//create a random box in a random location
function Shape(scene, boxWidth, boxHeight, boxDepth, bolReadyForNewShape,
    width, height, numBoxesWide, onBlockCollision, fieldArray) {

    this.fieldArray = fieldArray;
    this.scene = scene;
    this.boxHeight = boxHeight;

    //determine the color
    var colorIndex = getRandBetween(0, this.boxColors.length - 1);
    this.shapeColor = this.colors[colorIndex];
    // Box
    var shapeMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: this.boxColors[colorIndex]
        }),
        0,
        .0
        );
    this.physiShape = new Physijs.BoxMesh(
        new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth),
        shapeMaterial,
        5
        );
    this.physiShape.collisions = 0;

    var that = this;
    var onReady = function () {
        //console.log("shape ready");
        that.readyHandler();
    };
    var onCollision = function (collided_with, linearVelocity, angularVelocity) {
        that.collisionHandler(collided_with, linearVelocity, angularVelocity);
    };

    this.physiShape.addEventListener('ready', onReady);
    this.physiShape.addEventListener('collision', onCollision);

    this.columnNumber = Math.floor(Math.random() * numBoxesWide);
    this.physiShape.position.x = boxWidth * (this.columnNumber - numBoxesWide / 2);
    this.physiShape.position.y = (height / -2) - 2 * boxHeight;

    scene.add(this.physiShape);

    this.physiShape.__dirtyPosition = true;

    this.shapeID = this.currentID;
    ShapeProto.currentID++;
}

var ShapeProto = {
    fieldArray: undefined,
    physiShape: undefined,
    boxColors: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
    colors: ["r", "y", "b", "g"],
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
    prevColLoc: new THREE.Vector3(),
    curColLoc: new THREE.Vector3(),
    //matchStack : {},
    
    update: function (colBottomShape) {
        var vel = this.physiShape.getLinearVelocity();
        if ((vel.y > 0) && (colBottomShape)) {
            var distance = getDistance(this.physiShape.position,
                colBottomShape.physiShape.position);
            //console.log("Distance : " + distance);
            if (distance <= 0) {
                //                console.log("collision : " + this.shapeColor + ":" + 
                //                    this.shapeID + " - " + colBottomShape.shapeColor + ":" + 
                //                    colBottomShape.shapeID);
                return false;
            }
            return false;
        }

    },

    kill: function () {
        bolIsDead: true;
        this.scene.remove(this);
    },

    collisionHandler: function (shape, collided_with, linearVelocity, angularVelocity) {
        this.prevColLoc = this.curColLoc;
        this.curColLoc = this.physiShape.position;
        if (this.curColLoc.y !== this.prevColLoc.y) {
            console.log("collision: " + this.shapeID);
            
            //place the shape in the field array
            this.fieldArray[this.columnNumber].push(this);
            this.index = this.fieldArray[this.columnNumber].length - 1;

            var matchStack = { color: this.shapeColor };   //clear the match stack prior to checking for matches
            matchStack = this.checkForMatches(matchStack, this);
            
            //print out the nuber of matches
            
            console.log((Object.keys(matchStack).length-1) + " matches found");
            
            //remove the matching blocks from the scene
            this.scene.remove()
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
        
        //check if match stack contains this shape already
        if (!matchStack[shape.shapeID]) {
            if (this.shapeColor === matchStack.color) {
                matchStack[shape.shapeID] = this;
        
                //get the shape to the left
                var leftNeighbor = this.fieldArray[shape.columnNumber - 1][shape.index];
                //get the shape to the right
                var rightNeighbor = this.fieldArray[shape.columnNumber + 1][shape.index];
                //get the shape above   
                var aboveNeighbor = this.fieldArray[shape.columnNumber][shape.index - 1];
                //get the shape below   
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
        return matchStack;
    }
};

Shape.prototype = ShapeProto;