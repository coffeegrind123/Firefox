/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This module periodically sends a Telemetry ping containing information
 * about untrusted module loads on Windows.
 *
 * https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/telemetry/data/third-party-modules-ping.html
 */

"use strict";

var EXPORTED_SYMBOLS = ["TelemetryUntrustedModulesPing"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  Log: "resource://gre/modules/Log.jsm",
  TelemetryController: "resource://gre/modules/TelemetryController.jsm",
  TelemetryUtils: "resource://gre/modules/TelemetryUtils.jsm",
});

XPCOMUtils.defineLazyServiceGetters(lazy, {
  UpdateTimerManager: [
    "@mozilla.org/updates/timer-manager;1",
    "nsIUpdateTimerManager",
  ],
});

const DEFAULT_INTERVAL_SECONDS = 24 * 60 * 60; // 1 day

const LOGGER_NAME = "Toolkit.Telemetry";
const LOGGER_PREFIX = "TelemetryUntrustedModulesPing::";
const TIMER_NAME = "telemetry_untrustedmodules_ping";
const PING_SUBMISSION_NAME = "third-party-modules";

var TelemetryUntrustedModulesPing = Object.freeze({
  _log: lazy.Log.repository.getLoggerWithMessagePrefix(
    LOGGER_NAME,
    LOGGER_PREFIX
  ),

  start() {
    lazy.UpdateTimerManager.registerTimer(
      TIMER_NAME,
      this,
      Services.prefs.getIntPref(
        lazy.TelemetryUtils.Preferences.UntrustedModulesPingFrequency,
        DEFAULT_INTERVAL_SECONDS
      )
    );
  },

  notify() {
    try {
      Services.telemetry.getUntrustedModuleLoadEvents().then(payload => {
        try {
          if (payload) {
            lazy.TelemetryController.submitExternalPing(
              PING_SUBMISSION_NAME,
              payload,
              {
                addClientId: true,
                addEnvironment: true,
              }
            );
          }
        } catch (ex) {
          this._log.error("payload handler caught an exception", ex);
        }
      });
    } catch (ex) {
      this._log.error("notify() caught an exception", ex);
    }
  },
});
