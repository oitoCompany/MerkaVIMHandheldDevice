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
        }
    });
});