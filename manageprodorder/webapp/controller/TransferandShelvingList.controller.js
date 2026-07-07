sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "com/merkavim/ewm/manageprodorder/model/formatter",
    "sap/m/ViewSettingsFilterItem",
    "sap/m/ViewSettingsItem",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter"
], function(BaseController, JSONModel, MessageBox, formatter, ViewSettingsFilterItem, ViewSettingsItem, Filter, Sorter) {
// formatter is loaded for view binding
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.TransferandShelvingList", {
        formatter: formatter,
        onInit: function() {
            // this._aHoverFocusDelegates = [];
            // Disable custom hover-to-focus behavior
            // this._hoverFocusDisabled = true; // commented per request: only comments, no deletions
            // Use global device model (point 3). No local override.
            // Ensure initial visibility for mobile cards vs table if needed
            // this.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox1" });

            // `inputFields` model is initialized at the component level; rely on that model here

            // Ensure pickItems model is available when the view is displayed
            var oComponent = this.getOwnerComponent();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
             oRouter.getRoute("TransferandShelvingList").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function(oEvent) {
            var oComponent = this.getOwnerComponent();
            // var oPickModel = oComponent.getModel("pickItems");
            this.ongetList();
        },
        
        ongetList:function(){
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                SPRAS: lang.toUpperCase()
            };
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("CartList");
            oPickModel.setSizeLimit(9999);
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SHELVING_1_LIST";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (oData) {

                   
                    var oStockTransferModel = new sap.ui.model.json.JSONModel(oData);
                    oStockTransferModel.setSizeLimit(99999);
                     that.getOwnerComponent().getModel("TransferList").setSizeLimit(99999);
                    that.getOwnerComponent().getModel("TransferList").setData(oData);
                    that.getView().setModel(oStockTransferModel, "TransferList");
                    let oModel = that.getView().getModel("view");
                    oModel.setSizeLimit(99999);
                    oModel.setData(oData || {});
                    // Save WERKS globally on the component for later use
                    // if (oData.DATA && oData.DATA.WERKS) {
                    //     that.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({ WERKS: oData.DATA.WERKS }), "globalWerks");
                    // }

                   

                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch F4 help data");
                }
            });
           
        },

        onAfterRendering: function() {
            // if (BaseController.prototype.onAfterRendering) {
            //     BaseController.prototype.onAfterRendering.apply(this, arguments);
            // }
            // this._attachQtyInputSelectDelegates();
            // this._attachHoverFocusDelegates(); // disabled
        },

        onExit: function() {
            // this._clearHoverFocusDelegates();
            // this._clearQtyInputSelectDelegates();
            // if (BaseController.prototype.onExit) {
            //     BaseController.prototype.onExit.apply(this, arguments);
            // }
        },

       
        onNavBack: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("TransferandShelving",{
                 
            },true);
        },
       

        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function() {
            var oDlg = this.byId("sorttasDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Open the filter dialog (ViewSettingsDialog) and build filter items dynamically
         */
        onOpenFilterDialog: function() {
            var oDlg = this.byId("filtertasDialog");
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
        _buildFilterDialogItems: function(oDlg) {
            if (!oDlg) { return; }

            // Clear previous filter items
            try { oDlg.destroyFilterItems(); } catch (e) {}

            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent && oComponent.getModel && oComponent.getModel("TransferList");
            var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/LIST')) || [];

            var oI18n = this.getView().getModel("i18n");
            var rb = oI18n && oI18n.getResourceBundle && oI18n.getResourceBundle();
            function t(k){ try { return rb.getText(k); } catch(e){ return k; } }

            // Define fields to filter with label resolvers
            var aFields = [
                { key: "MATNR",       label: t("itemLabel") },
                { key: "MBLNR",       label: t("materialdocnum") },
                { key: "MENGE",  label: t("ShelvedQty") },
                { key: "BUDAT",    label: t("ReceiptDate") }
                
                
            ];

            // Pre-detect value type per field from first non-null sample
            var mTypes = {};
            aFields.forEach(function(f){
                for (var i=0;i<aItems.length;i++){
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

            aFields.forEach(function(f){
                var mDistinct = Object.create(null);
                aItems.forEach(function(row){
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

                    aValues.forEach(function(k){
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
          formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },

        /**
         * Build a map of currently applied filter values keyed by field.
         * Example: { MODEL: { "X1": true, "X2": true }, VORNR: { "10": true } }
         */
        _getCurrentFilterValueMap: function() {
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
                var oTable = this.byId("TASLTable");
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
        onFilterConfirm: function(oEvent) {
            var mParams = oEvent.getParameters();
            var aSelectedItems = mParams && mParams.filterItems || [];

            // Group selected values by field
            var mFieldToValues = {};
            aSelectedItems.forEach(function(oItem){
                if (!oItem || !oItem.getParent) { return; }
                var oGroup = oItem.getParent();
                var sField = oGroup && oGroup.getKey && oGroup.getKey();
                if (!sField) { return; }
                mFieldToValues[sField] = mFieldToValues[sField] || [];
                mFieldToValues[sField].push(oItem.getKey());
            });

            // Build compound filters: OR within same field, AND across different fields
            var aAndFilters = [];
            Object.keys(mFieldToValues).forEach(function(sField){
                var aValues = mFieldToValues[sField] || [];
                if (!aValues.length) { return; }
                var aOrFilters = aValues.map(function(v){
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
            var oTable = this.byId("TASLTable");
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
        onFilterReset: function() {
            try {
                var oTable = this.byId("TASLTable");
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
        onSortConfirm: function(oEvent) {
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem && mParams.sortItem.getKey();
            var bDescending = !!mParams.sortDescending;

            if (!sPath) { return; }

            try {
                var oSorter = new Sorter(sPath, bDescending);

                // Desktop/tablet table
                var oTable = this.byId("TASLTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                // Mobile list
                // var oList = this.byId("mobileCardList");
                // if (oList) {
                //     var oListBinding = oList.getBinding("items");
                //     if (oListBinding && oListBinding.sort) {
                //         // use a new sorter instance to avoid shared state
                //         oListBinding.sort(new Sorter(sPath, bDescending));
                //     }
                // }
            } catch (e) {
                // no-op; sorting errors should not break UX
                /* eslint no-console: 0 */
                console.warn("Sort apply failed", e);
            }
        },

      

     
      onClearSelection:function(){
        var oTable = this.byId("TASLTable");
        oTable.removeSelections(true);
      },
     

      
        onDisplayIssueItems: function() {
            var oComponent = this.getOwnerComponent();
            var oTable = this.byId("TASLTable");    
            var aSelected = oTable.getSelectedItems();
            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            var array = [];
            aSelected.forEach(function(oItem){
                var oDt = oItem.getBindingContext("TransferList").getObject();
                array.push(oDt.MBLNR);

            });
            var oDocument = encodeURIComponent(JSON.stringify(array));

            
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("TransferandShelving", { Document: oDocument }, true);
        },

      

        

        /**
         * Sort handler for table columns
         */
        onSort: function(oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("pickPCLTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },

       

      

      
      

      

       
    });
});
