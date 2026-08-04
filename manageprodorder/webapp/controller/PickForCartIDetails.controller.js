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
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.PickForCartIDetails", {
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
             oRouter.getRoute("PickForCartIDetails").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function(oEvent) {
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("pickItems");
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

            this.onUnlockCart();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          

            oRouter.navTo("PickForCart",{
                //  NFLAG: flag
            },true);
        },
       

        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function() {
            var oDlg = this.byId("sortDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Open the filter dialog (ViewSettingsDialog) and build filter items dynamically
         */
        onOpenFilterDialog: function() {
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
        _buildFilterDialogItems: function(oDlg) {
            if (!oDlg) { return; }

            // Clear previous filter items
            try { oDlg.destroyFilterItems(); } catch (e) {}

            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent && oComponent.getModel && oComponent.getModel("pickItems");
            var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];

            var oI18n = this.getView().getModel("i18n");
            var rb = oI18n && oI18n.getResourceBundle && oI18n.getResourceBundle();
            function t(k){ try { return rb.getText(k); } catch(e){ return k; } }

            // Define fields to filter with label resolvers
            var aFields = [
                { key: "BUS",       label: t("LongBusNumber") },
                { key: "NAME1",       label: t("CustomerName") },
                { key: "AUFNR",  label: t("FQA") }
               
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
                var oTable = this.byId("pickpcdTable");
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
            var oTable = this.byId("pickpcdTable");
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
                var oTable = this.byId("pickpcdTable");
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
                var oTable = this.byId("pickpcdTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                // Mobile list
                var oList = this.byId("mobileCardList");
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

       

      

      
        onDisplayIssueItems: function() {
            // var oComponent = this.getOwnerComponent();
            // var oPickModel = oComponent.getModel("pickItems");
            // var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];
            // var aSelected = aItems.filter(function(it){ return !!it.selected; });
            // if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            // if (!oComponent.getModel("issueItems")) {
            //     oComponent.setModel(new sap.ui.model.json.JSONModel({ items: aSelected }), "issueItems");
            // } else {
            //     oComponent.getModel("issueItems").setData({ items: aSelected });
            // }
            var oI18n = this.getView().getModel("i18n").getResourceBundle();
            var oTable = this.byId("pickpcdTable");
            var items = oTable.getBinding("items")
            var BUS = items.oModel.oData.BUS;
            
            if(BUS != undefined && BUS != null && BUS != ""){
                var cart_sts = BUS[0].CART_STS;
            }
            if(cart_sts == "1" ){
                          
                MessageBox.error(oI18n.getText("ProceedError"));
                return;
            }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
              var flag = this.getOwnerComponent().getModel("PickForCartCheckModel").getProperty("/FLAG");
            oRouter.navTo("PickForCartItems",{ NFLAG: flag },true);
        },

       onChangeProcessStatus: function () {
            var oMainModelRef = this.getOwnerComponent().getModel("PickForCartMainModel").getData();

            // this.getOwnerComponent().getModel("IssueBasedonReservationMainModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oMainModelRef.DATA || {},

                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_3_PROCES";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);
                    var oI18n = that.getView().getModel("i18n").getResourceBundle();

                    // Bind response to the view model



                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    var oTable = that.byId("pickpcdTable");
                    var items = oTable.getBinding("items");
                    var oModel = items.getModel();
                    var BUS = oModel.oData.BUS;
                    for (var i = 0; i < BUS.length; i++) {
                        BUS[i].CART_STS = "2";
                        BUS[i].CART_STS_DESC = "בהכנה";
                }
                  var mainModel = that.getOwnerComponent().getModel("PickForCartMainModel");
                 var data = mainModel.getData( );
                 data.DATA.CART_STS = "2";
                  data.DATA.CART_STS_DESC = "בהכנה";
                  mainModel.setData(data);
                    oTable.getBinding("items").refresh();
                    oModel.refresh();
                    MessageBox.success(response.MSG.MSGTX || oI18n.getText("SuccessfullyprocessStatus"));




                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onUnlockCart: function () {
            var oMainModelRef = this.getOwnerComponent().getModel("PickForCartMainModel").getData();

            // this.getOwnerComponent().getModel("IssueBasedonReservationMainModel").setData(aDocumentTokens);
            var that = this;
            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                CART: oMainModelRef.DATA.CART || {},
                ITEMS: oMainModelRef.DATA.ITEMS || [],
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_UNLOCK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);
                    var oI18n = that.getView().getModel("i18n").getResourceBundle();

                    // Bind response to the view model



                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    //MessageBox.success(response.MSG.MSGTX || oI18n.getText("SuccessfullyUnlockedStatus"));




                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },


        

        /**
         * Sort handler for table columns
         */
        onSort: function(oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("pickTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },

       

      

      
      

      

       
    });
});
