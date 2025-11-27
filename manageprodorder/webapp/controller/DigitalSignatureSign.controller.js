sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.DigitalSignatureSign", {
        onInit: function () {
            // Attach route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("DigitalSignatureSign").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Get saved document data from component model
            var oSavedDocModel = this.getOwnerComponent().getModel("savedDocument");
            if (!oSavedDocModel || !oSavedDocModel.getProperty("/MBLNR")) {
                // If no data, navigate back to search
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("DigitalSignature");
                return;
            }

            // Set the saved document model to the view
            this.getView().setModel(oSavedDocModel, "savedDocument");
        },

        onContinue: function () {
            // Navigate back to home
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteView1");
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("DigitalSignature", {}, true);
        }
    });
});
