import { CompositeLayer } from '@deck.gl/core/typed';
import type { LayerProps, DefaultProps, LayersList } from '@deck.gl/core/typed';
import { withVerifyLicense } from '../../with-verify-license.js';
import { FrontCompositeLayer } from './front-composite-layer.js';
import type { FrontCompositeLayerProps } from './front-composite-layer.js';
import { FrontType } from './front-type.js';

type _FrontLayerProps<DataT> = FrontCompositeLayerProps<DataT>;

export type FrontLayerProps<DataT> = _FrontLayerProps<DataT> & LayerProps;

const defaultProps: DefaultProps<FrontLayerProps<any>> = {
  ...FrontCompositeLayer.defaultProps,
};

@withVerifyLicense('FrontLayer', defaultProps)
export class FrontLayer<DataT = any, ExtraPropsT extends {} = {}> extends CompositeLayer<ExtraPropsT & Required<_FrontLayerProps<DataT>>> {
  static layerName = 'FrontLayer';
  static defaultProps = defaultProps;

  renderLayers(): LayersList {
    return [
      new FrontCompositeLayer(this.props, this.getSubLayerProps({
        id: 'composite',
      } satisfies Partial<FrontCompositeLayerProps<DataT>>)),
    ];
  }
}

export { FrontType };