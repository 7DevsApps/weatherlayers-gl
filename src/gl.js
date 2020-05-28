import { loadMetadata, loadImage } from './load.js';
import { getPixelRatio } from './pixel-ratio.js';
import { createImageTexture, createArrayTexture } from './webgl-common.js';
import { createQuadBuffer } from './shaders/quad.js';
import { createStepProgram, computeStep } from './shaders/step.js';
import { createFadeProgram, drawFade } from './shaders/fade.js';
import { initParticlesState, createParticlesBuffer, createParticlesIndexBuffer, createParticlesProgram, drawParticles } from './shaders/particles.js';
import { createOverlayProgram, drawOverlay } from './shaders/overlay.js';
import { createCopyProgram, drawCopy } from './shaders/copy.js';

/** @typedef {import('./webgl-common.js').WebGLProgramWrapper} WebGLProgramWrapper */
/** @typedef {import('./webgl-common.js').WebGLBufferWrapper} WebGLBufferWrapper */
/** @typedef {import('./webgl-common.js').WebGLTextureWrapper} WebGLTextureWrapper */
/** @typedef {{ weatherMetadata: string; weatherImage: string; particlesCount: number; particleSize: number; particleColor: [number, number, number]; particleOpacity: number; fadeOpacity: number; speedFactor: number; dropRate: number; dropRateBump: number; retina: boolean; }} MaritraceMapboxWeatherConfig */

/**
 * @param {WebGLRenderingContext} gl
 * @param {MaritraceMapboxWeatherConfig} config
 */
export async function drawToGl(gl, config) {
    // load weather files
    const [weatherMetadata, weatherImage] = await Promise.all([
        loadMetadata(config.weatherMetadata),
        loadImage(config.weatherImage),
    ]);
    const weatherTexture = createImageTexture(gl, weatherImage);

    // particles state textures, for the current and the previous state
    /** @type WebGLBufferWrapper */
    let particlesBuffer;
    /** @type WebGLBufferWrapper */
    let particlesIndexBuffer;
    /** @type WebGLTextureWrapper */
    let particlesStateTexture0;
    /** @type WebGLTextureWrapper */
    let particlesStateTexture1;
    function updateConfig() {
        const particlesStateResolution = Math.ceil(Math.sqrt(config.particlesCount));
        const particlesState = initParticlesState(particlesStateResolution * particlesStateResolution);

        particlesBuffer = createParticlesBuffer(gl, config.particlesCount);
        particlesIndexBuffer = createParticlesIndexBuffer(gl, config.particlesCount);
        particlesStateTexture0 = createArrayTexture(gl, particlesState, particlesStateResolution, particlesStateResolution);
        particlesStateTexture1 = createArrayTexture(gl, particlesState, particlesStateResolution, particlesStateResolution);
    }
    updateConfig();

    // particles screen textures, for the current and the previous state
    /** @type number */
    let pixelRatio;
    /** @type WebGLTextureWrapper */
    let particlesScreenTexture0;
    /** @type WebGLTextureWrapper */
    let particlesScreenTexture1;
    function resize() {
        pixelRatio = getPixelRatio(config.retina);

        const emptyTexture = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        particlesScreenTexture0 = createArrayTexture(gl, emptyTexture, gl.canvas.width, gl.canvas.height);
        particlesScreenTexture1 = createArrayTexture(gl, emptyTexture, gl.canvas.width, gl.canvas.height);
    }
    resize();

    const framebuffer = /** @type WebGLFramebuffer */ (gl.createFramebuffer());

    const quadBuffer = createQuadBuffer(gl);

    const stepProgram = createStepProgram(gl);
    const fadeProgram = createFadeProgram(gl);
    const particlesProgram = createParticlesProgram(gl);
    const overlayProgram = createOverlayProgram(gl);
    const copyProgram = createCopyProgram(gl);

    let playing = true;
    let raf = /** @type ReturnType<requestAnimationFrame> | null */ (null);

    function draw() {
        const speedFactor = config.speedFactor * pixelRatio;
        const particleSize = config.particleSize * pixelRatio;
        const particleColor = new Float32Array([config.particleColor[0] / 256, config.particleColor[1] / 256, config.particleColor[2] / 256, config.particleOpacity]);

        // draw to particles state texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particlesStateTexture1.texture, 0);
        gl.viewport(0, 0, particlesStateTexture0.x, particlesStateTexture0.y);
        gl.clear(gl.COLOR_BUFFER_BIT);
        computeStep(gl, stepProgram, quadBuffer, particlesStateTexture0, weatherMetadata, weatherTexture, speedFactor, config.dropRate, config.dropRateBump);

        // draw to particles screen texture
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particlesScreenTexture1.texture, 0);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawFade(gl, fadeProgram, quadBuffer, particlesScreenTexture0, config.fadeOpacity);
        drawParticles(gl, particlesProgram, particlesBuffer, particlesIndexBuffer, particlesStateTexture0, particlesStateTexture1, particleSize, particleColor);

        // draw to canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        drawOverlay(gl, overlayProgram, quadBuffer, weatherMetadata, weatherTexture);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        drawCopy(gl, copyProgram, quadBuffer, particlesScreenTexture1);
        gl.disable(gl.BLEND);

        // swap particle state and screen textures
        [particlesStateTexture1, particlesStateTexture0] = [particlesStateTexture0, particlesStateTexture1];
        [particlesScreenTexture1, particlesScreenTexture0] = [particlesScreenTexture0, particlesScreenTexture1];
    }

    function run() {
        draw();
        if (playing) {
            raf = requestAnimationFrame(run);
        }
    }

    function play() {
        if (playing) {
            return;
        }

        playing = true;
        run();
    }

    function pause() {
        if (!playing) {
            return;
        }

        playing = false;
        if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
        }
    }

    function destroy() {
        stop();
    }

    run();

    return {
        get playing() {
            return playing;
        },
        config,
        updateConfig,
        resize,
        play,
        pause,
        destroy,
    };
}
