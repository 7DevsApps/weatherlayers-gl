#version 300 es
#define SHADER_NAME particle-line-layer-update-vertex-shader

#ifdef GL_ES
precision highp float;
#endif

// Included utility functions (assuming they are correct)
@include "../../_utils/pixel.glsl"
@include "../../_utils/pixel-value.glsl"

// Input attributes from source buffer
in vec3 sourcePosition; // (longitude, latitude, 0)
in vec4 sourceColor;    // Color, also used as state (DROP_COLOR)

// Output attributes to target buffer (via Transform Feedback)
out vec3 targetPosition;
out vec4 targetColor;

// --- Constants ---
const vec2 DROP_POSITION = vec2(0.0); // A position likely outside any valid bounds
const vec4 DROP_COLOR = vec4(0.0, 0.0, 0.0, 0.0); // Represents a particle to be reset/respawned
const vec4 RESPAWNED_COLOR = vec4(0.0, 0.0, 0.0, 0.001); // Almost transparent black, distinct from DROP_COLOR

const float EARTH_RADIUS = 6370972.0; // meters

// Randomness constants
const vec2 RAND_SEED_DOT = vec2(12.9898, 78.233);
const float RAND_SEED_MUL = 43758.5453;
const float RAND_OFFSET_1 = 1.3;
const float RAND_OFFSET_2 = 2.1;
const float RAND_GLOBE_CENTER_OFFSET = 0.0001;

// --- Uniforms ---
// (Assuming these are provided correctly from CPU)
// particle uniforms (...)
// raster uniforms (...)
// bitmap2 uniforms (bounds) - Data texture bounds
// palette uniforms (...)
// Textures (...)
// currentViewportBounds uniform (minLng, minLat, maxLng, maxLat)
uniform vec4 currentViewportBounds;


// --- Utility Functions --- (Assuming these are mostly correct and needed)
// [ Functions: randFloat, randPoint, destinationPoint, randPointToPosition,
//   wrapLongitude, wrapLongitudeRelative, movePositionBySpeed, isPositionInBoundsAdvanced ]
// ... (Keep the utility functions from the previous version) ...
float randFloat(vec2 seed) {
  return fract(sin(dot(seed.xy, RAND_SEED_DOT)) * RAND_SEED_MUL);
}

vec2 randPoint(vec2 seed) {
  return vec2(randFloat(seed + RAND_OFFSET_1), randFloat(seed + RAND_OFFSET_2));
}

vec2 destinationPoint(vec2 fromDegrees, float distMeters, float bearingDegrees) {
  float distRatio = distMeters / EARTH_RADIUS;
  float bearingRad = radians(bearingDegrees);
  float lat1Rad = radians(fromDegrees.y);
  float lon1Rad = radians(fromDegrees.x);
  float sinLat2 = sin(lat1Rad) * cos(distRatio) + cos(lat1Rad) * sin(distRatio) * cos(bearingRad);
  float lat2Rad = asin(sinLat2);
  float y = sin(bearingRad) * sin(distRatio) * cos(lat1Rad);
  float x = cos(distRatio) - sin(lat1Rad) * sinLat2;
  float lon2Rad = lon1Rad + atan(y, x);
  return vec2(degrees(lon2Rad), degrees(lat2Rad));
}

vec2 randPointToPosition(vec2 randomPoint01, vec4 viewportBnds, vec2 globeCenter, float globeRadius, float isGlobe) {
  vec2 position;
  if (isGlobe == 1.0) {
    randomPoint01.x += RAND_GLOBE_CENTER_OFFSET;
    float dist = sqrt(randomPoint01.x) * globeRadius;
    float bearing = randomPoint01.y * 360.0;
    position = destinationPoint(globeCenter, dist, bearing);
  } else {
    vec2 viewportBoundsMin = viewportBnds.xy;
    vec2 viewportBoundsMax = viewportBnds.zw;
    position = mix(viewportBoundsMin, viewportBoundsMax, randomPoint01);
  }
  return position;
}

float wrapLongitude(float lng) {
  return mod(lng + 180.0, 360.0) - 180.0;
}

float wrapLongitudeRelative(float lng, float minLng) {
  float wrappedLng = wrapLongitude(lng);
   if (wrappedLng < minLng - 180.0) {
      wrappedLng += 360.0;
  } else if (wrappedLng > minLng + 180.0) {
      wrappedLng -= 360.0;
  }
  return wrappedLng;
}

vec2 movePositionBySpeed(vec2 positionDegrees, vec2 speedDegreesPerStep, float isGlobe) {
  float distortion = cos(radians(positionDegrees.y));
  distortion = max(distortion, 0.01);
  vec2 offsetDegrees;
  if (isGlobe == 1.0) {
     offsetDegrees = vec2(speedDegreesPerStep.x / distortion, speedDegreesPerStep.y);
  } else {
     offsetDegrees = vec2(speedDegreesPerStep.x, speedDegreesPerStep.y * distortion);
  }
  return positionDegrees + offsetDegrees;
}

// Check bounds, potentially handling antimeridian crossing
bool isPositionInBoundsAdvanced(vec2 position, vec4 bounds) {
    float minLng = bounds.x;
    float minLat = bounds.y;
    float maxLng = bounds.z;
    float maxLat = bounds.w;
    if (position.y < minLat || position.y > maxLat) return false;
    float lng = wrapLongitudeRelative(position.x, minLng);
    if (minLng <= maxLng) {
        return lng >= minLng && lng <= maxLng;
    } else {
        return lng >= minLng || lng <= maxLng;
    }
}


// --- Main Update Logic ---
void main() {
  float particleIndex = mod(float(gl_VertexID), particle.numParticles);
  float particleAge = floor(float(gl_VertexID) / particle.numParticles);

  // --- Process particles based on age ---
  // Only calculate new state for age 0 particles.
  // Older particles (age > 0) will have their state copied via buffer.copyData.
  if (particleAge == 0.0) {
      // --- This is a particle whose state needs updating this frame ---

      // --- Handle Particle Respawn ---
      if (sourceColor == DROP_COLOR) {
          vec2 particleSeed = vec2(particleIndex * particle.seed / particle.numParticles, particle.time);
          vec2 randomPoint01 = randPoint(particleSeed);
          vec2 newPosition = randPointToPosition(
              randomPoint01,
              particle.viewportBounds,
              particle.viewportGlobeCenter,
              particle.viewportGlobeRadius,
              particle.viewportGlobe
          );

          targetPosition.xy = newPosition;
          targetPosition.x = wrapLongitude(targetPosition.x); // Ensure initial spawn is wrapped
          targetPosition.z = 0.0;
          targetColor = RESPAWNED_COLOR; // Mark as just respawned
      }
      // --- Handle Forced Drops (Zooming Out, Age Limit) ---
      else if (particle.viewportZoomChangeFactor > 1.0 && mod(particleIndex, floor(particle.viewportZoomChangeFactor)) >= 1.0) {
          targetPosition.xy = DROP_POSITION;
          targetColor = DROP_COLOR;
      }
      else if (abs(mod(particleIndex, particle.maxAge + 2.0) - mod(particle.time, particle.maxAge + 2.0)) < 1.0) {
          targetPosition.xy = DROP_POSITION;
          targetColor = DROP_COLOR;
      }
      // --- Process Active Particle ---
      else {
          vec2 currentPosition = sourcePosition.xy;
          vec2 speed = vec2(0.0);
          vec4 nextColor = DROP_COLOR; // Start assuming it will be dropped

          // Check Data Bounds & Sample Data
          if (isPositionInBoundsAdvanced(currentPosition, bitmap2.bounds)) {
              vec2 uv = getUV(currentPosition);
              vec4 pixel = getPixelSmoothInterpolate(imageTexture, imageTexture2, raster.imageResolution, raster.imageSmoothing, raster.imageInterpolation, raster.imageWeight, uv);

              if (hasPixelValue(pixel, raster.imageUnscale)) {
                  float valueMagnitude = getPixelMagnitudeValue(pixel, raster.imageType, raster.imageUnscale);

                  bool valueInRange = (isNaN(raster.imageMinValue) || valueMagnitude >= raster.imageMinValue) &&
                                      (isNaN(raster.imageMaxValue) || valueMagnitude <= raster.imageMaxValue);

                  if (valueInRange) {
                      // Data is valid: calculate speed and color
                      speed = getPixelVectorValue(pixel, raster.imageType, raster.imageUnscale) * particle.speedFactor;
                      nextColor = applyPalette(paletteTexture, palette.paletteBounds, palette.paletteColor, valueMagnitude);
                      // Ensure calculated color is distinguishable from control states
                      if (nextColor == DROP_COLOR || nextColor == RESPAWNED_COLOR) {
                          nextColor.a = max(nextColor.a, 0.01);
                      }
                  }
                  // else: Value out of range -> nextColor remains DROP_COLOR
              }
              // else: NoData -> nextColor remains DROP_COLOR
          }
          // else: Out of data bounds -> nextColor remains DROP_COLOR

          // --- Check if particle should be dropped based on data ---
          if (nextColor == DROP_COLOR) {
              targetPosition.xy = DROP_POSITION;
              targetColor = DROP_COLOR;
          } else {
              // --- Move the particle ---
              vec2 potentialNextPosition = movePositionBySpeed(currentPosition, speed, particle.viewportGlobe);
              potentialNextPosition.x = wrapLongitude(potentialNextPosition.x); // Wrap before viewport check

              // --- Check Viewport Bounds ---
              if (!isPositionInBoundsAdvanced(potentialNextPosition, currentViewportBounds)) {
                  // Moved outside viewport: Drop
                  targetPosition.xy = DROP_POSITION;
                  targetColor = DROP_COLOR;
              } else {
                  // --- Final State: Particle is valid and inside viewport ---
                  targetPosition.xy = potentialNextPosition;
                  targetPosition.z = 0.0;
                  targetColor = nextColor; // Use the color calculated from the palette
              }
          }
      } // End of processing active particle

  } else {
      // --- This vertex corresponds to an older particle (age > 0.0) ---
      // Its state will be determined by the buffer copy operation.
      // Assign dummy values here to ensure all outputs are written, satisfying TF requirements.
      // These values will be overwritten.
      targetPosition.xy = DROP_POSITION;
      targetPosition.z = 0.0; // Ensure all components are assigned
      targetColor = DROP_COLOR;
  }
}
