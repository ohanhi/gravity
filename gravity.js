function Gravity() {

  var SKETCH_OPTIONS = {
    centerMass: 100000,
    partCount: 1000,
    partMassFactor: 0.2,
    gravitationalConstant: 1.0
  };

  var restartWithInputValues = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    function floatVal(id) {
      return parseFloat(document.getElementById(id).value, 10);
    }
    SKETCH_OPTIONS.centerMass = floatVal('centerMass');
    SKETCH_OPTIONS.partCount = parseInt(floatVal('partCount'));
    SKETCH_OPTIONS.partMassFactor = floatVal('partMassFactor');
    SKETCH_OPTIONS.gravitationalConstant = floatVal('gravitationalConstant');

    document.getElementById('dialog').className = "closed";
    restart();
  };

  document.getElementById('start').onclick = restartWithInputValues;
  document.getElementById('params').onsubmit = restartWithInputValues;

  document.getElementById('dialogOpen').onclick = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var dialog = document.getElementById('dialog');
    if (dialog.className === "open") {
      dialog.className = "closed";
    } else {
      dialog.className = "open";
    }
  };

  function sketchProc(P) {

    // BEGIN DEFINITIONS
    const CANVAS = {
      width: window.innerWidth,
      height: window.innerHeight
    },
    TIME_STEP = 0.15,
    COLLISION_RADIUS = 10.0;

    /**
    Newton's universal gravitation function.

    @link http://en.wikipedia.org/wiki/Newton's_law_of_universal_gravitation

    @param m1 mass of part 1
    @param m2 mass of part 2
    @param r distance between center of masses
    */
    const gravitation = function(m1, m2, r) {
      return SKETCH_OPTIONS.gravitationalConstant * (m1*m2 / (r*r));
    };
    /**
    Utility function that returns -1 or 1 at 50% probability.
    */
    const randomPlusMinus = function() {
      return (Math.random() < 0.5) ? -1 : 1;
    };
    /**
    Converts mass to displayed size.
    */
    const massToSize = function(m) {
      return Math.log(m)*2;
    };
    /**
    Converts mass to displayed color.
    */
    const massToColor = function(m, biggestMass) {
      if (biggestMass > 0) {
        return P.color(m/biggestMass*50+10,100,100, 80);
      }
      return P.color(0,0,0,0);
    };

    function Part(x, y, vx, vy, m) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.m = m;
    }
    Part.prototype.move = function() {
      this.x += this.vx * TIME_STEP;
      this.y += this.vy * TIME_STEP;
    };
    Part.prototype.draw = function(biggestMass) {
      var size = massToSize(this.m),
      color = massToColor(this.m, biggestMass);
      P.fill(color);
      P.ellipse(this.x, this.y, size, size);
    };
    Part.prototype.collide = function(part) {
      // totally inelastic collision
      this.vx = (this.m*this.vx + part.m*part.vx) / (this.m + part.m);
      this.vy = (this.m*this.vy + part.m*part.vy) / (this.m + part.m);
      this.m += part.m;
    };
    /*
    Determines the force from each part of the system and
    updates the velocities accordingly.
    */
    Part.prototype.updateVelocity = function(parts) {
      var self = this, ax = 0, ay = 0;
      parts.forEach(function(part, index){
        // distance of particles
        var dx = self.x-part.x,
        dy = self.y-part.y,
        r = Math.sqrt(
          dx*dx+
          dy*dy
        );

        // collision detection
        if (r && r < COLLISION_RADIUS) {
          self.collide(part);
          parts.splice(index, 1);
          return;
        }

        // gravitational force
        var f = gravitation(self.m, part.m, r);

        ax = (r===0)? 0 : (f * (dx/r)) / self.m;
        ay = (r===0)? 0 : (f * (dy/r)) / self.m;
        self.vx += ax * TIME_STEP * -1;
        self.vy += ay * TIME_STEP * -1;
      });
    };

    function PartSystem() {
      this.parts = [];
      this.biggestMass = 0.0;
    }
    PartSystem.prototype.destroy = function() {
      this.parts = undefined;
    };
    PartSystem.prototype.add = function(part) {
      this.parts.push(part);
    };
    PartSystem.prototype.addCentralPart = function() {
      var part = new Part(
        CANVAS.width/2, CANVAS.height/2,
        0, 0,
        SKETCH_OPTIONS.centerMass
      );
      this.parts.push(part);
    };
    PartSystem.prototype.update = function(draw) {
      var self = this;
      self.parts.forEach(function(part, index){
        // Update the position and speed of the part
        part.updateVelocity(self.parts);
        part.move();

        // Draw the part, if requested
        if (draw && draw === true) {
          part.draw(self.biggestMass);
        }

        // Update biggestMass, used for visualizing parts
        if (part.m > self.biggestMass) {
          self.biggestMass = part.m;
        }
      });

      if (draw && draw === true) {
        P.fill(0);
        P.rect(0, CANVAS.height - 60, 0, CANVAS.height - 40);
        P.fill(90);
        P.text(self.parts.length, 20, CANVAS.height - 40);
      }
    };
    PartSystem.prototype.redraw = function() {
      this.update(true);
    };
    PartSystem.prototype.randomizeParts = function(n, startVelocity) {
      for(var i = 0; i < n; i++) {
        var vx = startVelocity ? Math.random()*10*randomPlusMinus() : 0,
          vy = startVelocity ? Math.random()*10*randomPlusMinus() : 0;
        var part = new Part(
          Math.random()*CANVAS.width, Math.random()*CANVAS.height,
          vx, vy,
          (Math.random()*10 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    PartSystem.prototype.createProtoDisk = function(n) {
      this.addCentralPart(n);

      // all other parts get an initial velocity about "around the centre"
      for(var i = 0; i < n; i++) {
        var x = Math.random()*CANVAS.width,
          y = Math.random()*CANVAS.height,
          cx = CANVAS.width*0.5,
          cy = CANVAS.height*0.5,
          dx = x - cx,
          dy = y - cy,
          vx = Math.random()*20,
          vy = Math.random()*20;
        if (dy > 0) {
          vx = -vx;
        }
        if (dx < 0) {
          vy = -vy;
        }
        var part = new Part(
          x, y,
          vx, vy,
          (Math.random()*10 + 3) * SKETCH_OPTIONS.partMassFactor
        );
        this.add(part);
      }
    };
    // END DEFINITIONS


    var ps = new PartSystem();
    ps.createProtoDisk(SKETCH_OPTIONS.partCount);

    P.setup = function() {
      P.size(CANVAS.width, CANVAS.height);
      P.ellipseMode(P.CENTER);
      P.colorMode(P.HSB);
      P.noStroke();
      P.textSize(24);
    };

    // Override draw function, by default it will be called 60 times per second
    P.draw = function() {
      P.colorMode(P.RGB);
      P.fill(0,0,0, 40);
      P.rect(0,0, CANVAS.width,CANVAS.height);
      P.colorMode(P.HSB, 100);
      ps.redraw();
    };

  }

  var canvas = document.getElementById("processing-canvas");
  // attaching the sketchProc function to the canvas,
  // exit immediately to wait for user input
  var processing = new Processing(canvas, sketchProc);
  processing.exit();

  var restart = function() {
    processing.exit();
    processing = new Processing(canvas, sketchProc);
  };

}
