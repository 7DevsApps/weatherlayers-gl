/*
 * Copyright (c) 2021 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @param {string} value
 * @returns {string}
 */
export function formatDatetime(value) {
  const date = new Date(value);
  if (!date.getDate()) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth()}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  const hour = `${date.getUTCHours()}`.padStart(2, '0');
  const minute = `${date.getUTCMinutes()}`.padStart(2, '0');
  const formattedValue = `${year}/${month}/${day} ${hour}:${minute} UTC`;
  return formattedValue;
}