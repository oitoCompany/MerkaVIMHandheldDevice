sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.StockTransferBetweenSL", {
        // Track last material to decide when to clear LGORT on next Enter
        _lastMaterialEntered: null,
        onBeforeRendering: function () {
            // Clear all fields in the view model every time the page is shown
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                "WERKS": "",
                "LGORT_F": "",
                "LGORT_T": "",
                "MATNR": "",
                "MEINS": "",
                "LGPBE": "",
                "LABST": "",
                "MAKTX": "",
                "BKTXT": "",
                "CHARG_SERNR": "",
                "PICKING_QTY": "",
                "SPRAS": "e",
                "CHECK": ""
            }), "view");
        },

        /**
         * Helper to set focus on material input field with proper timing
         */
        _setMaterialFocus: function () {
            var that = this;
            // Use requestAnimationFrame for better timing with UI rendering
            window.requestAnimationFrame(function () {
                setTimeout(function () {
                    var oMaterialInput = that.getView().byId("materialInput1");
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

        /**
         * Handler for Enter key press on input fields
         * @param {sap.ui.base.Event} oEvent
         */
        onEnterPress: function (oEvent) {
            console.log("Enter key pressed on screen");
            var oView = this.getView();
            var oModel = oView.getModel("view");
            var oData = oModel.getData();

            if (!oData.WERKS) {
                var oGlobalWerksModel = this.getOwnerComponent().getModel("globalWerks");
                // fallback to the view model if global not available
                oData.WERKS = (oGlobalWerksModel && oGlobalWerksModel.getProperty("/WERKS")) || oModel.getProperty("/WERKS") || "";
            }

            // Only clear fields if material changed since last Enter
            var sCurrentMat = (oData.MATNR || "").trim();
            var sLastMat = (this._lastMaterialEntered || "").trim();
            var bMaterialChanged = sCurrentMat !== sLastMat;
            if(sLastMat === ""){
                bMaterialChanged = false;
            }
            
            oData.LGORT_T = bMaterialChanged ? "" : (oData.LGORT_T || "");
            oData.LGORT_F = bMaterialChanged ? "" : (oData.LGORT_F || "");
            oData.MAKTX = bMaterialChanged ? "" : (oData.MAKTX || "");
            oData.LGPBE = bMaterialChanged ? "" : (oData.LGPBE || "");
            // oData.MEINS = bMaterialChanged ? "" : (oData.MEINS || "");
            oData.LABST = bMaterialChanged ? "" : (oData.LABST || "");
            oData.CHECK = "";

            // Build payload
            var oPayload = {
                DATA: oData,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {

                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }
                    if (response.DATA.LABST === 0) {
                        response.DATA.LABST = "";
                    }

                    // Bind response to the view model
                    oModel.setData(response.DATA || response);

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    // Update last material after successful check
                    that._lastMaterialEntered = (oModel.getProperty("/MATNR") || sCurrentMat || null);

                    // sap.m.MessageToast.show("Data updated from server.");
                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
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
                        that.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({
                            items: []
                        }), "SLitems");
                        that.getOwnerComponent().getRouter().navTo("RouteView1");
                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });

        },

        onNavHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            var that = this;
            oRouter.getRoute("StockTransferBetweenSL").attachMatched(function (oEvent) {
                var oArgs = oEvent.getParameter("arguments") || {};
                var oView = that.getView();
                // var Flag = oArgs.Flag || "";
                // var Aufnrn = "";
                // var Kostln = "";
                var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
                that.getView().setModel(new sap.ui.model.json.JSONModel({
                    "WERKS": "",
                    "LGORT_F": "",
                    "LGORT_T": "",
                    "MATNR": "",
                    "MEINS": "",
                    "LGPBE": "",
                    "LABST": "",
                    "MAKTX": "",
                    "BKTXT": "",
                    "CHARG_SERNR": "",
                    "PICKING_QTY": "",
                    "SPRAS": lang || "E",
                    "CHECK": ""
                }), "view");
                // Set focus on material input when route is matched
                that._setMaterialFocus();


            });
            // Clear all fields in the view model on initialization
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                "WERKS": "",
                "LGORT_F": "",
                "LGORT_T": "",
                "MATNR": "",
                "MEINS": "",
                "LGPBE": "",
                "LABST": "",
                "MAKTX": "",
                "BKTXT": "",
                "CHARG_SERNR": "",
                "PICKING_QTY": "",
                "SPRAS": lang || "E",
                "CHECK": ""
            }), "view");

            // Simple approach: bind Enter to this view only via event delegate (no global listeners)
            var that = this;
            this._oEnterDelegate = {
                onsapenter: function (oEvent) {
                    that.onEnterPress(oEvent);
                }
            };
            this.getView().addEventDelegate(this._oEnterDelegate);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                "DATA": {
                "WERKS": "",
                "LGORT_F": "",
                "LGORT_T": "",
                "MATNR": "",
                "MEINS": "",
                "LGPBE": "",
                "LABST": 0,
                "MAKTX": "",
                "BKTXT": "",
                "CHARG_SERNR": "",
                "PICKING_QTY": 0,
                "SPRAS": lang || "E",
                "CHECK": ""
            }
            };

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_INIT";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (oData) {

                    if (oData.DATA.LABST === 0) {
                        oData.DATA.LABST = "";
                    }
                    if (oData.DATA.PICKING_QTY === 0) {
                        oData.DATA.PICKING_QTY = "";
                    }
                    var oStockTransferModel = new sap.ui.model.json.JSONModel(oData);
                    that.getOwnerComponent().getModel("StockTransferInitModel").setData(oData);
                    that.getView().setModel(oStockTransferModel, "StockTransferInitModel");
                    let oModel = that.getView().getModel("view");

                    oModel.setData(oData.DATA || response);
                    // Save WERKS globally on the component for later use
                    if (oData.DATA && oData.DATA.WERKS) {
                        that.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({ WERKS: oData.DATA.WERKS }), "globalWerks");
                    }

                    // Set focus on material input after model is loaded
                    that._setMaterialFocus();

                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch F4 help data");
                }
            });
        },
        onAfterRendering: function () {
            var inputfocus = this.getView().byId("issueQuantityInputu");
            inputfocus.attachBrowserEvent("focusin", function () {
                inputfocus.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });
            var inputfocus1 = this.getView().byId("materialInput1");
            inputfocus1.attachBrowserEvent("focusin", function () {
                inputfocus1.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });
            var inputfocus2 = this.getView().byId("issuingStorageLocationInput1");
            inputfocus2.attachBrowserEvent("focusin", function () {
                inputfocus2.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });
            var inputfocus3 = this.getView().byId("itemLocatorInputw");

            inputfocus3.attachBrowserEvent("focusin", function () {
                inputfocus3.$().find("input").select();
                this.selectText(0, this.getValue().length);
            });

        },
        onClearFields: function () {
            var oModel = this.getView().getModel("view");
            var oData = oModel.getData();
            oModel.setData({
                "WERKS": oData.WERKS,
                "LGORT_F": "",
                "LGORT_T": "",
                "MATNR": "",
                "MEINS": "",
                "LGPBE": "",
                "LABST": "",
                "MAKTX": "",
                "BKTXT": "",
                "CHARG_SERNR": "",
                "PICKING_QTY": "",
                "SPRAS": oData.SPRAS || "E",
                "CHECK": ""
            });

            this._setMaterialFocus();
            var MatInput = this.getView().byId("materialInput1");
            if (MatInput) {
                jquery.sap.delayedCall(0, this, function () {
                    MatInput.focus();
                })

            }
        },

        onClearFieldsAdd: function () {
            var oModel = this.getView().getModel("view");
            var oData = oModel.getData();
            oModel.setData({
                "WERKS": oData.WERKS,
                "LGORT_F": "",
                "LGORT_T": "",
                "MATNR": "",
                "MEINS": "",
                "LGPBE": "",
                "LABST": "",
                "MAKTX": "",
                "BKTXT": "",
                "CHARG_SERNR": "",
                "PICKING_QTY": "",
                "SPRAS": oData.SPRAS || "E",
                "CHECK": ""
            });
        },
        onLiveChangeOrder: function (oEvent) {
            var oValue = oEvent.getParameter("value");

            if (oValue.length === 0) {
                var oInput = oEvent.getSource();
                oInput.setDescription("");
            }

        },
        onAdd: function () {
            var oViewModel = this.getView().getModel("view");
            var oItemsModel = this.getView().getModel("SLitems");
            var oData = Object.assign({}, oViewModel.getData());
            // Ensure WERKS is present in the item being added
            if (!oData.WERKS) {
                var oGlobalWerksModel = this.getOwnerComponent().getModel("globalWerks");
                oData.WERKS = (oGlobalWerksModel && oGlobalWerksModel.getProperty("/WERKS")) || oViewModel.getProperty("/WERKS") || "";
            }
            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_1_CHECK";
            oData.CHECK = "X";
            var oPayload = {
                DATA: oData,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }
                    // No error, proceed to add
                    oViewModel.setData(response.DATA);

                    var aItems = oItemsModel.getProperty("/items") === undefined ? [] : oItemsModel.getProperty("/items");
                    aItems.push(response.DATA);
                    oItemsModel.setProperty("/items", aItems);
                    // MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("itemAddedSuccess"));
                    that.onClearFieldsAdd();
                    // Set focus back on material input
                    that._setMaterialFocus();
                },
                error: function (xhr, status, error) {
                    MessageBox.error("Failed to check item before adding");
                }
            });
        },
        onContinue: function () {
            var oItemsModel = this.getView().getModel("SLitems");
            var aItems = oItemsModel && oItemsModel.getProperty("/items");
            if (aItems && aItems.length > 0) {
                this.getOwnerComponent().getRouter().navTo("StockTransferbnSLItems", {},true);
            } else {
                var sMsg = this.getView().getModel("i18n").getResourceBundle().getText("noRecordsFound");
                MessageBox.error(sMsg);
            }
        },

        onInternalOrderValueHelp: function (oEvent) {
            var oModel = this.getView().getModel("StockTransferModel");
            var aInternalOrders = oModel && oModel.getProperty("/LIST/AUFNR") ? oModel.getProperty("/LIST/AUFNR") : [];
            var oInput = oEvent.getSource();
            var oDialog = new sap.m.SelectDialog({
                title: "Select Internal Order",
                items: aInternalOrders.map(function (item) {
                    return new sap.m.StandardListItem({
                        title: item.AUFNR_CODE + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.AUFNR_DESC || item.AUFNR + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.AUFNR_DESC,
                        // description: item.AUFNR_DESC || ""
                    });
                }),
                confirm: function (oConfirmEvent) {
                    var oSelected = oConfirmEvent.getParameter("selectedItem");
                    if (oSelected) {
                        oInput.setValue(oSelected.getTitle().split('-')[0].trim());
                        oInput.setDescription(oSelected.getTitle().split('-')[1].trim());
                        try {
                            var oViewModel = oInput.getBindingContext("view").getModel();
                            oViewModel.setProperty("/AUFNR", oSelected.getTitle().split('-')[0].trim());
                        } catch (e) {

                        }
                    }
                },
                search: function (oSearchEvent) {
                    var sValue = oSearchEvent.getParameter("value");
                    var aFiltered = aInternalOrders.filter(function (item) {
                        var code = item.AUFNR_CODE || item.AUFNR;
                        var desc = item.AUFNR_DESC || "";
                        return (desc && desc.toLowerCase().includes(sValue.toLowerCase())) || (code && code.includes(sValue));
                    });
                    oDialog.removeAllItems();
                    aFiltered.forEach(function (item) {
                        oDialog.addItem(new sap.m.StandardListItem({
                            title: item.AUFNR_CODE + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.AUFNR_DESC || item.AUFNR + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.AUFNR_DESC,
                            // description: item.AUFNR_DESC || ""
                        }));
                    });
                }
            });
            oDialog.open();
        },

        onCostCenterValueHelp: function (oEvent) {
            var oModel = this.getView().getModel("StockTransferModel");
            var aCostCenters = oModel && oModel.getProperty("/LIST/KOSTL") ? oModel.getProperty("/LIST/KOSTL") : [];
            var oInput = oEvent.getSource();
            var oDialog = new sap.m.SelectDialog({
                title: "Select Cost Center",
                items: aCostCenters.map(function (item) {
                    return new sap.m.StandardListItem({
                        title: item.KOSTL_CODE + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.KOSTL_DESC || item.KOSTL + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.KOSTL_DESC,
                        // description: item.KOSTL_DESC || ""
                    });
                }),
                confirm: function (oConfirmEvent) {
                    var oSelected = oConfirmEvent.getParameter("selectedItem");
                    if (oSelected) {
                        oInput.setValue(oSelected.getTitle().split('-')[0].trim());
                        oInput.setDescription(oSelected.getTitle().split('-')[1].trim());
                        try {
                            var oViewModel = oInput.getBindingContext("view").getModel();
                            oViewModel.setProperty("/KOSTL", oSelected.getTitle().split('-')[0].trim());
                        } catch (e) { }
                    }
                },
                search: function (oSearchEvent) {
                    var sValue = oSearchEvent.getParameter("value");
                    var aFiltered = aCostCenters.filter(function (item) {
                        var code = item.KOSTL_CODE || item.KOSTL;
                        var desc = item.KOSTL_DESC || "";
                        return (desc && desc.toLowerCase().includes(sValue.toLowerCase())) || (code && code.includes(sValue));
                    });
                    oDialog.removeAllItems();
                    aFiltered.forEach(function (item) {
                        oDialog.addItem(new sap.m.StandardListItem({
                            title: item.KOSTL_CODE + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.KOSTL_DESC || item.KOSTL + '\u00a0\u00a0\u00a0' + '-' + '\u00a0\u00a0\u00a0' + item.KOSTL_DESC,
                            // description: item.KOSTL_DESC || ""
                        }));
                    });
                }
            });
            oDialog.open();
        },

        // Cleanup Enter key listener
        onExit: function () {
            console.log("[IssueInternalOrder] onExit called");
            if (this._oEnterDelegate) {
                try {
                    this.getView().removeEventDelegate(this._oEnterDelegate);
                    console.log("[IssueInternalOrder] Enter delegate removed successfully");
                } catch (e) {
                    console.warn("[IssueInternalOrder] Failed to remove Enter delegate", e);
                }
                this._oEnterDelegate = null;
            } else {
                console.log("[IssueInternalOrder] No Enter delegate to remove");
            }
        }
    });
});