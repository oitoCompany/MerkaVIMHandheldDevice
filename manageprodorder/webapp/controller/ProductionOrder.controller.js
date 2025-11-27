

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
    "use strict";
    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.ProductionOrder", {
        onInit: function () {

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_PR_INIT";

            // Track last material to decide when to clear LGORT on next Enter
            this._lastMaterialEntered = null;

            let payload = {
                Material: "",
                ProductionOrder: "",
                OperationFrom: "",
                OperationTo: "",
                ReservationStorageLocation: "",
                LogisticsGroup: "",
                Remark: "",
                IssuesingStorageLocation: ""
            };

            var that = this;

            $.ajax({
                url: baseUrl + url,
                method: "POST",
                contentType: "application/json; charset=UTF-8",
                data: payload,
                success: function (oResponse) {

                    // view state model for inline create fields
                    var oViewModel = new sap.ui.model.json.JSONModel({
                        newEntry: {
                            Material: oResponse.DATA.MATNR || "",
                            ProductionOrder: oResponse.DATA.AUFNR || "",
                            OperationFrom: oResponse.DATA.VORNR_F || "",
                            OperationTo: oResponse.DATA.VORNR_T || "",
                            ReservationStorageLocation: oResponse.DATA.LGORT_F || "",
                            ReservationStorageLocationTo: oResponse.DATA.LGORT_FT || "",
                            LogisticsGroup: oResponse.DATA.LOGGR || "",
                            Remark: oResponse.DATA.BKTXT || "",
                            IssuesingStorageLocation: oResponse.DATA.LGORT_T || ""
                        }
                    });
                    that.getView().setModel(oViewModel, "view");

                    // Set focus on material input after model is loaded
                    that._setMaterialFocus();

                },
                error: function (xhr, status, error) {
                    MessageBox.error("Backend call failed: " + (xhr.responseText || status));
                }
            });

            // Simple approach: bind Enter to this view only via event delegate (no global listeners)
            this._oEnterDelegate = {
                onsapenter: function (oEvent) {
                    that.onEnterPress(oEvent);
                }
            };
            this.getView().addEventDelegate(this._oEnterDelegate);

            // Ensure view model is reset every time the route is entered
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProductionOrder").attachPatternMatched(this._resetViewModel, this);


        },

        /**
         * Reset the view-scoped model each time the ProductionOrder route is matched
         * so we don't rely on onInit which runs only once per controller lifecycle.
         */
        _resetViewModel: function () {
            var oView = this.getView();
            var oViewModel = oView.getModel("view");
            var oData = {
                newEntry: {
                    Material: "",
                    ProductionOrder: "",
                    OperationFrom: "",
                    OperationTo: "",
                    ReservationStorageLocation: "",
                    ReservationStorageLocationTo: "",
                    LogisticsGroup: "",
                    Remark: "",
                    IssuesingStorageLocation: ""
                }
            };
            if (!oViewModel) {
                oViewModel = new sap.ui.model.json.JSONModel(oData);
                oView.setModel(oViewModel, "view");
            } else {
                oViewModel.setData(oData);
            }
            
            // Set focus on material input when route is matched
            this._setMaterialFocus();
        },

        /**
         * Helper to set focus on material input field with proper timing
         */
        _setMaterialFocus: function() {
            var that = this;
            // Use requestAnimationFrame for better timing with UI rendering
            window.requestAnimationFrame(function() {
                setTimeout(function() {
                    var oMaterialInput = that.getView().byId("inpInlineMaterial");
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
         * Trigger ISSUE_PR_1_CHECK when user presses Enter, using current view input fields (newEntry)
         */
        onEnterPress: function () {
            var oViewModel = this.getView().getModel("view");
            if (!oViewModel) { return; }
            var oSelectionData = Object.assign({}, oViewModel.getProperty("/newEntry"));

            // Only clear LGORT fields if material changed since last Enter
            var sCurrentMat = (oSelectionData.Material || "").trim();
            var sLastMat = (this._lastMaterialEntered || "").trim();
            var bMaterialChanged = sCurrentMat !== sLastMat;

            var oPayload = {
                DATA: {
                    MATNR: oSelectionData.Material || "",
                    MEINS: "",
                    MAKTX: "",
                    AUFNR: oSelectionData.ProductionOrder || "",
                    VORNR_F: oSelectionData.OperationFrom || "",
                    VORNR_T: oSelectionData.OperationTo || "",
                    LGORT_F: bMaterialChanged ? "" : (oSelectionData.ReservationStorageLocation || ""),
                    LGORT_FT: bMaterialChanged ? "" : (oSelectionData.ReservationStorageLocationTo || ""),
                    LGORT_T: bMaterialChanged ? "" : (oSelectionData.IssuesingStorageLocation || ""),
                    LOGGR: oSelectionData.LogisticsGroup || "",
                    BKTXT: (oSelectionData.Remark || ""), 
                    SPRAS: sap.ui.getCore().getConfiguration().getLanguage().substring(0,1) || "E"// send only first letter
                }
            };

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_PR_1_CHECK";
            var that = this;
            $.ajax({
                url: baseUrl + url,
                method: "POST",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify(oPayload),
                success: function (oResponse) {
                    if (oResponse && oResponse.MSG && oResponse.MSG.MSGTY === "E") {
                        MessageBox.error(oResponse.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    // Map response back to newEntry fields for user convenience
                    var d = oResponse && oResponse.DATA ? oResponse.DATA : {};
                    if (d) {
                        if (d.MATNR !== undefined) { oViewModel.setProperty("/newEntry/Material", d.MATNR); }
                        if (d.AUFNR !== undefined) { oViewModel.setProperty("/newEntry/ProductionOrder", d.AUFNR); }
                        if (d.VORNR_F !== undefined) { oViewModel.setProperty("/newEntry/OperationFrom", d.VORNR_F); }
                        if (d.VORNR_T !== undefined) { oViewModel.setProperty("/newEntry/OperationTo", d.VORNR_T); }
                        if (d.LGORT_F !== undefined) { oViewModel.setProperty("/newEntry/ReservationStorageLocation", d.LGORT_F); }
                        if (d.LGORT_FT !== undefined) { oViewModel.setProperty("/newEntry/ReservationStorageLocationTo", d.LGORT_FT); }
                        if (d.LGORT_T !== undefined) { oViewModel.setProperty("/newEntry/IssuesingStorageLocation", d.LGORT_T); }
                        if (d.LOGGR !== undefined) { oViewModel.setProperty("/newEntry/LogisticsGroup", d.LOGGR); }
                        if (d.BKTXT !== undefined) { oViewModel.setProperty("/newEntry/Remark", d.BKTXT); }
                    }
                    // Update last material after successful check
                    that._lastMaterialEntered = oViewModel.getProperty("/newEntry/Material") || sCurrentMat || null;
                    MessageToast.show("Validated");
                },
                error: function (xhr, status, error) {
                    MessageBox.error("Backend call failed: " + (xhr.responseText || status));
                }
            });
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteView1", {}, true);
        },
        onNavHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1");
        },
        onContinue: function () {
            // Validate IssuesingStorageLocation is not blank
            var oViewModel = this.getView().getModel("view");
            var oSelectionData = Object.assign({}, oViewModel.getProperty("/newEntry"));
            // if (!oSelectionData.IssuesingStorageLocation || oSelectionData.IssuesingStorageLocation.trim() === "") {
            //     var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //     MessageBox.error(oBundle.getText("issuesingstoragelocationRequired") || "Storage Location is required.");
            //     return;
            // }
            var oViewModel = this.getView().getModel("view");
            var oSelectionData = Object.assign({}, oViewModel.getProperty("/newEntry"));
            var that = this;
            // Prepare payload for backend
            var oPayload = {
                DATA: {
                    MATNR: oSelectionData.Material || "",
                    MEINS: "",
                    MAKTX: "",
                    AUFNR: oSelectionData.ProductionOrder || "",
                    VORNR_F: oSelectionData.OperationFrom || "",
                    VORNR_T: oSelectionData.OperationTo || "",
                    LGORT_F: oSelectionData.ReservationStorageLocation || "",
                    LGORT_FT: oSelectionData.ReservationStorageLocationTo || "",
                    LGORT_T: oSelectionData.IssuesingStorageLocation || "",
                    LOGGR: oSelectionData.LogisticsGroup || "",
                    BKTXT: oSelectionData.Remark || "",
                    SPRAS: sap.ui.getCore().getConfiguration().getLanguage().substring(0,1) || "E"
                }
            };
            // Call backend endpoint
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_PR_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                method: "POST",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify(oPayload),
                success: function (oResponse) {
                    if (oResponse.MSG.MSGTY === "S") {

                        var oValidDataModel = new sap.ui.model.json.JSONModel(oResponse.DATA);
                        // Set validData model at both view and component level for global access
                        that.getView().setModel(oValidDataModel, "validData");
                        that.getOwnerComponent().setModel(oValidDataModel, "validData");

                        //Get the data for selection
                        let baseUrl = that.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
                        var url = "ISSUE_PR_1_DATA";



                        $.ajax({
                            url: baseUrl + url,
                            method: "POST",
                            contentType: "application/json; charset=UTF-8",
                            data: JSON.stringify(oResponse),
                            success: function (oResponse) {

                                let items = oResponse.ITEM;
                                let header = oResponse.HEAD;

                                // --- mock data logic preserved, only runs on success ---
                                var oComponent = that.getOwnerComponent();

                                let aPicking = [];

                                for (let i = 0; i < items.length; i++) {
                                    // Map all backend fields for each item
                                    aPicking.push({
                                        selected: false,
                                        VORNR: items[i].VORNR,
                                        MATNR: items[i].MATNR,
                                        MAKTX: items[i].MAKTX,
                                        CY_SEQNR: items[i].CY_SEQNR,
                                        MODEL: items[i].MODEL,
                                        MODEL_DESC: items[i].MODEL_DESC,
                                        MEINS: items[i].MEINS,
                                        RESERVED_QTY: items[i].RESERVED_QTY,
                                        PICKING_QTY: items[i].PICKING_QTY,
                                        CHARG: items[i].CHARG,
                                        SERNR: items[i].SERNR,
                                        AUFNR: items[i].AUFNR,
                                        AFPOS: items[i].AFPOS,
                                        RSNUM: items[i].RSNUM,
                                        RSPOS: items[i].RSPOS,
                                        RSART: items[i].RSART,
                                        LGPBE: items[i].LGPBE,
                                        LABST: items[i].LABST,
                                        WERKS: items[i].WERKS,
                                        BDTER: items[i].BDTER
                                    });
                                }
                                // If aPicking is blank, show error and do not route
                                if (!aPicking || aPicking.length === 0) {
                                    var oBundle = that.getOwnerComponent().getModel("i18n").getResourceBundle();
                                    MessageBox.error(oBundle.getText("noDataFound"));
                                    return;
                                }
                                // Sort aPicking by BDTER ascending
                                aPicking.sort(function(a, b) {
                                    return (a.BDTER > b.BDTER) ? 1 : (a.BDTER < b.BDTER) ? -1 : 0;
                                });

                                let aHeader = {
                                    Location: header.LGPBE,
                                    Stock: header.LABST,
                                    Material: header.MATNR,
                                    MaterialDescription: header.MAKTX,
                                    UOM: header.MEINS
                                }

                                var oPickModel = oComponent.getModel("pickItems");
                                if (oPickModel) {
                                    oPickModel.setData({ items: aPicking });
                                } else {
                                    oComponent.setModel(new sap.ui.model.json.JSONModel({ items: aPicking }), "pickItems");
                                }
                                var oSelectionModel = oComponent.getModel("inputFields");
                                if (oSelectionModel) {
                                    oSelectionModel.setData(aHeader);
                                } else {
                                    oComponent.setModel(new sap.ui.model.json.JSONModel(oSelectionData), "inputFields");
                                }
                                try {
                                    console.log("[ProductionOrder] pickItems on component:", oComponent.getModel("pickItems") && oComponent.getModel("pickItems").getData());
                                    console.log("[ProductionOrder] selection on component:", oComponent.getModel("selection") && oComponent.getModel("selection").getData());
                                } catch (e) { }
                                // Clear newEntry model before routing
                                var oViewModel = that.getView().getModel("view");
                                oViewModel.setProperty("/newEntry", {
                                    Material: "",
                                    ProductionOrder: "",
                                    Operation: "",
                                    ReservationStorageLocation: "",
                                    LogisticsGroup: "",
                                    Remark: "",
                                    IssuesingStorageLocation: ""
                                });
                                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                                oRouter.navTo("ProductionOrderContinue");
                            },
                            error: function (xhr, status, error) {
                                MessageBox.error("Backend call failed: " + (xhr.responseText || status));
                            }
                        })


                    } else {
                        MessageBox.error(oResponse.MSG.MSGTX || "Unknown error");
                    }
                },
                error: function (xhr, status, error) {
                    MessageBox.error("Backend call failed: " + (xhr.responseText || status));
                }
            });
        },

        onInlineAdd: function () {
            var oViewModel = this.getView().getModel("view");
            var oMockModel = this.getView().getModel("mock");
            var oEntry = Object.assign({}, oViewModel.getProperty("/newEntry"));
            if (!oEntry.Material && !oEntry.ProductionOrder) {
                return; // basic guard: require at least one key field
            }
            var aItems = oMockModel.getProperty("/items");
            aItems.push(oEntry);
            oMockModel.setProperty("/items", aItems);
            // clear after add
            oViewModel.setProperty("/newEntry", { Material: "", ProductionOrder: "", Operation: "", ReservationStorageLocation: "", LogisticsGroup: "", Remark: "" });
        },

        onInlineClear: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/newEntry", { Material: "", ProductionOrder: "", Operation: "", ReservationStorageLocation: "", LogisticsGroup: "", Remark: "" });
        },

        // Cleanup Enter key listener
        onExit: function () {
            if (this._oEnterDelegate) {
                try { this.getView().removeEventDelegate(this._oEnterDelegate); } catch (e) {}
                this._oEnterDelegate = null;
            }
        }

    });
});