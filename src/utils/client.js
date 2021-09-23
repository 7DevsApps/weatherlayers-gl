/*
 * Copyright (c) 2021 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {loadTextureData} from './data';

/** @typedef {import('./data').TextureData} TextureData */
/** @typedef {import('./client').ClientConfig} ClientConfig */
/** @typedef {import('./stac').StacCatalog} StacCatalog */
/** @typedef {import('./stac').StacCollection} StacCollection */
/** @typedef {import('./stac').StacProvider} StacProvider */
/** @typedef {import('./stac').StacItem} StacItem */

/** @type {ClientConfig} */
const DEFAULT_CLIENT_CONFIG = {
  url: 'https://catalog.weatherlayers.com',
  // url: 'http://localhost:8080',
  format: 'byte.png',
};

/** @type {ClientConfig} */
let clientConfig = DEFAULT_CLIENT_CONFIG;

/**
 * @param {Partial<ClientConfig>} config
 */
export function setClientConfig(config) {
  clientConfig = { ...DEFAULT_CLIENT_CONFIG, ...config };
}

/**
 * @returns {ClientConfig}
 */
export function getClientConfig() {
  return clientConfig;
}

/** @type {Map<string, any>} */
const cache = new Map();

/**
 * @template T
 * @param {string} url
 * @return {Promise<T>}
 */
async function loadJson(url) {
  return (await fetch(url)).json();
}

/**
 * @template T
 * @param {string} url
 * @return {Promise<T>}
 */
function loadJsonCached(url) {
  const dataOrPromise = cache.get(url);
  if (dataOrPromise) {
    return dataOrPromise;
  }
  
  const dataPromise = loadJson(url);
  cache.set(url, dataPromise);
  dataPromise.then(data => {
    cache.set(url, data);
  });
  return dataPromise;
}

/**
 * @param {string} url
 * @returns {Promise<TextureData>}
 */
function loadTextureDataCached(url) {
  const dataOrPromise = cache.get(url);
  if (dataOrPromise) {
    return dataOrPromise;
  }
  
  const dataPromise = loadTextureData(url);
  cache.set(url, dataPromise);
  dataPromise.then(data => {
    cache.set(url, data);
  });
  return dataPromise;
}

/**
 * @returns {Promise<StacCatalog>}
 */
export async function loadStacCatalog() {
  const params = new URLSearchParams();
  if (clientConfig.accessToken) {
    params.set('access_token', clientConfig.accessToken);
  }
  if (clientConfig.format) {
    params.set('format', clientConfig.format);
  }
  const query = params.toString();
  const url = `${clientConfig.url}/catalog${query ? `?${query}` : ''}`;
  return loadJsonCached(url);
}

/**
 * @param {StacCatalog} stacCatalog
 * @returns {string[]}
 */
export function getStacCatalogCollectionIds(stacCatalog) {
  const ids = /** @type {string[]} */ (stacCatalog.links.filter(x => x.rel === 'child').map(x => x.id).filter(x => !!x));
  return ids;
}

/**
 * @param {string} stacCollectionId
 * @returns {Promise<StacCollection>}
 */
export async function loadStacCollection(stacCollectionId) {
  const stacCatalog = await loadStacCatalog();
  const link = stacCatalog.links.find(x => x.id === stacCollectionId);
  if (!link) {
    throw new Error(`Collection ${stacCollectionId} not found`);
  }
  return loadJsonCached(link.href);
}

/**
 * @param {StacCollection} stacCollection
 * @returns {StacProvider | undefined}
 */
export function getStacCollectionProducer(stacCollection) {
  const producer = stacCollection.providers.find(x => x.roles.includes('producer'));
  return producer;
}

/**
 * @param {StacCollection} stacCollection
 * @returns {string[]}
 */
export function getStacCollectionItemDatetimes(stacCollection) {
  const datetimes = /** @type {string[]} */ (stacCollection.links.filter(x => x.rel === 'item').map(x => x.datetime).filter(x => !!x));
  return datetimes;
}

/**
 * @param {string} dataset
 * @param {string} datetime
 * @returns {Promise<StacItem>}
 */
export async function loadStacItemByDatetime(dataset, datetime) {
  const stacCollection = await loadStacCollection(dataset);
  const link = stacCollection.links.find(x => x.rel === 'item' && x.datetime === datetime);
  if (!link) {
    throw new Error(`Item ${datetime} not found`);
  }
  return loadJsonCached(link.href);
}

/**
 * @param {string} dataset
 * @param {string} datetime
 * @returns {Promise<TextureData>}
 */
export async function loadStacCollectionDataByDatetime(dataset, datetime) {
  const stacItem = await loadStacItemByDatetime(dataset, datetime);
  const url = stacItem.assets.data.href;
  return loadTextureDataCached(url);
}