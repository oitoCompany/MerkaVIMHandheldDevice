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
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.PickForCartItems", {
        formatter: formatter,
        onInit: function () {
            this._aHoverFocusDelegates = [];
            // Disable custom hover-to-focus behavior
            // this._hoverFocusDisabled = true; // commented per request: only comments, no deletions
            // Use global device model (point 3). No local override.
            // Ensure initial visibility for mobile cards vs table if needed
            // this.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox1" });

            // `inputFields` model is initialized at the component level; rely on that model here

            // Ensure pickItems model is available when the view is displayed
            var oComponent = this.getOwnerComponent();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("PickForCartItems").attachPatternMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
            this._attachQtyInputSelectDelegates();

            var oList = this.byId("mobileCardPCIList");
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

            try {
                var oList3 = this.byId("mobileCardList31");
                if (oList3 && oList3.getItems) {
                    var oItems3 = oList3.getItems() || [];
                    oItems3.forEach(function (oItem) {
                        var Input3 = oItem.getContent()[0].mAggregations.content[6].mAggregations.items[1];
                        if (Input3 && Input3.addEventDelegate) {
                            Input3.addEventDelegate({
                                onfocusin: function () {
                                    setTimeout(function () {

                                        Input3.$().find("input").select();
                                        this.selectText(0, this.getValue().length);
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (e) {
            }
        },
        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("PickForCartMainModel");
            this.oData = oContext && oContext.getObject();


            if (!this.ListTapiDialog) {
                this.ListTapiDialog = sap.ui.xmlfragment(this.getView().getId(), "com.merkavim.ewm.manageprodorder.fragment.TAPIList", this);
            }
            this.getView().addDependent(this.ListTapiDialog);
            this.ListTapiDialog.open();
        },
        formatTapiListItemTitle: function (TAPI_CODE, TAPI_DESC) {
            if (!TAPI_DESC) {
                return TAPI_CODE;
            }
            return TAPI_CODE + " - " + TAPI_DESC;
        },
        onTapiItemSelected: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oContext = oSelectedItem.getBindingContext("TapiListModel").getObject();
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);

            var MData = this.getOwnerComponent().getModel('PickForCartMainModel').getData().DATA
                MData.SPRAS = lang;
            var oPayload = {
                DATA:MData,
                TAPI: oContext,
                ITEM: this.oData,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_CART_2_TAPI";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model





                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    MessageBox.success(response.MSG.MSGTX || "Data Saved Successfully");



                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },

        onSearchTapiItems: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = [];
            if (sValue) {
                var desfilter = new sap.ui.model.Filter("TAPI_DESC", sap.ui.model.FilterOperator.Contains, sValue);
                var codefilter = new sap.ui.model.Filter("TAPI_CODE", sap.ui.model.FilterOperator.EQ, isNaN(sValue) ? sValue : parseInt(sValue));
                var combinedFilter = new sap.ui.model.Filter({
                    filters: [desfilter, codefilter],
                    and: false
                });
                oFilter.push(combinedFilter);
            }

            this.ListTapiDialog.getBinding("items").filter(oFilter);
        },


        onMobileListUpdateFinished: function () {
            var oList = this.byId("mobileCardPCIList");
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
                    //  oItem.setSelected(oItem.getBindingContext("PickForCartMainModel").getObject().ISSUED === "X" ? false : true);
                    var checkBox = oItem.getMultiSelectControl();
                    if (checkBox) {
                        checkBox.setEnabled(oItem.getBindingContext("PickForCartMainModel").getObject().ISSUED !== "X");


                    }
                    Input.setEnabled(oItem.getBindingContext("PickForCartMainModel").getObject().ISSUED !== "X");
                    oItem.getContent()[0].mAggregations.content[0].mAggregations.items[0].setEnabled(oItem.getBindingContext("PickForCartMainModel").getObject().ISSUED !== "X");


                }

                );
            }

            try {
                var oList3 = this.byId("mobileCardList31");
                if (oList3 && oList3.getItems) {
                    var oItems3 = oList3.getItems() || [];
                    oItems3.forEach(function (oItem) {
                        var Input3 = oItem.getContent()[0].mAggregations.content[6].mAggregations.items[1];
                        if (Input3 && Input3.addEventDelegate) {
                            Input3.addEventDelegate({
                                onfocusin: function () {
                                    setTimeout(function () {

                                        Input3.$().find("input").select();
                                        this.selectText(0, this.getValue().length);
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (e) {
            }
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

        onExit: function () {

        },


        onRemarkLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oViewModel = this.getOwnerComponent().getModel("validData");
            if (oViewModel) {
                oViewModel.setProperty("/BKTXT", sValue);
            }
        },
        onNavBack: function () {
            this.getOwnerComponent().getModel("PickForCartCheckModel").setProperty("/FLAG", "X");
            // this.onClearSelection();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("PickForCartIDetails", {

            }, true);
        },
        onPressBatchSerial: function (oEvent) {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // var HeadData = this.getOwnerComponent().getModel("PickForCartMainModel").getProperty("/HEAD");
            var HeadData = oEvent.getSource().getBindingContext("PickForCartMainModel").getObject();
            var Spath = oEvent.getSource().getBindingContext("PickForCartMainModel").getPath();
            this.getOwnerComponent().getModel("GlobalVariable").setProperty('/Spath', Spath);

            if (HeadData.XCHPF !== '') {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Batch", {
                    HeadData: HeadData,
                    View: "PickForCartItems"
                    // Path:Spath
                }, true);
            } else {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Serial", {
                    HeadData: HeadData,
                    View: "PickForCartItems"
                    // Path:Spath
                }, true);
            }
        },

        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("sortPCIDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Open the filter dialog (ViewSettingsDialog) and build filter items dynamically
         */
        onOpenFilterDialog: function () {
            var oDlg = this.byId("filterPCIDialog");
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
            var oPickModel = oComponent && oComponent.getModel && oComponent.getModel("PickForCartMainModel");
            var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/ITEM')) || [];

            var oI18n = this.getView().getModel("i18n");
            var rb = oI18n && oI18n.getResourceBundle && oI18n.getResourceBundle();
            function t(k) { try { return rb.getText(k); } catch (e) { return k; } }

            // Define fields to filter with label resolvers
            var aFields = [
                { key: "VORNR", label: t("action") },
                { key: "TAKT_VORNR", label: t("TAKT") },
                { key: "MAKTX", label: t("itemDescription") },
                { key: "MATNR", label: t("itemLabel") },
                // { key: "BDTER",       label: t("date"), formatter: this.formatter && this.formatter.bdterToDDMMYY },
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



            // Apply to mobile list
            var oList = this.byId("mobileCardPCIList");
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

            var oList2 = this.byId("mobileCardList31");
            if (oList2) {
                var oListBinding2 = oList2.getBinding("items");
                if (oListBinding2 && oListBinding2.filter) {
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
                // var oTable = this.byId("pickTable");
                var oList = this.byId("mobileCardPCIList");
                var oList2 = this.byId("mobileCardList31");
                // var oTableBinding = oTable && oTable.getBinding && oTable.getBinding("items");
                var oListBinding = oList && oList.getBinding && oList.getBinding("items");
                var oListBinding2 = oList2 && oList2.getBinding && oList2.getBinding("items");
                // if (oTableBinding && oTableBinding.filter) { oTableBinding.filter([]); }
                if (oListBinding && oListBinding.filter) { oListBinding.filter([]); }
                if (oListBinding2 && oListBinding2.filter) { oListBinding2.filter([]); }
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


                // Mobile list
                var oList = this.byId("mobileCardPCIList");
                if (oList) {
                    var oListBinding = oList.getBinding("items");
                    if (oListBinding && oListBinding.sort) {
                        // use a new sorter instance to avoid shared state
                        oListBinding.sort(new Sorter(sPath, bDescending));
                    }
                }
                var oList4 = this.byId("mobileCardList31");
                if (oList4) {
                    var oListBinding4 = oList4.getBinding("items");
                    if (oListBinding4 && oListBinding4.sort) {
                        // use a new sorter instance to avoid shared state
                        oListBinding4.sort(new Sorter(sPath, bDescending));
                    }
                }
            } catch (e) {
                // no-op; sorting errors should not break UX
                /* eslint no-console: 0 */
                console.warn("Sort apply failed", e);
            }
        },


        onSelectAllWarning: function () {
            var that = this;
            var text = "";

            if (this.bTarget === undefined || this.bTarget === false) {
                text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SelectAllWarningTitle");
            }
            else {
                text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("DeselectAllWarningTitle");
            }
            MessageBox.warning(
                text, {
                actions: [that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"), MessageBox.Action.CANCEL],
                emphasizedAction: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"),
                onClose: function (sAction) {
                    if (sAction === that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm")) {
                        // User confirmed deletion
                        // var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        // oRouter.navTo("RouteView1", {}, true);
                        that.onSelectAllMobile();

                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });

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


            var list = this.byId("mobileCardPCIList");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {
                    if (it.getBindingContext("PickForCartMainModel").getObject().ISSUED === "X") {
                        list.setSelectedItem(it, false);
                    } else {
                        list.setSelectedItem(it, this.bTarget);
                    }

                }, this);

            }

            var list2 = this.byId("mobileCardList31");
            var oItems2 = list2 && list2.getItems && list2.getItems();
            if (oItems2 && oItems2.length > 0) {

                oItems2.forEach(function (it) {
                    if (it.getBindingContext("PickForCartMainModel").getObject().ISSUED === "X") {
                        list2.setSelectedItem(it, false);
                    } else {
                        list2.setSelectedItem(it, this.bTarget);
                    }

                }, this);

            }

            // also sync header checkbox on desktop, if present
            // var oHeaderCB = this.byId("selectAllCheckBox");
            // if (oHeaderCB) { oHeaderCB.setSelected(this.bTarget); }

        },

        /**
         * Navigate to IssueItems but only with rows marked (selected === true)
         */
        onDisplayIssueItems: function () {
            var oComponent = this.getOwnerComponent();
            var oList = '';

            if (this.getOwnerComponent().getModel("device").getData().isPhone) {
                oList = this.getView().byId("mobileCardList31");

            } else {
                oList = this.getView().byId("mobileCardPCIList");
            }

            var aItems = (oList && oList.getItems && oList.getItems()) || [];
            var aSelected = oList.getSelectedItems().map(function (oItem) {
                var oContext = oItem.getBindingContext("PickForCartMainModel");
                return oContext && oContext.getObject();
            }).filter(function (it) { return !!it; });
            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            var copyaSelected = [...aSelected];
            var newArray = [];
            copyaSelected.forEach(function (it) {
                // ensure picking qty is not empty/undefined (can happen if user selected but did not enter a value)
                if (it.PICKING_QTY === undefined || it.PICKING_QTY === null || it.PICKING_QTY === "") {
                    it.PICKING_QTY = 0;
                }
                delete it.NumberRow;
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

            if (!oComponent.getModel("issueCartItems")) {
                oComponent.setModel(new sap.ui.model.json.JSONModel({ items: newArray }), "issueCartItems");
            } else {
                oComponent.getModel("issueCartItems").setData({ items: newArray });
            }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("PickIssueCartItems");
        },
        formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },

        onClearSelectionWarning: function () {
            var that = this;
            MessageBox.warning(
                that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ClearSelectionTile"), {
                actions: [that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"), MessageBox.Action.CANCEL],
                emphasizedAction: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"),
                onClose: function (sAction) {
                    if (sAction === that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm")) {
                        // User confirmed deletion
                        // var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        // oRouter.navTo("RouteView1", {}, true);
                        that.onClearSelection();

                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });

        },

        /**
         * Clear selections (clears selected flag on model and unchecks header checkbox)
         */
        onClearSelection: function () {
            this.bTarget = false;


            var list = this.byId("mobileCardPCIList");
            var oItems = list && list.getItems && list.getItems();
            if (oItems && oItems.length > 0) {

                oItems.forEach(function (it) {
                    list.setSelectedItem(it, this.bTarget);
                }, this);

            }

            var list2 = this.byId("mobileCardList31");
            var oItems2 = list2 && list2.getItems && list2.getItems();
            if (oItems2 && oItems2.length > 0) {

                oItems2.forEach(function (it) {

                    list2.setSelectedItem(it, this.bTarget);


                }, this);

            }

        },

        /**
         * Validate picking quantity cannot be greater than reserved quantity
         */
        onQtyToPickLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oContext = oInput.getBindingContext("PickForCartMainModel");
            var oComponent = this.getOwnerComponent();
            if (!oContext) { return; }
            var oData = oContext.getObject();
            var reservedQty = Number(oData.RESERVED_QTY);
            var pickingQty = Number(sValue);
            if (pickingQty > reservedQty) {
                oInput.setValue(reservedQty);

                var oPickModel = oComponent.getModel("PickForCartMainModel");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/PICKING_QTY", reservedQty);
                }
                var oView = this.getView();
                var sMsg = oView.getModel("i18n").getResourceBundle().getText("errorPickingQtyExceedsReserved");
                MessageBox.error(sMsg);
            } else {
                var oPickModel = oComponent.getModel("PickForCartMainModel");
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


        formaterlinebrak: function (ovalue) {
            if (ovalue) {
                return ovalue.replace(/\\n/g, ",\n");
            }
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments") || {};
            var NFlAG = oArgs.NFLAG || "";

            if (NFlAG !== "X") {
                this.onClearSelection();
            }

        },
    });
});
