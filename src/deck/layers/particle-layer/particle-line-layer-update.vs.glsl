#version 300 es
#define SHADER_NAME particle-line-layer-update-vertex-shader-refactored

#ifdef GL_ES
precision highp float;
#endif

// Included utility functions (assuming they are correct)
@include "../../_utils/pixel.glsl"
@include "../../_utils/pixel-value.glsl"

// Input attributes from source buffer
in vec3 sourcePosition; // (longitude, latitude, 0)
in vec4 sourceColor;    // Color, also used as state (DROP_COLOR, HIDE_COLOR)

// Output attributes to target buffer (via Transform Feedback)
out vec3 targetPosition;
out vec4 targetColor;

// --- Constants ---
const vec2 DROP_POSITION = vec2(0.0); // A position likely outside any valid bounds or easily identifiable
const vec4 DROP_COLOR = vec4(0.0, 0.0, 0.0, 0.0); // Represents a particle to be reset
const vec4 HIDE_COLOR = vec4(1.0, 0.0, 0.0, 0.0); // Represents a particle temporarily invisible (e.g., freshly spawned)

const float EARTH_RADIUS = 6370972.0; // meters

// Randomness constants
const vec2 RAND_SEED_DOT = vec2(12.9898, 78.233);
const float RAND_SEED_MUL = 43758.5453;
const float RAND_OFFSET_1 = 1.3;
const float RAND_OFFSET_2 = 2.1;
const float RAND_GLOBE_CENTER_OFFSET = 0.0001; // Prevents division by zero or singularity at exact center

// --- Uniforms ---
// (Assuming these are provided correctly from CPU)
// particle uniforms (numParticles, seed, viewportGlobe, viewportGlobeRadius, viewportGlobeCenter, viewportBounds, viewportZoomChangeFactor, maxAge, time, speedFactor)
// raster uniforms (imageResolution, imageSmoothing, imageInterpolation, imageWeight, imageUnscale, imageMinValue, imageMaxValue, imageType)
// bitmap2 uniforms (bounds) - Bounds of the data texture
// palette uniforms (paletteBounds, paletteColor)
// Textures (imageTexture, imageTexture2, paletteTexture)

// *** NEW UNIFORM REQUIRED ***
// Represents the current visible map area in degrees (minLng, minLat, maxLng, maxLat)
// Crucial for preventing particles jumping from screen edges.
uniform vec4 currentViewportBounds;


// --- Utility Functions ---

float randFloat(vec2 seed) {
  return fract(sin(dot(seed.xy, RAND_SEED_DOT)) * RAND_SEED_MUL);
}

vec2 randPoint(vec2 seed) {
  // Generate two pseudo-random numbers between 0 and 1
  return vec2(randFloat(seed + RAND_OFFSET_1), randFloat(seed + RAND_OFFSET_2));
}

// Calculate destination point on a sphere given start, distance, bearing
// see https://github.com/chrisveness/geodesy/blob/master/latlon-spherical.js#L360
vec2 destinationPoint(vec2 fromDegrees, float distMeters, float bearingDegrees) {
  float distRatio = distMeters / EARTH_RADIUS; // Angular distance
  float bearingRad = radians(bearingDegrees);

  float lat1Rad = radians(fromDegrees.y);
  float lon1Rad = radians(fromDegrees.x);

  float sinLat2 = sin(lat1Rad) * cos(distRatio) + cos(lat1Rad) * sin(distRatio) * cos(bearingRad);
  float lat2Rad = asin(sinLat2);

  float y = sin(bearingRad) * sin(distRatio) * cos(lat1Rad);
  float x = cos(distRatio) - sin(lat1Rad) * sinLat2;
  float lon2Rad = lon1Rad + atan(y, x); // Use atan(y,x) for correct quadrant

  return vec2(degrees(lon2Rad), degrees(lat2Rad));
}

// Generate a random position within the current view bounds
vec2 randPointToPosition(vec2 randomPoint01, vec4 viewportBnds, vec2 globeCenter, float globeRadius, float isGlobe) {
  vec2 position;
  if (isGlobe == 1.0) {
    // Globe view: distribute points uniformly on a spherical cap
    // Prevent exact center which might cause issues if radius is 0
    randomPoint01.x += RAND_GLOBE_CENTER_OFFSET;
    // Uniform random distance mapping
    // See https://twitter.com/keenanisalive/status/1529490555893428226
    // (simplified: sqrt maps uniform area to uniform radius on sphere cap)
    float dist = sqrt(randomPoint01.x) * globeRadius;
    float bearing = randomPoint01.y * 360.0;
    position = destinationPoint(globeCenter, dist, bearing);
  } else {
    // Flat map view: Mix between viewport bounds
    // Use smoothstep for potentially better latitude distribution if needed,
    // but linear mix (standard) is often fine.
    // randomPoint01.y = smoothstep(0.0, 1.0, randomPoint01.y); // Optional smoothing
    vec2 viewportBoundsMin = viewportBnds.xy;
    vec2 viewportBoundsMax = viewportBnds.zw;
    position = mix(viewportBoundsMin, viewportBoundsMax, randomPoint01);
  }
  return position;
}

// Wrap longitude to [-180, 180)
float wrapLongitude(float lng) {
  return mod(lng + 180.0, 360.0) - 180.0;
}

// Wrap longitude relative to a minimum longitude, useful for bounds checks across antimeridian
// Note: Assumes bounds don't span more than 360 degrees.
float wrapLongitudeRelative(float lng, float minLng) {
  float wrappedLng = wrapLongitude(lng);
  // If the wrapped longitude is significantly smaller than minLng,
  // assume it wrapped around and add 360.
  // This works if the view range (maxLng - minLng) is less than 360.
  if (wrappedLng < minLng - 180.0) { // Heuristic threshold
      wrappedLng += 360.0;
  }
  // Conversely, if it's much larger, subtract 360 (less common case)
  else if (wrappedLng > minLng + 180.0) {
      wrappedLng -= 360.0;
  }
  return wrappedLng;
}


// Calculate new position based on speed vector (lon/lat degrees per step)
vec2 movePositionBySpeed(vec2 positionDegrees, vec2 speedDegreesPerStep, float isGlobe) {
  // Apply latitude-based distortion correction
  // Cos(lat) accounts for longitude lines converging towards poles
  float distortion = cos(radians(positionDegrees.y));
  // Avoid division by zero or extreme distortion near poles
  distortion = max(distortion, 0.01); // Clamp minimum distortion effect

  vec2 offsetDegrees;
  if (isGlobe == 1.0) {
    // On globe, speed is more intuitive in meters/sec, but here speed is likely degrees/step
    // Need to adjust longitude speed based on latitude
     offsetDegrees = vec2(speedDegreesPerStep.x / distortion, speedDegreesPerStep.y);
  } else {
    // On flat map (Mercator-like), latitude speed needs adjustment
     offsetDegrees = vec2(speedDegreesPerStep.x, speedDegreesPerStep.y * distortion); // Slower latitude movement away from equator
  }

  // Simple addition in degree space. More accurate would be spherical destinationPoint,
  // but this is common for particle advection and often sufficient/faster.
  return positionDegrees + offsetDegrees;
}

// Check if a position (already wrapped) is within longitude/latitude bounds
// This version assumes bounds don't cross the antimeridian (minLng <= maxLng)
// OR that longitude has been pre-wrapped relative to minLng.
bool isPositionInBoundsSimple(vec2 position, vec4 bounds) {
  return (
    bounds.x <= position.x && position.x <= bounds.z && // Check Longitude
    bounds.y <= position.y && position.y <= bounds.w    // Check Latitude
  );
}

// Check if a position is within potentially antimeridian-crossing bounds
bool isPositionInBoundsAdvanced(vec2 position, vec4 bounds) {
    float minLng = bounds.x;
    float minLat = bounds.y;
    float maxLng = bounds.z;
    float maxLat = bounds.w;

    // Latitude check is simple
    if (position.y < minLat || position.y > maxLat) {
        return false;
    }

    // Longitude check handles antimeridian crossing (minLng > maxLng)
    float lng = wrapLongitudeRelative(position.x, minLng); // Wrap relative to min bound

    if (minLng <= maxLng) {
        // Normal case: bounds don't cross antimeridian
        return lng >= minLng && lng <= maxLng;
    } else {
        // Antimeridian crossing case: bounds cross (e.g., 170 to -170)
        // Valid if lng is >= minLng OR <= maxLng (after relative wrapping)
        return lng >= minLng || lng <= maxLng;
    }
}


// --- Main Update Logic ---
void main() {
  // Calculate particle index and age (relative to this batch)
  float particleIndex = mod(float(gl_VertexID), particle.numParticles);
  float particleAge = floor(float(gl_VertexID) / particle.numParticles);

  // --- Optimization: Skip older particles ---
  // Older particles (age > 0) are assumed to be copied by buffer.copyData
  // This shader only processes the *new state* for age 0 particles.
  if (particleAge > 0.0) {
    // This vertex corresponds to an older particle's *target* state.
    // It should not be processed here; its value comes from the copy.
    // We need to output *something* to avoid undefined behavior, but it won't be used.
    // Outputting DROP state is safe.
    targetPosition.xy = DROP_POSITION;
    targetColor = DROP_COLOR;
    return;
  }

  // --- Handle Particle Respawn ---
  // If the particle was marked as DROPPED in the source buffer, respawn it.
  if (sourceColor == DROP_COLOR) {
    // Generate a random point (0-1) based on particle index and global seed
    vec2 particleSeed = vec2(particleIndex * particle.seed / particle.numParticles, particle.time); // Add time for variance
    vec2 randomPoint01 = randPoint(particleSeed);

    // Convert the random point to a position within the current view
    vec2 newPosition = randPointToPosition(
        randomPoint01,
        particle.viewportBounds, // Use the general viewport bounds for spawning
        particle.viewportGlobeCenter,
        particle.viewportGlobeRadius,
        particle.viewportGlobe
    );

    targetPosition.xy = newPosition;
    targetPosition.x = wrapLongitude(targetPosition.x); // Ensure initial spawn is wrapped
    targetPosition.z = 0.0; // Reset Z component if used
    targetColor = HIDE_COLOR; // Start hidden (allows potential fade-in effect in rendering shader)
    return;
  }

  // --- Handle Forced Drops (Zooming Out, Age Limit) ---
  // Drop particles when zooming out significantly to avoid density explosion
  if (particle.viewportZoomChangeFactor > 1.0 && mod(particleIndex, floor(particle.viewportZoomChangeFactor)) >= 1.0) {
    targetPosition.xy = DROP_POSITION;
    targetColor = DROP_COLOR;
    return;
  }

  // Drop particles based on a cyclic age relative to current time
  // (+2 because only non-randomized pairs are rendered - specific to layer's rendering logic?)
  if (abs(mod(particleIndex, particle.maxAge + 2.0) - mod(particle.time, particle.maxAge + 2.0)) < 1.0) {
    targetPosition.xy = DROP_POSITION;
    targetColor = DROP_COLOR;
    return;
  }


  // --- Calculate Potential New Position ---
  vec2 currentPosition = sourcePosition.xy;
  vec2 speed = vec2(0.0); // Default speed if no data found

  // Check if current position is within the data texture bounds FIRST
  // Use the advanced check in case data bounds cross the antimeridian
  if (isPositionInBoundsAdvanced(currentPosition, bitmap2.bounds)) {
      // Sample the vector field data only if within data bounds
      vec2 uv = getUV(currentPosition); // Assumes getUV handles coordinate systems correctly
      vec4 pixel = getPixelSmoothInterpolate(imageTexture, imageTexture2, raster.imageResolution, raster.imageSmoothing, raster.imageInterpolation, raster.imageWeight, uv);

      // Check for NoData values
      if (hasPixelValue(pixel, raster.imageUnscale)) {
          float valueMagnitude = getPixelMagnitudeValue(pixel, raster.imageType, raster.imageUnscale);

          // Check if the value magnitude is within the specified min/max range
          bool valueInRange = (isNaN(raster.imageMinValue) || valueMagnitude >= raster.imageMinValue) &&
                              (isNaN(raster.imageMaxValue) || valueMagnitude <= raster.imageMaxValue);

          if (valueInRange) {
              // Valid data found: get speed and calculate color
              speed = getPixelVectorValue(pixel, raster.imageType, raster.imageUnscale) * particle.speedFactor;
              targetColor = applyPalette(paletteTexture, palette.paletteBounds, palette.paletteColor, valueMagnitude);
          } else {
              // Value out of range: Drop the particle
              targetPosition.xy = DROP_POSITION;
              targetColor = DROP_COLOR;
              return;
          }
      } else {
          // NoData found at current position: Drop the particle
          targetPosition.xy = DROP_POSITION;
          targetColor = DROP_COLOR;
          return;
      }
  } else {
      // Current position is outside data bounds: Drop the particle
      targetPosition.xy = DROP_POSITION;
      targetColor = DROP_COLOR;
      return;
  }

  // --- Move the particle ---
  vec2 potentialNextPosition = movePositionBySpeed(currentPosition, speed, particle.viewportGlobe);

  // --- Wrap Longitude ---
  // Important to wrap *before* checking viewport bounds
  potentialNextPosition.x = wrapLongitude(potentialNextPosition.x);


  // --- *** CRITICAL VIEWPORT CHECK *** ---
  // Check if the *potential next position* is within the *current screen viewport*.
  // If it moves off-screen, drop it immediately.
  // Use the advanced check in case viewport crosses the antimeridian
  if (!isPositionInBoundsAdvanced(potentialNextPosition, currentViewportBounds)) {
      // Particle moved outside the visible viewport
      targetPosition.xy = DROP_POSITION;
      targetColor = DROP_COLOR;
      return;
  }

  // --- Final State Assignment ---
  // If all checks passed, update the particle's state
  targetPosition.xy = potentialNextPosition;
  targetPosition.z = 0.0; // Maintain Z component if needed
  // targetColor was already set during the data sampling phase

}
