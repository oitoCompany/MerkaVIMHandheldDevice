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
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.ProductionOrderContinue", {
        formatter: formatter,
        onInit: function () {
            this._aHoverFocusDelegates = [];
            // Disable custom hover-to-focus behavior
            // this._hoverFocusDisabled = true; // commented per request: only comments, no deletions
            // Use global device model (point 3). No local override.
            // Ensure initial visibility for mobile cards vs table if needed
            this.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox1" });

            // `inputFields` model is initialized at the component level; rely on that model here

            // Ensure pickItems model is available when the view is displayed
            var oComponent = this.getOwnerComponent();
            try {
                var oRouter = oComponent.getRouter();
                if (oRouter && oRouter.getRoute("ProductionOrderContinue")) {
                    // keep reference
                    var that = this;
                    oRouter.getRoute("ProductionOrderContinue").attachPatternMatched(function (oEvent) {
                        that._ensurePickItemsModel();
                        var oArgs = oEvent.getParameter("arguments") || {};
                        var NFlAG = oArgs.NFLAG || "";

                        if (NFlAG !== "X") {
                            that.onClearSelection();
                        }
                    });
                } else {
                    // fallback immediate attempt
                    this._ensurePickItemsModel();
                }
            } catch (e) {
                // router may not be available in some contexts; try to ensure model anyway
                this._ensurePickItemsModel();
            }
        },

        onAfterRendering: function () {
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
            this._attachQtyInputSelectDelegates();
            // this._attachHoverFocusDelegates(); // disabled

            var oList = this.byId("mobileCardPCyIList");
            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    var Input = oItem.getContent()[0].mAggregations.content[5].mAggregations.items[0];
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
        onMobileListUpdateFinished: function (oEvent) {
            var oList = this.byId("mobileCardPCyIList");
            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    var Input = oItem.getContent()[0].mAggregations.content[5].mAggregations.items[0];
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
        onExit: function () {
            this._clearHoverFocusDelegates();
            this._clearQtyInputSelectDelegates();
            if (BaseController.prototype.onExit) {
                BaseController.prototype.onExit.apply(this, arguments);
            }
        },

        _ensurePickItemsModel: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("pickItems");
            console.log("[ProductionOrderContinue] component pickItems model:", oPickModel && oPickModel.getData ? oPickModel.getData() : oPickModel);
            if (oPickModel) {
                if (!oView.getModel("pickItems")) {
                    oView.setModel(oPickModel, "pickItems");
                    console.log("[ProductionOrderContinue] pickItems model set on view");
                }
                var oTable = this.byId("pickTable");
                if (oTable) {
                    var oTableModel = oTable.getModel("pickItems");
                    console.log("[ProductionOrderContinue] pickTable model before set:", oTableModel && oTableModel.getData ? oTableModel.getData() : oTableModel);
                    if (!oTableModel) {
                        oTable.setModel(oPickModel, "pickItems");
                        console.log("[ProductionOrderContinue] pickItems model set on pickTable");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            oBinding.refresh();
                            console.log("[ProductionOrderContinue] pickTable items binding refreshed");
                        }
                    }
                    // Additional diagnostics: check rendered items vs binding contexts
                    try {
                        var aRenderedItems = oTable.getItems && oTable.getItems();
                        console.log("[ProductionOrderContinue] pickTable.getItems() -> length:", aRenderedItems && aRenderedItems.length);
                        var oItemsBinding = oTable.getBinding("items");
                        if (oItemsBinding) {
                            var iContextsCount = 0;
                            if (oItemsBinding && oItemsBinding.getContexts) {
                                try { iContextsCount = oItemsBinding.getContexts(0, 100).length; } catch (e) { iContextsCount = 0; }
                            } else if (oItemsBinding && oItemsBinding.getLength) {
                                try { iContextsCount = oItemsBinding.getLength(); } catch (e) { iContextsCount = 0; }
                            }
                            // fallback: also check the underlying model data directly
                            var iModelItemsCount = 0;
                            try {
                                var aModelItems = oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items');
                                iModelItemsCount = Array.isArray(aModelItems) ? aModelItems.length : 0;
                            } catch (e) { iModelItemsCount = 0; }
                            console.log("[ProductionOrderContinue] items binding contexts/length:", iContextsCount, "model items:", iModelItemsCount);

                            if ((aRenderedItems ? aRenderedItems.length : 0) === 0 && (iContextsCount > 0 || iModelItemsCount > 0)) {
                                console.log("[ProductionOrderContinue] Binding has contexts or model items but no rendered items — attempting retries and forcing rebind if needed");
                                try { oPickModel.refresh && oPickModel.refresh(true); } catch (e) { }
                                try { oItemsBinding.refresh && oItemsBinding.refresh(); } catch (e) { }
                                try { oTable.invalidate && oTable.invalidate(); oTable.rerender && oTable.rerender(); } catch (e) { }

                                // small retry loop: try a few times (synchronously scheduling via setTimeout) to give UI5 time to process bindings
                                var iAttempts = 0;
                                var fnRetry = function () {
                                    iAttempts++;
                                    var aNowRendered = oTable.getItems && oTable.getItems();
                                    if (aNowRendered && aNowRendered.length > 0) {
                                        console.log("[ProductionOrderContinue] Items rendered after retry, attempts:", iAttempts);
                                        return;
                                    }
                                    if (iAttempts <= 3) {
                                        // try a light rebind: unbind and rebind with the existing template (or rely on fallback later)
                                        try { oTable.unbindItems(); } catch (e) { }
                                        try { oTable.bindItems({ path: "pickItems>/items", template: oTemplate || null }); } catch (e) { }
                                        setTimeout(fnRetry, 100);
                                        return;
                                    }
                                    // if still nothing after retries, continue to heavier fallback (clone/programmatic) below
                                    console.log("[ProductionOrderContinue] retries exhausted — proceeding to rebind fallbacks");
                                };
                                setTimeout(fnRetry, 100);
                                // fallback: unbind and rebind items using the XML template defined in the view
                                try {
                                    var oTemplate = this.byId("pickTableRowTemplate");
                                    if (oTemplate) {
                                        console.log("[ProductionOrderContinue] rebinding pickTable using template pickTableRowTemplate (clone)");
                                        oTable.unbindItems();
                                        var bBound = false;
                                        try {
                                            var oClonedTemplate = oTemplate.clone();
                                            oTable.bindItems({ path: "pickItems>/items", template: oClonedTemplate });
                                            bBound = true;
                                        } catch (e) {
                                            // fallback to original template if clone fails
                                            console.warn("[ProductionOrderContinue] cloning template failed, falling back to original template", e);
                                            try {
                                                oTable.bindItems({ path: "pickItems>/items", template: oTemplate });
                                                bBound = true;
                                            } catch (e2) {
                                                console.warn("[ProductionOrderContinue] binding with original template failed:", e2);
                                            }
                                        }

                                        // If template binding didn't work, try a programmatic ColumnListItem template as final fallback
                                        if (!bBound) {
                                            try {
                                                var ColumnListItem = sap.m.ColumnListItem;
                                                if (!ColumnListItem) { console.warn("[ProductionOrderContinue] sap.m.ColumnListItem not available"); }
                                                var oProgTemplate = new ColumnListItem({
                                                    cells: [
                                                        new sap.m.CheckBox({ selected: "{pickItems>selected}" }),
                                                        new sap.m.Text({ text: "{pickItems>VORNR}" }),
                                                        new sap.m.Text({ text: "{pickItems>MATNR}" }),
                                                        new sap.m.Text({ text: "{pickItems>MAKTX}" }),
                                                        new sap.m.Text({ text: "{pickItems>CY_SEQNR}" }),
                                                        new sap.m.Text({ text: "{pickItems>MODEL}" }),
                                                        new sap.m.Text({ text: "{pickItems>MODEL_DESC}" }),
                                                        new sap.m.Text({ text: "{pickItems>MEINS}" }),
                                                        new sap.m.Text({ text: "{pickItems>RESERVED_QTY}" }),
                                                        new sap.m.Text({ text: "{pickItems>PICKING_QTY}" }),
                                                        new sap.m.Text({ text: "{pickItems>CHARG}" }),
                                                        new sap.m.Text({ text: "{pickItems>SERNR}" }),
                                                        new sap.m.Text({ text: "{pickItems>AUFNR}" }),
                                                        new sap.m.Text({ text: "{pickItems>AFPOS}" }),
                                                        new sap.m.Text({ text: "{pickItems>RSNUM}" }),
                                                        new sap.m.Text({ text: "{pickItems>RSPOS}" }),
                                                        new sap.m.Text({ text: "{pickItems>RSART}" }),
                                                        new sap.m.Text({ text: "{pickItems>LGPBE}" }),
                                                        new sap.m.Text({ text: "{pickItems>LABST}" }),
                                                        new sap.m.Text({ text: "{pickItems>WERKS}" }),
                                                        new sap.m.Text({ text: "{pickItems>BDTER}" })
                                                    ]
                                                });
                                                oTable.unbindItems();
                                                oTable.bindItems({ path: "pickItems>/items", template: oProgTemplate });
                                                console.log("[ProductionOrderContinue] programmatic rebind attempted (template fallback)");
                                            } catch (e3) {
                                                console.warn("[ProductionOrderContinue] programmatic rebind failed (template fallback):", e3);
                                            }
                                        }
                                    } else {
                                        console.warn("[ProductionOrderContinue] pickTableRowTemplate not found — attempting programmatic rebind");
                                        // Try programmatic template since XML template is not present
                                        try {
                                            var ColumnListItem2 = sap.m.ColumnListItem;
                                            if (!ColumnListItem2) { console.warn("[ProductionOrderContinue] sap.m.ColumnListItem not available"); }
                                            var oProgTemplate2 = new ColumnListItem2({
                                                cells: [
                                                    new sap.m.CheckBox({ selected: "{pickItems>selected}" }),
                                                    new sap.m.Text({ text: "{pickItems>VORNR}" }),
                                                    new sap.m.Text({ text: "{pickItems>MATNR}" }),
                                                    new sap.m.Text({ text: "{pickItems>MAKTX}" }),
                                                    new sap.m.Text({ text: "{pickItems>CY_SEQNR}" }),
                                                    new sap.m.Text({ text: "{pickItems>MODEL}" }),
                                                    new sap.m.Text({ text: "{pickItems>MODEL_DESC}" }),
                                                    new sap.m.Text({ text: "{pickItems>MEINS}" }),
                                                    new sap.m.Text({ text: "{pickItems>RESERVED_QTY}" }),
                                                    new sap.m.Text({ text: "{pickItems>PICKING_QTY}" }),
                                                    new sap.m.Text({ text: "{pickItems>CHARG}" }),
                                                    new sap.m.Text({ text: "{pickItems>SERNR}" }),
                                                    new sap.m.Text({ text: "{pickItems>AUFNR}" }),
                                                    new sap.m.Text({ text: "{pickItems>AFPOS}" }),
                                                    new sap.m.Text({ text: "{pickItems>RSNUM}" }),
                                                    new sap.m.Text({ text: "{pickItems>RSPOS}" }),
                                                    new sap.m.Text({ text: "{pickItems>RSART}" }),
                                                    new sap.m.Text({ text: "{pickItems>LGPBE}" }),
                                                    new sap.m.Text({ text: "{pickItems>LABST}" }),
                                                    new sap.m.Text({ text: "{pickItems>WERKS}" }),
                                                    new sap.m.Text({ text: "{pickItems>BDTER}" })
                                                ]
                                            });
                                            oTable.unbindItems();
                                            oTable.bindItems({ path: "pickItems>/items", template: oProgTemplate2 });
                                            console.log("[ProductionOrderContinue] programmatic rebind attempted (no xml template)");
                                        } catch (e4) {
                                            console.warn("[ProductionOrderContinue] programmatic rebind failed (no xml template):", e4);
                                        }
                                    }
                                } catch (e) {
                                    console.warn("[ProductionOrderContinue] rebind fallback failed:", e);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("[ProductionOrderContinue] diagnostics failed:", e);
                    }
                } else {
                    console.warn("[ProductionOrderContinue] pickTable not found by id");
                }
            } else {
                console.warn("[ProductionOrderContinue] No pickItems model found on component");
            }
        },
        formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

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
            oRouter.navTo("ProductionOrder", {
                RFlag: "X",
            }, true);
        },
          onPressBatchSerial: function (oEvent) {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // var HeadData = this.getOwnerComponent().getModel("PickForCartMainModel").getProperty("/HEAD");
            var HeadData = Object.assign({}, oEvent.getSource().getBindingContext("pickItems").getObject());
            var Spath = oEvent.getSource().getBindingContext("pickItems").getPath();
            this.getOwnerComponent().getModel("GlobalVariable").setProperty('/Spath', Spath);
            HeadData.LGORT = this.getOwnerComponent().getModel("inputFields").getProperty("/LGORT");
            if (HeadData.XCHPF !== '') {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Batch", {
                    HeadData: HeadData,
                    View: "ProductionOrderContinue"
                    // Path:Spath
                }, true);
            } else {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Serial", {
                    HeadData: HeadData,
                    View: "ProductionOrderContinue"
                    // Path:Spath
                }, true);
            }
        },


        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("sortDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Open the filter dialog (ViewSettingsDialog) and build filter items dynamically
         */
        onOpenFilterDialog: function () {
            var oDlg = this.byId("filterDialog");
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
                { key: "MODEL", label: t("model") },
                { key: "MODEL_DESC", label: t("modelDesc") },
                { key: "CY_SEQNR", label: t("shortbusnum") },
                { key: "BDTER", label: t("date"), formatter: this.formatter && this.formatter.bdterToDDMMYY },
                { key: "RESERVED_QTY", label: t("qtyInReservation") },
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
                var oTable = this.byId("pickTable");
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
            var oTable = this.byId("pickTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding && oBinding.filter) {
                    oBinding.filter(aAndFilters); // AND across groups by default
                }
            }

            // Apply to mobile list
            var oList = this.byId("mobileCardList");
            if (oList) {
                var oListBinding = oList.getBinding("items");
                if (oListBinding && oListBinding.filter) {
                    // Note: reuse same Filter objects is fine; but create new to avoid shared state
                    var aCloned = aAndFilters.map(function (f) {
                        return (f.aFilters)
                            ? new Filter({ filters: f.aFilters.slice(), and: f.bAnd })
                            : new Filter(f.sPath, f.sOperator, f.oValue1, f.oValue2);
                    });
                    oListBinding.filter(aCloned);
                }
            }
        },

        /**
         * Handler for the dialog's Reset button: remove all filters from table and mobile list.
         */
        onFilterReset: function () {
            try {
                var oTable = this.byId("pickTable");
                var oList = this.byId("mobileCardList");
                var oTableBinding = oTable && oTable.getBinding && oTable.getBinding("items");
                var oListBinding = oList && oList.getBinding && oList.getBinding("items");
                if (oTableBinding && oTableBinding.filter) { oTableBinding.filter([]); }
                if (oListBinding && oListBinding.filter) { oListBinding.filter([]); }
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
                var oTable = this.byId("pickTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                // Mobile list
                var oList = this.byId("mobileCardList");
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
            var oPickModel = oComponent.getModel("pickItems");
            if (!oPickModel) { return; }
            try {
                var aItems = oPickModel.getProperty("/items") || [];
                aItems = aItems.map(function (it) { it.selected = bSelected; return it; });
                oPickModel.setProperty("/items", aItems);
                // also update header checkbox state explicitly (defensive)
                var oHeaderCB = this.byId("selectAllCheckBox");
                if (oHeaderCB) { oHeaderCB.setSelected(bSelected); }
            } catch (e) { console.warn("onSelectAll error", e); }
        },

        /**
         * Row checkbox handler: update model and header checkbox state
         */
        onSelectRow: function (oEvent) {
            var oSource = oEvent.getSource();
            var bSelected = !!oEvent.getParameter("selected");
            var oContext = oSource.getBindingContext("pickItems");
            if (!oContext) { return; }
            var sPath = oContext.getPath(); // /items/0
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("pickItems");
            if (!oPickModel) { return; }
            try {
                oPickModel.setProperty(sPath + "/selected", bSelected);
                // update header checkbox: selected only if all rows selected
                var aItems = oPickModel.getProperty("/items") || [];
                var bAll = aItems.length > 0 && aItems.every(function (it) { return !!it.selected; });
                var oHeaderCB = this.byId("selectAllCheckBox");
                if (oHeaderCB) { oHeaderCB.setSelected(bAll); }
            } catch (e) { console.warn("onSelectRow error", e); }
        },

        /**
         * Mobile "Select All" button: toggle all items selected/cleared.
         * It reuses the same pickItems model flag used by desktop checkboxes.
         */
        onSelectAllMobile: function () {
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent && oComponent.getModel && oComponent.getModel("pickItems");
            if (!oPickModel) { return; }

            try {
                var aItems = oPickModel.getProperty("/items") || [];
                // determine if we should select or clear: select if not all currently selected
                var bAllSelected = aItems.length > 0 && aItems.every(function (it) { return !!it.selected; });
                var bTarget = !bAllSelected;

                aItems = aItems.map(function (it) { it.selected = bTarget; return it; });
                oPickModel.setProperty("/items", aItems);

                // also sync header checkbox on desktop, if present
                var oHeaderCB = this.byId("selectAllCheckBox");
                if (oHeaderCB) { oHeaderCB.setSelected(bTarget); }
            } catch (e) {
                /* eslint no-console: 0 */
                console.warn("onSelectAllMobile error", e);
            }



            if (this.bTarget === undefined) {
                this.bTarget = true;
            }
            else {
                this.bTarget = !this.bTarget;
            }


            var list = this.byId("mobileCardPCyIList");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {

                    list.setSelectedItem(it, this.bTarget);


                }, this);

            }






        },

        /**
         * Navigate to IssueItems but only with rows marked (selected === true)
         */
        onDisplayIssueItems: function () {
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("pickItems");
            var oList = '';
            var aSelected;
            var aItems;
            if (this.getOwnerComponent().getModel("device").getData().isPhone) {
                oList = this.getView().byId("mobileCardList");
                aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];
                aSelected = aItems.filter(function (it) { return !!it.selected; });
            } else {
                oList = this.getView().byId("mobileCardPCyIList");
                aItems = (oList && oList.getItems && oList.getItems()) || [];
                aSelected = oList.getSelectedItems().map(function (oItem) {
                    var oContext = oItem.getBindingContext("pickItems");
                    return oContext && oContext.getObject();
                }).filter(function (it) { return !!it; });
            }
            // var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];
            // var aSelected = aItems.filter(function (it) { return !!it.selected; });
            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            var copyaSelected = [...aSelected];
            var newArray = [];
             copyaSelected.forEach(function (it) {
                // ensure picking qty is not empty/undefined (can happen if user selected but did not enter a value)
                if (it.PICKING_QTY === undefined || it.PICKING_QTY === null || it.PICKING_QTY === "") {
                    it.PICKING_QTY = 0;
                }
                
                if (it.XCHPF === 'X') {
                    if (it.BATCHDATA) {
                        var copyObject = JSON.parse(JSON.stringify(it))
                        for (var t = 0; t < it.BATCHDATA.length; t++) {
                            copyObject.CHARG = it.BATCHDATA[t] ? it.BATCHDATA[t].CHARG : "";
                            copyObject.PICKING_QTY = it.BATCHDATA[t] ? it.BATCHDATA[t].MENGE : "";
                            delete copyObject.BATCHDATA;
                            newArray.push({ ...copyObject});
                        }
                    } else {
                        newArray.push(it);
                    }
                    // delete it.BATCHDATA;
                }
                if (it.SERNP !== '') {
                    if (it.SERNRDATA) {
                        var copyObject = JSON.parse(JSON.stringify(it))
                        for (var t = 0; t < it.PICKING_QTY; t++) {
                            copyObject.SERNR = it.SERNRDATA[t] ? it.SERNRDATA[t].SERNR : "";
                            copyObject.PICKING_QTY = 1;
                            delete copyObject.SERNRDATA;
                            newArray.push({ ...copyObject});
                        }
                    } else {
                        newArray.push(it);
                    }
                    // delete it.SERNRDATA;
                }
                if (it.XCHPF === '' && it.SERNP === '') {
                    newArray.push(it);
                }


            });
            if (!oComponent.getModel("issueItems")) {
                oComponent.setModel(new sap.ui.model.json.JSONModel({ items: newArray }), "issueItems");
            } else {
                oComponent.getModel("issueItems").setData({ items: newArray });
            }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("IssueItems");
        },

        /**
         * Clear selections (clears selected flag on model and unchecks header checkbox)
         */
        onClearSelection: function () {
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("pickItems");
            if (oPickModel) {
                try {
                    var aItems = oPickModel.getProperty('/items') || [];
                    aItems = aItems.map(function (it) { it.selected = false; return it; });
                    oPickModel.setProperty('/items', aItems);
                } catch (e) { console.warn("onClearSelection model update failed", e); }
            }
            this.bTarget = false;


            var list = this.byId("mobileCardPCyIList");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {
                    list.setSelectedItem(it, this.bTarget);
                }, this);

            }
            var oHeaderCB = this.byId("selectAllCheckBox");
            if (oHeaderCB) { oHeaderCB.setSelected(false); }
            sap.m.MessageToast.show("Selection cleared");
        },

        /**
         * Validate picking quantity cannot be greater than reserved quantity
         */
        onQtyToPickLiveChange: function (oEvent) {
            var oComponent = this.getOwnerComponent();
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oContext = oInput.getBindingContext("pickItems");
            if (!oContext) { return; }
            var oData = oContext.getObject();
            var reservedQty = Number(oData.RESERVED_QTY);
            var pickingQty = Number(sValue);
            if (pickingQty > reservedQty) {
                oInput.setValue(reservedQty);
                
                var oPickModel = oComponent.getModel("pickItems");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/PICKING_QTY", reservedQty);
                }
                var oView = this.getView();
                var sMsg = oView.getModel("i18n").getResourceBundle().getText("errorPickingQtyExceedsReserved");
                MessageBox.error(sMsg);
            }else {
                var oPickModel = oComponent.getModel("pickItems");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/PICKING_QTY", sValue);
                }
            }
        },

        /**
         * Sort handler for table columns
         */
        onSort: function (oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("pickTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },

        onPickTableUpdateFinished: function () {
            this._attachQtyInputSelectDelegates();
            // this._attachHoverFocusDelegates(); // disabled
        },

        _attachQtyInputSelectDelegates: function () {
            var oView = this.getView();
            if (!oView) { return; }

            this._aQtySelectDelegates = this._aQtySelectDelegates || [];

            this._aQtySelectDelegates = this._aQtySelectDelegates.filter(function (oEntry) {
                if (!oEntry || !oEntry.control || oEntry.control.bIsDestroyed) {
                    if (oEntry && oEntry.control && oEntry.delegate) {
                        oEntry.control.removeEventDelegate(oEntry.delegate);
                    }
                    if (oEntry && oEntry.control) {
                        this._deregisterQtySelectHandlers(oEntry.control);
                    }
                    return false;
                }
                return true;
            }, this);

            var aInputs = oView.findAggregatedObjects(true, function (oControl) {
                return !!(oControl && oControl.isA && oControl.isA("sap.m.Input") && oControl.hasStyleClass && oControl.hasStyleClass("hoverFocusInput"));
            }) || [];

            var that = this;
            aInputs.forEach(function (oInput) {
                if (!oInput) { return; }

                var oTracked = that._aQtySelectDelegates.find(function (oEntry) {
                    return oEntry && oEntry.control === oInput;
                });

                if (!oTracked) {
                    var oDelegate = {
                        onAfterRendering: function () {
                            that._registerQtySelectHandlers(oInput);
                        },
                        onBeforeRendering: function () {
                            that._deregisterQtySelectHandlers(oInput);
                        }
                    };
                    oInput.addEventDelegate(oDelegate);
                    that._aQtySelectDelegates.push({ control: oInput, delegate: oDelegate });
                }

                that._registerQtySelectHandlers(oInput);
            });
        },

        _clearQtyInputSelectDelegates: function () {
            if (!this._aQtySelectDelegates) { return; }
            this._aQtySelectDelegates.forEach(function (oEntry) {
                if (oEntry && oEntry.control) {
                    this._deregisterQtySelectHandlers(oEntry.control);
                }
                if (oEntry && oEntry.control && oEntry.delegate) {
                    oEntry.control.removeEventDelegate(oEntry.delegate);
                }
            }, this);
            this._aQtySelectDelegates = [];
        },

        _registerQtySelectHandlers: function (oInput) {
            if (!oInput || !oInput.$) { return; }

            var fnHandler = oInput.data("selectAllHandler");
            if (!fnHandler) {
                fnHandler = function (oEvent) {
                    if (oEvent && oEvent.type === "mousedown" && oEvent.button !== 0) { return; }
                    if (oEvent && oEvent.type === "mousedown" && oEvent.preventDefault) {
                        oEvent.preventDefault();
                    }

                    try {
                        var oDomRef = oInput.getFocusDomRef && oInput.getFocusDomRef();
                        if (oInput.focus && (!oDomRef || document.activeElement !== oDomRef)) {
                            oInput.focus();
                        }
                        var sValue = oInput.getValue ? oInput.getValue() : "";
                        oInput.selectText(0, sValue.length);
                    } catch (e) {
                        // ignore selection errors
                    }
                };
                oInput.data("selectAllHandler", fnHandler);
            }

            var $Inner = oInput.$("inner");
            if ($Inner && $Inner.length) {
                $Inner.off(".qtySelect");
                $Inner.on("focus.qtySelect click.qtySelect touchstart.qtySelect mousedown.qtySelect", fnHandler);
            }
        },

        _deregisterQtySelectHandlers: function (oInput) {
            if (!oInput || !oInput.$) { return; }
            var $Inner = oInput.$("inner");
            if ($Inner && $Inner.length) {
                $Inner.off(".qtySelect");
            }
        },

        _selectAllInputText: function (oInput) {
            if (!oInput || !oInput.selectText) { return; }
            if (this._bSelectingQtyInputText) { return; }

            var that = this;
            this._bSelectingQtyInputText = true;
            try {
                if (oInput.focus) {
                    oInput.focus();
                }
            } catch (eFocus) {
                // ignore focus errors here, async retry below
            }
            setTimeout(function () {
                try {
                    var oDomRef = oInput.getFocusDomRef && oInput.getFocusDomRef();
                    if (oInput.focus && (!oDomRef || document.activeElement !== oDomRef)) {
                        oInput.focus();
                    }
                    var sValue = oInput.getValue ? oInput.getValue() : "";
                    oInput.selectText(0, sValue.length);
                } catch (e) {
                    // swallow selection errors silently
                } finally {
                    that._bSelectingQtyInputText = false;
                }
            }, 0);
        },

        _attachHoverFocusDelegates: function () {
            /*
            var oView = this.getView();
            if (!oView) { return; }

            var aInputs = oView.findAggregatedObjects(true, function(oControl) {
                return !!(oControl && oControl.isA && oControl.isA("sap.m.Input") && oControl.hasStyleClass && oControl.hasStyleClass("hoverFocusInput"));
            }) || [];

            var that = this;
            aInputs.forEach(function(oInput) {
                if (!oInput) { return; }

                var bAlreadyTracked = that._aHoverFocusDelegates.some(function(oEntry) {
                    return oEntry && oEntry.control === oInput;
                });

                if (!bAlreadyTracked) {
                    var oDelegate = {
                        onAfterRendering: function() {
                            that._registerHoverFocus(oInput);
                        },
                        onBeforeRendering: function() {
                            that._deregisterHoverFocus(oInput);
                        }
                    };

                    oInput.addEventDelegate(oDelegate);
                    that._aHoverFocusDelegates.push({ control: oInput, delegate: oDelegate });
                }

                that._registerHoverFocus(oInput);
            });
            */
        },

        _registerHoverFocus: function (oInput) {
            /*
            if (!oInput || !oInput.getDomRef) { return; }

            var fnHoverHandler = oInput.data("hoverFocusHandler");
            if (!fnHoverHandler) {
                fnHoverHandler = function() {
                    window.setTimeout(function() {
                        try {
                            var oDomRef = oInput.getFocusDomRef();
                            if (oDomRef && document.activeElement === oDomRef) {
                                return;
                            }
                            oInput.focus();
                            oDomRef = oInput.getFocusDomRef();
                            if (oDomRef && oDomRef.select) {
                                oDomRef.select();
                            }
                        } catch (e) {
                            // swallow focus errors silently
                        }
                    }, 0);
                };
                oInput.data("hoverFocusHandler", fnHoverHandler);
            }

            var $Inner;
            try { $Inner = oInput.$("inner"); } catch (e) { $Inner = null; }
            if ($Inner && $Inner.length) {
                $Inner.off("mouseenter.hoverFocus");
                $Inner.on("mouseenter.hoverFocus", fnHoverHandler);
            } else {
                var $Root;
                try { $Root = oInput.$(); } catch (eRoot) { $Root = null; }
                if ($Root && $Root.length) {
                    $Root.off("mouseenter.hoverFocus");
                    $Root.on("mouseenter.hoverFocus", fnHoverHandler);
                }
            }

            var $Cell = null;
            try {
                var $RootForCell = oInput.$();
                if ($RootForCell && $RootForCell.length) {
                    $Cell = $RootForCell.closest(".sapMListTblCell");
                }
            } catch (eCell) {
                $Cell = null;
            }
            if ($Cell && $Cell.length) {
                $Cell.off("mouseenter.hoverFocus");
                $Cell.on("mouseenter.hoverFocus", fnHoverHandler);
            }
            */
        },

        _deregisterHoverFocus: function (oInput) {
            /*
            if (!oInput) { return; }
            var $Inner;
            try { $Inner = oInput.$("inner"); } catch (e) { $Inner = null; }
            if ($Inner && $Inner.length) {
                $Inner.off("mouseenter.hoverFocus");
            }
            var $Root;
            try { $Root = oInput.$(); } catch (eRoot) { $Root = null; }
            if ($Root && $Root.length) {
                $Root.off("mouseenter.hoverFocus");
            }
            var $Cell = null;
            try {
                var $RootForCell = oInput.$();
                if ($RootForCell && $RootForCell.length) {
                    $Cell = $RootForCell.closest(".sapMListTblCell");
                }
            } catch (eCell) {
                $Cell = null;
            }
            if ($Cell && $Cell.length) {
                $Cell.off("mouseenter.hoverFocus");
            }
            */
        },

        _clearHoverFocusDelegates: function () {
            /*
            if (!this._aHoverFocusDelegates) { return; }
            this._aHoverFocusDelegates.forEach(function(oEntry) {
                if (!oEntry || !oEntry.control) { return; }
                if (oEntry.delegate) {
                    oEntry.control.removeEventDelegate(oEntry.delegate);
                }
                oEntry.control.data("hoverFocusHandler", null);
                this._deregisterHoverFocus(oEntry.control);
            }, this);
            this._aHoverFocusDelegates = [];
            */
        }
    });
});
