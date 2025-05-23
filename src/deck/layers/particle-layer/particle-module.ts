import type {ShaderModule} from '@luma.gl/shadertools';
import {sourceCode, tokens} from './particle-module.glsl';

export type ParticleModuleProps = {
  viewportGlobe?: boolean;
  viewportGlobeCenter?: [number, number];
  viewportGlobeRadius?: number;
  viewportBounds?: [number, number, number, number];
  viewportZoomChangeFactor?: number;

  numParticles: number;
  maxAge: number;
  speedFactor: number;

  time: number;
  seed: number;
};

type ParticleModuleUniforms = {[K in keyof typeof tokens]: any};

function getUniforms(props: Partial<ParticleModuleProps> = {}): ParticleModuleUniforms {
  return {
    [tokens.viewportGlobe]: props.viewportGlobe ? 1 : 0,
    [tokens.viewportGlobeCenter]: props.viewportGlobeCenter ?? [0, 0],
    [tokens.viewportGlobeRadius]: props.viewportGlobeRadius ?? 0,
    [tokens.viewportBounds]: props.viewportBounds ?? [0, 0, 0, 0],
    [tokens.viewportZoomChangeFactor]: props.viewportZoomChangeFactor ?? 0,

    [tokens.numParticles]: props.numParticles,
    [tokens.maxAge]: props.maxAge,
    [tokens.speedFactor]: props.speedFactor,

    [tokens.time]: props.time,
    [tokens.seed]: props.seed,
  };
}

export const particleModule = {
  name: 'particle',
  vs: sourceCode,
  fs: sourceCode,
  uniformTypes: {
    [tokens.viewportGlobe]: 'f32',
    [tokens.viewportGlobeCenter]: 'vec2<f32>',
    [tokens.viewportGlobeRadius]: 'f32',
    [tokens.viewportBounds]: 'vec4<f32>',
    [tokens.viewportZoomChangeFactor]: 'f32',

    [tokens.numParticles]: 'f32',
    [tokens.maxAge]: 'f32',
    [tokens.speedFactor]: 'f32',

    [tokens.time]: 'f32',
    [tokens.seed]: 'f32',
  },
  getUniforms,
} as const satisfies ShaderModule<ParticleModuleProps, ParticleModuleUniforms>;