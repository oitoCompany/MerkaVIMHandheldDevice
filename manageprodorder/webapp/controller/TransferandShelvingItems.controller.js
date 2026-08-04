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
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.TransferandShelvingItems", {
        formatter: formatter,
        onInit: function () {
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
            oRouter.getRoute("TransferandShelvingItems").attachPatternMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
            var oList = this.byId("materialList");
            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    var Input = oItem.getContent()[0].mAggregations.content[0].mAggregations.items[4].mAggregations.items[0].mAggregations.items[1];
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
            // this.getOwnerComponent().getModel("PickForCartCheckModel").setProperty("/FLAG", "X");
            // this.onClearSelection();

             var that = this;
            MessageBox.warning(
                that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ScreenExitWarningTitle"), {
                actions: [that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"), MessageBox.Action.CANCEL],
                emphasizedAction: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"),
                onClose: function (sAction) {
                    if (sAction === that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm")) {
                        // User confirmed deletion
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        oRouter.navTo("TransferandShelving", {

                        }, true);
                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });
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
        onSelectAll: function (oEvent) {
            var bSelected = !!oEvent.getParameter("selected");
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
            if (!oPickModel) { return; }
            try {
                var aItems = oPickModel.getProperty("/ITEM") || [];
                aItems = aItems.map(function (it) { it.selected = bSelected; return it; });
                oPickModel.setProperty("/ITEM", aItems);
                // also update header checkbox state explicitly (defensive)
                var oHeaderCB = this.byId("asd");
                if (oHeaderCB) { oHeaderCB.setSelected(bSelected); }
            } catch (e) { console.warn("onSelectAll error", e); }
        },
        onSelectRow: function (oEvent) {
            var oSource = oEvent.getSource();
            var bSelected = !!oEvent.getParameter("selected");
            var oContext = oSource.getBindingContext("MaterialDocumentItemModel");
            if (!oContext) { return; }
            var sPath = oContext.getPath(); // /items/0
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
            if (!oPickModel) { return; }
            try {
                oPickModel.setProperty(sPath + "/selected", bSelected);
                // update header checkbox: selected only if all rows selected
                var aItems = oPickModel.getProperty("/ITEM") || [];
                var bAll = aItems.length > 0 && aItems.every(function (it) { return !!it.selected; });
                var oHeaderCB = this.byId("asd");
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
        onSaveScreen: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oList = '';
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
            var aItems = [];
            var aSelected = [];
            oList = this.getView().byId("materialList");
            that.validFlag = "X";
            aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/ITEM')) || [];
            aSelected = aItems.filter(function (it) {

                if (it.selected) {
                    if (it.locationText === "X") {
                        return !!it.selected;
                    } else {
                        that.validFlag = "";
                        return !!it.selected;
                    }
                }
            });

            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            if (that.validFlag === "") {
                MessageBox.error(
                    this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("LocationMismatchWarning"), {
                    actions: [sap.m.MessageBox.Action.OK]
                });
                return;
            }


            var copu = JSON.stringify(aSelected);
            var copyaSelected = JSON.parse(copu);
            var newArray = [];
            copyaSelected.forEach(function (it) {
                // ensure picking qty is not empty/undefined (can happen if user selected but did not enter a value)

                delete it.locationText;
                delete it.selected;
                newArray.push(it);


            });

            if (!oComponent.getModel("TransferSaveItems")) {
                oComponent.setModel(new sap.ui.model.json.JSONModel({ items: newArray }), "TransferSaveItems");
            } else {
                oComponent.getModel("TransferSaveItems").setData({ items: newArray });
            }
            // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // oRouter.navTo("PickIssueCartItems");

            var that = this;

            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oPickModel.getProperty("/DATA") || {},
                HEAD: oPickModel.getProperty("/HEAD") || {},
                ITEM: aSelected,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            // var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SHELVING_2_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model
                    // oListModel.setData(response || response);
                    // for (var i = 0; i < response.ITEM.length; i++) {
                    //     response.ITEM[i].NumberRow = i + 1;
                    //     response.ITEM[i].selected = false;
                    //     response.ITEM[i].locationText = response.ITEM[i].LGPBE_IN === response.ITEM[i].LGPBE ? "X" : ""; // Add locationText property based on comparison
                    // }

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("TransferandShelvingSave");


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onPrintScreen: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oList = '';
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
            var aItems = [];
            var aSelected = [];
            oList = this.getView().byId("materialList");
            that.validFlag = "X";
            aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/ITEM')) || [];
            aSelected = aItems.filter(function (it) {

                if (it.selected) {
                    if (it.locationText === "X") {
                        return !!it.selected;
                    } else {
                        that.validFlag = "";
                        return !!it.selected;
                    }
                }
            });

            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
            if (that.validFlag === "") {
                MessageBox.error(
                    this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("LocationMismatchWarning"), {
                    actions: [sap.m.MessageBox.Action.OK]
                });
                return;
            }

            var copu = JSON.stringify(aSelected);
            var copyaSelected = JSON.parse(copu);
            var newArray = [];
            copyaSelected.forEach(function (it) {
                // ensure picking qty is not empty/undefined (can happen if user selected but did not enter a value)

                delete it.locationText;
                it.selected = false;
                newArray.push(it);


            });

            if (!oComponent.getModel("TransferSaveItems")) {
                oComponent.setModel(new sap.ui.model.json.JSONModel({ items: newArray }), "TransferSaveItems");
            } else {
                oComponent.getModel("TransferSaveItems").setData({ items: newArray });
            }
            // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // oRouter.navTo("PickIssueCartItems");

            var that = this;

            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oPickModel.getProperty("/DATA") || {},
                HEAD: oPickModel.getProperty("/HEAD") || {},
                ITEM: aSelected,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            // var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SHELVING_2_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    that.getView().setBusy(false);


                    // Bind response to the view model
                    // oListModel.setData(response || response);
                    // for (var i = 0; i < response.ITEM.length; i++) {
                    //     response.ITEM[i].NumberRow = i + 1;
                    //     response.ITEM[i].selected = false;
                    //     response.ITEM[i].locationText = response.ITEM[i].LGPBE_IN === response.ITEM[i].LGPBE ? "X" : ""; // Add locationText property based on comparison
                    // }

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }

                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("TransferandShelvingPrint", {
                        view: "TransferandShelvingItems" 
                    }, true);


                },
                error: function (xhr, status, error) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });

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


            var list = this.byId("materialList");
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
            if (oPickModel) {
                try {
                    var aItems = oPickModel.getProperty('/ITEM') || [];
                    aItems = aItems.map(function (it) {
                        it.selected = false;
                        it.LGPBE_IN = "";
                        it.locationText = "";
                        return it;
                    });
                    oPickModel.setProperty('/ITEM', aItems);
                } catch (e) { console.warn("onClearSelection model update failed", e); }
            }
            var oHeaderCB = this.byId("asd");
            if (oHeaderCB) { oHeaderCB.setSelected(false); }



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



        _onRouteMatched: function (oEvent) {
            // var oArgs = oEvent.getParameter("arguments") || {};
            // var NFlAG = oArgs.NFLAG || "";

            // if (NFlAG !== "X") {
            //     this.onClearSelection();
            // }

        },

        onChangeInputValue: function (oEvent) {
            var oSource = oEvent.getSource();

            var oContext = oSource.getBindingContext("MaterialDocumentItemModel");
            if (!oContext) { return; }
            var sPath = oContext.getPath(); // /items/0
            var oComponent = this.getOwnerComponent();
            if (oContext.getObject().LGPBE === oEvent.getSource().getValue()) {
                oContext.getObject().locationText = "X";
            } else { oContext.getObject().locationText = ""; }

        }
    });
});
