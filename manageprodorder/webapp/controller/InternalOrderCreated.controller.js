sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
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
            oViewModel.setProperty("/flag", oArgs.PFLAG || "");
        },
        onSign: function () {
            var oViewModel = this.getView().getModel("internalOrderCreated");
            // Implement digital signature navigation here
            this.getOwnerComponent().getRouter().navTo("DigitalSignatureItems", {
                MBLNR: oViewModel.getProperty("/docNumber"),
                Flag: "X"
                // MJAHR: oViewModel.getProperty("/docYear")
            });
        },
        onNavHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },
        onPrint: function () {
            var oMainModelRef = this.getOwnerComponent().getModel("PickForCartMainModel").getData();
            var oIssueItemsModel = this.getOwnerComponent().getModel("issueCartItems");
            var aItems = (oIssueItemsModel && oIssueItemsModel.getProperty("/items")) || [];
            // this.getOwnerComponent().getModel("IssueBasedonReservationMainModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oMainModelRef.DATA || {},
                HEAD: oMainModelRef.HEAD || {},
                ITEM: aItems,

                BUS: oMainModelRef.BUS || [],
                CHECK: "",
                DOC: {
                    MBLNR: "",
                    MJAHR: ""
                },
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_3_PRINT";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    var oI18n = that.getView().getModel("i18n").getResourceBundle();
                    that.getView().setBusy(false);


                    // Bind response to the view model



                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    MessageBox.success(response.MSG.MSGTX || oI18n.getText("Successfullyprint"));




                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onChangeParkingStatus: function () {
            var oMainModelRef = this.getOwnerComponent().getModel("PickForCartMainModel").getData();

            // this.getOwnerComponent().getModel("IssueBasedonReservationMainModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oMainModelRef.DATA || {},

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_3_PARK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);
                    var oI18n = that.getView().getModel("i18n").getResourceBundle();

                    // Bind response to the view model



                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    MessageBox.success(response.MSG.MSGTX || oI18n.getText("SuccessfullypickingStatus"));




                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
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