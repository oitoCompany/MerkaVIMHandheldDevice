sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], (Controller, MessageBox) => {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.View1", {
        onInit() {
            // Set default tile headers
            this._setTileHeaders();
        },

        onAfterRendering: function() {
            // show info message box: Do not refresh during dispensing (localized)
            // try {
            //     var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //     var sMsg = oBundle.getText("dontRefreshMessage");
            //     MessageBox.information(sMsg);
            // } catch (e) {
            //     // fallback (shouldn't occur if i18n model is configured)
            //     MessageBox.information("Do not refresh the screen during dispensing");
            // }
            var oTilesModel = this.getOwnerComponent().getModel("TilesModel");
            oTilesModel.setData([]);
            var oPayload={};
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "APP_LIST";
            var that = this;
            $.ajax({
                url: baseUrl + url,
                method: "POST",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify(oPayload),
                success: function (oResponse) {
                    if (oResponse && oResponse.MSG && oResponse.MSG.MSGTY === "E") {
                        MessageBox.error(oResponse.MSG.MSGTX || "Error occurred");
                        return;
                    }
                       oTilesModel.setData(oResponse.APPS || []);
                    // Map response back to newEntry fields for user convenience
                  
                },
                error: function (xhr, status, error) {
                    MessageBox.error("Backend call failed: " + (xhr.responseText || status));
                }
            });
        },

        onTilePress: function(oEvent) {
            var oTile = oEvent.getSource();
            var sAppName = oTile.getBindingContext("TilesModel").getProperty("APP_NAME");
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo(sAppName);
        },

        /**
         * Set tile headers with default values
         */
        _setTileHeaders: function() {
            var oTileProductionOrder = this.getView().byId("ProductionOrder");
            if (oTileProductionOrder) {
                oTileProductionOrder.setHeader("Production Order");
            }
            
            var oTileInternalOrder = this.getView().byId("IssueInternalOrder");
            if (oTileInternalOrder) {
                oTileInternalOrder.setHeader("Issue Internal Order");
            }
            
            var oTileDigitalSignature = this.getView().byId("DigitalSignature");
            if (oTileDigitalSignature) {
                oTileDigitalSignature.setHeader("Digital Signature");
            }
        },

        onProductionOrderPress: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("ProductionOrder");
        },
        
        onIssueInternalOrderPress: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("IssueInternalOrder");
        },
        
        onDigitalSignaturePress: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("DigitalSignature");
        },
        onIssueBasedonReservationPress: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("IssueBasedonReservation");
        }
    });
});