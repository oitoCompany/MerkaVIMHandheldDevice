sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/Popover",
  "sap/m/VBox",
  "sap/m/Text",
  "sap/m/Title",
  "sap/m/Bar",
  "sap/m/Button",
  "sap/m/PlacementType",
  "sap/m/MessageBox"
], (BaseController, Popover, VBox, Text, Title, Bar, Button, PlacementType, MessageBox) => {
  "use strict";

  return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.App", {
    onInit() {
      // Load user details from backend (APP_INIT)
      this._loadUser();
    },
    
    onLogoPress: function() {
      try {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        if (oRouter && oRouter.navTo) {
          // Navigate to home route and replace history to avoid stacking
          oRouter.navTo("RouteView1", {}, true);
          return;
        }
      } catch (e) { /* ignore and fallback */ }
      // Fallback: set hash to root
      try { sap.ui.core.routing.HashChanger.getInstance().setHash(""); } catch (e2) {}
    },

    _getLoggedInUserInfo: function() {
      var o = { uname: "", cname: "", email: "" };
      try {
        // 1) Fiori Launchpad user if available
        if (sap && sap.ushell && sap.ushell.Container && sap.ushell.Container.getUser) {
          var u = sap.ushell.Container.getUser();
          if (u) {
            o.uname = (u.getId && u.getId()) || o.uname;
            o.cname = (u.getFullName && u.getFullName()) || o.cname;
            o.email = (u.getEmail && u.getEmail()) || o.email;
          }
        }
      } catch (e1) { /* ignore */ }
      try {
        // 2) Local storage profile if present
        if ((!o.uname || !o.cname || !o.email) && window.localStorage) {
          var s = window.localStorage.getItem("appUserProfile");
          if (s) {
            var p = JSON.parse(s);
            o.uname = o.uname || p.username || p.user || p.UNAME || "";
            o.cname = o.cname || p.name || p.CNAME || "";
            o.email = o.email || p.email || p.E_MAIL || "";
          }
        }
      } catch (e2) { /* ignore */ }
      try {
        // 3) Component 'user' model as fallback
        if (!o.uname || !o.cname || !o.email) {
          var m = this.getOwnerComponent().getModel("user");
          if (m) {
            var d = m.getData && m.getData();
            if (d) {
              o.uname = o.uname || d.username || d.user || d.UNAME || "";
              o.cname = o.cname || d.name || d.CNAME || "";
              o.email = o.email || d.email || d.E_MAIL || "";
            }
          }
        }
      } catch (e3) { /* ignore */ }
      return o;
    },

    _loadUser: function() {
      try {
        var that = this;
        var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
        var url = "APP_INIT";
        // Build payload with current user info as required by service
        var u = this._getLoggedInUserInfo();
        var payload = { UNAME: u.uname || "", CNAME: u.cname || "", E_MAIL: u.email || "" };
        jQuery.ajax({
          url: baseUrl + url,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(payload),
          success: function(oResp) {
            try {
              var oUserModel = that.getOwnerComponent().getModel("user");
              if (!oUserModel) {
                oUserModel = new sap.ui.model.json.JSONModel({});
                that.getOwnerComponent().setModel(oUserModel, "user");
              }
              var r = oResp && (oResp.DATA || oResp.data || oResp) || {};
              var sUser = (r.UNAME || r.User || r.user) || "";
              var sName = (r.CNAME || r.NAME || r.name) || sUser || "";
              var sEmail = (r.E_MAIL || r.EMAIL || r.email) || "";
              oUserModel.setProperty("/username", sUser);
              oUserModel.setProperty("/name", sName);
              oUserModel.setProperty("/email", sEmail);
              oUserModel.setProperty("/loggedIn", true);
              oUserModel.setProperty("/authChecked", true);
              try { window.localStorage && window.localStorage.setItem("appUserProfile", JSON.stringify(oUserModel.getData())); } catch(e) {}
            } catch (e) { /* swallow mapping errors */ }
          },
          error: function() {
            // Explicitly mark as not logged in so guards can redirect
            try {
              var oUserModel = that.getOwnerComponent().getModel("user");
              if (!oUserModel) {
                oUserModel = new sap.ui.model.json.JSONModel({});
                that.getOwnerComponent().setModel(oUserModel, "user");
              }
              oUserModel.setProperty("/loggedIn", false);
              oUserModel.setProperty("/authChecked", true);
              try { window.localStorage && window.localStorage.removeItem("appUserProfile"); } catch(e) {}
              try {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter && oRouter.navTo("Logout", {}, true);
              } catch (_) { /* ignore navigation issues */ }
            } catch (e) { /* ignore */ }
          }
        });
      } catch (e) {
        // ignore init errors
      }
    },

    _getUserPopover: function() {
      if (!this._oUserPopover) {
        var oUserModel = this.getOwnerComponent().getModel("user");
        this._oUserPopover = new Popover({
          placement: PlacementType.Bottom,
          showHeader: false,
          contentWidth: "260px",
          content: [
            new VBox({
              width: "100%",
              items: [
                new Title({ text: "Signed in", level: "H4" }).addStyleClass("sapUiTinyMarginBottom"),
                new Text({ text: "{user>/name}" }),
                new Text({ text: "{user>/email}" })
              ]
            }).addStyleClass("sapUiSmallMargin")
          ],
          footer: new Bar({
            contentRight: [
              new Button({ text: "Logout", type: "Transparent", press: this.onLogoutPress.bind(this) })
            ]
          })
        });
        this._oUserPopover.setModel(oUserModel, "user");
      }
      return this._oUserPopover;
    },

    onUserButtonPress: function(oEvent) {
      var oSource = oEvent.getSource();
      this._getUserPopover().openBy(oSource);
    },

    onLogoutPress: function() {
      if (this._bLoggingOut) { return; }

      var that = this;
      var proceedLogout = function() {
        that._bLoggingOut = true;

        var goToLogoutRoute = function() {
          try {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
            // Replace history to avoid navigating back into protected routes
            oRouter && oRouter.navTo("Logout", {}, true);
          } catch (e) {
            // As a last resort, drop the hash so the app reloads at entry
            try { sap.ui.core.routing.HashChanger.getInstance().setHash(""); } catch (_) {}
          } finally {
            setTimeout(function(){ that._bLoggingOut = false; }, 500);
          }
        };

        try {
          if (that._oUserPopover && that._oUserPopover.isOpen && that._oUserPopover.isOpen()) {
            var fnAfterClose = function() {
              try { that._oUserPopover.detachAfterClose(fnAfterClose); } catch (_) {}
              goToLogoutRoute();
            };
            try { that._oUserPopover.attachAfterClose(fnAfterClose); } catch (_) {}
            that._oUserPopover.close();
          } else {
            goToLogoutRoute();
          }
        } catch (e) {
          goToLogoutRoute();
        }
      };

      var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      MessageBox.confirm(oBundle.getText("logoutConfirmMessage"), {
        title: oBundle.getText("logoutConfirmTitle"),
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: function(oAction) {
          if (oAction === MessageBox.Action.OK) {
            proceedLogout();
          }
        }
      });
    }
  });
});