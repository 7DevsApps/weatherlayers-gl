import {CompositeLayer, COORDINATE_SYSTEM} from '@deck.gl/core';
import {createTextureCached, EMPTY_TEXTURE} from '../../../_utils/texture.js';
import {withCheckLicense} from '../../license.js';
import {RasterBitmapLayer} from './raster-bitmap-layer.js';

const defaultProps = {
  ...RasterBitmapLayer.defaultProps,

  imageTexture: undefined,
  imageTexture2: undefined,
  image: {type: 'object', value: null, required: true}, // object instead of image to allow reading raw data
  image2: {type: 'object', value: null}, // object instead of image to allow reading raw data

  bounds: {type: 'array', value: [-180, -90, 180, 90], compare: true},
};

@withCheckLicense(defaultProps)
class RasterLayer extends CompositeLayer {
  renderLayers() {
    const {props, imageTexture, imageTexture2} = this.state;

    if (!props || !imageTexture) {
      return [];
    }

    return [
      new RasterBitmapLayer(this.props, this.getSubLayerProps({
        id: 'bitmap',
        imageTexture,
        imageTexture2,
        image: EMPTY_TEXTURE,
        image2: EMPTY_TEXTURE,
        
        _imageCoordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      })),
    ];
  }

  updateState({props, oldProps, changeFlags}) {
    const {image, image2, imageUnscale} = props;

    super.updateState({props, oldProps, changeFlags});

    if (imageUnscale && !(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray)) {
      throw new Error('imageUnscale can be applied to Uint8 data only');
    }

    if (image !== oldProps.image || image2 !== oldProps.image2) {
      this.updateTexture();
    }

    this.setState({ props });
  }

  updateTexture() {
    const {gl} = this.context;
    const {image, image2} = this.props;

    const imageTexture = image ? createTextureCached(gl, image) : null;
    const imageTexture2 = image2 ? createTextureCached(gl, image2) : null;

    this.setState({ imageTexture, imageTexture2 });
  }
}

RasterLayer.layerName = 'RasterLayer';
RasterLayer.defaultProps = defaultProps;

export {RasterLayer};