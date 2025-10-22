"use strict";
//it will be handy to have references to some of our WebGL related objects
let gl;
let canvas;
let program;
let bufferId;
let umv; //index of model_view in shader
let uproj; //index of proj
let umode;
//where the car will move
let xoffset;
let yoffset;
let zoffset;
//angle of the car
let theta;
let vPosition; //where shader attribute is
let vColor; //where color shader attribute is
let vNormal;
let vAmbientDiffuseColor; //Ambient and Diffuse can be the same for the material
let vSpecularColor; //highlight color
let vSpecularExponent;
//uniform indices for light properties
let light_position;
let light_color;
let ambient_light;
//info on whether we are moving forward or back
let forward = true;
//let backward:boolean = false;
let go = false;
let wheelRotate = 0;
//info on left or right
let right = false;
let left = false;
//coordinate info
let x;
let y;
let z;
let camera = 1;
let zoom = 45;
let dolly = 20;
let carCam = false;
let headspin = 0;
let stationary = false;
let headlight_position;
let headlight_direction;
let headlight_color;
let headlight_cutoff;
let headlight_exponent;
import { initShaders, vec4, flatten, perspective, translate, lookAt, rotateX, rotateY, scalem, rotateZ, toradians } from './helperfunctions.js';
//We want some set up to happen immediately when the page loads
window.onload = function init() {
    //fetch reference to the canvas element we defined in the html file
    canvas = document.getElementById("gl-canvas");
    //grab the WebGL 2 context for that canvas.  This is what we'll use to do our drawing
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert("WebGL isn't available");
    }
    //Take the vertex and fragment shaders we provided and compile them into a shader program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program); //and we want to use that program for our rendering
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    umode = gl.getUniformLocation(program, "mode");
    vPosition = gl.getAttribLocation(program, "vPosition");
    vColor = gl.getAttribLocation(program, "vColor");
    vNormal = gl.getAttribLocation(program, "vNormal");
    vAmbientDiffuseColor = gl.getAttribLocation(program, "vAmbientDiffuseColor");
    vSpecularColor = gl.getAttribLocation(program, "vSpecularColor");
    vSpecularExponent = gl.getAttribLocation(program, "vSpecularExponent");
    light_position = gl.getUniformLocation(program, "light_position");
    light_color = gl.getUniformLocation(program, "light_color");
    ambient_light = gl.getUniformLocation(program, "ambient_light");
    headlight_position = gl.getUniformLocation(program, "headlight_position");
    headlight_direction = gl.getUniformLocation(program, "headlight_direction");
    headlight_color = gl.getUniformLocation(program, "headlight_color");
    headlight_cutoff = gl.getUniformLocation(program, "headlight_cutoff");
    headlight_exponent = gl.getUniformLocation(program, "headlight_exponent");
    //sets offsets to 0
    xoffset = yoffset = zoffset = 0;
    theta = 90; //set theta to 30 so you can see more of the car on load
    window.addEventListener("keydown", function (event) {
        let min = 5;
        let dollyMax = 40;
        let zoomMax = 120;
        switch (event.key) {
            //go vs stop
            case " ":
                go = false;
                break;
            case "ArrowDown":
                go = true;
                forward = false;
                break;
            case "ArrowUp":
                go = true;
                forward = true;
                break;
            //turning
            case "ArrowLeft":
                left = true;
                break;
            case "ArrowRight":
                right = true;
                break;
            //doesn't let zoom outside of 5 and 120
            case "q":
                if (zoom > min) {
                    zoom--;
                }
                break;
            case "w":
                if (zoom < zoomMax) {
                    zoom++;
                }
                break;
            //doesn't let dolly outside of 5 and 40
            case "a":
                if (dolly < dollyMax) {
                    dolly++;
                }
                break;
            case "s":
                if (dolly > min) {
                    dolly--;
                }
                break;
            //changes carcam
            case "f":
                carCam = !carCam;
                break;
            //resets camera
            case "r":
                dolly = 20;
                zoom = 45;
                break;
            //free roam
            case "1":
                camera = 1;
                break;
            //POV
            case "2":
                camera = 2;
                break;
            //chase cam
            case "3":
                camera = 3;
                break;
            case "0":
                stationary = !stationary;
                break;
            //head turning
            case "z":
                headspin += 1;
                break;
            case "x":
                headspin -= 1;
                break;
        }
    });
    // separate keyup listener
    window.addEventListener("keyup", function (event) {
        switch (event.key) {
            //listens for when to stop moving left or right
            case "ArrowLeft":
                left = false;
                break;
            case "ArrowRight":
                right = false;
                break;
        }
        requestAnimationFrame(render);
    });
    gl.uniform1i(umode, 2);
    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubeAndBuffer();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    //What color do you want the background to be?  This sets it to black and opaque.
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    //we need to do this to avoid having objects that are behind other objects show up anyway
    gl.enable(gl.DEPTH_TEST);
    window.setInterval(update, 16); //target 60 frames per second
};
//function to create cube
function makeCube(x, y, z) {
    let cubepoints = [];
    let normalFront = new vec4(0.0, 0.0, 1.0, 0.0);
    //front
    cubepoints.push(new vec4(x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(normalFront);
    cubepoints.push(new vec4(x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0));
    cubepoints.push(normalFront);
    cubepoints.push(new vec4(-x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0));
    cubepoints.push(normalFront);
    cubepoints.push(new vec4(-x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0));
    cubepoints.push(normalFront);
    cubepoints.push(new vec4(-x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0));
    cubepoints.push(normalFront);
    cubepoints.push(new vec4(x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0));
    cubepoints.push(normalFront);
    let normalBack = new vec4(0.0, 0.0, -1.0, 0.0);
    //back face
    cubepoints.push(new vec4(-x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(normalBack);
    cubepoints.push(new vec4(-x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalBack);
    cubepoints.push(new vec4(x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalBack);
    cubepoints.push(new vec4(x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalBack);
    cubepoints.push(new vec4(x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalBack);
    cubepoints.push(new vec4(-x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalBack);
    let normalLeft = new vec4(1.0, 0.0, 0.0, 0.0);
    //left face
    cubepoints.push(new vec4(x, y, z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(normalLeft);
    cubepoints.push(new vec4(x, -y, z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalLeft);
    cubepoints.push(new vec4(x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalLeft);
    cubepoints.push(new vec4(x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalLeft);
    cubepoints.push(new vec4(x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalLeft);
    cubepoints.push(new vec4(x, y, z, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalLeft);
    let normalRight = new vec4(-1.0, 0.0, 0.0, 0.0);
    //right face
    cubepoints.push(new vec4(-x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(normalRight);
    cubepoints.push(new vec4(-x, -y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0));
    cubepoints.push(normalRight);
    cubepoints.push(new vec4(-x, -y, z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0));
    cubepoints.push(normalRight);
    cubepoints.push(new vec4(-x, -y, z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0));
    cubepoints.push(normalRight);
    cubepoints.push(new vec4(-x, y, z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0));
    cubepoints.push(normalRight);
    cubepoints.push(new vec4(-x, y, -z, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0));
    cubepoints.push(normalRight);
    let normalTop = new vec4(0.0, 1.0, 0.0, 0.0);
    //top
    cubepoints.push(new vec4(x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(normalTop);
    cubepoints.push(new vec4(x, y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalTop);
    cubepoints.push(new vec4(-x, y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalTop);
    cubepoints.push(new vec4(-x, y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalTop);
    cubepoints.push(new vec4(-x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalTop);
    cubepoints.push(new vec4(x, y, z, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0));
    cubepoints.push(normalTop);
    let normalBottom = new vec4(0.0, -1.0, 0.0, 0.0);
    //bottom
    cubepoints.push(new vec4(x, -y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(normalBottom);
    cubepoints.push(new vec4(x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalBottom);
    cubepoints.push(new vec4(-x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalBottom);
    cubepoints.push(new vec4(-x, -y, z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalBottom);
    cubepoints.push(new vec4(-x, -y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalBottom);
    cubepoints.push(new vec4(x, -y, -z, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0));
    cubepoints.push(normalBottom);
    return cubepoints;
}
//Make a cube and send it over to the graphics card
function makeCubeAndBuffer() {
    //Creates the ground
    let cubepoints = []; //empty array
    x = 30;
    y = 30;
    z = .6;
    cubepoints.push(new vec4(-x, -y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    cubepoints.push(new vec4(x, -y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    cubepoints.push(new vec4(-x, y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    cubepoints.push(new vec4(-x, y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    cubepoints.push(new vec4(x, -y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    cubepoints.push(new vec4(x, y, z, 1));
    cubepoints.push(new vec4(0, 1, 0, 1));
    cubepoints.push(new vec4(0.0, 0.0, -1.0, 0.0));
    //creates the car
    x = .5;
    y = .25;
    z = 1;
    cubepoints.push(...makeCube(x, y, z));
    let wheelCenter = [0, 0, 0, 1.0]; // x, y, z, w
    cubepoints.push(new vec4(...wheelCenter)); // center position
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0)); // white center color
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 0.0)); // normal (X-axis)
    let wheelpoints = 8; // smoother wheel
    let wheelThickness = 0.2; // how wide the tire is (x-axis)
    let wheelRadius = 0.35; // tire radius
    // Create a 3D tire (cylinder-like)
    for (let slice = 0; slice <= 1; slice += 0.1) { // thickness steps
        let x = wheelCenter[0] + (slice - 0.5) * wheelThickness;
        for (let i = 0; i < wheelpoints; i++) {
            const angle = (i / wheelpoints) * 2 * Math.PI;
            const y = wheelCenter[1] + wheelRadius * Math.sin(angle);
            const z = wheelCenter[2] + wheelRadius * Math.cos(angle);
            cubepoints.push(new vec4(x, y, z, 1.0)); // rim vertex
            // Give slight shading variation (makes rotation visible)
            /*cubepoints.push(new vec4(
                0.1 + 0.9 * Math.abs(Math.sin(angle)),
                0.1 + 0.9 * Math.abs(Math.cos(angle)),
                0.1 + 0.9 * (slice),
                1.0
            ));*/
            cubepoints.push(new vec4(1, 0, 0, 1));
            let ny = y - wheelCenter[1];
            let nz = z - wheelCenter[2];
            let len = Math.sqrt(ny * ny + nz * nz);
            cubepoints.push(new vec4(0, ny / len, nz / len, 0)); // normal
        }
    }
    //we need some graphics memory for this information
    bufferId = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubepoints), gl.STATIC_DRAW);
    // position            color
    //  x   y   z     w       r    g     b    a
    // 0-3 4-7 8-11 12-15  16-19 20-23 24-27 28-31
    //What is this data going to be used for?
    //The vertex shader has an attribute named "vPosition".  Let's associate part of this data to that attribute
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(vPosition);
    //The vertex shader also has an attribute named "vColor".  Let's associate the other part of this data to that attribute
    //vColor = gl.getAttribLocation(program, "vColor");
    //gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 48, 16);
    //gl.enableVertexAttribArray(vColor);
    //vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 48, 32);
    gl.enableVertexAttribArray(vNormal);
}
//increase rotation angle and request new frame
function update() {
    //dir keeps track of theta absolute value for mod operations
    let dir = Math.abs(theta);
    let bound = 27;
    let maxSpeed = 0.05;
    let wheelSpin = 5;
    if (go) {
        //Used to see if border hit to stop car
        let movedX = false;
        let movedZ = false;
        if (forward) {
            //Sets boundaries so car doesn't go offscreen in x-axis
            if (theta > 0) {
                if (xoffset < bound || dir % 360 > 180) {
                    if (xoffset > -bound || dir % 360 < 180) {
                        xoffset += maxSpeed * (Math.sin(theta * Math.PI / 180));
                        movedX = true;
                    }
                }
            }
            else {
                if (xoffset < bound || dir % 360 < 180) {
                    if (xoffset > -bound || dir % 360 > 180) {
                        xoffset += maxSpeed * (Math.sin(theta * Math.PI / 180));
                        movedX = true;
                    }
                }
            }
            //Sets boundaries so car doesn't go offscreen in z-axis
            if (zoffset >= -bound || (dir % 360 > 270 || dir % 360 < 90)) {
                if (zoffset <= bound || (dir % 360 > 90 && dir % 360 < 270)) {
                    zoffset += maxSpeed * Math.cos(theta * Math.PI / 180);
                    movedZ = true;
                }
            }
            //rotates wheel forward
            wheelRotate += wheelSpin;
            if (wheelRotate >= 360) {
                wheelRotate -= 360;
            }
        }
        if (!forward) {
            //Sets boundaries so car doesn't go offscreen in x-axis
            if (theta > 0) {
                if (xoffset < bound || dir % 360 < 180) {
                    if (xoffset > -bound || dir % 360 > 180) {
                        xoffset -= maxSpeed * (Math.sin(theta * Math.PI / 180));
                        movedX = true;
                    }
                }
            }
            else {
                if (xoffset < bound || dir % 360 > 180) {
                    if (xoffset > -bound || dir % 360 < 180) {
                        xoffset -= maxSpeed * (Math.sin(theta * Math.PI / 180));
                        movedX = true;
                    }
                }
            }
            //Sets boundaries so car doesn't go offscreen in z-axis
            if (zoffset >= -bound || (dir % 360 < 270 && dir % 360 > 90)) {
                if (zoffset <= bound || (dir % 360 < 90 || dir % 360 > 270)) {
                    zoffset -= maxSpeed * Math.cos(theta * Math.PI / 180);
                    movedZ = true;
                }
            }
            //rotates wheel back
            wheelRotate -= wheelSpin;
            if (wheelRotate <= 360) {
                wheelRotate += 360;
            }
        }
        //adjusts direction
        if ((left && forward) || (right && !forward)) {
            theta += 1;
        }
        if ((right && forward) || (left && !forward)) {
            theta -= 1;
        }
        if (!movedX || !movedZ) {
            go = false;
        }
    }
    requestAnimationFrame(render);
}
function render() {
    // Clear screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Projection
    let p = perspective(zoom, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());
    // -------------------------------
    // 1. View (Camera)
    // -------------------------------
    //Holds where camera info starts
    let baseLook;
    if (camera == 1 && carCam == true) {
        // Chase cam locked onto car
        baseLook = lookAt(new vec4(0, 10, dolly, 1), new vec4(xoffset, yoffset, zoffset, 1), new vec4(0, 1, 0, 0));
    }
    else if (camera == 1 && carCam == false) {
        // Global chase cam looking at world origin
        baseLook = lookAt(new vec4(0, 10, dolly, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
    }
    else if (camera == 2) {
        // Eyeball cam
        zoom = 45;
        //finds location of eye
        let eye = new vec4(xoffset, yoffset + y + y + 0.2, zoffset, 1);
        let forward = new vec4(Math.sin(toradians(theta + headspin)), 0, Math.cos(toradians(theta + headspin)), 0);
        //Looks at a point ahead of the eye
        let center = new vec4(eye[0] + forward[0], eye[1] + forward[1], eye[2] + forward[2], eye[3] + forward[3]);
        baseLook = lookAt(eye, center, new vec4(0, 1, 0, 0));
    }
    else if (camera == 3) {
        //Car chase cam
        zoom = 45;
        let thetaRad = toradians(theta);
        // Calculate camera offset behind the car
        let cameraDistance = 5; // Distance behind car
        let cameraHeight = 1.2; // Height above car
        let eye = new vec4(xoffset - Math.sin(thetaRad) * cameraDistance, yoffset + y + y + cameraHeight, zoffset - Math.cos(thetaRad) * cameraDistance, 1);
        baseLook = lookAt(eye, new vec4(xoffset, yoffset, zoffset, 1), new vec4(0, 1, 0, 0));
    }
    if (stationary) {
        let temp = new vec4(0.0, 20.0, 0.0, 1.0);
        gl.uniform4fv(light_position, baseLook.mult(temp)); // overhead light
        gl.uniform4fv(light_color, [1.0, 1.0, 1.0, 1.0]); // white light
    }
    else {
        gl.uniform4fv(light_position, [0.0, 0.0, 0.0, 1.0]);
        gl.uniform4fv(light_color, [0.0, 0.0, 0.0, 1.0]);
    }
    // Setup headlight in world space
    let thetaRad = toradians(theta);
    let forwardX = Math.sin(thetaRad);
    let forwardZ = Math.cos(thetaRad);
    let rightX = Math.cos(thetaRad);
    let rightZ = -Math.sin(thetaRad);
    // Headlight position in world space (front of car)
    let headlightWorldPos = new vec4(xoffset + forwardX * .2 - rightX * .25, yoffset + 0.3, zoffset + forwardZ * .2 - rightZ * .25, 1 // w = 1 for position
    );
    // Headlight direction in world space
    let headlightWorldDir = new vec4(-forwardX, .2, -forwardZ, 0 // w = 0 for direction vector
    );
    // Transform to eye space using the view matrix
    let headlightEyePos = baseLook.mult(headlightWorldPos);
    let headlightEyeDir = baseLook.mult(headlightWorldDir);
    // Send eye-space values to shader
    gl.uniform4fv(headlight_position, headlightEyePos);
    gl.uniform4fv(headlight_direction, headlightEyeDir);
    gl.uniform4fv(headlight_color, [0.2, 0.2, 0.15, 1]); // Warmer, dimmer headlight
    gl.uniform1f(headlight_cutoff, Math.cos(toradians(20)));
    gl.uniform1f(headlight_exponent, 25);
    gl.uniform4fv(light_color, [.7, .7, .7, 1]);
    gl.uniform4fv(ambient_light, [.05, .05, .05, 1]);
    // -------------------------------
    // 2. Ground
    // -------------------------------
    let testNormal = new vec4(0, -1, 0, 0); // Your ground normal
    let rotatedNormal = rotateX(90).mult(testNormal);
    console.log("Ground normal after rotation:", rotatedNormal);
    let groundMV = baseLook;
    groundMV = groundMV.mult(rotateX(90));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [0.0, 1.0, 0.0, 1.0]);
    gl.vertexAttrib4fv(vSpecularColor, [0.8, 0.8, 0.8, 1.0]);
    gl.vertexAttrib1f(vSpecularExponent, 32.0);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // ----------------------------------------------------------
    // 2.5. Circles on ground (To make POV view more interesting)
    // ----------------------------------------------------------
    groundMV = baseLook;
    groundMV = groundMV.mult(translate(5, 0, 5)).mult(rotateY(90)).mult(scalem(5, 5, 5));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    groundMV = baseLook;
    groundMV = groundMV.mult(translate(-10, 0, 18)).mult(rotateY(90)).mult(scalem(5, 5, 5));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    groundMV = baseLook;
    groundMV = groundMV.mult(translate(-18, 0, -10)).mult(rotateY(90)).mult(scalem(5, 5, 5));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    groundMV = baseLook;
    groundMV = groundMV.mult(translate(7, 0, -20)).mult(rotateY(90)).mult(scalem(5, 5, 5));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    groundMV = baseLook;
    groundMV = groundMV.mult(translate(15, 0, 18)).mult(rotateY(90)).mult(scalem(5, 5, 5));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, groundMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    // -------------------------------
    // 3. Car body
    // -------------------------------
    let carMV = baseLook
        .mult(translate(xoffset, yoffset, zoffset))
        .mult(rotateY(theta));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [0.0, 1.0, 1.0, 1.0]); // cyan
    //gl.vertexAttrib4fv(vSpecularColor, [1.0, 1.0, 1.0, 1.0]);       // white specular
    //gl.vertexAttrib1f(vSpecularExponent, 15.0);
    gl.uniformMatrix4fv(umv, false, carMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLES, 6, 36);
    // -------------------------------
    // 4. Second cube (Head)
    // -------------------------------
    let secondMV = carMV.mult(translate(0, y + y, z - (z / 2)));
    secondMV = secondMV.mult(scalem(.5, 1, .25));
    //Spins head
    secondMV = secondMV.mult(rotateY(headspin));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [0.0, 1.0, 1.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, secondMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLES, 6, 36);
    secondMV = secondMV.mult(scalem(2, 1, 4));
    // -------------------------------
    // 5. Eyeball
    // -------------------------------
    let eyeballMV = secondMV
        .mult(translate(0, 0.1, (z / 3)))
        .mult(scalem(0.5, 0.5, 0.5))
        .mult(rotateY(90));
    gl.uniformMatrix4fv(umv, false, eyeballMV.flatten());
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    // -------------------------------
    // 6. Wheels
    // -------------------------------
    // Front left wheel
    let wheelMV = carMV;
    if (go && left)
        wheelMV = wheelMV.mult(rotateZ(-10));
    if (go && right)
        wheelMV = wheelMV.mult(rotateZ(10));
    wheelMV = wheelMV.mult(translate(-x, -y, z)).mult(rotateX(wheelRotate));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, wheelMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    // Front right wheel
    wheelMV = carMV;
    if (go && left)
        wheelMV = wheelMV.mult(rotateZ(-10));
    if (go && right)
        wheelMV = wheelMV.mult(rotateZ(10));
    wheelMV = wheelMV.mult(translate(x, -y, z)).mult(rotateX(wheelRotate))
        .mult(rotateY(180));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, wheelMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    // Back left wheel
    wheelMV = carMV
        .mult(translate(-x, -y, -z))
        .mult(rotateX(wheelRotate));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, wheelMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
    // Back right wheel
    wheelMV = carMV
        .mult(translate(x, -y, -z))
        .mult(rotateX(wheelRotate))
        .mult(rotateY(180));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(umv, false, wheelMV.flatten());
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLE_FAN, 43, 89);
}
