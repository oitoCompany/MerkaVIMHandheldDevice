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
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.TransferandShelvingPrint", {
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
            oRouter.getRoute("TransferandShelvingPrint").attachPatternMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
             var oList = this.byId("materialspList");
            if (oList && oList.getItems) {
                var oItems = oList.getItems() || [];
                oItems.forEach(function (oItem) {
                    var Input = oItem.getContent()[0].mAggregations.content[0].mAggregations.items[3].mAggregations.items[0].mAggregations.items[1];
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

        },
        onClearSelection:function(){
            this.bTarget = false;


            var list = this.byId("materialspList");
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("TransferSaveItems");
            if (oPickModel) {
                try {
                    var aItems = oPickModel.getProperty('/items') || [];
                    aItems = aItems.map(function (it) {
                        it.selected = false;
                        // it.LGPBE_IN = "";
                        // it.locationText = "";
                        return it;
                    });
                    oPickModel.setProperty('/items', aItems);
                } catch (e) { console.warn("onClearSelection model update failed", e); }
            }
            var oHeaderCB = this.byId("asrd");
            if (oHeaderCB) { oHeaderCB.setSelected(false); }
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
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo(this.navBackView, {

            }, true);
        },
          onSelectAll: function (oEvent) {
            var bSelected = !!oEvent.getParameter("selected");
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("TransferSaveItems");
            if (!oPickModel) { return; }
            try {
                var aItems = oPickModel.getProperty("/items") || [];
                aItems = aItems.map(function (it) { it.selected = bSelected; return it; });
                oPickModel.setProperty("/items", aItems);
                // also update header checkbox state explicitly (defensive)
                var oHeaderCB = this.byId("asrd");
                if (oHeaderCB) { oHeaderCB.setSelected(bSelected); }
            } catch (e) { console.warn("onSelectAll error", e); }
        },
         onSelectRow: function (oEvent) {
            var oSource = oEvent.getSource();
            var bSelected = !!oEvent.getParameter("selected");
            var oContext = oSource.getBindingContext("TransferSaveItems");
            if (!oContext) { return; }
            var sPath = oContext.getPath(); // /items/0
            var oComponent = this.getOwnerComponent();
            var oPickModel = oComponent.getModel("TransferSaveItems");
            if (!oPickModel) { return; }
            try {
                oPickModel.setProperty(sPath + "/selected", bSelected);
                // update header checkbox: selected only if all rows selected
                var aItems = oPickModel.getProperty("/items") || [];
                var bAll = aItems.length > 0 && aItems.every(function (it) { return !!it.selected; });
                var oHeaderCB = this.byId("asrd");
                if (oHeaderCB) { oHeaderCB.setSelected(bAll); }
            } catch (e) { console.warn("onSelectRow error", e); }
        },
       

        /**
         * Navigate to IssueItems but only with rows marked (selected === true)
         */
        onSaveandFinish: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oList = '';
            var aSelected = [];
            var oMainModel = oComponent.getModel("MaterialDocumentItemModel");
            var oPickModel = oComponent.getModel("TransferSaveItems");
            var aItems = (oPickModel && oPickModel.getProperty && oPickModel.getProperty('/items')) || [];
            aSelected = aItems.filter(function (it) {

                // if (it.selected) {
                //     if (it.locationText === "X") {
                        return !!it.selected;
                    // } else {
                    //     that.validFlag = "";
                    //     return !!it.selected;
                    // }
                // }
            });

            if (!aSelected.length) { sap.m.MessageToast.show("No items selected"); return; }
           
            
             var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SHELVING_3_PRINT";

            this.getView().setBusy(true);
            var lang = sap.ui.getCore().getConfiguration().getLanguage() === "HE" ? "B" : sap.ui.getCore().getConfiguration().getLanguage().substring(0, 1);
            var oPayload = {
                DATA: oMainModel.getProperty("/DATA") || {},
                HEAD: oMainModel.getProperty("/HEAD") || {},
                ITEM: aSelected,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };
              var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            // var url = "SHELVING_2_CHECK";
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
        formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },
         /**
         * Validate picking quantity cannot be greater than reserved quantity
         */
        onQtyToPickLiveChange: function (oEvent) {
            var oComponent = this.getOwnerComponent();
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oContext = oInput.getBindingContext("TransferSaveItems");
            if (!oContext) { return; }
            var oData = oContext.getObject();
            var reservedQty = Number(oData.MENGE_IN);
            var pickingQty = Number(sValue);
            if (pickingQty > reservedQty) {
                oInput.setValue(reservedQty);
                
                var oPickModel = oComponent.getModel("TransferSaveItems");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/LABEL_QTY", 1);
                }
                var oView = this.getView();
                var sMsg = oView.getModel("i18n").getResourceBundle().getText("errorPickingQtyExceedsReserved");
                MessageBox.error(sMsg);
            }else {
                var oPickModel = oComponent.getModel("TransferSaveItems");
                if (oPickModel) {
                    oPickModel.setProperty(oContext.getPath() + "/LABEL_QTY", sValue);
                }
            }
        },

       

      



        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments") || {};
             this.navBackView = oArgs.view;
            

        },

      
    });
});
