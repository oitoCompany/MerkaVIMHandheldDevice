sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.InternalOrderCreated", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("InternalOrderCreated").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments") || {};
            var oView = this.getView();
            var oViewModel = oView.getModel("internalOrderCreated");
            if (!oViewModel) {
                oViewModel = new sap.ui.model.json.JSONModel();
                oView.setModel(oViewModel, "internalOrderCreated");
            }
            // Defensive: fallback to empty string if undefined
            oViewModel.setProperty("/docNumber", oArgs.MBLNR || "");
            oViewModel.setProperty("/docYear", oArgs.MJAHR || "");
        },
        onSign: function () {
            // Implement digital signature navigation here
        },
        onNavHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onNavBack: function () {
            // Clear items in the destination view's model
            var oItemsModel = this.getOwnerComponent().getModel("items");
            if (oItemsModel) {
                oItemsModel.setProperty("/items", []);
            }
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        }
    });
});