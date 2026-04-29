sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "com/merkavim/ewm/manageprodorder/service/MockDataService"
], function (Controller, MessageBox, MessageToast, MockDataService) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.IssueBasedonReservation", {
        onInit: function () {
            // Initialize the digital signature model
            var IssueBasedonReservationModel = new sap.ui.model.json.JSONModel({
                MBLNR: "",
                BKTXT: "",
                documentTokens: []
            });
            this.getView().setModel(IssueBasedonReservationModel, "IssueBasedonReservationModel");
            // Attach route matched event to reset view on navigation
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("IssueBasedonReservation").attachPatternMatched(this._onRouteMatched, this);
        },
        onLiveChangeMaterialDocument: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oMultiInput = oEvent.getSource();
            var sFilteredValue = sValue.replace(/[^0-9]/g, ''); // Remove non-numeric characters
            oMultiInput.setValue(sFilteredValue);

        },
        _validateNumericInput: function (sValue) {
            var sText = sValue.text;
            // Use a regular expression to check if the input contains only digits
            var numeric = /^\d+$/;
            if (numeric.test(sText)) {
                // Input is a valid number, create a token
                return new sap.m.Token({
                    text: sText
                });
            } else {

                return null; // Return null to prevent token creation
            }
        },
       
        _onRouteMatched: function (oEvent) {
            // Reset the model when the route is matched
            this._resetView();
            var that = this;
            that._setMaterialFocus();
           
            

           

        },

        //  /   * Helper to set focus on material input field with proper timing
        //  */
        _setMaterialFocus: function () {
            var that = this;
            // Use requestAnimationFrame for better timing with UI rendering
            window.requestAnimationFrame(function () {
                setTimeout(function () {
                    var oMaterialInput = that.getView().byId("ReservationNumberInput");
                    if (oMaterialInput && oMaterialInput.getDomRef()) {
                        oMaterialInput.focus();
                        // Force focus multiple times to override UI5's automatic focus management
                        setTimeout(function () {
                            if (oMaterialInput && oMaterialInput.getDomRef()) {
                                oMaterialInput.focus();
                            }
                        }, 100);
                        setTimeout(function () {
                            if (oMaterialInput && oMaterialInput.getDomRef()) {
                                oMaterialInput.focus();
                            }
                        }, 300);
                        setTimeout(function () {
                            if (oMaterialInput && oMaterialInput.getDomRef()) {
                                oMaterialInput.focus();
                            }
                        }, 500);
                    }
                }, 200);
            });
        },

        onAfterRendering: function () {
            var that = this;
            var oMultiInput = this.getView().byId("ReservationNumberInput");
           
           
            // Still use the validator function (from Method 1) for values pasted via copy/paste
            
            that._setMaterialFocus();
            
            // var inputfocus1 = this.getView().byId("materialInput");
            oMultiInput.attachBrowserEvent("focusin", function () {
                oMultiInput.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });
    
        },


        _resetView: function () {
            // var oModel = this.getView().getModel("IssueBasedonReservationModel");
            // oModel.setData({
            //     MBLNR: "",
            //     BKTXT: "",
            //     documentTokens: []
            // });
            var oMultiInput = this.getView().byId("ReservationNumberInput");
            oMultiInput.setValue("");
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
     

        onAddDocument: function (oEvent) {
            var oMultiInput = this.getView().byId("inpMaterialDocument1");
            var sValue = oMultiInput.getValue();

            if (sValue && sValue.trim()) {
                this._addDocumentToken(sValue.trim());
                // Clear the input field after adding the token
                oMultiInput.setValue("");
                // Set focus back to input
                
                setTimeout(function () {
                    oMultiInput.focus();
                }, 100);
            } else {
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageToast.show(oBundle.getText("enterreservationNumber") || "Please enter a Reservation number");
            }
        },

        onTokenUpdate: function (oEvent) {
            var sType = oEvent.getParameter("type");
            var aRemovedTokens = oEvent.getParameter("removedTokens");

            if (sType === "removed" && aRemovedTokens && aRemovedTokens.length > 0) {
                var oModel = this.getView().getModel("IssueBasedonReservationModel");
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
            this._setMaterialFocus();
        },

        onTokenDelete: function (oEvent) {
            var oToken = oEvent.getSource();
            var sKey = oToken.getKey();
            var oModel = this.getView().getModel("IssueBasedonReservationModel");
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
            var oModel = this.getView().getModel("IssueBasedonReservationModel");
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
                MessageToast.show(oBundle.getText("duplicatereservationError") || "Reservation number already added");
            }
             
        },
        onDisplay: function () {
            var oModel = this.getView().getModel("IssueBasedonReservationModel");
            var aDocumentTokens = oModel.getProperty("/documentTokens");
            var oListModel = this.getOwnerComponent().getModel("IssueBasedonReservationItemModel");
            var ResInput = this.getView().byId("ReservationNumberInput").getValue();
            var oMainModelRef = this.getOwnerComponent().getModel("IssueBasedonReservationMainModel");

            // Validation
            if (!ResInput || ResInput.length === 0) {
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oBundle.getText("requiredFieldsErrorReservation") || "Please enter at least one Reservation Number");
                return;
            }
            // Get all document numbers
           
            // this.getOwnerComponent().getModel("IssueBasedonReservationMainModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
             var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE"? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0,1);
            var oPayload = {
                DATA: {
                    "RSNUM": ResInput,
                    "BKTXT": oModel.getProperty("/BKTXT") || "",
                    "SPRAS": lang || "E"
                },
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_RES_1_DATA";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model
                    oListModel.setData(response.ITEM || response);
                    oMainModelRef.setData(response || {});

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("IssueBasedOnReservationItems");


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },

       

        onClearSearch: function () {
            var oModel = this.getView().getModel("IssueBasedonReservationModel");
            oModel.setProperty("/MBLNR", "");
            oModel.setProperty("/BKTXT", "");
            oModel.setProperty("/documentTokens", []);
            this.getView().byId("ReservationNumberInput").setValue();

            // Set focus back to material document input
            setTimeout(() => {
                var oMaterialDocInput = this.getView().byId("ReservationNumberInput");
                if (oMaterialDocInput) {
                    oMaterialDocInput.focus();
                }
            }, 0);
        },

        onNavBack: function () {
           
             var that = this;
            MessageBox.warning(
                that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ScreenExitWarningTitle"), {
                actions: [that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"), MessageBox.Action.CANCEL],
                emphasizedAction: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"),
                onClose: function (sAction) {
                    if (sAction === that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm")) {
                        // User confirmed deletion
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                            oRouter.navTo("RouteView1", {}, true);
                            
                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });
        }
    });
});
