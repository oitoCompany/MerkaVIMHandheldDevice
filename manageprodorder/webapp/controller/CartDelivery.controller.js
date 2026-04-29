sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "com/merkavim/ewm/manageprodorder/service/MockDataService"
], function (Controller, MessageBox, MessageToast, MockDataService) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.CartDelivery", {
        onInit: function () {
            // Initialize the digital signature model
            var PickForCartModel = new sap.ui.model.json.JSONModel({
                CART: "",
                // ISSUED_ITEMS: false,
                // ITEMS_IN_STOCK: false



            });
            this.getView().setModel(PickForCartModel, "CartModel");
            // Attach route matched event to reset view on navigation
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("CartDelivery").attachPatternMatched(this._onRouteMatched, this);
        },
        onLiveChangeMaterialDocument: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oMultiInput = oEvent.getSource();
            var sFilteredValue = sValue.replace(/[^0-9]/g, ''); // Remove non-numeric characters
            oMultiInput.setValue(sFilteredValue);

        },
        onSelectPartial: function (oEvent) {
            var oValue = oEvent.getParameter("selected");
            var oModel = this.getView().getModel("CartModel");
            oModel.setProperty("/ISSUED_ITEMS", oValue);
            if (oValue) {

                oModel.setProperty("/ITEMS_IN_STOCK", false);
            }
        },
        onSelectOnlyInStock: function (oEvent) {
            var oValue = oEvent.getParameter("selected");
            var oModel = this.getView().getModel("CartModel");
            oModel.setProperty("/ITEMS_IN_STOCK", oValue);
            if (oValue) {

                oModel.setProperty("/ISSUED_ITEMS", false);
            }
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
            // var oArgs = oEvent.getParameter("arguments") || {};
            var oView = this.getView();
            // var CART = oArgs.CART || "";
            // this.routeFlag = oArgs.Flag || "";
            // this.onLoadingData();

           
            // this.getOwnerComponent().getModel("PickForCartCheckModel").setProperty("/FLAG", "X");
            // this.onDisplay(CART);
            // }





        },
       
        onLoadingData: function () {
            var oListTapiModel = this.getOwnerComponent().getModel("CartdlvListModel");

            oListTapiModel.setData([]);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: {
                    "SPRAS": lang.toUpperCase() || "E"
                },

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "DLV_CART_INIT";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model



                    oListTapiModel.setData(response || {});

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }




                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },

        //  /   * Helper to set focus on material input field with proper timing
        //  */
        _setMaterialFocus: function () {
            var that = this;
            // Use requestAnimationFrame for better timing with UI rendering
            window.requestAnimationFrame(function () {
                setTimeout(function () {
                    var oMaterialInput = that.getView().byId("InputPcT");
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
            var oMultiInput = this.getView().byId("InputPcT");


            // Still use the validator function (from Method 1) for values pasted via copy/paste

            that._setMaterialFocus();

            // var inputfocus1 = this.getView().byId("materialInput");
            oMultiInput.attachBrowserEvent("focusin", function () {
                oMultiInput.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });

        },


        _resetView: function () {
            var oModel = this.getView().getModel("CartModel");
            oModel.setData({
                CART: "",
                // ISSUED_ITEMS: false,
                // ITEMS_IN_STOCK: false

            });
            var oMultiInput = this.getView().byId("InputPcT");
            oMultiInput.setValue("");
        },

       
       

        onDisplay: function () {
            var oModel = this.getView().getModel("CartModel");

            var ResInput = this.getView().byId("InputPcT").getValue();
            var oListModel = this.getOwnerComponent().getModel("CartdlvListModel");
            // var oMainModelRef = this.getOwnerComponent().getModel("PickForCartMainModel");
            // var clearModelCheck = this.getOwnerComponent().getModel("PickForCartCheckModel");



            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: {
                    "CART": ResInput,
                    // "BKTXT": oModel.getProperty("/BKTXT") || "",
                    // "ISSUED_ITEMS": oModel.getProperty("/ISSUED_ITEMS") === true ? "X" : "",
                    // "ITEMS_IN_STOCK": oModel.getProperty("/ITEMS_IN_STOCK") === true ? "X" : "",
                    "SPRAS": lang.toUpperCase() || "E"
                },

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_1_DATA";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model

                    for (var i = 0; i < response.ITEM.length; i++) {
                        response.ITEM[i].NumberRow = i + 1;
                    }
                    oListModel.setData(response.ITEM || response);
                    oMainModelRef.setData(response || {});

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    clearModelCheck.setProperty("/FLAG", "");
                    if (that.coreFlag === "X") {
                        that.onPrint();
                    } else {
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        oRouter.navTo("PickForCartIDetails");
                    }


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onCartCheck: function () {
            var oModel = this.getView().getModel("CartModel");
            var ResInput = this.getView().byId("InputPcT").getValue();
            var oListModel = this.getOwnerComponent().getModel("CartdlvListModel");
            // Validation
            // if (!ResInput || ResInput.length === 0) {
            //     var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //     MessageBox.error(oBundle.getText("requiredFieldsErrorCart") || "Please enter at least one Cart Number");
            //     return;
            // }
            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: {
                    "CART": ResInput,
                    // "BKTXT": oModel.getProperty("/BKTXT") || "",
                    // "ISSUED_ITEMS": oModel.getProperty("/ISSUED_ITEMS") === true ? "X" : "",
                    // "ITEMS_IN_STOCK": oModel.getProperty("/ITEMS_IN_STOCK") === true ? "X" : "",
                    "SPRAS": lang.toUpperCase() || "E"
                },

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "DLV_CART_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model

                    // for( var i=0; i<response.ITEM.length; i++){
                    //     response.ITEM[i].NumberRow = i+1;
                    // }
                    // oListModel.setData(response.ITEM || response);
                    // oMainModelRef.setData(response || {});

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    oListModel.setData(response);
                    // that.coreFlag = "";
                    // that.onDisplay();
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("CartDlvIDetails");


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },

        onDisplayList: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("CartDLVList");
        },

        onClearSearch: function () {
            var oModel = this.getView().getModel("CartModel");
            oModel.setProperty("/CART", "");
            // oModel.setProperty("/ISSUED_ITEMS", false);
            // oModel.setProperty("/ITEMS_IN_STOCK", false);
            this.getView().byId("InputPcT").setValue();

            // Set focus back to material document input
            setTimeout(() => {
                var oMaterialDocInput = this.getView().byId("InputPcT");
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
