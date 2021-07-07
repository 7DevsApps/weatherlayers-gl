/*
 * Copyright (c) 2021 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Animation } from '../../utils/animation';
import './timeline-control.css';

/** @typedef {import('./timeline-control').TimelineConfig} TimelineConfig */

export class TimelineControl {
  /** @type {TimelineConfig} */
  config = undefined;
  /** @type {HTMLElement} */
  container = undefined;
  /** @type {Animation} */
  animation = undefined;
  /** @type {number} */
  progress = 0;

  /**
   * @param {TimelineConfig} config
   */
  constructor(config) {
    this.config = config;

    this.animation = new Animation(() => {
      if (this.progress < this.config.datetimes.length - 1) {
        this.progress += 0.05;
      } else {
        this.progress = 0;
      }

      const datetimeIndex = Math.floor(this.progress);
      const datetime = this.config.datetimes[datetimeIndex];
      const datetime2 = this.config.datetimes[datetimeIndex + 1];
      const datetimeWeight = Math.round((this.progress - datetimeIndex) * 100) / 100;
      
      this.config.onUpdate({
        datetime: datetimeIndex % 2 === 0 ? datetime : datetime2,
        datetime2: datetimeIndex % 2 === 0 ? datetime2 : datetime,
        datetimeWeight: datetimeIndex % 2 === 0 ? datetimeWeight : 1 - datetimeWeight,
      });
    });
  }

  /**
   * @returns {HTMLElement}
   */
  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'timeline';

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
   * @param {TimelineConfig} config
   * @returns {void}
   */
  update(config) {
    if (!this.container) {
      return;
    }

    this.config = config;
    this.container.innerHTML = '';
    
    if (!config.datetimes || config.datetimes.length < 2) {
      return;
    }

    const div = document.createElement('div');
    this.container.appendChild(div);

    const button = document.createElement('button');
    button.innerHTML = 'Play';
    button.addEventListener('click', () => {
      if (this.animation.running) {
        this.animation.stop();
        this.config.onStop?.();
        button.innerHTML = 'Play';
      } else {
        this.animation.start();
        this.config.onStart?.();
        button.innerHTML = 'Pause';
      }
    });
    div.appendChild(button);
  }
}