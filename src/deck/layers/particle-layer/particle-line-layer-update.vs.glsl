#version 300 es
#define SHADER_NAME particle-line-layer-update-vertex-shader

#ifdef GL_ES
precision highp float;
#endif

@include "../../_utils/pixel.glsl"
@include "../../_utils/pixel-value.glsl"

in vec3 sourcePosition;
in vec4 sourceColor;
out vec3 targetPosition;
out vec4 targetColor;

const vec2 DROP_POSITION = vec2(0);
const vec4 DROP_COLOR = vec4(0);
const vec4 HIDE_COLOR = vec4(1, 0, 0, 0);

const float _EARTH_RADIUS = 6370972.0; // Earth's radius in meters

// Calculates destination point given a start point, distance, and bearing.
vec2 destinationPoint(vec2 from, float dist, float bearing) {
  float d = dist / _EARTH_RADIUS;
  float r = radians(bearing);
  float y1 = radians(from.y);
  float x1 = radians(from.x);
  float siny2 = sin(y1) * cos(d) + cos(y1) * sin(d) * cos(r);
  float y2 = asin(siny2);
  float y = sin(r) * sin(d) * cos(y1);
  float x = cos(d) - sin(y1) * siny2;
  float x2 = x1 + atan2(y, x);
  float lat = degrees(y2);
  float lon = degrees(x2);
  return vec2(lon, lat);
}

// Wraps longitude value to the range [-180, 180].
float wrapLongitude(float lng) {
  float wrappedLng = mod(lng + 180.0, 360.0) - 180.0;
  return wrappedLng;
}

// Wraps longitude with a specified minimum longitude.
float wrapLongitude(float lng, float minLng) {
  float wrappedLng = wrapLongitude(lng);
  if (wrappedLng < minLng) {
    wrappedLng += 360.0;
  }
  return wrappedLng;
}

// Generates a random float based on a seed.
float randFloat(vec2 seed) {
  return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Generates a random point in the [0, 1] range.
vec2 randPoint(vec2 seed) {
  return vec2(randFloat(seed + 1.3), randFloat(seed + 2.1));
}

// Generates a random position based on a random point and viewport settings.
vec2 randPointToPosition(vec2 point) {
  if (particle.viewportGlobe == 1.0) {
    point.x += 0.0001; // prevent generating point at the center
    point.x = sqrt(point.x); // uniform random distance
    float dist = point.x * particle.viewportGlobeRadius;
    float bearing = point.y * 360.0;
    return destinationPoint(particle.viewportGlobeCenter, dist, bearing);
  } else {
    point.y = smoothstep(0.0, 1.0, point.y); // uniform random latitude
    vec2 viewportBoundsMin = particle.viewportBounds.xy;
    vec2 viewportBoundsMax = particle.viewportBounds.zw;
    return mix(viewportBoundsMin, viewportBoundsMax, point);
  }
}

// Updates the position based on speed and latitude distortion.
vec2 movePositionBySpeed(vec2 position, vec2 speed) {
  float distortion = cos(radians(position.y));
  vec2 offset;
  if (particle.viewportGlobe == 1.0) {
    offset = vec2(speed.x / distortion, speed.y); // adjust longitude speed
  } else {
    offset = vec2(speed.x, speed.y * distortion); // adjust latitude speed
  }
  return position + offset;
}

// Checks if a position is within the given bounds.
bool isPositionInBounds(vec2 position, vec4 bounds) {
  vec2 boundsMin = bounds.xy;
  vec2 boundsMax = bounds.zw;
  float lng = wrapLongitude(position.x, boundsMin.x);
  float lat = position.y;
  return (
    boundsMin.x <= lng && lng <= boundsMax.x &&
    boundsMin.y <= lat && lat <= boundsMax.y
  );
}

void main() {
  float particleIndex = mod(float(gl_VertexID), particle.numParticles);
  float particleAge = floor(float(gl_VertexID) / particle.numParticles);

  // Local variables for output values.
  vec3 pos;
  vec4 col;
  
  // If the particle age is greater than zero, keep current values.
  if (particleAge > 0.0) {
    pos = sourcePosition;
    col = sourceColor;
  }
  // If the source color equals DROP_COLOR, generate a random position.
  else if (sourceColor == DROP_COLOR) {
    vec2 particleSeed = vec2(particleIndex * particle.seed / particle.numParticles);
    vec2 point = randPoint(particleSeed);
    vec2 position = randPointToPosition(point);
    pos.xy = position;
    pos.x = wrapLongitude(pos.x);
    col = HIDE_COLOR;
  }
  // Drop particle when zooming out.
  else if (particle.viewportZoomChangeFactor > 1.0 &&
           mod(particleIndex, particle.viewportZoomChangeFactor) >= 1.0) {
    pos.xy = DROP_POSITION;
    col = DROP_COLOR;
  }
  // Drop particle by maximum age.
  else if (abs(mod(particleIndex, particle.maxAge + 2.0) - mod(particle.time, particle.maxAge + 2.0)) < 1.0) {
    pos.xy = DROP_POSITION;
    col = DROP_COLOR;
  }
  // If the source position is out of bounds, hide the particle.
  else if (!isPositionInBounds(sourcePosition.xy, bitmap2.bounds)) {
    pos.xy = sourcePosition.xy;
    col = HIDE_COLOR;
  }
  else {
    vec2 uv = getUV(sourcePosition.xy); // imageTexture is in LNGLAT coordinate system.
    vec4 pixel = getPixelSmoothInterpolate(
      imageTexture, imageTexture2,
      raster.imageResolution, raster.imageSmoothing,
      raster.imageInterpolation, raster.imageWeight,
      uv
    );
    if (!hasPixelValue(pixel, raster.imageUnscale)) {
      pos.xy = sourcePosition.xy;
      col = HIDE_COLOR;
    } else {
      float value = getPixelMagnitudeValue(pixel, raster.imageType, raster.imageUnscale);
      if ((!isNaN(raster.imageMinValue) && value < raster.imageMinValue) ||
          (!isNaN(raster.imageMaxValue) && value > raster.imageMaxValue)) {
        pos.xy = sourcePosition.xy;
        col = HIDE_COLOR;
      } else {
        vec2 speed = getPixelVectorValue(pixel, raster.imageType, raster.imageUnscale) * particle.speedFactor;
        pos.xy = movePositionBySpeed(sourcePosition.xy, speed);
        pos.x = wrapLongitude(pos.x);
        col = applyPalette(paletteTexture, palette.paletteBounds, palette.paletteColor, value);
      }
    }
  }
  
  // Output the computed values.
  targetPosition = pos;
  targetColor = col;
}
