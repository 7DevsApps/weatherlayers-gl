import './attribution-control.css';
import {getClient} from '../../cloud-client/client';

/** @typedef {import('./attribution-control').AttributionConfig} AttributionConfig */
/** @typedef {import('../../cloud-client/client').Client} Client */
/** @typedef {import('../../cloud-client/stac').StacCollection} StacCollection */

export class AttributionControl {
  /** @type {AttributionConfig} */
  config = undefined;
  /** @type {Client} */
  client = undefined;
  /** @type {HTMLElement} */
  container = undefined;
  /** @type {StacCollection} */
  stacCollection = undefined;

  /**
   * @param {AttributionConfig} [config]
   */
  constructor(config = {}) {
    this.config = config;
    this.client = getClient();
  }

  /**
   * @returns {HTMLElement}
   */
  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'weatherlayers-attribution-control';

    this.update(this.config);

    return this.container;
  }

  /**
   * @returns {void}
   */
  onRemove() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = undefined;
    }
  }

  /**
   * @param {AttributionConfig} config
   * @returns {Promise<void>}
   */
  async update(config) {
    if (!this.container) {
      return;
    }
    if (this.stacCollection && this.config.dataset === config.dataset) {
      return;
    }

    this.config = config;

    if (!this.config.dataset) {
      this.container.innerHTML = this.config.attribution ? `<div>${this.config.attribution}</div>` : '';
      return;
    }

    this.stacCollection = await this.client.loadStacCollection(this.config.dataset);
    this.container.innerHTML = `<div>${await this.client.getStacCollectionAttribution(this.config.dataset)}</div>`;
  }
}