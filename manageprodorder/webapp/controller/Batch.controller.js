sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "com/merkavim/ewm/manageprodorder/model/formatter",
    "sap/m/ViewSettingsFilterItem",
    "sap/m/ViewSettingsItem",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, MessageBox, formatter, ViewSettingsFilterItem, ViewSettingsItem, Filter, Sorter) {
    // formatter is loaded for view binding
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.Batch", {
        formatter: formatter,
        onInit: function () {


            var oComponent = this.getOwnerComponent();


            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Batch").attachPatternMatched(this._onRouteMatched, this);
        },
        formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments") || {};
            var sHeadData = oArgs.HeadData || "{}";
            this.navBackView = oArgs.View; // default fallback
            this.sPath = this.getOwnerComponent().getModel("GlobalVariable").getProperty("/Spath") || this.sPath; // fallback to previous path if not provided
            try {
                sHeadData = decodeURIComponent(sHeadData);
                var oHeadData = JSON.parse(sHeadData);
            } catch (e) { /* ignore */ }
           
            this.onReadBatchList(oHeadData);

        },
        onReadBatchList: function (oHeadData) {
            var that = this;
            this.getView().setBusy(true);
            var batchListModel = that.getOwnerComponent().getModel("batchList");
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                HEAD: {
                    "WERKS": oHeadData.WERKS,
                    // "BKTXT": oModel.getProperty("/BKTXT") || "",
                    "LGORT": oHeadData.LGORT || "",
                    "MATNR": oHeadData.MATNR || "",
                    "MAKTX": oHeadData.MAKTX || "",
                    "MENGE": oHeadData.PICKING_QTY || "",
                    "SPRAS": lang
                },

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };
            this.HeadData = oPayload.HEAD; // save for later use in issue items step

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "BATCH_DATA";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);

                    batchListModel.setData([]);

                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    batchListModel.setData(response);
                    that.onClearSelection();
                    that.onSelectedListCheck();

                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onAfterRendering: function () {
            var oList = this.byId("mobileCardPCILrtist");
            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    var Input = oItem.getContent()[0].mAggregations.content[3].mAggregations.items[0];
                    if (Input && Input.addEventDelegate) {
                        Input.addEventDelegate({
                            onfocusin: function () {
                                setTimeout(function () {

                                    Input.$().find("input").select();
                                    this.selectText(0, this.getValue().length);
                                });
                            }
                        });
                    }
                });
            }
        },
        onMobileListUpdateFinished: function () {
            var oList = this.byId("mobileCardPCILrtist");

            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    if (oItem.getBindingContext("batchList").getObject().SELECTED === "X") {
                        oList.setSelectedItem(oItem, true);
                    }
                    var Input = oItem.getContent()[0].mAggregations.content[3].mAggregations.items[0];
                    if (Input && Input.addEventDelegate) {
                        Input.addEventDelegate({
                            onfocusin: function () {
                                setTimeout(function () {

                                    Input.$().find("input").select();
                                    this.selectText(0, this.getValue().length);
                                });
                            }
                        });
                    }
                });
            }
             var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("batchList");
            var aItems;
            if (oPickModel) {

                if (this.getOwnerComponent().getModel("device").getData().isPhone) {
                    try {
                        aItems = oPickModel.getProperty('/BATCH') || [];
                        aItems = aItems.map(function (it) {
                            if (it.SELECTED === "X") {
                                it.selected = true;
                            } else {
                                it.selected = false;
                            } return it;
                        });
                        oPickModel.setProperty('/BATCH', aItems);
                    } catch (e) { console.warn("onClearSelection model update failed", e); }
                }
            }
        },

        onExit: function () {
            // this._clearHoverFocusDelegates();
            // this._clearQtyInputSelectDelegates();
            // if (BaseController.prototype.onExit) {
            //     BaseController.prototype.onExit.apply(this, arguments);
            // }
        },


        onRemarkLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oViewModel = this.getOwnerComponent().getModel("validData");
            if (oViewModel) {
                oViewModel.setProperty("/BKTXT", sValue);
            }
        },
        onNavBack: function () {

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            if (this.navBackView === "PickForCartItems"  || this.navBackView === "IssueBasedOnReservationItems" || this.navBackView === "ProductionOrderContinue") {
                oRouter.navTo(this.navBackView, {
                    NFLAG: "X"
                }, true);
             }else{
                    oRouter.navTo(this.navBackView,{},true);
            }
        },

        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("sortbsDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Open the filter dialog (ViewSettingsDialog) and build filter items dynamically
         */
        onOpenFilterDialog: function () {
            var oDlg = this.byId("filterbsDialog");
            if (!oDlg) { return; }

            try {
                // Build filter items dynamically from current data
                this._buildFilterDialogItems(oDlg);
                // Ensure Reset button clears applied filters as well
                if (oDlg.detachResetFilters && oDlg.attachResetFilters) {
                    oDlg.detachResetFilters(this.onFilterReset, this);
                    oDlg.attachResetFilters(this.onFilterReset, this);
                }
                // Compatibility with older/newer UI5 versions
                if (oDlg.detachReset && oDlg.attachReset) {
                    oDlg.detachReset(this.onFilterReset, this);
                    oDlg.attachReset(this.onFilterReset, this);
                }
            } catch (e) {
                // swallow errors to not block opening dialog
                /* eslint no-console: 0 */
                console.warn("Building filter dialog items failed", e);
            }

            oDlg.open();
        },

        /**
         * Build dynamic filter items for ViewSettingsDialog based on distinct values in pickItems model
         * @param {sap.m.ViewSettingsDialog} oDlg
         */
        _buildFilterDialogItems: function (oDlg) {
            if (!oDlg) { return; }

            // Clear previous filter items
            try { oDlg.destroyFilterItems(); } catch (e) { }

            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent && oComponent.getModel && oComponent.getModel("pickItems");
            var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];

            var oI18n = this.getView().getModel("i18n");
            var rb = oI18n && oI18n.getResourceBundle && oI18n.getResourceBundle();
            function t(k) { try { return rb.getText(k); } catch (e) { return k; } }

            // Define fields to filter with label resolvers
            var aFields = [
                { key: "VORNR", label: t("action") },

                { key: "CY_SEQNR", label: t("shortbusnum") },
                { key: "BDTER", label: t("date"), formatter: this.formatter && this.formatter.bdterToDDMMYY },

                { key: "PICKING_QTY", label: t("qtyToPick") }
            ];

            // Pre-detect value type per field from first non-null sample
            var mTypes = {};
            aFields.forEach(function (f) {
                for (var i = 0; i < aItems.length; i++) {
                    var v = aItems[i] && aItems[i][f.key];
                    if (v !== undefined && v !== null && v !== "") {
                        mTypes[f.key] = typeof v;
                        break;
                    }
                }
                if (!mTypes[f.key]) { mTypes[f.key] = "string"; }
            });

            // Build a filter group per field with distinct values
            // Build a lookup of currently applied filters to preselect items in the dialog
            var mActiveFilters = this._getCurrentFilterValueMap();

            aFields.forEach(function (f) {
                var mDistinct = Object.create(null);
                aItems.forEach(function (row) {
                    if (!row) { return; }
                    var v = row[f.key];
                    if (v === undefined || v === null || v === "") { return; }
                    var k = String(v);
                    if (!mDistinct[k]) { mDistinct[k] = v; }
                });

                var aValues = Object.keys(mDistinct).sort();
                if (aValues.length > 0) {
                    var oFilterGroup = new ViewSettingsFilterItem({
                        key: f.key,
                        text: f.label,
                        multiSelect: true
                    });

                    aValues.forEach(function (k) {
                        var vRaw = mDistinct[k];
                        var sText = (typeof f.formatter === 'function') ? f.formatter(vRaw) : String(vRaw);
                        // API fix: ViewSettingsFilterItem uses addItem (singular)
                        var oItem = new ViewSettingsItem({ key: String(vRaw), text: sText });
                        // Preselect if currently filtered by this value
                        try {
                            if (mActiveFilters[f.key] && mActiveFilters[f.key][String(vRaw)]) {
                                oItem.setSelected(true);
                            }
                        } catch (eSel) { /* ignore */ }
                        oFilterGroup.addItem(oItem);
                    });

                    oDlg.addFilterItem(oFilterGroup);
                }
            }, this);
        },

        /**
         * Build a map of currently applied filter values keyed by field.
         * Example: { MODEL: { "X1": true, "X2": true }, VORNR: { "10": true } }
         */
        _getCurrentFilterValueMap: function () {
            var m = Object.create(null);
            function add(path, val) {
                var s = String(val);
                m[path] = m[path] || Object.create(null);
                m[path][s] = true;
            }
            function visit(f) {
                if (!f) { return; }
                if (Array.isArray(f)) { f.forEach(visit); return; }
                if (f.aFilters && f.aFilters.length) {
                    f.aFilters.forEach(visit);
                    return;
                }
                if (f.sPath && f.sOperator && f.oValue1 !== undefined) {
                    add(f.sPath, f.oValue1);
                }
            }
            try {
                var oTable = this.byId("pickbsTable");
                var oBinding = oTable && oTable.getBinding && oTable.getBinding("items");
                var aFilters = (oBinding && oBinding.aFilters) || [];
                visit(aFilters);
            } catch (e) { /* ignore */ }
            return m;
        },

        /**
         * Apply filtering chosen in ViewSettingsDialog to both table (desktop) and list (mobile)
         * @param {sap.ui.base.Event} oEvent confirm event from ViewSettingsDialog
         */
        onFilterConfirm: function (oEvent) {
            var mParams = oEvent.getParameters();
            var aSelectedItems = mParams && mParams.filterItems || [];

            // Group selected values by field
            var mFieldToValues = {};
            aSelectedItems.forEach(function (oItem) {
                if (!oItem || !oItem.getParent) { return; }
                var oGroup = oItem.getParent();
                var sField = oGroup && oGroup.getKey && oGroup.getKey();
                if (!sField) { return; }
                mFieldToValues[sField] = mFieldToValues[sField] || [];
                mFieldToValues[sField].push(oItem.getKey());
            });

            // Build compound filters: OR within same field, AND across different fields
            var aAndFilters = [];
            Object.keys(mFieldToValues).forEach(function (sField) {
                var aValues = mFieldToValues[sField] || [];
                if (!aValues.length) { return; }
                var aOrFilters = aValues.map(function (v) {
                    // Convert numeric-looking values to number where appropriate by peeking at model data type
                    var vConv = v;
                    if (/^\s*-?\d+(?:\.\d+)?\s*$/.test(v)) { vConv = Number(v); }
                    return new Filter(sField, sap.ui.model.FilterOperator.EQ, vConv);
                });
                if (aOrFilters.length === 1) {
                    aAndFilters.push(aOrFilters[0]);
                } else {
                    aAndFilters.push(new Filter({ filters: aOrFilters, and: false }));
                }
            });

            // Apply to desktop/tablet table
            var oTable = this.byId("pickbsTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding && oBinding.filter) {
                    oBinding.filter(aAndFilters); // AND across groups by default
                }
            }

            // Apply to mobile list
            // var oList = this.byId("mobileCardList");
            // if (oList) {
            //     var oListBinding = oList.getBinding("items");
            //     if (oListBinding && oListBinding.filter) {
            //         // Note: reuse same Filter objects is fine; but create new to avoid shared state
            //         var aCloned = aAndFilters.map(function(f){
            //             return (f.aFilters)
            //                 ? new Filter({ filters: f.aFilters.slice(), and: f.bAnd })
            //                 : new Filter(f.sPath, f.sOperator, f.oValue1, f.oValue2);
            //         });
            //         oListBinding.filter(aCloned);
            //     }
            // }
        },

        /**
         * Handler for the dialog's Reset button: remove all filters from table and mobile list.
         */
        onFilterReset: function () {
            try {
                var oTable = this.byId("pickTable");
                // var oList = this.byId("mobileCardList");
                var oTableBinding = oTable && oTable.getBinding && oTable.getBinding("items");
                // var oListBinding = oList && oList.getBinding && oList.getBinding("items");
                if (oTableBinding && oTableBinding.filter) { oTableBinding.filter([]); }
                // if (oListBinding && oListBinding.filter) { oListBinding.filter([]); }
            } catch (e) {
                /* eslint no-console: 0 */
                console.warn("Reset filters failed", e);
            }
        },

        /**
         * Apply sorting chosen in ViewSettingsDialog to both table (desktop) and list (mobile)
         * @param {sap.ui.base.Event} oEvent confirm event from ViewSettingsDialog
         */
        onSortConfirm: function (oEvent) {
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem && mParams.sortItem.getKey();
            var bDescending = !!mParams.sortDescending;

            if (!sPath) { return; }

            try {
                var oSorter = new Sorter(sPath, bDescending);

                // Desktop/tablet table
                var oTable = this.byId("pickbsTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                // Mobile list
                var oList = this.byId("mobileCardPCILrtist");
                if (oList) {
                    var oListBinding = oList.getBinding("items");
                    if (oListBinding && oListBinding.sort) {
                        // use a new sorter instance to avoid shared state
                        oListBinding.sort(new Sorter(sPath, bDescending));
                    }
                }
            } catch (e) {
                // no-op; sorting errors should not break UX
                /* eslint no-console: 0 */
                console.warn("Sort apply failed", e);
            }
        },

        /**
         * Header checkbox handler: toggle selected flag for all pick items
         */
        onSelectAll: function (oEvent) {
            var bSelected = !!oEvent.getParameter("selected");
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("batchList");
            if (!oPickModel) { return; }
            try {
                var aItems = oPickModel.getProperty("/BATCH") || [];
                aItems = aItems.map(function (it) {
                    if (it.SELECTED === "X") {
                        it.selected = true;
                    } else {
                        it.selected = bSelected;
                    }
                    return it;
                });

                oPickModel.setProperty("/BATCH", aItems);
                // also update header checkbox state explicitly (defensive)
                var oHeaderCB = this.byId("selectbsAllCheckBox");
                if (oHeaderCB) { oHeaderCB.setSelected(bSelected); }
            } catch (e) { console.warn("onSelectAll error", e); }



        },

        /**
         * Row checkbox handler: update model and header checkbox state
         */
        onSelectRow: function (oEvent) {
            var oSource = oEvent.getSource();
            var bSelected = !!oEvent.getParameter("selected");
            var oContext = oSource.getBindingContext("batchList");
            if (!oContext) { return; }
            var sPath = oContext.getPath(); // /items/0
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("batchList");
            if (!oPickModel) { return; }
            try {
                oPickModel.setProperty(sPath + "/selected", bSelected);
                // update header checkbox: selected only if all rows selected
                var aItems = oPickModel.getProperty("/BATCH") || [];
                var bAll = aItems.length > 0 && aItems.every(function (it) { return !!it.selected; });
                var oHeaderCB = this.byId("selectbsAllCheckBox");
                if (oHeaderCB) { oHeaderCB.setSelected(bAll); }
            } catch (e) { console.warn("onSelectRow error", e); }
        },

        /**
         * Mobile "Select All" button: toggle all items selected/cleared.
         * It reuses the same pickItems model flag used by desktop checkboxes.
         */
        onSelectAllMobile: function (oEvent) {

            if (this.bTarget === undefined) {
                this.bTarget = true;
            }
            else {
                this.bTarget = !this.bTarget;
            }


            var list = this.byId("mobileCardPCILrtist");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {

                    if (this.bTarget) {

                        list.setSelectedItem(it, this.bTarget);
                    } else {
                        if (it.getBindingContext("batchList").getObject().SELECTED === "X") {
                            list.setSelectedItem(it, true);
                        } else {
                            list.setSelectedItem(it, this.bTarget);
                        }
                    }


                }, this);

            }





        },

        /**
         * Navigate to IssueItems but only with rows marked (selected === true)
         */
        onDisplayIssueItems: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("batchList");
            var oList = this.byId("mobileCardPCILrtist");
            var aItems = [];
            if (this.getOwnerComponent().getModel("device").getData().isPhone) {
                aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/BATCH')) || [];
                var aSelected = aItems.filter(function (it) { return !!it.selected; });
                if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            }
            else {

                aItems = (oList && oList.getItems && oList.getItems()) || [];
                aSelected = oList.getSelectedItems().map(function (oItem) {
                    var oContext = oItem.getBindingContext("batchList");
                    return oContext && oContext.getObject();
                }).filter(function (it) { return !!it; });
            }
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var BatchD = aSelected;
            var oPayload = {
                "HEAD": this.HeadData,
                "BATCH": BatchD,
                "MSG": {
                    "MSGTX": "",
                    "MSGTY": ""
                }
            }
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "BATCH_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (response) {


                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    if(that.navBackView === "PickForCartItems") {
                    that.getOwnerComponent().getModel("PickForCartMainModel").setProperty(that.sPath + "/BATCHDATA", []);
                    that.getOwnerComponent().getModel("PickForCartMainModel").setProperty(that.sPath + "/BATCHDATA", BatchD);
                    }else if(that.navBackView === "IssueInternalOrderItems") {
                        that.getOwnerComponent().getModel("items").setProperty(that.sPath + "/BATCHDATA", []);
                        that.getOwnerComponent().getModel("items").setProperty(that.sPath + "/BATCHDATA", BatchD);
                    }else if(that.navBackView === "IssueBasedOnReservationItems") {
                        that.getOwnerComponent().getModel("IssueBasedonReservationItemModel").setProperty(that.sPath + "/BATCHDATA", []);
                        that.getOwnerComponent().getModel("IssueBasedonReservationItemModel").setProperty(that.sPath + "/BATCHDATA", BatchD);
                    }else if (that.navBackView === "ProductionOrderContinue") {
                        that.getOwnerComponent().getModel("pickItems").setProperty(that.sPath + "/BATCHDATA", []);
                        that.getOwnerComponent().getModel("pickItems").setProperty(that.sPath + "/BATCHDATA", BatchD);
                    }else if (that.navBackView === "StockTransferbnSLItems") {
                        that.getOwnerComponent().getModel("SLitems").setProperty(that.sPath + "/BATCHDATA", []);
                        that.getOwnerComponent().getModel("SLitems").setProperty(that.sPath + "/BATCHDATA", BatchD);
                    }
                    that.onNavBack();




                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch F4 help data");
                }
            });
        },

        /**
         * Clear selections (clears selected flag on model and unchecks header checkbox)
         */
        onClearSelection: function () {
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("batchList");
            var aItems;
            if (oPickModel) {

                if (this.getOwnerComponent().getModel("device").getData().isPhone) {
                    try {
                        aItems = oPickModel.getProperty('/BATCH') || [];
                        aItems = aItems.map(function (it) {
                            if (it.SELECTED === "X") {
                                it.selected = true;
                            } else {
                                it.selected = false;
                            } return it;
                        });
                        oPickModel.setProperty('/BATCH', aItems);
                    } catch (e) { console.warn("onClearSelection model update failed", e); }
                }
            }

            var oHeaderCB = this.byId("selectbsAllCheckBox");
            if (oHeaderCB) { oHeaderCB.setSelected(false); }
            this.bTarget = false;
            var list = this.byId("mobileCardPCILrtist");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {

                    if (it.getBindingContext("batchList").getObject().SELECTED === "X") {
                        list.setSelectedItem(it, true);
                    } else {
                        list.setSelectedItem(it, this.bTarget);
                    }
                }, this);

            }

            // var oHeaderCB = this.byId("selectAllCheckBox");
            // if (oHeaderCB) { oHeaderCB.setSelected(false); }
            // sap.m.MessageToast.show("Selection cleared");
        },
        onSelectedListCheck: function () {
            var that = this;
            this.bTarget = false;
            var list = this.byId("mobileCardPCILrtist");
            var oItems = list && list.getItems && list.getItems();
            var BatchData = [];
            if(that.navBackView === "PickForCartItems") {
            BatchData = that.getOwnerComponent().getModel("PickForCartMainModel").getProperty(that.sPath + "/BATCHDATA") || [];
            }else if(that.navBackView === "IssueInternalOrderItems") {
                BatchData = that.getOwnerComponent().getModel("items").getProperty(that.sPath + "/BATCHDATA") || [];
            }else if(that.navBackView === "IssueBasedOnReservationItems") {
                BatchData = that.getOwnerComponent().getModel("IssueBasedonReservationItemModel").getProperty(that.sPath + "/BATCHDATA") || [];
            }else if (that.navBackView === "ProductionOrderContinue") {
                BatchData = that.getOwnerComponent().getModel("pickItems").getProperty(that.sPath + "/BATCHDATA") || [];
            }else if (that.navBackView === "StockTransferbnSLItems") {
                BatchData = that.getOwnerComponent().getModel("SLitems").getProperty(that.sPath + "/BATCHDATA") || [];
            }
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {

                    if (it.getBindingContext("batchList").getObject().SELECTED === "X") {
                        list.setSelectedItem(it, true);
                    } else {
                        if (BatchData.length > 0) {
                            // var batchData = this.HeadData.BATCHDATA;
                            BatchData.forEach(function (batch) {
                                if (batch.CHARG === it.getBindingContext("batchList").getObject().CHARG) {
                                    // it.getBindingContext("batchList").getObject().MENGE = batch.MENGE;
                                    it.getBindingContext("batchList").getModel().setProperty(it.getBindingContext("batchList").getPath() + "/MENGE", batch.MENGE);
                                    it.getBindingContext("batchList").getModel().setProperty(it.getBindingContext("batchList").getPath() + "/selected", true);
                                    list.setSelectedItem(it, true);
                                }
                            });
                        } else {
                            if(it.getBindingContext("batchList").getObject().SELECTED === "X") {
                                it.getBindingContext("batchList").getModel().setProperty(it.getBindingContext("batchList").getPath() + "/selected", true);

                                list.setSelectedItem(it, true);
                            }else{
                            list.setSelectedItem(it, this.bTarget);
                            it.getBindingContext("batchList").getModel().setProperty(it.getBindingContext("batchList").getPath() + "/selected", false);

                            }
                        }
                    }
                }, this);

            }
        },

        /**
         * Validate picking quantity cannot be greater than reserved quantity
         */
        onQtyToPickLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oContext = oInput.getBindingContext("batchList");
            var oComponent = this.getOwnerComponent();
            if (!oContext) { return; }
            var oData = oContext.getObject();
            var reservedQty = Number(oData.CLABS) || 0;
            var pickingQty = Number(sValue);
            if (pickingQty > reservedQty) {
                oInput.setValue(reservedQty);
                var oComponent = this.getOwnerComponent();
                var oPickModel = oComponent.getModel("batchList");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/MENGE", reservedQty);
                }
                var oView = this.getView();
                var sMsg = oView.getModel("i18n").getResourceBundle().getText("errorPickingQtyExceedsReserved");
                MessageBox.error(sMsg);
            } else {
                var oPickModel = oComponent.getModel("batchList");
                //     if (oPickModel) {
                oPickModel.setProperty(oContext.getPath() + "/MENGE", sValue);
                //     }
            }
        },

        /**
         * Sort handler for table columns
         */
        onSort: function (oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("pickbsTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },

        onPickTableUpdateFinished: function () {
            // this._attachQtyInputSelectDelegates();
            // this._attachHoverFocusDelegates(); // disabled
        },






    });
});
