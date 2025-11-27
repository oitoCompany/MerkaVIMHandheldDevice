sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "com/merkavim/ewm/manageprodorder/service/MockDataService"
], function (Controller, MessageBox, MessageToast, MockDataService) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.DigitalSignature", {
        onInit: function () {
            // Initialize the digital signature model
            var oDigitalSignatureModel = new sap.ui.model.json.JSONModel({
                MBLNR: "",
                documentTokens: []
            });
            this.getView().setModel(oDigitalSignatureModel, "digitalSignature");

            // Attach route matched event to reset view on navigation
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("DigitalSignature").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Reset the model when the route is matched
            this._resetView();

            // Set focus on material document input
            setTimeout(() => {
                var oMaterialDocInput = this.getView().byId("inpMaterialDocument");
                if (oMaterialDocInput) {
                    oMaterialDocInput.focus();
                }
            }, 200);
        },

        _resetView: function () {
            var oModel = this.getView().getModel("digitalSignature");
            oModel.setData({
                MBLNR: "",
                documentTokens: []
            });
        },

        onSubmitToken: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oMultiInput = oEvent.getSource();
            
            if (sValue && sValue.trim()) {
                this._addDocumentToken(sValue.trim());
                // Clear the input field after adding the token
                oMultiInput.setValue("");
            }
        },

        onAddDocument: function () {
            var oMultiInput = this.getView().byId("inpMaterialDocument");
            var sValue = oMultiInput.getValue();
            
            if (sValue && sValue.trim()) {
                this._addDocumentToken(sValue.trim());
                // Clear the input field after adding the token
                oMultiInput.setValue("");
                // Set focus back to input
                setTimeout(function() {
                    oMultiInput.focus();
                }, 100);
            } else {
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageToast.show(oBundle.getText("enterDocumentNumber") || "Please enter a document number");
            }
        },

        onTokenUpdate: function (oEvent) {
            var sType = oEvent.getParameter("type");
            var aRemovedTokens = oEvent.getParameter("removedTokens");
            
            if (sType === "removed" && aRemovedTokens && aRemovedTokens.length > 0) {
                var oModel = this.getView().getModel("digitalSignature");
                var aTokens = oModel.getProperty("/documentTokens");
                
                aRemovedTokens.forEach(function (oToken) {
                    var sKey = oToken.getKey();
                    var iIndex = aTokens.findIndex(function (oT) {
                        return oT.key === sKey;
                    });
                    if (iIndex > -1) {
                        aTokens.splice(iIndex, 1);
                    }
                });
                
                oModel.setProperty("/documentTokens", aTokens);
            }
        },

        onTokenDelete: function (oEvent) {
            var oToken = oEvent.getSource();
            var sKey = oToken.getKey();
            var oModel = this.getView().getModel("digitalSignature");
            var aTokens = oModel.getProperty("/documentTokens");
            
            var iIndex = aTokens.findIndex(function (oT) {
                return oT.key === sKey;
            });
            
            if (iIndex > -1) {
                aTokens.splice(iIndex, 1);
                oModel.setProperty("/documentTokens", aTokens);
            }
        },

        _addDocumentToken: function (sValue) {
            var oModel = this.getView().getModel("digitalSignature");
            var aTokens = oModel.getProperty("/documentTokens");
            
            // Check for duplicates
            var bExists = aTokens.some(function (oToken) {
                return oToken.key === sValue;
            });
            
            if (!bExists) {
                aTokens.push({
                    key: sValue,
                    text: sValue
                });
                oModel.setProperty("/documentTokens", aTokens);
            } else {
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageToast.show(oBundle.getText("duplicateDocumentError") || "Document number already added");
            }
        },

        onDisplay: function () {
            var oModel = this.getView().getModel("digitalSignature");
            var aDocumentTokens = oModel.getProperty("/documentTokens");

            // Validation
            if (!aDocumentTokens || aDocumentTokens.length === 0) {
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oBundle.getText("requiredFieldsError") || "Please enter at least one Material Document Number");
                return;
            }

            // Get all document numbers
            var aDocumentNumbers = aDocumentTokens.map(function (oToken) {
                return oToken.key;
            });

            var that = this;
            this.getView().setBusy(true);

            // Process multiple documents - you can either:
            // 1. Call the service for each document individually
            // 2. Send all documents in a single batch call if backend supports it
            
            // Option 1: Individual calls (demonstrating with first document)
            // For production, you'd want to iterate through all or use Promise.all
            var oPayload = {
                MBLNR: aDocumentNumbers[0], // First document
                DOCUMENTS: aDocumentNumbers // All documents if backend supports batch
            };

            MockDataService.call("DIGI_SIGN_LOAD", oPayload).then(function (oResponse) {
                that.getView().setBusy(false);

                if (oResponse && oResponse.MSG && oResponse.MSG.MSGTY === "E") {
                    MessageBox.error(oResponse.MSG.MSGTX || "Error loading document");
                    return;
                }

                // Store the full response in component-level model
                var oComponentModel = that.getOwnerComponent().getModel("digitalSignature");
                if (!oComponentModel) {
                    oComponentModel = new sap.ui.model.json.JSONModel();
                    that.getOwnerComponent().setModel(oComponentModel, "digitalSignature");
                }

                // Update model with response data
                var oData = {
                    MBLNR: aDocumentNumbers.join(", "),
                    DOCUMENTS: aDocumentNumbers,
                    BUDAT: "",
                    BLDAT: "",
                    USNAM: "",
                    items: []
                };

                if (oResponse && oResponse.HEAD) {
                    // Keep the comma-separated MBLNR, don't overwrite it
                    oData.BUDAT = oResponse.HEAD.BUDAT;
                    oData.BLDAT = oResponse.HEAD.BLDAT;
                    oData.USNAM = oResponse.HEAD.USNAM;
                }

                if (oResponse && oResponse.ITEMS && Array.isArray(oResponse.ITEMS)) {
                    oData.items = oResponse.ITEMS;
                }

                oComponentModel.setData(oData);

                // Navigate to display screen
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("DigitalSignatureDisplay");
            }).catch(function (error) {
                that.getView().setBusy(false);
                MessageBox.error("Mock data service call failed: " + (error.message || error));
            });
        },

        onClearSearch: function () {
            var oModel = this.getView().getModel("digitalSignature");
            oModel.setProperty("/MBLNR", "");
            oModel.setProperty("/documentTokens", []);
            
            // Set focus back to material document input
            setTimeout(() => {
                var oMaterialDocInput = this.getView().byId("inpMaterialDocument");
                if (oMaterialDocInput) {
                    oMaterialDocInput.focus();
                }
            }, 0);
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteView1", {}, true);
        }
    });
});
