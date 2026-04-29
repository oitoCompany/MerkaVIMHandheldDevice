sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"

], function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.DigitalSignatureItems", {
        onInit: function () {
            // Initialize the digital signature model


            // Attach route matched event to reset view on navigation
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("DigitalSignatureItems").attachPatternMatched(this._onRouteMatched, this);
        },
             formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },

        _onRouteMatched: function (oEvent) {
            // Reset the model when the route is matched
            var oArgs = oEvent.getParameter("arguments") || {};
            var oView = this.getView();
            var MBLNR = oArgs.MBLNR || "";
            this.routeFlag = oArgs.Flag || "";

            if (MBLNR !== "" && MBLNR !== undefined) {


                this.onDisplay(MBLNR);
            }


        },
        onDisplay: function (MBLNR) {

            var oListModel = this.getOwnerComponent().getModel("MaterialDocumentItemModel");


            var aDocumentNumbers = [MBLNR];
            var aDocumentTokens = [
                { key: MBLNR, text: MBLNR }
            ];

            this.getOwnerComponent().getModel("MaterialDocumentokenModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
             var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE"? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0,1);
            var oPayload = {
                DATA: {
                    "IT_MBLNR": aDocumentNumbers,
                    "SPRAS": lang || "E"
                },
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SIGN_1_DATA";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model
                    oListModel.setData(response.ITEM || response);

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    // var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    // oRouter.navTo("DigitalSignatureItems");


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onAfterRendering: function () {


        },
        onContinue: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("DigitalSignatureDisplay", {}, true);
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            if(this.routeFlag==="X"){
                oRouter.navTo("RouteView1", {}, true);
                
            }else{
                oRouter.navTo("DigitalSignature", {}, true);
            }
            
        }
    });
});
