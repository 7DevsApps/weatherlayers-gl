/*
 * Copyright (c) 2021 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {CompositeLayer} from '@deck.gl/layers';
import {HiloTextLayer} from './hilo-text-layer';
import {loadStacCollection, getStacCollectionItemDatetimes, loadStacCollectionDataByDatetime} from '../../utils/client';
import {getClosestStartDatetime} from '../../utils/datetime';
import {formatValue} from '../../utils/value';

const defaultProps = {
  ...HiloTextLayer.defaultProps,

  dataset: {type: 'object', value: null, required: true},
  datetime: {type: 'object', value: null, required: true},
};

export class HiloLayer extends CompositeLayer {
  renderLayers() {
    const {props, stacCollection, image} = this.state;

    if (!props || !stacCollection || !stacCollection.summaries.hilo || !image) {
      return [];
    }

    return [
      new HiloTextLayer(props, this.getSubLayerProps({
        id: 'text',
        image,
        imageBounds: stacCollection.summaries.imageBounds,
        radius: props.radius || stacCollection.summaries.hilo.radius,
        contour: props.contour || stacCollection.summaries.hilo.contour,
        formatValueFunction: x => formatValue(x, stacCollection.summaries.unit[0]).toString(),
      })),
    ];
  }

  async updateState({props, oldProps, changeFlags}) {
    const {dataset, datetime} = this.props;

    super.updateState({props, oldProps, changeFlags});

    if (!dataset || !datetime) {
      this.setState({
        props: undefined,
        stacCollection: undefined,
        datetimes: undefined,
        image: undefined,
      });
      return;
    }

    if (!this.state.stacCollection || dataset !== oldProps.dataset) {
      this.state.stacCollection = await loadStacCollection(dataset);
      this.state.datetimes = getStacCollectionItemDatetimes(this.state.stacCollection);
    }

    if (dataset !== oldProps.dataset || datetime !== oldProps.datetime) {
      const startDatetime = getClosestStartDatetime(this.state.datetimes, datetime);
      if (!startDatetime) {
        return;
      }

      if (dataset !== oldProps.dataset || startDatetime !== this.state.startDatetime) {
        const image = await loadStacCollectionDataByDatetime(dataset, startDatetime);

        this.setState({
          image,
        });
      }

      this.setState({
        startDatetime,
      });
    }

    this.setState({
      props: this.props,
    });
  }
}

HiloLayer.layerName = 'HiloLayer';
HiloLayer.defaultProps = defaultProps;