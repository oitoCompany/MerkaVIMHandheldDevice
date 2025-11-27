sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.IssueInternalOrder", {
        // Track last material to decide when to clear LGORT on next Enter
        _lastMaterialEntered: null,
        onBeforeRendering: function () {
            // Clear all fields in the view model every time the page is shown
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                WERKS: "",
                LGORT: "",
                AUFNR: "",
                KOSTL: "",
                MATNR: "",
                MEINS: "",
                LGPBE: "",
                LABST: "",
                MAKTX: "",
                BKTXT: "",
                PICKING_QTY: ""
            }), "view");
        },

        /**
         * Helper to set focus on material input field with proper timing
         */
        _setMaterialFocus: function() {
            var that = this;
            // Use requestAnimationFrame for better timing with UI rendering
            window.requestAnimationFrame(function() {
                setTimeout(function() {
                    var oMaterialInput = that.getView().byId("materialInput");
                    if (oMaterialInput && oMaterialInput.getDomRef()) {
                        oMaterialInput.focus();
                        // Force focus multiple times to override UI5's automatic focus management
                        setTimeout(function() {
                            if (oMaterialInput && oMaterialInput.getDomRef()) {
                                oMaterialInput.focus();
                            }
                        }, 100);
                        setTimeout(function() {
                            if (oMaterialInput && oMaterialInput.getDomRef()) {
                                oMaterialInput.focus();
                            }
                        }, 300);
                        setTimeout(function() {
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
            oData.LGORT = oData.LGORT ;
            oData.MAKTX = bMaterialChanged ? "" : (oData.MAKTX || "");
            oData.LGPBE = bMaterialChanged ? "" : (oData.LGPBE || "");
            oData.MEINS = bMaterialChanged ? "" : (oData.MEINS || "");
            oData.LABST = bMaterialChanged ? "" : (oData.LABST || "");

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
            var url = "ISSUE_ORD_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {

                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }

                    // Bind response to the view model
                    oModel.setData(response.DATA || response);

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                       // MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    // Update last material after successful check
                    that._lastMaterialEntered = (oModel.getProperty("/MATNR") || sCurrentMat || null);

                    sap.m.MessageToast.show("Data updated from server.");
                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onNavHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            var that = this;
            oRouter.getRoute("IssueInternalOrder").attachMatched(function () {
                that.getView().setModel(new sap.ui.model.json.JSONModel({
                    WERKS: "",
                    LGORT: "",
                    AUFNR: "",
                    KOSTL: "",
                    MATNR: "",
                    MEINS: "",
                    LGPBE: "",
                    LABST: "",
                    MAKTX: "",
                    BKTXT: "",
                    PICKING_QTY: ""
                }), "view");
                // Set focus on material input when route is matched
                that._setMaterialFocus();
            });
            // Clear all fields in the view model on initialization
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                WERKS: "",
                LGORT: "",
                AUFNR: "",
                KOSTL: "",
                MATNR: "",
                MEINS: "",
                LGPBE: "",
                LABST: "",
                MAKTX: "",
                BKTXT: "",
                PICKING_QTY: ""
            }), "view");

            // Simple approach: bind Enter to this view only via event delegate (no global listeners)
            var that = this;
            this._oEnterDelegate = {
                onsapenter: function (oEvent) {
                    that.onEnterPress(oEvent);
                }
            };
            this.getView().addEventDelegate(this._oEnterDelegate);

            var oPayload = {
                "DATA": {
                    "WERKS": "",
                    "LGORT": "",
                    "AUFNR": "",
                    "KOSTL": "",
                    "MATNR": "",
                    "MEINS": "",
                    "LGPBE": "",
                    "LABST": 0,
                    "MAKTX": "",
                    "BKTXT": "",
                    "SPRAS": sap.ui.getCore().getConfiguration().getLanguage() || "E",
                    "PICKING_QTY": 0
                }
            };

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_ORD_INIT";
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
                    var oIssueOrdInitModel = new sap.ui.model.json.JSONModel(oData);
                    that.getView().setModel(oIssueOrdInitModel, "issueOrdInitModel");
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

        onClearFields: function () {
            var oModel = this.getView().getModel("view");
            var oData = oModel.getData();
            oModel.setData({
                LGORT: "",
                AUFNR: "",
                KOSTL: "",
                MATNR: "",
                PICKING_QTY: "",
                BKTXT: "",
                MAKTX: "",
                LGPBE: "",
                MEINS: "",
                LABST: "",
                WERKS: oData.WERKS
            });
        },

        onClearFieldsAdd: function () {
            var oModel = this.getView().getModel("view");
            var oData = oModel.getData();
            oModel.setData({
                LGORT: oData.LGORT,
                AUFNR: oData.AUFNR,
                KOSTL: oData.KOSTL,
                MATNR: "",
                PICKING_QTY: "",
                BKTXT: "",
                MAKTX: "",
                LGPBE: "",
                MEINS: "",
                LABST: "",
                WERKS: oData.WERKS
            });
        },

        onAdd: function () {
            var oViewModel = this.getView().getModel("view");
            var oItemsModel = this.getView().getModel("items");
            var oData = Object.assign({}, oViewModel.getData());
            // Ensure WERKS is present in the item being added
            if (!oData.WERKS) {
                var oGlobalWerksModel = this.getOwnerComponent().getModel("globalWerks");
                oData.WERKS = (oGlobalWerksModel && oGlobalWerksModel.getProperty("/WERKS")) || oViewModel.getProperty("/WERKS") || "";
            }
            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_ORD_1_CHECK";
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

                    var aItems = oItemsModel.getProperty("/items");
                    aItems.push(response.DATA);
                    oItemsModel.setProperty("/items", aItems);
                    MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("itemAddedSuccess"));
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
            var oItemsModel = this.getView().getModel("items");
            var aItems = oItemsModel && oItemsModel.getProperty("/items");
            if (aItems && aItems.length > 0) {
                this.getOwnerComponent().getRouter().navTo("IssueInternalOrderItems");
            } else {
                var sMsg = this.getView().getModel("i18n").getResourceBundle().getText("noRecordsFound");
                MessageBox.error(sMsg);
            }
        },

        onInternalOrderValueHelp: function (oEvent) {
            var oModel = this.getView().getModel("issueOrdInitModel");
            var aInternalOrders = oModel && oModel.getProperty("/LIST/AUFNR") ? oModel.getProperty("/LIST/AUFNR") : [];
            var oInput = oEvent.getSource();
            var oDialog = new sap.m.SelectDialog({
                title: "Select Internal Order",
                items: aInternalOrders.map(function (item) {
                    return new sap.m.StandardListItem({
                        title: item.AUFNR_CODE || item.AUFNR,
                        description: item.AUFNR_DESC || ""
                    });
                }),
                confirm: function (oConfirmEvent) {
                    var oSelected = oConfirmEvent.getParameter("selectedItem");
                    if (oSelected) {
                        oInput.setValue(oSelected.getTitle());
                        var oViewModel = oInput.getBindingContext("view").getModel();
                        oViewModel.setProperty("/AUFNR", oSelected.getTitle());
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
                            title: item.AUFNR_CODE || item.AUFNR,
                            description: item.AUFNR_DESC || ""
                        }));
                    });
                }
            });
            oDialog.open();
        },

        onCostCenterValueHelp: function (oEvent) {
            var oModel = this.getView().getModel("issueOrdInitModel");
            var aCostCenters = oModel && oModel.getProperty("/LIST/KOSTL") ? oModel.getProperty("/LIST/KOSTL") : [];
            var oInput = oEvent.getSource();
            var oDialog = new sap.m.SelectDialog({
                title: "Select Cost Center",
                items: aCostCenters.map(function (item) {
                    return new sap.m.StandardListItem({
                        title: item.KOSTL_CODE || item.KOSTL,
                        description: item.KOSTL_DESC || ""
                    });
                }),
                confirm: function (oConfirmEvent) {
                    var oSelected = oConfirmEvent.getParameter("selectedItem");
                    if (oSelected) {
                        oInput.setValue(oSelected.getTitle());
                        var oViewModel = oInput.getBindingContext("view").getModel();
                        oViewModel.setProperty("/KOSTL", oSelected.getTitle());
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
                            title: item.KOSTL_CODE || item.KOSTL,
                            description: item.KOSTL_DESC || ""
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