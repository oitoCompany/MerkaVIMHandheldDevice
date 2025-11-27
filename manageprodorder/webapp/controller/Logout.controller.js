sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("com.merkavim.ewm.manageprodorder.controller.Logout", {
    onInit: function() {
      // Trigger standard logout flow immediately on entering this view
      this._logout();
    },

    onNavHome: function() {
      try {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        // Replace history so back won't return to protected pages
        oRouter.navTo("RouteView1", {}, true);
      } catch (e) {
        try { sap.ui.core.routing.HashChanger.getInstance().setHash(""); } catch (e2) {}
      }
    },

    /**
     * Standardized logout orchestrator. Prefers FLP logout when available,
     * otherwise performs ABAP ICF logoff and client-side cleanup as fallback.
     */
    _logout: function() {
      try {
        var that = this;
        this._logoutViaAbap()
          .catch(function(){ /* ignore network errors; continue */ })
          .finally(function(){
            // Always clear app state client-side
            try { that._logoutClientSide(); } catch (_) {}
            // Hard reload without hash to ensure a new session challenge
            try {
              var sNoHashUrl = window.location.href.split('#')[0];
              // Replace to avoid back-navigation into protected pages
              window.location.replace(sNoHashUrl);
            } catch (eNav) {
              try { window.location.reload(); } catch(_) {}
            }
          });
      } catch (e) {
        // Last-resort cleanup
        try { this._logoutClientSide(); } catch (_) {}
      }
    },

    /**
     * Best-effort client-side logout:
     * - Clears local/session storage used by the app
     * - Resets the component-level user and working models
     * - Attempts to clear Basic Auth cache (not guaranteed by browsers)
     */
    _logoutClientSide: function() {
      var oComponent = this.getOwnerComponent();

      // 1) Clear any app-specific persisted data
      try {
        if (window.localStorage) {
          window.localStorage.removeItem("appUserProfile");
        }
      } catch (e1) {}
      try {
        if (window.sessionStorage) {
          window.sessionStorage.clear();
        }
      } catch (e2) {}

      // 2) Reset in-memory models to a logged-out/empty state
      try {
        var oUserModel = oComponent.getModel("user");
        if (oUserModel) {
          oUserModel.setData({ name: "", email: "", loggedIn: false, authChecked: true });
          oUserModel.updateBindings(true);
        }

        var mResetModels = ["pickItems", "inputFields", "selection", "form", "items", "view", "validData"]; 
        mResetModels.forEach(function(sName){
          var oModel = oComponent.getModel(sName);
          if (!oModel) { return; }
          switch (sName) {
            case "pickItems":
            case "items":
              oModel.setData({ items: [] });
              break;
            case "inputFields":
              oModel.setData({ Location: "", Stock: "", Material: "", MaterialDescription: "", UOM: "" });
              break;
            case "selection":
              oModel.setData({ Material: "", ProductionOrder: "", Operation: "", ReservationStorageLocation: "", LogisticsGroup: "", Remark: "" });
              break;
            case "form":
              oModel.setData({ issuingStorageLocation: "", internalOrder: "", costCenter: "", material: "", issueQuantity: "", remark: "" });
              break;
            case "view":
              oModel.setData({ WERKS: "", LGORT: "", AUFNR: "", KOSTL: "", MATNR: "", MEINS: "", LGPBE: "", LABST: 0, MAKTX: "", BKTXT: "", SPRAS: sap.ui.getCore().getConfiguration().getLanguage() || "E", PICKING_QTY: 0 });
              break;
            default:
              try { oModel.setData({}); } catch(_) {}
          }
          try { oModel.updateBindings(true); } catch(_) {}
        });
      } catch (e3) {}

      // 3) Attempt to clear Basic Auth cache (browser-dependent and not guaranteed)
      this._tryClearBasicAuth();

      // 4) Notify the user
      try {
        MessageToast.show(this._getI18nText("logoutHeading") || "You have been signed out.");
      } catch (_) {}
    },

    /**
     * Performs ABAP ICF logoff to invalidate backend session cookies.
     * Returns a Promise that resolves when the attempt completes (success or fail).
     */
    _logoutViaAbap: function() {
      return new Promise(function(resolve) {
        try {
          var sLogoffUrl = "/sap/public/bc/icf/logoff";

          // Fire a GET to the logoff endpoint
          var oXHR = new XMLHttpRequest();
          oXHR.open("GET", sLogoffUrl, true);
          oXHR.onreadystatechange = function() {
            if (oXHR.readyState === 4) {
              // Also attach a hidden iframe to ensure cookies are cleared in some browsers
              try {
                var oIframe = document.createElement("iframe");
                oIframe.style.display = "none";
                oIframe.src = sLogoffUrl;
                document.body.appendChild(oIframe);
                setTimeout(function(){
                  try { document.body.removeChild(oIframe); } catch(_) {}
                  resolve();
                }, 300);
              } catch (_) { resolve(); }
            }
          };
          oXHR.send(null);
        } catch (e) {
          // Even if network fails, resolve to continue the flow
          resolve();
        }
      });
    },

    _getI18nText: function(sKey){
      try {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
      } catch (e) { return ""; }
    },

    /**
     * Tries known approaches to clear HTTP Basic Auth credentials:
     * - IE/Edge Legacy: document.execCommand('ClearAuthenticationCache')
     * - XHR with bogus creds against the protected realm
     * None of these are guaranteed across modern browsers. As a fallback, ask the
     * user to close all tabs for this site or use a private window.
     */
    _tryClearBasicAuth: function(){
      // a) IE/Edge Legacy
      try {
        if (document && typeof document.execCommand === "function") {
          document.execCommand("ClearAuthenticationCache");
        }
      } catch (e) {}

      // b) Make a request with wrong credentials to the same realm
      try {
        var sBaseUri = "/";
        try {
          var oApp = this.getOwnerComponent().getManifestEntry("sap.app");
          if (oApp && oApp.dataSources) {
            // Heuristic: pick the first dataSource with a uri
            var aKeys = Object.keys(oApp.dataSources);
            for (var i = 0; i < aKeys.length; i++) {
              var oDS = oApp.dataSources[aKeys[i]];
              if (oDS && oDS.uri) { sBaseUri = oDS.uri; break; }
            }
          }
        } catch(_) {}
        // Use jQuery ajax with explicit username/password to override cached creds
        if (window.jQuery && jQuery.ajax) {
          jQuery.ajax({
            url: sBaseUri + "__logout_probe__" + Date.now(),
            method: "GET",
            username: "logout",
            password: "logout",
            timeout: 3000
          }).always(function(){ /* ignore result */ });
        } else if (window.fetch) {
          // fetch cannot set username/password directly; send a request likely to 401
          fetch(sBaseUri + "__logout_probe__" + Date.now(), { credentials: "include", cache: "no-store" }).catch(function(){});
        }
      } catch (e2) {}
    }
  });
});
